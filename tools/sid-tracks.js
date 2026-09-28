// cozy-tracker patterns (IT semantics) -> driver tracks, one per voice per pattern chunk
// (sid/FORMAT.md). Walks the order list row by row so effect memory, speed and tempo follow
// playback order; a pattern reached with different state gets its own tracks.
import { noteNumber, DRIVER_NOTE_OFFSET, frequencyTable } from './sid-data.js';

const FX = { arp: 1, up: 2, down: 3, porta: 4, vib: 5, speed: 6, jump: 7 };
// Vibrato quarter period in frames for IT speed 0..15 (a 64/speed-frame period).
const QUARTER = [1, 16, 8, 5, 4, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1];
const FREQ = (() => { const t = frequencyTable(); return t.lo.map((lo, i) => lo | (t.hi[i] << 8)); })();
// The SID frequency step of one semitone above driver note n: slides and vibrato scale with it
// so they keep the same musical size at every pitch (music.html, 1.2).
const semitone = (n) => FREQ[Math.min(94, n) + 1] - FREQ[Math.min(94, n)];
const word = (v) => [v & 0xff, (v >> 8) & 0xff];
export const CHUNK_ROWS = 255; // the driver's row counter is a byte
const REST = 0x62, REST_MAX = 30; // $62+n: this row and n more

/** Song order index -> driver order index (patterns longer than CHUNK_ROWS are split). */
export function orderMap(song) {
  const map = [];
  song.order.reduce((at, p, i) => (map[i] = at) + Math.ceil(song.patterns[p].rows / CHUNK_ROWS), 0);
  return map;
}

/**
 * Returns { tracks: [bytes[]], chunks: [{rows, tracks: [i, i, i]}], order: [chunk], loop, speed }.
 * ctx: { transpose[], warn(message) }.
 */
export function convertSong(song, { transpose, warn }) {
  const map = orderMap(song);
  let ticks = song.ticks ?? 6, bpm = song.bpm ?? 125;
  const frames = () => {
    const exact = (ticks * 125) / bpm, f = Math.max(2, Math.round(exact));
    if (Math.abs(f - exact) > 0.01)
      warn(`${ticks} ticks at ${bpm} BPM is ${exact.toFixed(2)} frames per row; plays at ${f} (${Math.round((ticks * 125) / f)} BPM)`);
    return f;
  };
  const speed = song.sid.speed ?? frames();
  const state = [0, 1, 2].map(() => ({ inst: null, sent: null, note: null, mem: { J: 0, EF: 0, G: 0, Hx: 0, Hy: 0 } }));
  const tracks = [], trackIndex = new Map(), chunks = [], chunkIndex = new Map(), order = [];
  const intern = (list, index, key, value) => {
    if (!index.has(key)) { index.set(key, list.length); list.push(value); }
    return index.get(key);
  };

  song.order.forEach((p, oi) => {
    const pat = song.patterns[p];
    const next = map[(oi + 1) % song.order.length];
    for (let start = 0; start < pat.rows; start += CHUNK_ROWS) {
      const rows = Math.min(CHUNK_ROWS, pat.rows - start);
      const out = [[], [], []], rest = [0, 0, 0];
      for (const st of state) st.sent = null; // a chunk may be reached by a jump: name its instruments
      const flush = (c) => {
        for (let n = rest[c]; n > 0; n -= REST_MAX) out[c].push(REST + Math.min(n, REST_MAX) - 1);
        rest[c] = 0;
      };
      for (let r = start; r < start + rows; r++) {
        for (let c = 0; c < 3; c++) {
          const e = pat.channels[c]?.[r];
          const cell = e ? convertCell(e, state[c]) : [];
          if (!cell.length) { rest[c]++; continue; }
          flush(c);
          out[c].push(...cell);
          if (!e.note) rest[c] = 1; // prefixes only: a rest ends the row
        }
      }
      for (let c = 0; c < 3; c++) flush(c);
      const ids = out.map((bytes) => intern(tracks, trackIndex, bytes.join(','), bytes));
      order.push(intern(chunks, chunkIndex, `${rows}:${ids}`, { rows, tracks: ids }));
    }

    // One row of one channel -> track bytes: effect, instrument, volume, then the note.
    function convertCell(e, st) {
      const bytes = [];
      if (e.instrument != null) st.inst = e.instrument;
      const note = e.note && e.note !== '==' && e.note !== '^^';
      let n = null;
      if (note) {
        if (st.inst === null) { warn('a note before any instrument plays instrument 0'); st.inst = 0; }
        n = noteNumber(e.note) - DRIVER_NOTE_OFFSET + transpose[st.inst];
        if (n < 0 || n > 95) { warn(`note ${e.note} is outside the driver's C-1..B-8`); n = Math.max(0, Math.min(95, n)); }
      }
      if (e.fx) {
        const L = e.fx[0], v = parseInt(e.fx.slice(1), 16), m = st.mem;
        // A slide or vibrato starts from the row's new note; a portamento from the old one.
        const from = (L === 'G' ? st.note ?? n : n ?? st.note) ?? 48;
        let fx = null;
        if (L === 'J') fx = [FX.arp, (m.J = v || m.J)];
        else if (L === 'E' || L === 'F') {
          if (v >= 0xe0) warn(`${L}${e.fx.slice(1)}: fine slides are not supported`);
          else fx = [L === 'F' ? FX.up : FX.down, ...word(Math.round((semitone(from) * (m.EF = v || m.EF)) / 16))];
        } else if (L === 'G') fx = [FX.porta, ...word(Math.max(1, Math.round((semitone(from) * (m.G = v || m.G)) / 16)))];
        else if (L === 'H') {
          const x = (m.Hx = v >> 4 || m.Hx), y = (m.Hy = v & 15 || m.Hy);
          fx = [FX.vib, ...word(Math.round((semitone(from) * x * y) / 256)), QUARTER[x]];
        } else if (L === 'A') { if (v) ticks = v; fx = [FX.speed, frames()]; }
        else if (L === 'T') {
          if (v >= 0x20) { bpm = v; fx = [FX.speed, frames()]; } else warn('T0x/T1x tempo slides are not supported');
        } else if (L === 'B') {
          if (v < map.length) fx = [FX.jump, map[v]]; else warn(`B${e.fx.slice(1)}: no such order`);
        } else if (L === 'C') {
          if (v) warn(`C${e.fx.slice(1)}: breaks continue at row 0`);
          fx = [FX.jump, next];
        } else warn(`effect ${L} is not supported`);
        if (fx) bytes.push(0xb0 | fx[0], ...fx.slice(1));
      }
      if (note && st.inst !== st.sent) { bytes.push(0x80 | st.inst); st.sent = st.inst; }
      if (e.vol) {
        const m = /^v(\d+)$/.exec(e.vol);
        if (!m) warn(`volume column ${e.vol[0]}xx is not supported`);
        else if (!note) warn('volume changes without a note are not supported');
        else bytes.push(0xa0 | Math.min(15, Math.round((Number(m[1]) * 15) / 64)));
      }
      if (e.note === '==') bytes.push(0x60);
      else if (e.note === '^^') bytes.push(0x61);
      else if (note) {
        bytes.push(n);
        st.note = n;
      }
      return bytes;
    }
  });
  if (tracks.length > 256) throw new Error(`${tracks.length} tracks; the driver holds 256`);
  if (chunks.length > 256) throw new Error(`${chunks.length} patterns; the driver holds 256`);
  if (order.length > 255) throw new Error(`order list of ${order.length}; the driver holds 255`);
  return { tracks, chunks, order, loop: map[song.sid.loop ?? 0], speed };
}
