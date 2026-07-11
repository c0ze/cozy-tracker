#!/usr/bin/env node
/**
 * "First Light" — first real track, composed per the mod-music skill.
 * Generates songs/first_light.json (run: node songs/first_light.gen.js).
 *
 * A minor, 132 BPM, speed 6 (4 rows/beat, 64-row patterns = 4 bars).
 * Structure: intro → theme → theme+echo → B section → break → theme →
 * theme+echo → climax → outro.  Channels: kick snare hat bass lead echo arp pad.
 */

import fs from "fs";

// --- note helpers ---------------------------------------------------------
const NAMES = ["C-", "C#", "D-", "D#", "E-", "F-", "F#", "G-", "G#", "A-", "A#", "B-"];
const nn = (s) => NAMES.indexOf(s.slice(0, 2)) + 12 * parseInt(s[2]); // "A-2" -> 33
const ns = (n) => NAMES[n % 12] + Math.floor(n / 12);                 // 33 -> "A-2"
const up = (s, semi) => ns(nn(s) + semi);

// chords: [root name, arpeggio fx (J = chip chord: +x, +y semitones)]
const CH = {
  Am: ["A", "J37"], F: ["F", "J47"], C: ["C", "J47"], G: ["G", "J47"],
  Dm: ["D", "J37"], E: ["E", "J47"],
};

// --- channel builders (all return {row: event} for one 64-row pattern) ----
const put = (ch, row, ev) => { ch[row] = ev; };

function drumsKick(bars = [0, 1, 2, 3], vol = 64) {
  const ch = {};
  for (const b of bars) for (const r of [0, 4, 8, 12]) put(ch, b * 16 + r, { note: "C-5", instrument: 0, vol: `v${vol}` });
  return ch;
}
function drumsSnare(bars = [0, 1, 2, 3], fill = false) {
  const ch = {};
  for (const b of bars) for (const r of [4, 12]) put(ch, b * 16 + r, { note: "C-5", instrument: 1, vol: "v50" });
  if (fill) [60, 61, 62, 63].forEach((r, i) => put(ch, r, { note: "C-5", instrument: 1, vol: `v${30 + i * 8}` }));
  return ch;
}
function drumsHat(bars = [0, 1, 2, 3], { open = false, dense = false } = {}) {
  const ch = {};
  for (const b of bars) {
    if (dense) {
      for (let r = 0; r < 16; r += 2) put(ch, b * 16 + r, { note: "C-5", instrument: 2, vol: r % 4 === 0 ? "v38" : "v24" });
    } else {
      for (const r of [2, 6, 10, 14]) put(ch, b * 16 + r, { note: "C-5", instrument: 2, vol: r === 2 ? "v38" : "v26" });
    }
    if (open) put(ch, b * 16 + 14, { note: "C-5", instrument: 3, vol: "v30" });
  }
  return ch;
}
// bass: root 8ths alternating octaves, walk into the next chord at bar end
function bass(chords, { sparse = false } = {}) {
  const ch = {};
  chords.forEach((name, b) => {
    const root = nn(CH[name][0] + "-2");
    const next = nn(CH[chords[(b + 1) % chords.length]][0] + "-2");
    const o = b * 16;
    if (sparse) {
      put(ch, o, { note: ns(root), instrument: 4, vol: "v44" });
      put(ch, o + 8, { note: ns(root + 12), instrument: 4, vol: "v32" });
      put(ch, o + 14, { note: "==" });
      return;
    }
    const line = [[0, 0, 50], [2, 0, 34], [4, 12, 42], [6, 0, 38], [8, 0, 46], [10, 12, 38], [12, 0, 42]];
    for (const [r, t, v] of line) put(ch, o + r, { note: ns(root + t), instrument: 4, vol: `v${v}` });
    // approach: chromatic from above or below, whichever is closer
    const walk = next > root ? next - 1 : next + 1;
    put(ch, o + 14, { note: ns(walk === root ? root + 7 : walk), instrument: 4, vol: "v40" });
  });
  return ch;
}
// arp channel: chip chord — note + J effect repeated on every sustained row
function arp(chords, { oct = 4, vols = [34, 30] } = {}) {
  const ch = {};
  chords.forEach((name, b) => {
    const [root, fx] = CH[name];
    const note = root + "-" + oct;
    for (const [start, vol] of [[0, vols[0]], [8, vols[1]]]) {
      const o = b * 16 + start;
      put(ch, o, { note, instrument: 6, vol: `v${vol}`, fx });
      for (let r = 1; r < 6; r++) put(ch, o + r, { fx });
      put(ch, o + 6, { note: "^^" });
    }
  });
  return ch;
}
// pad: one sustained root note per bar (replaced by next bar's note)
function pad(chords, { oct = 3, vol = 26, fadeFrom = null } = {}) {
  const ch = {};
  chords.forEach((name, b) => {
    put(ch, b * 16, { note: CH[name][0] + "-" + oct, instrument: 7, vol: `v${vol}` });
    if (fadeFrom !== null) for (let r = fadeFrom; r < 16; r += 4) put(ch, b * 16 + r, { fx: "D01" });
  });
  return ch;
}
// melody: list of [row, note, vol?, fx?]; transpose by semitones
function mel(events, { semi = 0, inst = 5, scale = 1 } = {}) {
  const ch = {};
  for (const [r, note, vol, fx] of events) {
    if (note === "==" || note === "^^") { put(ch, r, { note }); continue; }
    const ev = { note: up(note, semi), instrument: inst, vol: `v${Math.round(vol * scale)}` };
    if (fx) ev.fx = fx;
    put(ch, r, ev);
  }
  return ch;
}
// echo: same melody delayed, quieter (own channel, panned opposite)
const echo = (events, delay = 3, scale = 0.55, semi = 0) =>
  mel(events.map(([r, n, v, f]) => [r + delay, n, v, f]).filter(([r]) => r < 64), { semi, scale });

