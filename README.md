![cozy-tracker](assets/banner.png)

# cozy-tracker

**Live: [tracker.coze.org](https://tracker.coze.org)** — jukebox + adaptive-music
demos on the landing page, [/listen](https://tracker.coze.org/listen/) for the
focused player, [/player](https://tracker.coze.org/player/) for the browser
tracker (view + edit).

AI-assisted adaptive game music: Claude composes Impulse Tracker modules from
JSON, a human polishes them in a real tracker, and the same `.it` files play
in the browser and in games via libopenmpt — with layer/section manifests that
make the score react to gameplay. The pitch:
[docs/positioning.md](docs/positioning.md). The original stack research:
[RESEARCH.md](RESEARCH.md).

## Pipeline

```
songs/*.json ─→ tools/json2it.js ─→ build/*.it (+ *.cozy.json manifest)
                     │                   ├→ player/  — browser tracker (view/edit)
                     │                   ├→ listen/  — jukebox w/ visualizers
                     ├─ tools/lint.js    ├→ Schism Tracker (human editing)
                     └─ tools/render.js  └→ games — CozyAdaptive runtimes
                                            (web: player/cozy-adaptive.js,
                                             Godot: engines/godot/)
```

## Quickstart

```sh
npm install
node tools/json2it.js songs/demo.json   # → build/demo.it
python3 tools/serve.py 8123             # no-cache dev server, project root
open http://localhost:8123/player/      # load ../build/demo.it, press Load
```

Human editing: `brew install --cask schism-tracker`, then open `build/*.it`.

Every push to `main` auto-deploys the site via GitHub Actions
([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) — Pages source
must be set to "GitHub Actions" in the repo settings.

## Layout

- `songs/` — song sources (JSON, itwriter structure + `synth`/`file` sample specs)
- `tools/` — `json2it.js` (compiler), `render.js` (module → WAV + stats),
  `analyze.js` (module structure/stats/pattern dumps), `synth.js`, `wav.js`
- `.claude/skills/mod-music/` — the composition skill: format reference, library map,
  corpus-derived composition guidelines, licensing rules
- `vendor/itwriter/` — vendored [itwriter](https://github.com/chr15m/itwriter) (MIT),
  patched: sample loop points, default volume, C5Speed override
- `player/` — browser tracker: pattern view with playhead, VU meters, oscilloscope,
  per-channel **solo/mute** (engine-level, via libopenmpt's ext interface),
  and an **edit mode** for `.json` songs (piano-roll keyboard with audition,
  instrument add/remove, in-browser itwriter compile, ⬇ json/.it export). Space = pause/resume; in edit
  mode space (re)plays the selected pattern. Keys: z s x d c v g b h n j m = C..B,
  q 2 w 3 e … = octave up, i 9 o 0 p = two up, a = note off, Delete = remove,
  arrows/PgUp/PgDn = cursor, [ ] = octave, click = place cursor.
  `player/vendor/chiptune3/` is vendored [chiptune3](https://github.com/DrSnuggles/chiptune)
  (MIT/BSD), patched: per-channel VU + formatted pattern data
- `listen/` — jukebox player + `jukebox.js` component (playlist, transport,
  wave/bars/rings live visualizers) — embedded on the landing page too
- `demos/` — the shipped modules + adaptive manifests the site plays
- `engines/godot/` — CozyAdaptive runtime for Godot 4 (godot-openmpt)
- `docs/` — [positioning.md](docs/positioning.md) (the pitch),
  [corpus-studies.md](docs/corpus-studies.md) (five pattern-level Drozerix
  deep dives with adoptable recipes)
- `index.html` / `assets/` / `CNAME` — the landing page at tracker.coze.org
- `.claude/skills/` — `mod-music` (composition) and `bridge` (song-to-song
  transitions) skills
- `library/` — samples/modules/corpus (not in git; see library/README.md for rules)
- `build/` — generated `.it` files (not in git)

## Song JSON

The itwriter structure (title/bpm/ticks/samples/patterns/order — see
`vendor/itwriter/UPSTREAM-README.md`), with extended sample definitions:

```jsonc
{ "name": "bass",  "synth": { "wave": "square", "pulse": 0.25, "volume": 42 } },
{ "name": "kick",  "synth": { "wave": "kick", "seconds": 0.3 } },
{ "name": "flute", "file": "library/samples/akwf/AKWF_0001.wav", "loop": "cycle" }
```

Waves: `sine|square|saw|triangle` (single-cycle, looped, C-5 = middle C),
`noise|kick` (one-shot percussion). `loop: "cycle"` loops a WAV file
end-to-end as a single-cycle waveform and tunes it automatically.

## Rendering / verifying output

`node tools/render.js build/song.it` renders to `build/song.wav` via the same
libopenmpt WASM the player uses, and prints duration/peak/RMS/clipping stats
(add `--stats-only` to skip the WAV). `node tools/lint.js songs/song.json`
simulates note durations and flags forgotten sustains, register clashes, and
overcrowding — songs must lint clean before they ship. This is how the agent
checks its own output.

## Adaptive music (CozyAdaptive)

Songs can declare an `adaptive` block (intensity-ordered layers + named
sections); `json2it` then emits a `<name>.cozy.json` manifest next to the
`.it`. The web runtime [player/cozy-adaptive.js](player/cozy-adaptive.js)
pairs the two:

```js
const music = await CozyAdaptive.create('siege_engine.it', 'siege_engine.cozy.json');
music.setIntensity(0.7);                          // layer muting, sample-accurate
music.transitionTo('combat', { via: 'bridge' });  // jump at the next pattern boundary
```

Sections loop themselves until a transition is requested. Live demo on the
landing page ([index.html](index.html)). See
[docs/positioning.md](docs/positioning.md) for the why.

### Bridging two songs into one module

[tools/merge.js](tools/merge.js) merges two songs plus a composed bridge into
a single adaptive module: B's channels/instruments are remapped after A's,
every pattern's row 0 is stamped with its song's tempo/speed/loudness
(Txx/Axx/Vxx on control channels), and section names get prefixed. The bridge
itself is authored music — see
[songs/siege_to_night.gen.js](songs/siege_to_night.gen.js), which walks
Siege Engine (E minor, 150 BPM) into Night Bus (A minor, 112 BPM) over an
E pedal (v→i) with a stepped tempo ramp. Then:

```js
music.transitionTo('nb:groove', { via: 'bridge' }); // cross songs, musically
```

## Analyzing modules

`node tools/analyze.js <module>` prints structure + stats (tempo, channels,
effect usage, note ranges); `--pattern N` prints a tracker grid; `--corpus <dir>`
sweeps a directory. Drozerix corpus results: `build/analysis/drozerix.json`.

## TODO

- IT instrument support (envelopes, NNA) in vendored itwriter
- `.it` reader for round-tripping human edits back to JSON
- Unity CozyAdaptive wrapper (P/Invoke over libopenmpt)
- Godot wrapper smoke test in a real project (API-verified, not yet run)
