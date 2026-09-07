import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { analyzeSong } from '../tools/song-analysis.js';
import { echo, echoChannel } from '../songs/lib.js';
import { validateSong } from '../tools/validate-song.js';

const root = new URL('../', import.meta.url);
const loop = { name: 'lead', synth: { wave: 'sine' } };
const note = (note, instrument = 0) => ({ note, instrument });
function run(song, tool = 'lint', flags = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cozy-composition-'));
  try {
    const input = path.join(dir, 'song.json');
    fs.writeFileSync(input, JSON.stringify(song));
    return spawnSync(process.execPath, [`tools/${tool}.js`, input,
      ...(tool === 'json2it' ? [path.join(dir, 'song.it')] : []), ...flags],
    { cwd: root, encoding: 'utf8' });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
const song = (patterns, samples = [loop]) => ({ bpm: 120, ticks: 6, samples,
  patterns, order: patterns.map((_, i) => i) });

test('lint catches a held note clashing after the next order begins', () => {
  const s = song([{ rows: 4, channels: [{ 0: note('C-5') }, {}] },
    { rows: 4, channels: [{}, { 0: note('C#5') }] }]);
  assert.match(run(s).stdout, /clash/);
});

test('a low one-shot lasts longer when transposed down', () => {
  const s = song([{ rows: 16, channels: [{ 0: note('C-3') }, { 8: note('C#3', 1) }] }],
    [{ name: 'bell', synth: { wave: 'pluck', seconds: 1 } }, loop]);
  assert.match(run(s).stdout, /clash/);
});

test('strict lint fails for an unclosed loop', () => {
  assert.equal(run(song([{ rows: 4, channels: [{ 0: note('C-5') }] }]), 'lint', ['--strict']).status, 1);
});

test('compiler rejects malformed sharp notes before serialization', () => {
  const result = run(song([{ rows: 4, channels: [{ 0: note('C#-5') }] }]), 'json2it');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /note/);
});

test('compiler rejects rows which would silently disappear', () => {
  const result = run(song([{ rows: 4, channels: [{ 4: note('C-5') }] }]), 'json2it');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /row/);
});

test('arpeggio pitches are checked on sounding ticks and stop on a blank effect row', () => {
  const s = song([{ rows: 3, channels: [
    { 0: { ...note('C-5'), fx: 'J47' }, 2: { note: '^^' } },
    { 0: note('F-5'), 2: { note: '^^' } },
  ] }]);
  const report = analyzeSong(s);
  const clashes = report.warnings.filter(w => w.code === 'clash');
  assert.ok(clashes.some(w => w.row === 0));
  assert.ok(!clashes.some(w => w.row === 1));
});

test('fades execute only on stamped rows, and zero-volume voices can resume', () => {
  const s = song([{ rows: 6, channels: [{
    0: { ...note('C-5'), vol: 'v20' }, 1: { fx: 'D01' },
    3: { vol: 'v00' }, 4: { vol: 'v10' }, 5: { note: '^^' },
  }] }]);
  const report = analyzeSong(s, { trace: true });
  assert.equal(report.timeline[1].voices[0].volume, 15);
  assert.equal(report.timeline[2].voices[0].volume, 15);
  assert.equal(report.timeline[3].pitched, 0);
  assert.equal(report.timeline[4].pitched, 1);
  assert.equal(report.warnings.length, 0);
});

test('sample memory, speed/tempo stamps and cross-pattern note endings are respected', () => {
  const s = song([{ rows: 2, channels: [{ 0: note('C-5') }] },
    { rows: 2, channels: [{ 0: { note: 'D-5', fx: 'A03' }, 1: { note: '^^', fx: 'T3C' } }] }]);
  const report = analyzeSong(s, { trace: true });
  assert.equal(report.timeline[2].voices[0].semi, 62);
  assert.equal(report.metrics.seconds, 0.438);
  assert.equal(report.warnings.length, 0);
});

test('unsupported playback flow is disclosed instead of claiming a complete simulation', () => {
  const report = analyzeSong(song([{ rows: 4, channels: [{ 0: note('C-5'), 3: { note: '^^', fx: 'B00' } }] }]));
  assert.match(report.limitations.join('\n'), /Effect B/);
});

test('unplayed patterns do not contribute audible warnings', () => {
  const s = song([{ rows: 4, channels: [{ 0: note('C-5') }] },
    { rows: 4, channels: [{ 0: note('D-5'), 3: { note: '^^' } }] }]);
  s.order = [1];
  assert.equal(analyzeSong(s).warnings.length, 0);
});

