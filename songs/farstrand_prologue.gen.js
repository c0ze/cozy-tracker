#!/usr/bin/env node
/**
 * FARSTRAND — "Prologue" (under the five stills of the opening text crawl). 2026-09-25.
 * D minor (the title's key), 75 BPM, speed 6: 4 rows/beat, 16 rows/bar; one row = a 16th (200 ms), one bar = 3.2 s.
 * Rendered at 44.1 kHz, where 75 BPM is exact (1470 samples/tick).
 *
 * Identity: lonely and slow, emptier than the title. Five three-bar phrases (9.6 s each), one per still,
 * then a bar that turns back; the whole loop is 16 bars (51.2 s) after a one-bar intro. No drums. A soft
 * lead (the title's ocarina: a sine with a little of the odd harmonics) only hints at the title motif
 * ("A—F——E | D———", 5 up a minor sixth to b3, 2, 1): it leaps and stops short of the D, then reaches the
 * seventh and sinks onto Eb (the bII, Halm's colour); only the fourth phrase plays the motif whole, far
 * away on a glass bell with a ping-pong echo. Under it: a dark 8th-note pluck arpeggio with Farstrand's
 * dotted-8th (3-row) delay, one held cold-pad tone, a sine-ish bass and wind.
 *
 * Phrase map (each phrase = one still)
 *   Intro   Dm                         wind and a low D (not looped)
 *   1       Dm Dm Bbmaj7                no melody: pad, bass, wind; the arp fades in; one bell (A6)
 *   2       Dm Bbmaj7 Gm                the lead leaps "A—F———" and sinks to E over Bbmaj7 (the #11), then rests
 *   3       Gm Eb Eb                    the second phrase: "A—G———", "F—Eb———" onto the bII, then rests
 *   4       Dm Bbmaj7 Gm                the whole title motif on the glass bell, "A—F——E | D———", with a
 *                                       3- and 8-row echo; the lead is silent
 *   5       Gm A A                      the lead climbs "Bb D G——", "C#——E——", and holds E over A, open
 *   Turn    A                           a reverse swell; the loop jumps back to phrase 1
 * Loop body: orders 1-6 (16 bars, 51.2 s); phrase starts at 3.2, 12.8, 22.4, 32.0 and 41.6 s in the file.
 * Everything synthesized. Source of truth: this file; the shared helpers come from farstrand_halm.gen.js.
 */
import { wave, glassBell, thinPad, noiseLoop, swell, mel, line, chart, bass, pattern, jump, writeSongCompact,
  ladder, pingpong, notesOf, hits, triads, cutLanes } from './heliobane_stage6.kit.js';
import { sawPluck, soften, delayLine, padLane, wind, fadeIn } from './farstrand_halm.gen.js';

const I = { bass: 0, pluck: 1, lead: 2, pad: 3, bell: 4, noise: 5, swell: 6 };
const LAYOUT = ['bass', 'arp', 'canon', 'lead', 'echo', 'echo2', 'pad', 'bells', 'bellEcho', 'bellEcho2', 'wind', 'fx'];
const PANS = [0x80, 0x58, 0xa8, 0x84, 0x50, 0xb4, 0x74, 0x6c, 0xa4, 0x54, 0x80, 0x90];
const KEYS = ['lead', 'echo', 'echo2', 'arp', 'canon', 'pad', 'bells', 'bellEcho', 'bellEcho2'];

// ---------------------------------------------------------------- melodies
const P2_MEL = 'a5/4 f6/12~ | e6/16~ | r/16';
const P3_MEL = 'a5/4 g6/12~ | f6/6 eb6/10~ | r/16';
const P4_BELL = 'a5/4 f6/10 e6/2 | d6/12 r/4 | r/16';        // the title motif, whole, in glass
const P5_MEL = 'bb5/4 d6/4 g6/8 | c#6/8~ e6/24~';
const CH = { intro: 'Dm', p1: 'Dm Dm Bbmaj7', p2: 'Dm Bbmaj7 Gm', p3: 'Gm Eb Eb', p4: 'Dm Bbmaj7 Gm', p5: 'Gm A A', turn: 'A' };
const SHAPE = [0, 2, 4, 3, 1, 3, 5, 4]; // 8ths through 7 chord-tone rungs from D-4 (the title's)

