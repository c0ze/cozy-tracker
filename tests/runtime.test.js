import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { CozyAdaptive } from '../player/cozy-adaptive.js';
import { synthesize } from '../tools/synth.js';
import { mergeSongs } from '../tools/merge.js';

function adaptive(sections, loop) {
  const jumps = [];
  const player = {
    onProgress(cb) { this.progress = cb; },
    setOrderRow(order, row) { jumps.push([order, row]); },
  };
  const music = new CozyAdaptive(player, { sections, loop });
  music.playing = true;
  music._jump(loop);
  player.progress({ order: sections[loop][0], row: 0 });
  return { music, jumps, progress: (order, row = 0) => player.progress({ order, row }) };
}

test('a queued transition starts at the next pattern, before the source section ends', () => {
  const { music, progress, jumps } = adaptive({ explore: [0, 3], combat: [4, 5] }, 'explore');
  music.transitionTo('combat');
  progress(0, 16);
  assert.equal(music.section, 'explore');
  progress(1);
  assert.equal(music.section, 'combat');
  assert.deepEqual(jumps.at(-1), [4, 0]);
});

test('a multi-pattern bridge plays all of its orders before the destination', () => {
  const { music, progress } = adaptive({ explore: [0, 3], bridge: [4, 5], combat: [6, 7] }, 'explore');
  music.transitionTo('combat', { via: 'bridge' });
  progress(1);
  assert.equal(music.section, 'bridge');
  progress(4); // acknowledge the seek
  progress(5);
  assert.equal(music.section, 'bridge');
  progress(6);
  assert.equal(music.section, 'combat');
});

test('transitions remain possible when the source covers the complete order list', () => {
  const { music, progress } = adaptive({ whole: [0, 2], destination: [1, 2] }, 'whole');
  progress(2, 31);
  music.transitionTo('destination');
  progress(0);
  assert.equal(music.section, 'destination');
});

test('the row reset at a single-order module loop is a transition boundary', () => {
  const { music, progress } = adaptive({ whole: [0, 0], destination: [0, 0] }, 'whole');
  progress(0, 31);
  music.transitionTo('destination');
  progress(0, 0);
  assert.equal(music.section, 'destination');
});

test('a bridge ending at the module end advances on the natural wrap', () => {
  const { music, progress } = adaptive({ start: [0, 0], destination: [1, 1], bridge: [2, 3] }, 'start');
  music.transitionTo('destination', { via: 'bridge', now: true });
  progress(2);
  progress(3, 63);
  progress(0);
  assert.equal(music.section, 'destination');
});

test('sections still loop when no transition is queued', () => {
  const { music, progress, jumps } = adaptive({ loop: [1, 2] }, 'loop');
  progress(2, 63);
  progress(3);
  assert.equal(music.section, 'loop');
  assert.deepEqual(jumps, [[1, 0], [1, 0]]);
});

test('a section the module loops itself (Bxx) is not re-seeked', () => {
  const { music, progress, jumps } = adaptive({ loop: [1, 2] }, 'loop');
  progress(2, 63);
  progress(1, 0);
  assert.equal(music.section, 'loop');
  assert.deepEqual(jumps, [[1, 0]]);
});

test('a bridge that jumps into its destination is adopted without a seek', () => {
  const { music, progress, jumps } = adaptive({ explore: [0, 1], combat: [2, 3], bridge: [4, 4] }, 'explore');
  music.transitionTo('combat', { via: 'bridge' });
  progress(1);
  assert.deepEqual(jumps.at(-1), [4, 0]);
  progress(4);
  progress(4, 31);
  progress(2, 0);
  assert.equal(music.section, 'combat');
  assert.deepEqual(jumps.at(-1), [4, 0]);
  progress(3);
  progress(2, 0); // and then loops natively too
  assert.equal(jumps.length, 2);
});

