import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import itwriter from '../vendor/itwriter/index.js';
import { readWav } from '../tools/wav.js';
import { synthesize } from '../tools/synth.js';

const renderCli = fileURLToPath(new URL('../tools/render.js', import.meta.url));

function tinyModule(channels = [[0.5, 0.25], [-0.5, -0.25]]) {
  return Buffer.from(itwriter({
    title: 'audio regression', order: [0],
    samples: [{ samplerate: 8000, channels }],
    patterns: [{ rows: 8, channels: [{ 0: { note: 'C-5', instrument: 0 }, 1: { note: '^^' } }] }],
  }));
}

function wav({ format = 1, bits = 32, values = [0.5, -0.5], channels = 1, extensible = false } = {}) {
  const fmtSize = extensible ? 40 : 16;
  const bytesPerSample = bits / 8;
  const dataSize = values.length * bytesPerSample;
  const dataOffset = 12 + 8 + fmtSize + 8;
  const b = Buffer.alloc(dataOffset + dataSize + (dataSize & 1));
  b.write('RIFF'); b.writeUInt32LE(b.length - 8, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(fmtSize, 16);
  b.writeUInt16LE(extensible ? 0xfffe : format, 20); b.writeUInt16LE(channels, 22);
  b.writeUInt32LE(48000, 24); b.writeUInt32LE(48000 * channels * bytesPerSample, 28);
  b.writeUInt16LE(channels * bytesPerSample, 32); b.writeUInt16LE(bits, 34);
  if (extensible) {
    b.writeUInt16LE(22, 36); b.writeUInt16LE(bits, 38);
    b.writeUInt32LE(format, 44);
    Buffer.from('00001000800000aa00389b71', 'hex').copy(b, 48);
  }
  b.write('data', dataOffset - 8); b.writeUInt32LE(dataSize, dataOffset - 4);
  values.forEach((v, i) => {
    const at = dataOffset + i * bytesPerSample;
    if (format === 3 && bits === 32) b.writeFloatLE(v, at);
    else if (bits === 8) b.writeUInt8(Math.round(v * 128 + 128), at);
    else b.writeIntLE(Math.round(v * 2 ** (bits - 1)), at, bytesPerSample);
  });
  return b;
}

test('IT writer preserves independent left and right sample channels', () => {
  const b = tinyModule();
  const sampleHeader = b.readUInt32LE(192 + b.readUInt16LE(32));
  const sampleData = b.readUInt32LE(sampleHeader + 72);
  assert.deepEqual([0, 2, 4, 6].map((i) => b.readInt16LE(sampleData + i)), [16383, 8191, -16384, -8192]);
});

for (const bits of [8, 16, 24, 32]) {
  test(`WAV PCM${bits} decodes integer amplitudes`, () => {
    assert.deepEqual(readWav(wav({ bits })).channels, [[0.5, -0.5]]);
  });
}

for (const extensible of [false, true]) {
  test(`WAV float32${extensible ? ' extensible' : ''} preserves amplitudes`, () => {
    assert.deepEqual(readWav(wav({ format: 3, extensible })).channels, [[0.5, -0.5]]);
  });
}

test('WAV extensible PCM32 uses its PCM subformat', () => {
  assert.deepEqual(readWav(wav({ extensible: true })).channels, [[0.5, -0.5]]);
});

test('WAV extensible rejects an unsupported subformat GUID', () => {
  const b = wav({ extensible: true });
  b[59] ^= 1;
  assert.throws(() => readWav(b), /subformat/i);
});

test('WAV reader preserves interleaved stereo and buffer-view offsets', () => {
  const b = wav({ bits: 16, channels: 2, values: [0.5, -0.5, 0.25, -0.25] });
  const padded = Buffer.concat([Buffer.alloc(7), b, Buffer.alloc(5)]);
  assert.deepEqual(readWav(padded.subarray(7, 7 + b.length)).channels, [[0.5, 0.25], [-0.5, -0.25]]);
});

test('WAV rejects truncated chunks before reading sample data', () => {
  const b = wav();
  b.writeUInt32LE(1000, 40);
  assert.throws(() => readWav(b), /truncated.*data/i);
});

test('WAV tolerates a stale RIFF size in tracker-exported sample metadata', () => {
  const original = wav({ bits: 16 });
  const metadata = Buffer.alloc(20);
  metadata.write('LIST'); metadata.writeUInt32LE(12, 4);
  const b = Buffer.concat([original, metadata]);
  // The data and metadata chunks fit, but the old container length is too short.
  b.writeUInt32LE(original.length, 4);
  assert.deepEqual(readWav(b).channels, [[0.5, -0.5]]);
});

test('WAV rejects zero channels without hanging', () => {
  const b = wav();
  b.writeUInt16LE(0, 22);
  const readerUrl = new URL('../tools/wav.js', import.meta.url).href;
  const script = `import assert from 'node:assert/strict'; import { readWav } from ${JSON.stringify(readerUrl)}; assert.throws(() => readWav(Buffer.from('${b.toString('hex')}', 'hex')), /channels/i);`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 3000 });
  assert.equal(r.status, 0, r.error?.message || r.stderr);
});

