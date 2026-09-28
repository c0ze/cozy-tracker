// Runs a compiled SID tune in cRSID (player/vendor/crsid/crsid.wasm) under Node, one play
// call per frame, recording each call's CPU cycles and the SID registers after it.
import fs from 'fs';

const WASM = new URL('../player/vendor/crsid/crsid.wasm', import.meta.url);
export const PAL_FRAME_CYCLES = 19656;   // 312 lines x 63 cycles (vic-ii.txt, 6569)
export const LINE_CYCLES = 63;

export async function loadCrsid() {
  const { instance } = await WebAssembly.instantiate(fs.readFileSync(WASM));
  const w = instance.exports;
  if (!w.crsid_init(44100)) throw new Error('cRSID init failed');
  return w;
}

/** Loads the PSID and runs its init routine. */
export function loadTune(w, psid) {
  if (psid.length > w.crsid_file_max()) throw new Error('tune too large');
  new Uint8Array(w.memory.buffer).set(psid, w.crsid_file());
  if (w.crsid_load(psid.length, 1)) throw new Error('cRSID rejected the file');
}

/** Calls play `frames` times. Returns [{ cycles, regs: Uint8Array(25) }]. */
export function playFrames(w, org, frames) {
  const out = [];
  for (let f = 0; f < frames; f++) {
    const cycles = w.crsid_call(org + 3, 0, PAL_FRAME_CYCLES);
    if (cycles < 0) throw new Error(`play ran past a whole frame at frame ${f}`);
    const regs = new Uint8Array(25);
    for (let r = 0; r < 25; r++) regs[r] = w.crsid_sid(r);
    out.push({ cycles, regs });
  }
  return out;
}

/** Calls the effect entry point with A = n (as the game would). */
export const playSfx = (w, org, n) => w.crsid_call(org + 6, n, 1000);

export function cycleStats(frames) {
  const c = frames.map((f) => f.cycles);
  const max = Math.max(...c), avg = c.reduce((a, b) => a + b, 0) / c.length;
  return { max, avg, maxLines: max / LINE_CYCLES, avgLines: avg / LINE_CYCLES };
}
