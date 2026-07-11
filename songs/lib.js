/**
 * Shared helpers for song generator scripts (songs/*.gen.js).
 */
import fs from "fs";

export const NAMES = ["C-", "C#", "D-", "D#", "E-", "F-", "F#", "G-", "G#", "A-", "A#", "B-"];
export const nn = (s) => NAMES.indexOf(s.slice(0, 2)) + 12 * parseInt(s[2]); // "A-2"/"F#4" -> semitones
export const ns = (n) => NAMES[n % 12] + Math.floor(n / 12);
export const up = (s, semi) => ns(nn(s) + semi);
export const rn = (root, oct) => root.length === 2 ? root + oct : root + "-" + oct; // "F#",4 -> "F#4"

export const put = (ch, row, ev) => { ch[row] = ev; };

/** melody from [row, note, vol?, fx?] tuples; transposable & volume-scalable */
export function mel(events, { semi = 0, inst = 0, scale = 1, rows = 64 } = {}) {
  const ch = {};
  for (const [r, note, vol, fx] of events) {
    if (r >= rows) continue;
    if (note === "==" || note === "^^") { put(ch, r, { note }); continue; }
    const ev = { note: up(note, semi), instrument: inst };
    if (vol !== undefined) ev.vol = `v${Math.round(vol * scale)}`;
    if (fx) ev.fx = fx;
    put(ch, r, ev);
  }
  return ch;
}

/** delayed, quieter copy of a melody on its own channel */
export const echo = (events, { delay = 3, scale = 0.5, semi = 0, inst = 0, rows = 64 } = {}) =>
  mel(events.map(([r, n, v, f]) => [r + delay, n, v, f]), { semi, scale, inst, rows });

/** merge event maps for one channel (later wins per row) */
export const merge = (...chs) => Object.assign({}, ...chs);

export function writeSong(metaUrl, song) {
  const out = new URL(metaUrl.replace(/\.gen\.js$/, ".json"));
  fs.writeFileSync(out, JSON.stringify(song, null, 1));
  console.log(`${out.pathname.split("/").pop()}: ${song.patterns.length} patterns, order [${song.order}] (${song.order.length} entries)`);
}
