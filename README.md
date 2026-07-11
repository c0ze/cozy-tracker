# mod_music

Experiments in AI-assisted tracker music: Claude composes Impulse Tracker
modules, a human polishes them in a real tracker, and the same `.it` files
play in the browser and in games via libopenmpt.

See [RESEARCH.md](RESEARCH.md) for the stack decision and licensing research.

## Pipeline

```
songs/*.json  →  tools/json2it.js  →  build/*.it  →  player/ (browser, chiptune3/libopenmpt)
                                                 →  Schism Tracker (human editing)
                                                 →  game engines (libopenmpt native)
```

## Quickstart

```sh
npm install
node tools/json2it.js songs/demo.json   # → build/demo.it
python3 -m http.server 8123             # serve project root
open http://localhost:8123/player/      # load ../build/demo.it, press Load URL
```

Human editing: `brew install --cask schism-tracker`, then open `build/*.it`.

## Layout

- `songs/` — song sources (JSON, itwriter structure + `synth`/`file` sample specs)
- `tools/` — `json2it.js` (compiler), `render.js` (module → WAV + stats),
  `analyze.js` (module structure/stats/pattern dumps), `synth.js`, `wav.js`
- `.claude/skills/mod-music/` — the composition skill: format reference, library map,
  corpus-derived composition guidelines, licensing rules
- `vendor/itwriter/` — vendored [itwriter](https://github.com/chr15m/itwriter) (MIT),
  patched: sample loop points, default volume, C5Speed override
- `player/` — browser player; `player/vendor/chiptune3/` is vendored
  [chiptune3](https://github.com/DrSnuggles/chiptune) (MIT/BSD), patched: per-channel VU enabled
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
(add `--stats-only` to skip the WAV). This is how the agent checks its own output.

## Analyzing modules

`node tools/analyze.js <module>` prints structure + stats (tempo, channels,
effect usage, note ranges); `--pattern N` prints a tracker grid; `--corpus <dir>`
sweeps a directory. Drozerix corpus results: `build/analysis/drozerix.json`.

## TODO

- Channel mute in the player (needs libopenmpt ext interface in the worklet)
- IT instrument support (envelopes, NNA) in vendored itwriter
- `.it` reader for round-tripping human edits back to JSON