test('WAV rejects non-finite float samples', () => {
  assert.throws(() => readWav(wav({ format: 3, values: [NaN] })), /non-finite/i);
});

function renderFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cozy-audio-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const input = path.join(dir, 'tiny.it');
  fs.writeFileSync(input, tinyModule());
  const run = (args) => spawnSync(process.execPath, [renderCli, ...args], { cwd: dir, encoding: 'utf8', timeout: 10000 });
  return { dir, input, run };
}

test('render accepts options before the module path', (t) => {
  const { input, run } = renderFixture(t);
  const r = run(['--rate', '22050', input, '--stats-only']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /@ 22050Hz/);
});

test('render keeps option values out of positional paths and creates the output directory', (t) => {
  const { dir, input, run } = renderFixture(t);
  const output = path.join(dir, 'nested', 'preview.wav');
  const r = run([input, '--rate', '22050', output]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.existsSync(path.join(dir, '22050')), false);
  assert.equal(fs.readFileSync(output).readUInt32LE(24), 22050);
});

test('render rejects missing or invalid rate values instead of silently using a default', (t) => {
  const { input, run } = renderFixture(t);
  for (const rateArgs of [['--rate'], ['--rate', 'abc'], ['--rate', '0'], ['--rate', '-1'], ['--rate', '48000oops']]) {
    const r = run([input, '--stats-only', ...rateArgs]);
    assert.equal(r.status, 1, `${rateArgs}: ${r.stderr}`);
    assert.match(r.stderr, /rate/i);
  }
});

test('noise synthesis is reproducible with its default seed and explicit seeds', () => {
  const spec = { wave: 'noise', seconds: 0.01 };
  assert.deepEqual(synthesize(spec), synthesize(spec));
  assert.deepEqual(synthesize({ ...spec, seed: 0 }), synthesize({ ...spec, seed: 0 }));
  assert.deepEqual(synthesize({ ...spec, seed: 12345 }), synthesize({ ...spec, seed: 12345 }));
  assert.notDeepEqual(synthesize({ ...spec, seed: 12345 }).channels, synthesize({ ...spec, seed: 54321 }).channels);
});

test('noise synthesis rejects seeds that cannot be represented as unsigned 32-bit integers', () => {
  for (const seed of [-1, 1.5, '12', NaN, Infinity, 2 ** 32]) {
    assert.throws(() => synthesize({ wave: 'noise', seed, seconds: 0.001 }), /seed/i);
  }
});

test('single-cycle waveforms remove DC without spending peak headroom', () => {
  for (const spec of [{ wave: 'saw' }, { wave: 'square', pulse: 0.125 }, { wave: 'square', pulse: 0.25 }, { wave: 'square', pulse: 0.875 }]) {
    const sample = synthesize(spec);
    const values = sample.channels[0];
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    assert.ok(Math.abs(mean) < 1e-12, `${JSON.stringify(spec)} mean ${mean}`);
    assert.equal(Math.max(...values.map(Math.abs)), 1);
    assert.deepEqual(sample.loop, { start: 0, end: values.length });
    assert.equal(sample.c5speed, Math.round(values.length * 261.6256));
  }
});

test('balanced square, sine, and triangle retain their shape and unity peak', () => {
  const square = synthesize({ wave: 'square' }).channels[0];
  assert.deepEqual(square, [...Array(128).fill(1), ...Array(128).fill(-1)]);
  for (const wave of ['sine', 'triangle']) {
    const values = synthesize({ wave }).channels[0];
    assert.equal(Math.max(...values.map(Math.abs)), 1);
    for (let i = 0; i < values.length; i++) {
      const p = i / values.length;
      const expected = wave === 'sine' ? Math.sin(p * 2 * Math.PI) : p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
      assert.ok(Math.abs(values[i] - expected) < 1e-12);
    }
  }
});

