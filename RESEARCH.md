# mod_music — Stack Research & Decisions (July 2026)

Research into the player / tracker / API combo for AI-assisted tracker music, plus
license-safe module & sample sources. Three parallel research passes: playback
libraries, trackers + programmatic write APIs, and content licensing.

## The decision

| Role | Pick | Why |
|---|---|---|
| **Target format** | **IT (Impulse Tracker)** | Best-documented spec (ITTECH.TXT + OpenMPT test cases), richest features (64ch, filters, NNA), and — critically — *instruments are optional* (sample mode), so a generator can start simple and graduate to envelopes later |
| **Web player** | **chiptune3.js** (libopenmpt WASM) | Reference-accuracy playback of IT/XM/MOD/S3M + 40 formats; AudioWorklet; richest runtime API of anything surveyed |
| **Native player (games)** | **libopenmpt** (BSD-3) | Same engine as web → bit-identical playback. Godot: maintained MIT GDExtension (godot-openmpt). Fallback: libxmp (MIT, in SDL_mixer ≥2.6) |
| **Programmatic write API (for Claude)** | **itwriter** (JS/Node, MIT) | The only purpose-built "JSON in → valid .it file out" library that exists. Zero deps, small enough to vendor and extend |
| **Tracker (human editing)** | **Schism Tracker** | Native macOS builds, very actively maintained (Homebrew cask `schism-tracker`), edits & saves IT — perfect round-trip with generated files |

**Pipeline:** Claude emits JSON song description → Node + itwriter → `song.it` →
verify by rendering with libopenmpt → human polishes in Schism Tracker →
ship the .it and play it anywhere with libopenmpt.

## Player research detail

