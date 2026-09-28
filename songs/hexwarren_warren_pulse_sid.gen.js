#!/usr/bin/env node
/**
 * Warren Pulse (SID) — Hexwarren's in-Warren loop arranged for the SID's three voices, for
 * the C64 port (hexwarren-c64). The source is ../hexwarren/assets/audio/warren_pulse.it:
 * 8 channels at speed 6, 132 BPM, order 0 1 2 3 3 4 5 6 6 7 7 4 5 8 0.
 *
 * The driver runs at the PAL frame rate, so 6 frames per row is 125 BPM (5% slower).
 *
 * Voice 1: the octave pulse bass on 8ths, staccato (the original drops to v10 on the odd
 *   rows; here a key off does it). The 909 kick lands on the low notes, so those notes use
 *   a kick+bass instrument: a noise click and a falling pulse thump, then the bass.
 * Voice 2: the kit. The soft snare ticks on 8ths, its accents as a real snare, and where
 *   the original has offbeat hats, a hat replaces the tick on those rows.
 * Voice 3: the E drone (patterns 0-2, 5, 8), the E minor / D minor pad as a chord arpeggio in
 *   the instrument (patterns 3-5; the original's J37), then the hunter call with its echo
 *   three rows later on the same voice (6-7). The game's sound effects borrow this voice.
 *
 * Not carried over: the pad's and drone's volume pumping (the SID has no per-voice volume;
 * the drone gets a pulse sweep and a filter opening instead).
 */
import { writeSong } from './lib.js';

const ROWS = 64;
const I = { bass: 0, kickBass: 1, tick: 2, hat: 3, snare: 4, drone: 5, pad: 6, lead: 7, echo: 8, zap: 9, burst: 10, fall: 11, rise: 12 };
const n = (note, instrument) => ({ note, instrument });

// Voice 1. kick: rows with a kick (quarters); turn: D instead of E in the last bar.
function bass({ kick = () => false, turn = true, until = ROWS } = {}) {
  const ch = {};
  for (let r = 0; r < until; r += 2) {
    const root = turn && r >= 56 ? 'D' : 'E';
    const note = `${root}-${r % 4 === 0 ? 2 : 3}`;
    ch[r] = n(note, kick(r) ? I.kickBass : I.bass);
    ch[r + 1] = { note: '==' };
  }
  return ch;
}
const quarters = (r) => r % 4 === 0;

// Voice 2. hats: offbeat hats; accents: snare rows; every: tick spacing; until: last row.
function kit({ hats = false, accents = [], every = 2, until = ROWS } = {}) {
  const ch = {};
  for (let r = 0; r < until; r += every) {
    if (accents.includes(r)) ch[r] = n('C-5', I.snare);
    else if (hats && r % 4 === 2) ch[r] = n('C-5', I.hat);
    else ch[r] = n('C-5', I.tick);
  }
  return ch;
}
const BACKBEAT = [8, 24, 40, 56];
const PUSHED = [8, 22, 24, 30, 40, 54, 56, 62];

// Voice 3.
const drone = (from = 0) => ({ [from]: n('E-4', I.drone), 62: { note: '^^' } });
const pad = () => ({ 0: n('E-5', I.pad), 16: n('E-5', I.pad), 32: n('E-5', I.pad), 48: n('D-5', I.pad), 63: { note: '^^' } });
function call(notes) {
  const ch = {};
  notes.forEach((note, i) => {
    ch[i * 8] = n(note, I.lead);
    ch[i * 8 + 3] = n(note, I.echo);
    ch[i * 8 + 7] = { note: '^^' };
  });
  return ch;
}
const CALL_A = ['B-5', 'D-6', 'E-6', 'D-6', 'B-5', 'G-5', 'A-5', 'B-5'];
const CALL_B = ['B-5', 'D-6', 'E-6', 'G-6', 'E-6', 'D-6', 'B-5', 'E-6'];

const pattern = (name, v1, v2, v3) => ({ name, rows: ROWS, channels: [v1, v2, v3] });
const patterns = [
  pattern('0 intro', bass({ turn: false }), {}, drone()),
  pattern('1 ticks', bass({ turn: false }), kit({ accents: [8, 40] }), drone()),
  pattern('2 kick', bass({ kick: quarters }), kit({ accents: BACKBEAT }), drone()),
  pattern('3 pad', bass({ kick: quarters }), kit({ hats: true, accents: BACKBEAT }), pad()),
  pattern('4 pad, pushed snare', bass({ kick: quarters }), kit({ hats: true, accents: PUSHED }), pad()),
  pattern('5 breakdown',
    { ...bass({ kick: (r) => r === 0, turn: false, until: 32 }), 32: { note: '^^' },
      48: n('E-2', I.bass), 52: n('F-2', I.bass), 56: n('G-2', I.bass), 60: n('D-2', I.bass), 63: { note: '==' } },
    kit({ every: 4, until: 48 }),
    { 0: n('E-5', I.pad), 2: { note: '==' }, ...drone(16) }),
  pattern('6 hunter call', bass({ kick: quarters }), kit({ accents: BACKBEAT }), call(CALL_A)),
  pattern('7 hunter call, higher', bass({ kick: quarters }), kit({ hats: true, accents: PUSHED }), call(CALL_B)),
  pattern('8 turnaround', bass({ kick: (r) => quarters(r) && r < 32, turn: false }), kit({ until: 32 }), drone()),
];