test('browser sample resolution respects explicit synth volume, tuning and sustain-loop overrides', async () => {
  const html = fs.readFileSync(new URL('../player/index.html', import.meta.url), 'utf8');
  const source = html.slice(html.indexOf('async function resolveSample(def)'), html.indexOf('async function compileIt()'));
  const context = vm.createContext({ sampleCache: new Map(), synthesize, MIDDLE_C: 261.6256 });
  vm.runInContext(source, context);
  const def = { synth: { wave: 'square', volume: 40 }, volume: 8, c5speed: 5000, susloop: { start: 0, end: 4 }, detune: 12 };
  const sample = await context.resolveSample(def);
  assert.equal(sample.volume, 8);
  assert.equal(sample.c5speed, Math.round(5000 * 2 ** (12 / 1200)));
  assert.deepEqual(sample.susloop, def.susloop);
});

function worklet({ invalidModule = false, extra = {} } = {}) {
  let source = fs.readFileSync(new URL('../player/vendor/chiptune3/chiptune3.worklet.js', import.meta.url), 'utf8');
  // Run the actual processor methods with a fake WASM allocator and browser port.
  source = source.replace(/import libopenmptPromise from [^\n]+/, '')
    .replace(/libopenmptPromise\(\)[\s\S]*?\.catch\(e => console.error\(e\)\)/, '');
  const allocations = new Set();
  const invalidFrees = [];
  let next = 128;
  const api = {
    HEAPU8: new Uint8Array(65536),
    _malloc(size) { const ptr = next; next += size; allocations.add(ptr); return ptr; },
    _free(ptr) { if (!allocations.delete(ptr)) invalidFrees.push(ptr); },
    _openmpt_module_ext_create_from_memory() { return invalidModule ? 0 : 77; },
    _openmpt_module_ext_get_module() { return 78; },
    _openmpt_module_ext_destroy() {},
    _openmpt_module_get_num_channels() { return 1; },
    _openmpt_module_set_repeat_count() {},
    _openmpt_module_set_render_param() {},
    ...extra,
  };
  let Processor;
  const context = vm.createContext({
    api, console, sampleRate: 48000,
    AudioWorkletProcessor: class { constructor() { this.port = { postMessage() {} }; } },
    registerProcessor(_name, cls) { Processor = cls; },
  });
  vm.runInContext(source + ';libopenmpt = api;', context);
  const processor = new Processor();
  processor.meta = () => {};
  return { processor, allocations, invalidFrees, api };
}

test('loading, replacing and stopping modules releases all WASM sample buffers', () => {
  const { processor, allocations, invalidFrees } = worklet();
  processor.play(new ArrayBuffer(1000));
  assert.equal(allocations.size, 2, 'only the two output buffers stay allocated after module creation');
  processor.play(new ArrayBuffer(2000));
  assert.equal(allocations.size, 2);
  processor.stop();
  processor.stop();
  assert.equal(allocations.size, 0);
  assert.deepEqual(invalidFrees, []);
});

test('an invalid module releases its temporary input allocation', () => {
  const { processor, allocations, invalidFrees } = worklet({ invalidModule: true });
  processor.play(new ArrayBuffer(1000));
  processor.stop();
  assert.equal(allocations.size, 0);
  assert.deepEqual(invalidFrees, []);
});

function mergeSource(overrides = {}) {
  return { title: 'fixture', samples: [{ synth: { wave: 'square' } }],
    patterns: [{ rows: 32, channels: [{}] }], order: [0], ...overrides };
}

test('merging relocates B jumps by order offset, including the authored bridge', () => {
  const a = mergeSource({ order: [0, 0, 0], patterns: [{ rows: 32, channels: [{ 3: { fx: 'B01' } }] }] });
  const b = mergeSource({ order: [0, 0], patterns: [{ rows: 32, channels: [{ 7: { fx: 'B01', instrument: 0 } }] }] });
  const merged = mergeSongs(a, b, { bridge: () => ({ patterns: [{ rows: 32, channels: [{ 8: { fx: 'B04' } }] }] }) });
  assert.equal(merged.patterns[0].channels[0][3].fx, 'B01');
  assert.equal(merged.patterns[1].channels[0][8].fx, 'B04', 'bridge coordinates already use the merged space');
  assert.equal(merged.patterns[2].channels[1][7].fx, 'B05', 'B order 1 becomes merged order 5, not pattern 3');
  assert.equal(b.patterns[0].channels[0][7].fx, 'B01', 'the source is unchanged');
});