test('key-off does not silence an ordinary looping sample in sample mode', () => {
  const s = song([{ rows: 6, channels: [{ 0: note('C-5'), 1: { note: '==' }, 4: { note: '^^' } }] }]);
  const report = analyzeSong(s, { trace: true });
  assert.equal(report.timeline[1].pitched, 1);
  assert.equal(report.timeline[3].pitched, 1);
  assert.equal(report.timeline[4].pitched, 0);
  assert.ok(report.warnings.some(w => w.code === 'keyoff' && w.row === 1));
});

test('channel volume memory survives silence and explicit cuts', () => {
  const s = song([{ rows: 6, channels: [{ 0: { instrument: 0, vol: 'v00' },
    1: { note: 'C-5' }, 2: { note: '^^' }, 3: { note: 'D-5' }, 4: { note: '^^' } }] }]);
  const report = analyzeSong(s, { trace: true });
  assert.ok(report.timeline.every(r => r.pitched === 0));
});

test('packed patterns exceeding the IT byte limit are rejected', () => {
  const ch = Object.fromEntries(Array.from({ length: 256 }, (_, row) => [row, { ...note('C-5'), vol: 'v64', fx: 'J00' }]));
  const report = analyzeSong(song([{ rows: 256, channels: Array.from({ length: 64 }, () => ch) }]));
  assert.match(report.errors.join('\n'), /65535-byte/);
});

test('delayed echo retains a cut when its original ending falls past the pattern', () => {
  const events = [[56, 'C-5', 32], [62, '^^']];
  assert.equal(echo(events, { delay: 4 })[63].note, '^^');
  assert.equal(echo(events, { delay: 4, boundary: 'carry' })[63], undefined);
});

test('event-map echo copies envelope and effect rows while scaling only volume', () => {
  const source = { 0: { ...note('C-5'), vol: 'v32', fx: 'J47' },
    1: { vol: 'v16', fx: 'J47' }, 2: { vol: 'p10' }, 3: { note: '^^' } };
  const copy = echoChannel(source, { delay: 4, scale: 0.5, semi: 2, rows: 16 });
  assert.deepEqual(copy, { 4: { ...note('D-5'), vol: 'v16', fx: 'J47' },
    5: { vol: 'v8', fx: 'J47' }, 6: { vol: 'p10' }, 7: { note: '^^' } });
  assert.equal(source[0].note, 'C-5');
});

test('special IT volume slides apply on tick zero', () => {
  for (const [fx, volume] of [['D0F', 17], ['DF0', 47], ['DFF', 47]]) {
    const s = song([{ rows: 1, channels: [{ 0: { ...note('C-5'), vol: 'v32', fx } }] }]);
    s.ticks = 1;
    assert.equal(analyzeSong(s, { trace: true }).timeline[0].voices[0].volume, volume);
  }
});

test('all checked-in song sources satisfy the binary format contract', () => {
  const dir = new URL('../songs/', import.meta.url);
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    assert.deepEqual(validateSong(JSON.parse(fs.readFileSync(new URL(file, dir)))), [], file);
  }
});

test('generators reproduce checked-in JSON without the optional sample library', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cozy-generators-'));
  const sourceDir = new URL('../songs/', import.meta.url);
  try {
    fs.mkdirSync(path.join(dir, 'songs'));
    fs.mkdirSync(path.join(dir, 'tools'));
    fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
    for (const file of fs.readdirSync(sourceDir)) if (/\.(js|json)$/.test(file))
      fs.copyFileSync(new URL(file, sourceDir), path.join(dir, 'songs', file));
    for (const file of ['merge.js', 'validate-song.js'])
      fs.copyFileSync(new URL(`../tools/${file}`, import.meta.url), path.join(dir, 'tools', file));
    for (const file of fs.readdirSync(sourceDir).filter(f => f.endsWith('.gen.js')).sort()) {
      const result = spawnSync(process.execPath, [path.join(dir, 'songs', file)], { cwd: dir, encoding: 'utf8' });
      assert.equal(result.status, 0, `${file}: ${result.stderr}`);
      const output = file.replace(/\.gen\.js$/, '.json');
      assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'songs', output))),
        JSON.parse(fs.readFileSync(new URL(output, sourceDir))), `${file} generated JSON is stale`);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
