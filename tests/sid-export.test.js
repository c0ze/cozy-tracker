import test from 'node:test';
import assert from 'node:assert/strict';
import { compileSid } from '../tools/sid-compile.js';
import { readDriver } from '../tools/json2sid.js';
import { frequencyTable, noteNumber } from '../tools/sid-data.js';
import { loadCrsid, loadTune, playFrames, playSfx, cycleStats } from '../tools/sid-run.js';
import { validateSong } from '../tools/validate-song.js';

const driver = readDriver();
const FREQ = (() => { const t = frequencyTable(); return t.lo.map((lo, i) => lo | (t.hi[i] << 8)); })();
const freqOf = (name) => FREQ[noteNumber(name) - 12];
const voice = (regs, v) => {
  const b = 7 * v;
  return { freq: regs[b] | (regs[b + 1] << 8), pw: regs[b + 2] | ((regs[b + 3] & 15) << 8), ctrl: regs[b + 4], ad: regs[b + 5], sr: regs[b + 6] };
};

// 16 rows at 6 frames per row: row r starts at frame 6r.
const song = () => ({
  title: 'test', bpm: 125, ticks: 6,
  sid: { model: '8580', sfx: [{ name: 'zap', instrument: 2, note: 'C-6', frames: 3, tail: 2 }] },
  samples: [
    { name: 'bass', sid: { adsr: [0, 9, 8, 4], wave: [['pulse']], pulse: { width: 1024, speed: 24, min: 512, max: 3072 } } },
    { name: 'lead', sid: { adsr: [1, 8, 10, 6], wave: [['saw']], filter: { mode: 'low', resonance: 10, cutoff: 400, speed: 2, max: 1600 } } },
    { name: 'drum', sid: { adsr: [0, 8, 0, 0], wave: [['noise', 'C-7'], ['pulse', -12], ['noise', 'A-6']], pulse: { width: 2048 } } },
  ],
  order: [0, 1],
  patterns: [
    { rows: 16, channels: [
      { 0: { note: 'C-3', instrument: 0 }, 4: { note: 'C-3' }, 8: { note: 'G-2', vol: 'v32' }, 12: { note: '==' } },
      { 0: { note: 'E-5', instrument: 1, fx: 'J37' }, 1: { fx: 'J00' }, 4: { note: 'G-5', fx: 'G08' }, 5: { fx: 'G00' },
        6: { fx: 'G00' }, 7: { fx: 'G00' }, 8: { note: 'C-5', fx: 'H44' }, 9: { fx: 'H00' } },
      { 0: { note: 'C-5', instrument: 2 } },
    ] },
    { rows: 4, channels: [{ 0: { note: 'A-2', instrument: 0 } }, {}, { 2: { fx: 'B00' } }] },
  ],
});

async function run(s, frames, org = 0x1000) {
  const result = compileSid(s, { driver, org });
  const w = await loadCrsid();
  loadTune(w, result.psid);
  return { w, result, frames: playFrames(w, org, frames) };
}

test('writes a PSID v2 header the players accept', () => {
  const { psid, prg } = compileSid(song(), { driver });
  const v = new DataView(psid.buffer);
  assert.equal(String.fromCharCode(...psid.slice(0, 4)), 'PSID');
  assert.equal(v.getUint16(4), 2);
  assert.equal(v.getUint16(0x0a), 0x1000);
  assert.equal(v.getUint16(0x0c), 0x1003);
  assert.equal(v.getUint16(0x76), 0x24);                   // PAL, 8580
  assert.deepEqual([...psid.slice(0x7c, 0x7e)], [0x00, 0x10]);
  assert.deepEqual([...prg.slice(0, 2)], [0x00, 0x10]);
  assert.deepEqual([...prg.slice(2, 5)], [0x4c, ...psid.slice(0x7f, 0x81)]); // jmp init
});

