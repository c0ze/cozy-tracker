#!/usr/bin/env node
/**
 * lint — composition hygiene checks for song JSON.
 *
 * A note does not only exist where it begins: it rings until an explicit
 * ==/^^, a new note on its channel, or (one-shots) natural decay. This tool
 * simulates that and flags:
 *
 *   1. forgotten sustains — looped samples ringing longer than --max-ring
 *      rows without an end, or ringing past the pattern end
 *   2. register clashes — simultaneously ringing pitched notes a minor 2nd
 *      apart (or b9/maj7 across octaves) on different channels
 *   3. overcrowding — more than --max-voices pitched notes ringing at once
 *
 * Limitation: J-arpeggio chord tones are not expanded (base pitch only).
 *
 * Usage: node tools/lint.js songs/<name>.json [--max-ring 16] [--max-voices 4]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { readWav } from "./wav.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const NAMES = ["C-", "C#", "D-", "D#", "E-", "F-", "F#", "G-", "G#", "A-", "A#", "B-"];
const nn = (s) => NAMES.indexOf(s.slice(0, 2)) + 12 * parseInt(s[2]);

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const flag = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? +args[i + 1] : dflt; };
const MAX_RING = flag("--max-ring", 16);
const MAX_VOICES = flag("--max-voices", 4);
if (!file) { console.error("Usage: node tools/lint.js <song.json> [--max-ring N] [--max-voices N]"); process.exit(1); }

const song = JSON.parse(fs.readFileSync(file, "utf8"));
const rowsPerSec = (song.bpm || 125) / (2.5 * (song.ticks || 6));

// classify instruments: {sustain: Infinity|rows, pitched: bool}
const inst = (song.samples || []).map((def) => {
  const name = def.name || def.file || "?";
  if (def.synth) {
    const w = def.synth.wave || "sine";
    if (["noise", "kick"].includes(w)) return { name, sustain: Math.ceil((def.synth.seconds || 0.3) * rowsPerSec), pitched: false };
    if (w === "pluck") return { name, sustain: Math.ceil((def.synth.seconds || 2) * rowsPerSec), pitched: true };
    return { name, sustain: Infinity, pitched: true }; // single-cycle loop
  }
  const looped = !!def.loop;
  let seconds = 1;
  if (def.file) {
    try { const w = readWav(fs.readFileSync(path.resolve(ROOT, def.file))); seconds = w.channels[0].length / w.samplerate; } catch {}
  } else if (def.channels) seconds = def.channels[0].length / (def.samplerate || 44100);
  const isDrum = /kick|snare|hat|clap|crash|tom|drum|perc|nois/i.test(name + (def.file || ""));
  return { name, sustain: looped ? Infinity : Math.ceil(seconds * rowsPerSec), pitched: !isDrum };
});

let warnings = 0;
const warn = (pat, row, msg) => { warnings++; console.log(`  P${pat} r${String(row).padStart(2, "0")}: ${msg}`); };

(song.patterns || []).forEach((pat, pIdx) => {
  const rows = pat.rows || 64;
  const ringing = new Map(); // ch -> {semi, instIdx, startRow, endRow}
  const headerShown = { v: false };

  for (let r = 0; r < rows; r++) {
    // process events
    pat.channels.forEach((chn, c) => {
      const ev = chn[r] ?? chn[String(r)];
      if (!ev) return;
      if (ev.note === "==" || ev.note === "^^") { ringing.delete(c); return; }
      if (ev.note) {
        const meta = inst[ev.instrument] || { sustain: Infinity, pitched: true, name: "?" };
        ringing.set(c, { semi: nn(ev.note), i: ev.instrument, startRow: r, endRow: r + meta.sustain, note: ev.note });
      }
      if (ev.vol === "v0" || ev.vol === "v00") ringing.delete(c);
    });
    // expire one-shots
    for (const [c, n] of ringing) if (r >= n.endRow) ringing.delete(c);

    // pitched ringing set
    const act = [...ringing.entries()].filter(([, n]) => (inst[n.i] || { pitched: true }).pitched);

    // clash check (only report at the row a new note causes it)
    for (const [c1, n1] of act) {
      if (n1.startRow !== r) continue; // report once, when the clash is created
      for (const [c2, n2] of act) {
        if (c2 === c1 || n2.startRow > r) continue;
        const d = Math.abs(n1.semi - n2.semi);
        if (d === 0) continue;
        // harsh: seconds in close position, or a b9 within ~two octaves
        if (d <= 2 || (d % 12 === 1 && d <= 25)) {
          warn(pIdx, r, `clash: ch${c1} ${n1.note} vs ch${c2} ${n2.note} (ringing since r${n2.startRow}) — interval ${d} semitones`);
        }
      }
    }
    // overcrowding
    if (act.length > MAX_VOICES && !headerShown.v) {
      warn(pIdx, r, `${act.length} pitched notes ringing at once (max ${MAX_VOICES}): ${act.map(([c, n]) => `ch${c}:${n.note}`).join(" ")}`);
      headerShown.v = true; // once per pattern
    }
  }

  // forgotten sustains: infinite notes never ended within the pattern
  for (const [c, n] of ringing) {
    const meta = inst[n.i] || { sustain: Infinity, name: "?" };
    if (meta.sustain === Infinity) {
      warn(pIdx, rows - 1, `ch${c} ${n.note} (${meta.name}) rings past pattern end — started r${n.startRow}, no ==/^^/next note`);
    }
  }
  // long UNATTENDED sustains: a looped-sample note with no event at all on
  // its channel (fade fx, vol stamps, arp continuations all count as
  // attention) for more than MAX_RING rows
  pat.channels.forEach((chn, c) => {
    let open = null, lastEvent = -1;
    const check = (r) => {
      if (!open) return;
      const meta = inst[open.i] || { sustain: Infinity };
      if (meta.sustain === Infinity && r - lastEvent > MAX_RING) {
        warn(pIdx, open.r, `ch${c} ${open.note} unattended for ${r - lastEvent} rows (max ${MAX_RING}) — add ==, a fade, or end it sooner`);
        open = null; // report once
      }
    };
    for (let r = 0; r < rows; r++) {
      const ev = chn[r] ?? chn[String(r)];
      if (!ev) { check(r); continue; }
      if (ev.note === "==" || ev.note === "^^" || ev.vol === "v00") open = null;
      else if (ev.note) open = { r, note: ev.note, i: ev.instrument };
      lastEvent = r;
    }
    check(rows);
  });
});

console.log(warnings === 0
  ? `${file}: clean (${(song.patterns || []).length} patterns, ${rowsPerSec.toFixed(1)} rows/s)`
  : `${file}: ${warnings} warning(s)`);
process.exit(0);