test('single-cycle synthesis rejects invalid pulse widths and degenerate cycles', () => {
  for (const pulse of [0, 1, -0.1, 1.1, '0.5', NaN]) {
    assert.throws(() => synthesize({ wave: 'square', pulse }), /pulse/i);
  }
  for (const cycle of [0, 1, 2, 2.5, NaN]) {
    assert.throws(() => synthesize({ wave: 'sine', cycle }), /cycle/i);
  }
  assert.throws(() => synthesize({ wave: 'square', pulse: 0.9999, cycle: 256 }), /pulse|waveform/i);
});

test('IT writer preserves an explicit zero mix volume', () => {
  const b = Buffer.from(itwriter({
    mixvol: 0, order: [0], samples: [], patterns: [{ rows: 8, channels: [{}] }],
  }));
  assert.equal(b[49], 0);
});

test('libopenmpt keeps ordinary sample loops after == and silences them after ^^', (t) => {
  const { dir, input, run } = renderFixture(t);
  fs.writeFileSync(input, Buffer.from(itwriter({
    bpm: 120, ticks: 6, order: [0], samples: [synthesize({ wave: 'sine' })],
    patterns: [{ rows: 6, channels: [{
      0: { note: 'C-5', instrument: 0, vol: 'v64' },
      1: { note: '==' },
      4: { note: '^^' },
    }] }],
  })));
  const output = path.join(dir, 'keyoff.wav');
  const result = run([input, output, '--rate', '8000']);
  assert.equal(result.status, 0, result.stderr);
  const samples = readWav(fs.readFileSync(output)).channels[0];
  // Six ticks at 120 BPM occupy exactly 1000 frames at 8 kHz. Measure
  // inside each row so libopenmpt's short transition ramp has settled.
  const rowRms = (row) => {
    const window = samples.slice(row * 1000 + 400, row * 1000 + 900);
    assert.equal(window.length, 500);
    return Math.sqrt(window.reduce((sum, v) => sum + v * v, 0) / window.length);
  };
  const initialRms = rowRms(0);
  assert.ok(initialRms > 0.03, 'the probe must start audibly');
  for (const row of [1, 2, 3]) {
    assert.ok(rowRms(row) > initialRms * 0.9, `key-off unexpectedly stopped or faded row ${row}`);
  }
  for (const row of [4, 5]) {
    assert.ok(rowRms(row) < 1e-6, `note cut left audio sounding in row ${row}`);
  }
});

test('WAV accepts streamed size markers and ignores damaged metadata after the audio', () => {
  const streamed = wav({ bits: 16, values: [0.5, -0.5, 0.25] });
  streamed.writeUInt32LE(0xffffffff, 4);
  streamed.writeUInt32LE(0xffffffff, streamed.indexOf('data') + 4);
  assert.equal(readWav(streamed).channels[0].length, 3);

  const base = wav({ bits: 16, values: [0.5, -0.5] });
  const trailing = Buffer.concat([base, Buffer.from('LIST'), Buffer.from([100, 0, 0, 0]), Buffer.from('INFO')]);
  trailing.writeUInt32LE(trailing.length - 8, 4);
  assert.equal(readWav(trailing).channels[0].length, 2);

  const truncatedAudio = wav({ bits: 16, values: [0.5, -0.5] }).subarray(0, -2);
  truncatedAudio.writeUInt32LE(truncatedAudio.length - 8, 4);
  assert.throws(() => readWav(truncatedAudio), /Truncated WAV data chunk/);
});

test('writer stores Unicode text as ASCII without spilling into later fields', () => {
  const b = Buffer.from(itwriter({
    title: 'Siege → Night — Café ♪', message: 'line one\nline two',
    samples: [{ name: '→→→→→→→→→→→→→→', ...synthesize({ wave: 'sine' }) }],
    patterns: [{ rows: 1, channels: [{}] }], order: [0],
  }));
  assert.equal(b.toString('latin1', 4, 30).replace(/\0+$/, ''), 'Siege -> Night - Cafe ~');
  const special = b.readUInt16LE(0x2e);
  assert.equal(special & 0x2, 0, 'no edit-history block is promised');
  assert.equal(special & 0x1, 1, 'message flag');
  const msg = b.toString('latin1', b.readUInt32LE(0x38), b.readUInt32LE(0x38) + b.readUInt16LE(0x36));
  assert.equal(msg, 'line one\rline two\0');
  const ptr = b.readUInt32LE(0xc0 + b.readUInt16LE(0x20));
  assert.equal(b.toString('latin1', ptr + 0x14, ptr + 0x14 + 26), '->'.repeat(13));
  assert.equal(b[ptr + 0x2e], 1, 'convert flag follows the 26-byte name intact');
});