test('merge defaults match the writer and reach both stamps and bridge helpers', () => {
  let context;
  const merged = mergeSongs(mergeSource(), mergeSource({ mixvol: 96 }), {
    bridge(ctx) { context = ctx; return { patterns: [] }; },
  });
  assert.equal(merged.bpm, 120);
  assert.equal(merged.ticks, 6);
  assert.equal(merged.mixvol, 96);
  assert.equal(merged.patterns[0].channels[2][0].fx, 'T78');
  assert.equal(merged.patterns[0].channels[3][0].fx, 'A06');
  assert.equal(merged.patterns[0].channels[4][0].fx, 'V40');
  assert.equal(context.aBpm, 120);
  assert.equal(context.bTicks, 6);
  assert.equal(mergeSongs(mergeSource(), mergeSource()).mixvol, 48);
});

test('merge rejects jumps outside local A/B orders and the absolute bridge order list', () => {
  const bad = mergeSource({ patterns: [{ rows: 32, channels: [{ 0: { fx: 'B01' } }] }] });
  assert.throws(() => mergeSongs(bad, mergeSource()), /A.*jump.*outside/i);
  assert.throws(() => mergeSongs(mergeSource(), bad), /B.*jump.*outside/i);
  assert.throws(() => mergeSongs(mergeSource(), mergeSource(), {
    bridge: () => ({ patterns: [{ rows: 32, channels: [{ 0: { fx: 'B03' } }] }] }),
  }), /bridge.*jump.*outside/i);
});

test('merge rejects channel, pattern, sample and relocated jump byte overflows', () => {
  const wide = mergeSource({ patterns: [{ rows: 32, channels: Array.from({ length: 31 }, () => ({})) }] });
  assert.throws(() => mergeSongs(wide, wide), /64 channels/i);
  const manyPatterns = mergeSource({ patterns: Array.from({ length: 128 }, () => ({ rows: 32, channels: [{}] })) });
  assert.throws(() => mergeSongs(manyPatterns, manyPatterns), /254 patterns/i);
  const samples = Array.from({ length: 128 }, (_, i) => ({ name: 'a' + i, synth: { wave: 'square' } }));
  assert.throws(() => mergeSongs(mergeSource({ samples }), mergeSource({ samples: samples.map(s => ({ ...s, name: 'b' + s.name })) })), /255 samples/i);
  const longA = mergeSource({ order: Array(256).fill(0) });
  const loopingB = mergeSource({ patterns: [{ rows: 32, channels: [{ 1: { fx: 'B00' } }] }] });
  assert.throws(() => mergeSongs(longA, loopingB), /jump.*255/i);
  assert.throws(() => mergeSongs(mergeSource(), mergeSource(), {
    bridge: ctx => ({ patterns: [{ rows: 32, channels: Array.from({ length: ctx.totalCh + 1 }, () => ({})) }] }),
  }), /bridge.*channels/i);
});