// --- the music -------------------------------------------------------------
const THEME_A = ["Am", "F", "C", "G"];
const THEME_B = ["Dm", "F", "E", "E"];

const melodyA = [
  [0, "E-5", 46], [4, "A-5", 44], [8, "=="], [10, "B-5", 40], [12, "C-6", 44], [14, "B-5", 38],
  [16, "A-5", 46, "H21"], [22, "=="], [24, "G-5", 40], [26, "A-5", 42], [28, "F-5", 40], [30, "=="],
  [32, "E-5", 44], [36, "G-5", 42], [40, "C-6", 46, "H21"], [46, "=="],
  [48, "B-5", 44], [52, "D-6", 42], [54, "B-5", 38], [56, "A-5", 40], [60, "G-5", 38], [62, "=="],
];
const melodyB = [
  [0, "D-5", 46], [4, "F-5", 42], [8, "E-5", 40], [10, "D-5", 38], [12, "=="],
  [16, "F-5", 44, "H21"], [22, "=="], [24, "A-5", 42], [28, "G-5", 40], [30, "=="],
  [32, "G#5", 44], [36, "B-5", 42], [40, "E-5", 44, "H21"], [46, "=="],
  [48, "G#5", 42], [52, "B-5", 44], [56, "D-6", 46, "H31"], [62, "=="],
];
const fragment = [ // break: slow falling phrase over Am
  [0, "E-6", 36, "H21"], [8, "=="], [16, "C-6", 34], [24, "=="],
  [32, "B-5", 34], [40, "=="], [48, "A-5", 36, "H21"], [60, "=="],
];
const patterns = [];
const P = (channels, name) => { patterns.push({ name, rows: 64, channels }); return patterns.length - 1; };

// P0 intro: pads + bass, hats bar 3, kick pickup bar 4
const introHat = drumsHat([2, 3]);
const introKick = {};
[48, 52, 56, 60].forEach((r, i) => put(introKick, r, { note: "C-5", instrument: 0, vol: `v${44 + i * 6}` }));
const intro = [introKick, {}, introHat, bass(THEME_A, { sparse: true }), {}, {}, arp(THEME_A, { vols: [26, 22] }), pad(THEME_A)];
// pan setup (persists for the whole song; center channels use the IT default).
// vol column holds v OR p, so pans go on rows with no volume: free cells for
// hat/lead/echo at row 0, arp's chord-gap at row 7; pad pans via fx X (0-255).
intro[2][0] = { vol: "p42" };  // hat right of center
intro[4][0] = { vol: "p24" };  // lead slightly left
intro[5][0] = { vol: "p44" };  // echo opposite the lead
intro[6][7] = { vol: "p18" };  // arp left
intro[7][0].fx = "X90";        // pad slightly right (0x90/255 ≈ p36)
const P0 = P(intro, "intro");