test('plays notes, hard restarts, arpeggio, portamento, vibrato and key off', async () => {
  const { frames } = await run(song(), 100);
  const v0 = (f) => voice(frames[f].regs, 0), v1 = (f) => voice(frames[f].regs, 1);
  assert.equal(v0(0).freq, freqOf('C-3'));
  assert.equal(v0(0).ctrl, 0x41);
  assert.equal(v0(0).ad, 0x09);
  // Hard restart: the two frames before row 4's note have the gate off and ADSR 0.
  for (const f of [22, 23]) assert.deepEqual([v0(f).ctrl, v0(f).ad, v0(f).sr], [0x40, 0, 0]);
  assert.equal(v0(24).ctrl, 0x41);
  assert.equal(v0(24).pw, 1024 + 24);                       // pulse restarts with the note, sweeping from
  assert.equal(v0(25).pw, 1024 + 2 * 24);                   // its first frame
  // Arpeggio J37 over rows 0-1: note, +3, +7.
  assert.deepEqual([0, 1, 2, 3, 6].map((f) => v1(f).freq), ['E-5', 'G-5', 'B-5', 'E-5', 'E-5'].map(freqOf));
  // Portamento from E-5 to G-5 (rows 4-7): rises without restarting, and arrives.
  assert.equal(v1(22).ctrl & 1, 1);
  assert.ok(v1(25).freq > freqOf('E-5') && v1(25).freq < freqOf('G-5'));
  assert.equal(v1(47).freq, freqOf('G-5'));
  // Vibrato around C-5: stays within a semitone, crosses the note both ways.
  const vib = [...Array(12)].map((_, i) => v1(48 + i).freq - freqOf('C-5'));
  assert.ok(Math.max(...vib) > 0 && Math.min(...vib) < 0, vib.join());
  assert.ok(Math.max(...vib.map(Math.abs)) < freqOf('C#5') - freqOf('C-5'));
  // Volume column v32 on row 8: sustain 8 of 15.
  assert.equal(v0(48).sr >> 4, 8);
  // Key off on row 12.
  assert.equal(v0(72).ctrl & 1, 0);
  // Drum wavetable: noise at C-7, pulse an octave under the note, noise at A-6, then hold.
  const v2 = (f) => voice(frames[f].regs, 2);
  assert.deepEqual([0, 1, 2, 5].map((f) => [v2(f).ctrl, v2(f).freq]),
    [[0x81, freqOf('C-7')], [0x41, freqOf('C-4')], [0x81, freqOf('A-6')], [0x81, freqOf('A-6')]]);
  // Filter: lead's low-pass on voice 2 only, cutoff sweeping up.
  assert.equal(frames[0].regs[23], 0xa2);
  assert.equal(frames[0].regs[24], 0x1f);
  assert.equal(frames[1].regs[22] - frames[0].regs[22], 2);
});

test('follows the order list, jumps and loops', async () => {
  const { w, frames } = await run(song(), 16 * 6 + 3 * 6 + 1);
  // Order 1 starts at frame 96 with A-2; its row 2 jumps back to order 0.
  assert.equal(voice(frames[96].regs, 0).freq, freqOf('A-2'));
  assert.equal(voice(frames[114].regs, 0).freq, freqOf('C-3'));
  assert.equal(w.crsid_peek(0x100b), 0);                    // cur_order
  assert.equal(w.crsid_peek(0x100c), 0);                    // cur_row
});

test('starts from any order (the player restarts init with start_order set)', async () => {
  const { w, result } = await run(song(), 5);
  w.crsid_poke(result.org + 9, 1);
  w.crsid_restart();
  const [f] = playFrames(w, result.org, 1);
  assert.equal(voice(f.regs, 0).freq, freqOf('A-2'));
  assert.equal(w.crsid_peek(result.org + 11), 1);
});

test('a sound effect borrows voice 3 and gives it back silent', async () => {
  const { w, result } = await run(song(), 10);
  playSfx(w, result.org, 0);
  const f = playFrames(w, result.org, 12).map((x) => voice(x.regs, 2));
  assert.deepEqual([f[0].ctrl & 1, f[0].ad, f[0].sr], [0, 0, 0]);   // restart frame
  assert.deepEqual([f[1].ctrl, f[1].freq], [0x81, freqOf('C-7')]);   // the drum wavetable
  assert.deepEqual([f[2].ctrl, f[2].freq], [0x41, freqOf('C-5')]);   // -12 from the effect's C-6
  assert.equal(f[4].ctrl & 1, 0);                                    // gate off after 3 frames
  assert.equal(f[8].ctrl, 0);                                        // music voice back, silent
});

test('mute silences a voice', async () => {
  const { w, result } = await run(song(), 2);
  w.crsid_poke(result.org + 10, 0b010);
  const [f] = playFrames(w, result.org, 1);
  assert.equal(voice(f.regs, 1).ctrl, 0x08);
  assert.equal(voice(f.regs, 0).ctrl, 0x41);
});

test('the play routine stays cheap', async () => {
  const { frames } = await run(song(), 500);
  const s = cycleStats(frames);
  assert.ok(s.max < 2200, `worst frame ${s.max} cycles`);
  assert.ok(s.avg < 900, `average ${s.avg} cycles`);
});

test('reports what does not carry over', () => {
  const s = song();
  s.patterns[0].channels[2][4] = { fx: 'D0F' };
  s.patterns[0].channels[2][5] = { fx: 'EF1' };
  s.bpm = 132;
  const { warnings } = compileSid(s, { driver });
  const text = [...warnings.keys()].join('\n');
  assert.match(text, /effect D is not supported/);
  assert.match(text, /fine slides/);
  assert.match(text, /5\.68 frames per row; plays at 6/);
});

test('validation keeps SID songs and IT songs apart', () => {
  assert.match(validateSong(song()).join('\n'), /sid instruments play only through tools\/json2sid.js/);
  assert.deepEqual(validateSong(song(), { sid: true }), []);
  const wide = song();
  wide.patterns[0].channels.push({});
  assert.match(validateSong(wide, { sid: true }).join('\n'), /3 voices; this song has 4 channels/);
  const bad = song();
  bad.samples[0].sid.wave = [['square']];
  assert.match(validateSong(bad, { sid: true }).join('\n'), /unknown waveform "square"/);
});