test('merge permits the largest encodable jump and keeps zero mix volume silent', () => {
  const a = mergeSource({ order: Array(255).fill(0), mixvol: 0 });
  const b = mergeSource({ mixvol: 0, patterns: [{ rows: 32, channels: [{ 1: { fx: 'B00' } }] }] });
  const merged = mergeSongs(a, b);
  assert.equal(merged.patterns[1].channels[1][1].fx, 'BFF');
  assert.equal(merged.mixvol, 0);
  assert.equal(merged.patterns[0].channels[4][0].fx, 'V00');
  assert.equal(merged.patterns[1].channels[4][0].fx, 'V00');
  assert.throws(() => mergeSongs(mergeSource(), mergeSource(), {
    bridge(ctx) { ctx.chB(1); return { patterns: [] }; },
  }), /bridge B channel.*outside/);
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const flushTasks = () => new Promise(resolve => setImmediate(resolve));

function jukebox({ manualInitialization = false } = {}) {
  const nodes = new Map(), fetches = new Map(), instances = [], cancelledFrames = [];
  const gradient = { addColorStop() {} };
  const drawing = new Proxy({}, { get: (_target, key) => key.startsWith('create') ? () => gradient : () => {} });
  const node = () => ({
    children: [], style: {}, dataset: {}, textContent: '', width: 0, height: 0,
    classList: { toggle() {} }, addEventListener() {}, setAttribute() {}, removeAttribute() {},
    appendChild(child) { this.children.push(child); },
    querySelector() { return node(); },
    getBoundingClientRect() { return { width: 10, height: 10 }; },
    getContext() { return drawing; },
  });
  const container = { querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, node()); return nodes.get(selector); }, querySelectorAll() { return []; } };
  class Player {
    constructor() {
      instances.push(this); this.plays = [];
      this.context = { state: 'running', createAnalyser: () => ({ fftSize: 8, frequencyBinCount: 4, disconnect() {} }),
        resume: async () => {}, close: async () => { this.closed = true; } };
      this.gain = { connect() {}, disconnect() {} };
    }
    onInitialized(cb) { this.initialize = cb; if (!manualInitialization) queueMicrotask(cb); }
    onMetadata(cb) { this.metadata = cb; }
    onProgress(cb) { this.progress = cb; }
    onEnded(cb) { this.ended = cb; }
    onError(cb) { this.error = cb; }
    play(buffer) { this.plays.push(buffer); }
    stop() {}
    pause() {}
    unpause() {}
  }
  class AudioContext { get audioWorklet() { return {}; } }
  const context = vm.createContext({
    ChiptuneJsPlayer: Player, window: { isSecureContext: true, AudioContext }, console,
    document: { getElementById: () => ({}), createElement: () => node(), head: { appendChild() {} } },
    devicePixelRatio: 1, addEventListener() {}, removeEventListener() {},
    requestAnimationFrame: () => 1, cancelAnimationFrame: id => cancelledFrames.push(id),
    fetch(url) { const request = deferred(); fetches.set(url, request); return request.promise; },
  });
  const source = fs.readFileSync(new URL('../listen/jukebox.js', import.meta.url), 'utf8')
    .replace(/import \{ ChiptuneJsPlayer \} from [^\n]+/, '').replace('export function mountJukebox', 'function mountJukebox');
  vm.runInContext(source, context);
  const mounted = context.mountJukebox(container, { base: '/' });
  const finish = (file, bytes) => fetches.get('/' + file).resolve({ ok: true, arrayBuffer: async () => bytes });
  return { mounted, nodes, fetches, instances, finish, cancelledFrames };
}

test('jukebox keeps the latest selection when an older download completes last', async () => {
  const { mounted, instances, finish, nodes } = jukebox();
  const first = mounted.playTrack(0); await flushTasks();
  const second = mounted.playTrack(1); await flushTasks();
  finish('paper_hearts.it', 'second'); await second;
  finish('night_bus.it', 'first'); await first;
  assert.deepEqual(instances[0].plays, ['second']);
  assert.equal(nodes.get('.jb-title').textContent, 'Paper Hearts');
});

test('stopping or disposing the jukebox invalidates pending loads', async () => {
  for (const operation of ['stopAll', 'dispose']) {
    const { mounted, instances, finish } = jukebox();
    const pending = mounted.playTrack(0); await flushTasks();
    await mounted[operation]();
    finish('night_bus.it', 'obsolete'); await pending;
    assert.equal(mounted.state, 'stopped');
    assert.deepEqual(instances[0].plays, []);
  }
});

test('rapid selection during player initialization waits for the same ready player', async () => {
  const { mounted, instances, fetches, finish } = jukebox({ manualInitialization: true });
  const first = mounted.playTrack(0); await flushTasks();
  const second = mounted.playTrack(1); await flushTasks();
  assert.equal(fetches.size, 0);
  instances[0].initialize(); await flushTasks();
  assert.equal(fetches.size, 1);
  finish('paper_hearts.it', 'second'); await Promise.all([first, second]);
  assert.deepEqual(instances[0].plays, ['second']);
});

test('jukebox reports a failed latest download and permits retry', async () => {
  const { mounted, fetches, finish, instances, nodes } = jukebox();
  const failed = mounted.playTrack(0); await flushTasks();
  fetches.get('/night_bus.it').resolve({ ok: false, status: 404 }); await failed;
  assert.equal(mounted.state, 'stopped');
  assert.match(nodes.get('.jb-title').textContent, /404/);
  const retry = mounted.playTrack(0); await flushTasks();
  finish('night_bus.it', 'retry'); await retry;
  assert.deepEqual(instances[0].plays, ['retry']);
});