// P1 theme
const P1 = P([drumsKick(), drumsSnare(), drumsHat(), bass(THEME_A), mel(melodyA), {}, arp(THEME_A), pad(THEME_A)], "theme A");
// P2 theme + echo + open hats
const P2 = P([drumsKick(), drumsSnare(), drumsHat([0, 1, 2, 3], { open: true }), bass(THEME_A), mel(melodyA), echo(melodyA), arp(THEME_A), pad(THEME_A)], "theme A + echo");
// P3 B section with fill
const P3 = P([drumsKick(), drumsSnare([0, 1, 2, 3], true), drumsHat(), bass(THEME_B), mel(melodyB), {}, arp(THEME_B), pad(THEME_B)], "B section");
// P4 break: no kick/snare, sparse bass, fragment + its echo
const P4 = P([{}, {}, drumsHat([0, 1, 2, 3]), bass(["Am", "Am", "F", "E"], { sparse: true }), mel(fragment), echo(fragment, 4, 0.5), arp(["Am", "Am", "F", "E"], { vols: [24, 20] }), pad(["Am", "Am", "F", "E"])], "break");
// P5 climax: melody up an octave, dense hats, echo a fifth below for harmony
const P5 = P([drumsKick(), drumsSnare(), drumsHat([0, 1, 2, 3], { open: true, dense: true }), bass(THEME_A), mel(melodyA, { semi: 12 }), echo(melodyA, 2, 0.5, 5), arp(THEME_A, { oct: 5 }), pad(THEME_A, { oct: 4 })], "climax");
// P6 outro: everything settles on Am and fades
const outroLead = mel([[0, "E-5", 40], [4, "C-5", 38], [8, "B-4", 36], [12, "A-4", 42, "H21"]]);
for (let r = 20; r <= 44; r += 4) outroLead[r] = { fx: "D01" };
outroLead[48] = { note: "==" };
const outroBass = { 0: { note: "A-2", instrument: 4, vol: "v44" }, 16: { note: "A-1", instrument: 4, vol: "v38" } };
for (let r = 32; r <= 56; r += 8) outroBass[r] = { fx: "D01" };
const P6 = P([{}, {}, drumsHat([0, 1]), outroBass, outroLead, {}, arp(["Am", "Am"], { vols: [22, 18] }), pad(["Am", "Am", "Am", "Am"], { fadeFrom: 32 })], "outro");

// --- assemble --------------------------------------------------------------
const song = {
  title: "First Light",
  message: "First Light\n\nComposed by Claude via the mod-music pipeline.\nAKWF single-cycle waveforms (PD) + Saga Musix drums.\nA minor, 132 BPM. songs/first_light.gen.js is the source.",
  bpm: 132,
  ticks: 6,
  mixvol: 68,
  samples: [
    { name: "909 kick (saga)", file: "library/samples/sagamusix/bass_drums/Clicky 909 BD.wav" },
    { name: "analog snare (saga)", file: "library/samples/sagamusix/drums/Analog Snare.wav", volume: 44 },
    { name: "hat closed (saga)", file: "library/samples/sagamusix/drums/Hi-Hat Closed.wav", volume: 34 },
    { name: "hat open (saga)", file: "library/samples/sagamusix/drums/Hi-Hat Open.wav", volume: 30 },
    { name: "saw bass (akwf)", file: "library/samples/akwf/AKWF/AKWF_bw_saw/AKWF_saw_0006.wav", loop: "cycle", volume: 38 },
    { name: "violin lead (akwf)", file: "library/samples/akwf/AKWF/AKWF_violin/AKWF_violin_0001.wav", loop: "cycle", volume: 32 },
    { name: "epiano arp (akwf)", file: "library/samples/akwf/AKWF/AKWF_epiano/AKWF_epiano_0042.wav", loop: "cycle", volume: 28 },
    { name: "eorgan pad (akwf)", file: "library/samples/akwf/AKWF/AKWF_eorgan/AKWF_eorgan_0001.wav", loop: "cycle", volume: 22 },
  ],
  channelnames: { 0: "kick", 1: "snare", 2: "hat", 3: "bass", 4: "lead", 5: "echo", 6: "arp", 7: "pad" },
  order: [P0, P1, P2, P3, P4, P1, P2, P5, P6],
  patterns,
};

fs.writeFileSync(new URL("./first_light.json", import.meta.url), JSON.stringify(song, null, 1));
console.log(`first_light.json: ${patterns.length} patterns, order [${song.order}]`);
