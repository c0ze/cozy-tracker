#!/usr/bin/env node
/**
 * json2sid — compile a SID song JSON (sid/FORMAT.md) to a PSID file, and optionally a PRG
 * for a game.
 *
 * Usage: node tools/json2sid.js songs/<song>.json [build/<song>.sid] [--org 0x1000]
 *                               [--prg build/<song>.prg] [--measure seconds]
 *
 * --measure runs the tune in cRSID for that many seconds and reports the play routine's CPU
 * cycles per frame (worst and average), the driver's cost to a game.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { compileSid, report, DRIVER_FILES } from './sid-compile.js';
import { loadCrsid, loadTune, playFrames, cycleStats } from './sid-run.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const readDriver = () => DRIVER_FILES.map((f) => fs.readFileSync(path.join(ROOT, 'sid', f), 'utf8')).join('\n');

function parseArgs(argv) {
  const opts = { files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--org') opts.org = Number(argv[++i]);
    else if (a === '--prg') opts.prg = argv[++i];
    else if (a === '--measure') opts.measure = Number(argv[++i]);
    else opts.files.push(a);
  }
  return opts;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opts = parseArgs(process.argv.slice(2));
  const [inFile, outArg] = opts.files;
  if (!inFile || (opts.org !== undefined && !(opts.org >= 0x0200 && opts.org < 0xff00))) {
    console.error('Usage: node tools/json2sid.js <song.json> [out.sid] [--org 0x1000] [--prg out.prg] [--measure seconds]');
    process.exit(1);
  }
  const outFile = outArg || path.join(ROOT, 'build', path.basename(inFile, path.extname(inFile)) + '.sid');
  try {
    const song = JSON.parse(fs.readFileSync(inFile, 'utf8'));
    const result = compileSid(song, { driver: readDriver(), org: opts.org });
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, result.psid);
    console.log(`${outFile}\n${report(result)}`);
    if (opts.prg) {
      fs.mkdirSync(path.dirname(opts.prg), { recursive: true });
      fs.writeFileSync(opts.prg, result.prg);
      console.log(`${opts.prg} (load address $${result.org.toString(16)})`);
    }
    if (opts.measure) {
      const w = await loadCrsid();
      loadTune(w, result.psid);
      const s = cycleStats(playFrames(w, result.org, Math.round(opts.measure * 50)));
      console.log(`play over ${opts.measure} s: worst ${s.max} cycles (${s.maxLines.toFixed(1)} raster lines), ` +
        `average ${Math.round(s.avg)} (${s.avgLines.toFixed(1)} lines)`);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