test('jukebox disposal during buffer decoding closes audio and prevents later restart', async () => {
  const { mounted, fetches, instances, cancelledFrames } = jukebox();
  const buffer = deferred();
  const pending = mounted.playTrack(0); await flushTasks();
  fetches.get('/night_bus.it').resolve({ ok: true, arrayBuffer: () => buffer.promise });
  await flushTasks();
  await mounted.dispose();
  buffer.resolve('obsolete'); await pending;
  await mounted.playTrack(1);
  assert.equal(instances[0].closed, true);
  assert.deepEqual(instances[0].plays, []);
  assert.deepEqual(cancelledFrames, [1]);
  assert.equal(fetches.size, 1);
});

function fakeChiptune({ init = true, meta = true, error = null } = {}) {
  const handlers = {};
  const on = (name) => (cb) => { (handlers[name] ??= []).push(cb); };
  const fire = (name, v) => (handlers[name] ?? []).forEach((cb) => cb(v));
  const player = {
    calls: [], closed: 0,
    context: { state: 'running', close() { player.closed++; this.state = 'closed'; return Promise.resolve(); } },
    onInitialized: on('onInitialized'), onMetadata: on('onMetadata'),
    onProgress: on('onProgress'), onError: on('onError'),
    play() { player.calls.push('play'); if (error) queueMicrotask(() => fire('onError', { type: error })); else if (meta) queueMicrotask(() => fire('onMetadata', {})); },
    stop() { player.calls.push('stop'); },
    setOrderRow(o, r) { player.calls.push(['seek', o, r]); },
    setChannelMute() {},
  };
  if (init) queueMicrotask(() => fire('onInitialized'));
  return player;
}

async function withFetch(routes, fn) {
  const saved = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const body = routes[url];
    if (body === undefined) return { ok: false, status: 404 };
    return { ok: true, status: 200, json: async () => body, arrayBuffer: async () => new ArrayBuffer(8) };
  };
  try { return await fn(); } finally { globalThis.fetch = saved; }
}

const MANIFEST = { sections: { a: [0, 1], b: [2, 2] }, loop: 'a', layers: [{ name: 'x', channels: [0], above: 0 }] };

test('adaptive create starts the loop section once the module is ready', async () => {
  const player = fakeChiptune();
  const music = await withFetch({ 'm.it': 'buf', 'm.json': MANIFEST }, () =>
    CozyAdaptive.create('m.it', 'm.json', { createPlayer: () => player }));
  assert.equal(music.section, 'a');
  assert.deepEqual(player.calls.slice(0, 2), ['play', ['seek', 0, 0]]);
  music.dispose();
  assert.equal(player.closed, 1);
});

test('adaptive create rejects and closes audio on missing files, bad manifests, load errors and timeouts', async () => {
  const cases = [
    [{ 'm.json': MANIFEST }, {}, /m\.it: HTTP 404/],
    [{ 'm.it': 'buf', 'm.json': { sections: { a: [2, 1] } } }, {}, /section a must be/],
    [{ 'm.it': 'buf', 'm.json': { sections: { a: [0, 1] }, loop: 'z' } }, {}, /unknown section: z/],
    [{ 'm.it': 'buf', 'm.json': MANIFEST }, { error: 'ptr' }, /module failed to load \(ptr\)/],
    [{ 'm.it': 'buf', 'm.json': MANIFEST }, { init: false }, /audio worklet did not load within 20 ms/],
    [{ 'm.it': 'buf', 'm.json': MANIFEST }, { meta: false }, /module did not load within 20 ms/],
  ];
  for (const [routes, behaviour, expected] of cases) {
    const player = fakeChiptune(behaviour);
    await assert.rejects(withFetch(routes, () =>
      CozyAdaptive.create('m.it', 'm.json', { createPlayer: () => player, timeout: 20 })), expected);
    assert.equal(player.closed, 1, String(expected));
  }
});