### Winner: libopenmpt via chiptune3.js
- Repo: https://github.com/DrSnuggles/chiptune — npm `chiptune3`, tracks libopenmpt releases within days (v0.8.7, May 2026). Demo: https://drsnuggles.github.io/chiptune/
- Confirmed API (from source): `load(url)` / `play(arrayBuffer)`, `setPos(seconds)`, `setOrderRow(order,row)`, `onProgress → {pos, order, pattern, row, vu[]}` (per-channel VU L/R), full pattern/order/cell metadata dump, `setTempo`/`setPitch` factors, `setCtl`, subsong support, **offline render** via `decodeAll()` → PCM (trivially WAV-encodable).
- Known gap: per-channel **mute is commented out** in the worklet — a ~20-line patch (libopenmpt's `openmpt_module_ext` interactive interface has `set_channel_mute_status`, `set_channel_volume`, `play_note`). Worth patching/vendoring, possibly upstreaming.
- Size: wrapper ~3–13 KB; worklet WASM ~1.5 MB raw / ~400–500 KB gzipped.
- Licensing: BSD-3 (libopenmpt) + MIT (wrapper) — game-safe, no LGPL.

### Runners-up / rejected
- **libxmp** (MIT, v4.7.1 Jul 2026): excellent C API (`xmp_channel_mute`, `xmp_set_tempo_factor`, frame-level info), best lightweight native option; no maintained official WASM build (DIY Emscripten of `libxmp-lite` is easy if the 1.5 MB worklet is too heavy).
- **chiptune2.js**: stale (2024), outdated libopenmpt — superseded by chiptune3.
- **jsxm / micromod / webaudio-mod-player**: no IT support, mostly unmaintained, non-reference accuracy.
- **Furnace**: chip-synthesis tracker, GPL, not an embeddable module player; MOD/XM import is a lossy converter. Rejected.
- **xmrs + xmrsplayer** (Rust, MIT, very active — v0.14.6 Jul 2026): the serious Rust option; keep in mind if the game is Rust/Bevy. Note: XM save round-trip verified only in ≤0.13; 0.14 rewrite's export is unproven.

## Tracker & write-API research detail

### Writing module files from code is a sparse ecosystem
Confirmed **playback/read-only**: libopenmpt (FAQ explicit), libxmp, xmodits (sample ripper), pytrax (IT parser), xm-file (reader), ittech (parser, "writer some day"). OpenMPT's Lua scripting: still unshipped. **Python has no viable module writer at all.**

What can write:
1. **itwriter** — https://github.com/chr15m/itwriter (MIT). Plain JS object `{title, bpm, samples[], patterns: [{rows, channels: [{note, instrument, vol}]}], order}` → ArrayBuffer of valid .it. Current limits: sample mode only (no IT instrument envelopes/NNA yet — fine, IT plays sample-only natively; adding instrument support is a bounded extension, well specified in ITTECH.TXT).
2. **xmrs** (Rust) — genuine XM read→edit→write in ≤0.13.
3. **BassoonTracker internals** (MIT, plain JS) — proven MOD/XM save code, extractable but not packaged.

### Trackers (human side, macOS)
- **Schism Tracker** — native macOS, rolling releases (May 2026 cask), IT-native. **Chosen.**
- **MilkyTracker** — native macOS but XM/MOD only, slower maintenance (last release Nov 2024).
- **OpenMPT** — most powerful editor but Windows-only (Wine on macOS is buggy per their own download page).
- **Furnace** — imports MOD/XM/IT but exports only .fur/.dmf → one-way door, ruled out.
- **BassoonTracker** (MIT, active May 2026) — best *web* tracker, reads/writes MOD+XM, loads modules from URL; relevant if we later want an in-browser editing surface, but it can't edit IT.

### Format spec references (for extending itwriter / writing analyzers)
- IT: ITTECH.TXT in the released Impulse Tracker source — https://github.com/jthlim/impulse-tracker — plus OpenMPT wiki IT test cases: https://wiki.openmpt.org/Development:_Test_Cases/IT
- XM: unofficial spec gist https://gist.github.com/loveemu/737ace92f08b439a416adc829ae2aa76 ; Kaitai grammar https://formats.kaitai.io/fasttracker_xm_module/

## Content licensing research detail

### Key legal nuances
1. **The Mod Archive default = author retains copyright.** Only the explicitly license-tagged subset is reusable: ~300 Public Domain + ~120 CC0 + ~450 CC-BY modules (browse `view_by_license`, queries `publicdomain` / `cc0` / `by`). Watch for covers/remixes in the PD list (uploader can't PD someone else's composition).
2. **Sample provenance problem:** a module's license covers rights the author actually held. 90s modules routinely used samples ripped from commercial sample CDs / other tracks / games. A "PD" tag doesn't clean those samples. Mitigation: treat module licenses as covering the *pattern data*; source shippable instrument samples separately from sample-native clean sources; keep a provenance ledger (URL, author, license, date, SHA per asset).
3. **Shipping .it/.xm files = shipping extractable PCM.** "Royalty-free for compositions, no redistribution as samples" licenses (Splice, MusicRadar…) are a gray area inside module files. Prefer CC0/PD sample sources.

### Sources — verdicts
**SAFE (shippable):**
- **AKWF single-cycle waveforms** — ~4,000 waveforms, public domain ("do your thing"). Cornerstone of the instrument library. https://github.com/KristofferKarlAxelEkstrand/AKWF-FREE
- **Freesound.org CC0 filter** — UI filter + APIv2 `filter=license:"Creative Commons 0"`.
- **OpenGameArt CC0** — incl. "CC0 Chiptunes" collection; some real XM/IT/MOD content.
- **Saga Musix sample collection** — ~97 samples, "do anything, credits not required". https://sagamusix.de/en/samples/
- **Drozerix's catalog** — 79 modules on TMA, PD + explicit blanket grant on his profile ("use my music in whatever… PC game"). Best single module source; email (drozerix@gmail.com) for written confirmation before commercial shipping.
- TMA license-filtered PD/CC0/CC-BY subsets (~900 modules; audit samples & exclude covers).

**ANALYSIS-ONLY (never ship):**
- **Mod Archive torrents** — tracker.modarchive.org: 2007 snapshot (120k modules, 29 GiB) + yearly additions 2008–2022. Explicitly legal to download. Ideal training/analysis corpus.
- **Modland** (~500k files, zero license metadata; archive.org mirror exists), **scene.org** (FAQ: distribution rights only).

**RISKY:**
- **Amiga ST-01/ST-02** — no formal license ever; samples were themselves recorded from Roland D-50/Yamaha DX21 presets; 39 years of universal unenforced use. Negligible practical risk, nonzero paper risk → recreate the timbres from AKWF/synthesis for a strictly clean library.
- **CHIPSHOP pack** — creator admits some samples ripped from Atari games. Avoid.
- 4mat / Radix / Necros catalogs — not freed; require permission.

### Mod Archive API
XML API exists (`modarchive.org/index.php?xml-api`); key granted on application via forums, monthly caps. Returns license metadata — right tool for pulling the licensed subsets programmatically.

## Next steps (mapped to project aims)
1. **Player embed (aim 1, 2):** small web app — `npm i chiptune3`, drop-a-module player page; patch/vendor worklet for channel mute. This doubles as Claude's audition surface.
2. **Write API (aim 2, 5):** vendor itwriter; build a `song.json → song.it` CLI + a renderer (libopenmpt → WAV) so Claude can generate and *hear* (analyze) its own output.
3. **Tracker (aim 3):** `brew install --cask schism-tracker`.
4. **Library (aim 4):** download AKWF + Saga Musix + Drozerix catalog; script Freesound CC0 pulls; grab the TMA 2007 torrent as analysis corpus; start the provenance ledger.
5. **Skill (aim 5):** a `mod-music` skill encoding IT-format knowledge, itwriter JSON schema, composition idioms learned from corpus analysis.
6. **Game embed (aim 6):** libopenmpt native (godot-openmpt for Godot; SDL_mixer≥2.6/libxmp elsewhere) — same engine as the web player, identical playback.
