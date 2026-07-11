#!/usr/bin/env node
/**
 * json2it — compile a song JSON file to an Impulse Tracker .it module.
 *
 * Usage: node tools/json2it.js songs/demo.json [build/demo.it]
 *
 * The song JSON is the itwriter structure (see vendor/itwriter/UPSTREAM-README.md)
 * except samples may be declared three ways:
 *
 *   { "name": "bass", "synth": { "wave": "square", "pulse": 0.25 } }
 *   { "name": "flute", "file": "library/samples/akwf/AKWF_0001.wav", "loop": "cycle" }
 *   { "name": "raw", "samplerate": 44100, "channels": [[...]] }
 *
 * file samples: loop may be "cycle" (loop whole file as a single-cycle
 * waveform, auto-tuned so C-5 = middle C) or {start, end}. Paths are
 * relative to the project root.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import itwriter from "../vendor/itwriter/index.js";
import { synthesize } from "./synth.js";
import { readWav } from "./wav.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MIDDLE_C = 261.6256;

function resolveSample(def) {
  if (def.synth) {
    const s = synthesize(def.synth);
    return applyDetune({ name: def.name, ...s, ...overrides(def) }, def);
  }
  if (def.file) {
    const wav = readWav(fs.readFileSync(path.resolve(ROOT, def.file)));
    const s = { name: def.name || path.basename(def.file), ...wav };
    if (def.loop === "cycle") {
      const n = wav.channels[0].length;
      s.loop = { start: 0, end: n };
      s.c5speed = Math.round(n * MIDDLE_C);
    } else if (def.loop) {
      s.loop = def.loop;
    }
    return applyDetune({ ...s, ...overrides(def) }, def);
  }
  return def; // raw itwriter sample
}

// explicit per-sample settings win over derived ones
function overrides(def) {
  const out = {};
  for (const k of ["volume", "c5speed", "susloop"]) {
    if (def[k] !== undefined) out[k] = def[k];
  }
  return out;
}

// detune in cents (e.g. +4/-4 for chorus layering) applied to final c5speed
function applyDetune(s, def) {
  if (def.detune) s.c5speed = Math.round((s.c5speed || s.samplerate) * Math.pow(2, def.detune / 1200));
  return s;
}

const [inFile, outFileArg] = process.argv.slice(2);
if (!inFile) {
  console.error("Usage: node tools/json2it.js <song.json> [out.it]");
  process.exit(1);
}

const song = JSON.parse(fs.readFileSync(inFile, "utf8"));
song.samples = (song.samples || []).map(resolveSample);

const outFile = outFileArg || path.join(ROOT, "build", path.basename(inFile).replace(/\.json$/, ".it"));
fs.mkdirSync(path.dirname(outFile), { recursive: true });

const buf = itwriter(song);
fs.writeFileSync(outFile, Buffer.from(buf));
console.log(`${outFile} (${buf.byteLength} bytes, ${song.samples.length} samples, ${song.patterns.length} patterns, order length ${song.order.length})`);
