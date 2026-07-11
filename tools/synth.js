/**
 * Sample synthesis for tracker instruments.
 * Generates float arrays (-1..1) usable as itwriter sample channels.
 *
 * Two families:
 * - Single-cycle waveforms (loop forever, pitched by the tracker):
 *   sine, square, saw, triangle. Returns { channels, loop, c5speed }.
 * - One-shot drums/noise: noise (hats/snare body), kick (pitch-swept sine).
 *
 * C5Speed convention: single-cycle samples are tuned so note C-5 plays
 * middle C (261.6256 Hz). c5speed = cycleLength * 261.6256.
 */

const MIDDLE_C = 261.6256;

function singleCycle(fn, cycle = 256) {
  const out = new Array(cycle);
  for (let i = 0; i < cycle; i++) {
    out[i] = fn(i / cycle); // phase 0..1
  }
  return out;
}

const WAVES = {
  sine: (p) => Math.sin(p * 2 * Math.PI),
  saw: (p) => 1 - 2 * p,
  triangle: (p) => (p < 0.5 ? 4 * p - 1 : 3 - 4 * p),
  // square takes pulse width via closure, see below
};

/**
 * Build a sample definition from a synth spec.
 * spec: {
 *   wave: "sine"|"square"|"saw"|"triangle"|"noise"|"kick",
 *   cycle: 256,            // single-cycle length in samples
 *   pulse: 0.5,            // square only: pulse width 0..1
 *   seconds: 0.15,         // one-shots: duration
 *   samplerate: 22050,     // one-shots: rate
 *   decay: 20,             // one-shots: exponential decay rate (per second)
 *   freqStart: 160, freqEnd: 45, // kick pitch sweep in Hz
 *   volume: 64             // default sample volume 0-64
 * }
 * Returns an itwriter-ready sample object (name added by caller).
 */
export function synthesize(spec) {
  const wave = spec.wave || "sine";

  // one-shot percussion
  if (wave === "noise") {
    const samplerate = spec.samplerate || 22050;
    const n = Math.round((spec.seconds || 0.15) * samplerate);
    const decay = spec.decay === undefined ? 25 : spec.decay;
    const data = new Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / samplerate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-decay * t);
    }
    return { samplerate, channels: [data], volume: spec.volume };
  }

  if (wave === "kick") {
    const samplerate = spec.samplerate || 22050;
    const n = Math.round((spec.seconds || 0.25) * samplerate);
    const decay = spec.decay === undefined ? 14 : spec.decay;
    const f0 = spec.freqStart || 160;
    const f1 = spec.freqEnd || 45;
    const sweep = spec.sweep === undefined ? 18 : spec.sweep; // pitch decay rate
    const data = new Array(n);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / samplerate;
      const f = f1 + (f0 - f1) * Math.exp(-sweep * t);
      phase += (f / samplerate) * 2 * Math.PI;
      data[i] = Math.sin(phase) * Math.exp(-decay * t);
    }
    return { samplerate, channels: [data], volume: spec.volume };
  }

  // single-cycle looping waveform
  const cycle = spec.cycle || 256;
  let fn;
  if (wave === "square") {
    const pulse = spec.pulse === undefined ? 0.5 : spec.pulse;
    fn = (p) => (p < pulse ? 1 : -1);
  } else {
    fn = WAVES[wave];
    if (!fn) throw new Error(`Unknown wave type: ${wave}`);
  }
  const data = singleCycle(fn, cycle);
  return {
    samplerate: 44100, // ignored when c5speed present, but keep sane
    c5speed: Math.round(cycle * MIDDLE_C),
    channels: [data],
    loop: { start: 0, end: cycle },
    volume: spec.volume,
  };
}