const PULSE_BASS = { width: 0x500, speed: 12, min: 0x300, max: 0xa00 };
writeSong(import.meta.url, {
  title: 'Warren Pulse (SID)', bpm: 125, ticks: 6,
  message: "Hexwarren's in-Warren loop (warren_pulse.it) for the SID's three voices + sound effects.\n" +
    'Voice 1 bass + kick, voice 2 kit, voice 3 drone / pad / hunter call. Source: songs/hexwarren_warren_pulse_sid.gen.js',
  sid: {
    model: '6581', author: 'Hexwarren', released: '2026',
    // The game's sound effects, on voice 3 (hexwarren-c64 plays them by number).
    sfx: [
      { name: 'shot', instrument: I.zap, note: 'C-6', frames: 5, tail: 3 },
      { name: 'kill', instrument: I.burst, note: 'C-5', frames: 8, tail: 10 },
      { name: 'death', instrument: I.fall, note: 'G-5', frames: 40, tail: 12 },
      { name: 'promote', instrument: I.rise, note: 'E-5', frames: 12, tail: 4 },
    ],
  },
  samples: [
    { name: 'pulse bass', sid: { adsr: [0, 6, 10, 3], wave: [['pulse']], pulse: PULSE_BASS } },
    { name: 'kick + bass', sid: { adsr: [0, 7, 10, 3], wave: [['noise', 'C-7'], ['pulse', 'A-4'], ['pulse', 'E-4'], ['pulse', 'B-3'], ['pulse', 0]], pulse: PULSE_BASS } },
    { name: 'tick', sid: { adsr: [0, 2, 0, 0], wave: [['noise', 'C#7']] } },
    { name: 'hat', sid: { adsr: [0, 1, 0, 0], wave: [['noise', 'G-8']] } },
    { name: 'snare', sid: { adsr: [0, 7, 0, 0], wave: [['noise', 'D-7'], ['pulse', 'G-4'], ['noise', 'C-7'], ['noise', 'A-6']], pulse: { width: 0x800 } } },
    { name: 'drone', sid: { adsr: [9, 0, 12, 9], wave: [['pulse']], pulse: { width: 0x300, speed: 6, min: 0x200, max: 0xd00 },
      filter: { mode: 'low', resonance: 8, cutoff: 500, speed: 1, max: 1200 } } },
    { name: 'pad arpeggio', sid: { adsr: [2, 8, 9, 10], wave: [['pulse', 0], ['pulse', 3], ['pulse', 7]], loop: 0, pulse: { width: 0x800, speed: 20, min: 0x400, max: 0xc00 } } },
    { name: 'hunter call', sid: { adsr: [1, 6, 10, 5], wave: [['saw']] } },
    { name: 'call echo', sid: { adsr: [0, 4, 4, 5], wave: [['tri']] } },
    { name: 'sfx zap', sid: { adsr: [0, 5, 0, 0], wave: [['pulse', 12], ['pulse', 7], ['pulse', 2], ['pulse', -3], ['pulse', -8], ['pulse', -13]], pulse: { width: 0x400 } } },
    { name: 'sfx burst', sid: { adsr: [0, 8, 0, 0], wave: [['noise', 'C-7'], ['noise', 'A-6'], ['noise', 'F-6'], ['noise', 'D-6'], ['noise', 'A-5'], ['noise', 'F-5'], ['noise', 'C-5']] } },
    { name: 'sfx fall', sid: { adsr: [0, 0, 15, 8], wave: [...Array(36)].map((_, i) => ['saw', -i]) } },
    { name: 'sfx rise', sid: { adsr: [0, 6, 0, 0], wave: [['pulse', 0], ['pulse', 0], ['pulse', 4], ['pulse', 4], ['pulse', 7], ['pulse', 7], ['pulse', 12]], pulse: { width: 0x600 } } },
  ],
  channelnames: ['bass + kick', 'kit', 'drone / pad / call'],
  patterns,
  order: [0, 1, 2, 3, 3, 4, 5, 6, 6, 7, 7, 4, 5, 8, 0],
});