test('a disposed adaptive player ignores late progress', () => {
  const { music, progress, jumps } = adaptive({ loop: [1, 2] }, 'loop');
  music.dispose = CozyAdaptive.prototype.dispose;
  music.player.stop = () => {};
  music.dispose();
  progress(3);
  assert.deepEqual(jumps, [[1, 0]]);
});

function stackAndStrings() {
  const strings = new Set();
  let sp = 60000, nextString = 30000;
  const str = () => { const ptr = nextString++; strings.add(ptr); return ptr; };
  return {
    strings,
    extra: {
      HEAP8: new Int8Array(65536),
      stackSave: () => sp,
      stackRestore(v) { sp = v; },
      stackAlloc(n) { sp -= n; return sp; },
      _openmpt_module_ctl_set() {},
      _openmpt_module_ext_get_interface() { return 0; },
      UTF8ToString: () => 'x',
      _openmpt_free_string(ptr) { assert.ok(strings.delete(ptr), `double or foreign free ${ptr}`); },
      _openmpt_module_get_duration_seconds: () => 10,
      _openmpt_module_get_metadata_keys: str,
      _openmpt_module_get_metadata: str,
      _openmpt_module_get_num_subsongs: () => 1,
      _openmpt_module_get_subsong_name: str,
      _openmpt_module_get_channel_name: str,
      _openmpt_module_get_num_instruments: () => 1,
      _openmpt_module_get_instrument_name: str,
      _openmpt_module_get_num_samples: () => 2,
      _openmpt_module_get_sample_name: str,
      _openmpt_module_get_num_orders: () => 2,
      _openmpt_module_get_order_name: str,
      _openmpt_module_get_order_pattern: () => 0,
      _openmpt_module_get_num_patterns: () => 1,
      _openmpt_module_get_pattern_name: str,
      _openmpt_module_get_pattern_num_rows: () => 2,
      _openmpt_module_format_pattern_row_channel: str,
    },
    get sp() { return sp; },
  };
}

test('tempo and pitch changes do not consume the WASM stack', () => {
  const env = stackAndStrings();
  const { processor } = worklet({ extra: env.extra });
  processor.play(new ArrayBuffer(100));
  const before = env.sp;
  for (let i = 0; i < 5000; i++) {
    processor.handleMessage_({ data: { cmd: i % 2 ? 'setTempo' : 'setPitch', val: 1 + i / 1e4 } });
  }
  assert.equal(env.sp, before);
});

test('module metadata frees every string libopenmpt returns', () => {
  const env = stackAndStrings();
  const { processor } = worklet({ extra: env.extra });
  processor.play(new ArrayBuffer(100));
  processor.getMeta();
  assert.equal(env.strings.size, 0);
});

test('a finished module reports its end once', () => {
  const posted = [];
  const { processor } = worklet({ extra: { _openmpt_module_read_float_stereo: () => 0 } });
  processor.play(new ArrayBuffer(100));
  processor.port.postMessage = (m) => posted.push(m.cmd);
  const out = [[new Float32Array(128), new Float32Array(128)]];
  for (let i = 0; i < 10; i++) processor.process([], out, {});
  assert.deepEqual(posted, ['end']);
});

test('jukebox recovers when the audio engine fails to start', async () => {
  const { mounted, instances, finish } = jukebox({ manualInitialization: true });
  const failed = mounted.playTrack(0); await flushTasks();
  instances[0].error({ type: 'Init' }); await failed;
  assert.equal(mounted.state, 'stopped');
  assert.equal(instances[0].closed, true);
  const retry = mounted.playTrack(0); await flushTasks();
  instances[1].initialize(); await flushTasks();
  finish('night_bus.it', 'retry'); await retry;
  assert.deepEqual(instances[1].plays, ['retry']);
});

test('jukebox stops and reports a module the engine cannot read', async () => {
  const { mounted, instances, finish, nodes } = jukebox();
  const pending = mounted.playTrack(2); await flushTasks();
  finish('first_light.it', 'junk'); await pending;
  assert.equal(mounted.state, 'playing');
  instances[0].error({ type: 'ptr' });
  assert.equal(mounted.state, 'stopped');
  assert.match(nodes.get('.jb-title').textContent, /could not play First Light \(ptr\)/);
});