// ---------------------------------------------------------------- sections
function section(name, bars, chordStr, { melody = null, bell = null, bellVol = 44, arpVol = 24, padVol = 18, bassVol = 26,
  windHi = 9, extra = {} } = {}) {
  const rows = bars * 16, segs = chart(chordStr), tri = chart(triads(chordStr));
  const parts = { wind: wind(bars, { hi: windHi, inst: I.noise }),
    bass: bass(tri, ['R---------------'], I.bass, { rows, lo: 'C-3', vol: bassVol, decay: 0.94 }) };
  const refs = [];
  if (melody) {
    const notes = mel(melody, { vol: 38 }), ch = line(notes, I.lead, { rows, vib: 'H23', vibDelay: 4 });
    parts.lead = ch; refs.push(notes);
    [parts.echo, parts.echo2] = pingpong(ch, notes, rows, { d1: 3, s1: 0.4, d2: 6, s2: 0.22, segs });
    refs.push(notesOf(parts.echo, rows), notesOf(parts.echo2, rows));
  }
  if (bell) {
    const notes = mel(bell, { vol: bellVol }), ch = soften(line(notes, I.bell, { rows, vib: null }), rows, refs);
    parts.bells = ch;
    [parts.bellEcho, parts.bellEcho2] = pingpong(ch, notes, rows, { d1: 3, s1: 0.45, d2: 8, s2: 0.25, segs });
    refs.push(notes, notesOf(parts.bellEcho, rows), notesOf(parts.bellEcho2, rows));
  }
  const arpNotes = ladder(segs, rows, SHAPE, { lo: 'D-4', span: 7, vol: arpVol, soft: 5, len: 2 });
  parts.arp = soften(line(arpNotes, I.pluck, { rows, vib: null }), rows, refs);
  parts.canon = soften(delayLine(parts.arp, rows, segs, { delay: 3, scale: 0.4 }), rows, [...refs, notesOf(parts.arp, rows)]);
  parts.pad = padLane(segs, tri, rows, refs, { lo: 'F-4', vol: padVol, inst: I.pad });
  return pattern(name, bars, cutLanes({ ...parts, ...extra }, KEYS), LAYOUT, PANS);
}

const p1Arp = section('tmp', 3, CH.p1).channels;
const patterns = [
  section('intro: alone', 1, CH.intro, { arpVol: 0, padVol: 12, bassVol: 22, windHi: 11,
    extra: { arp: { 0: { note: '^^' } }, canon: { 0: { note: '^^' } } } }),
  section('1: first still', 3, CH.p1, { padVol: 16, extra: {
    arp: fadeIn(p1Arp[LAYOUT.indexOf('arp')], 16, 44), canon: fadeIn(p1Arp[LAYOUT.indexOf('canon')], 19, 44),
    bells: hits(I.bell, [8], { note: 'A-6', vol: 36 }), bellEcho: hits(I.bell, [11], { note: 'A-6', vol: 14 }),
  } }),
  section('2: the leap', 3, CH.p2, { melody: P2_MEL }),
  section('3: onto the bII', 3, CH.p3, { melody: P3_MEL, padVol: 20 }),
  section('4: the motif in glass', 3, CH.p4, { bell: P4_BELL, arpVol: 20, padVol: 20 }),
  section('5: open on A', 3, CH.p5, { melody: P5_MEL, padVol: 20 }),
  jump(section('turn', 1, CH.turn, { arpVol: 20, padVol: 22, windHi: 12, extra: { fx: hits(I.swell, [10], { vol: 28 }) } }), 1),
];

writeSongCompact(import.meta.url, {
  title: 'Farstrand - Prologue', bpm: 75, ticks: 6, mixvol: 48,
  message: 'FARSTRAND "Prologue" (under the opening stills).\nD minor, 75 BPM. Orders 1-6 loop; five 3-bar phrases, one per still.\nAll samples synthesized. Source: songs/farstrand_prologue.gen.js',
  samples: [
    wave('round bass', [1, 0.3, 0.1, 0.04]),
    sawPluck('dark pluck', { open: 3600, closed: 320, close: 4, decay: 2.2, sec: 1.2 }),
    wave('soft lead', [1, 0, 0.16, 0, 0.05, 0, 0.02]),
    thinPad('cold pad', { amps: [1, 0, 0.25, 0, 0.1], spread: 1 }),
    glassBell('glass bell', { sec: 1.6, partials: [[1, 1, 1.6], [2.76, 0.45, 4], [5.4, 0.2, 7.5], [8.93, 0.08, 12]] }),
    noiseLoop(), swell('swell', { sec: 1.2, seed: 23 }),
  ],
  channelnames: LAYOUT,
  patterns,
  order: patterns.map((_, i) => i),
});
