---
name: bridge
description: Compose a musical bridge between two cozy songs and merge them into one adaptive module. Use when asked to bridge/connect/transition between two songs (e.g. "/bridge siege_engine night_bus" or "make a transition from X to Y").
---

# bridge: connect two songs with a composed transition

Input: two song names from `songs/` (A = from, B = to). Output: one merged
adaptive module where `transitionTo('<b>:...', {via: 'bridge'})` crosses
between them musically. Reference implementation: `songs/siege_to_night.gen.js`.

## Prerequisites

Read [the composition skill](../../../skills/mod-music/SKILL.md), including its
clock and sample-mode note-ending reference.

Both songs must have an `adaptive` block (layers + sections + loop) in their
gen files — add one first if missing (see the mod-music skill).

## Workflow

1. **Study both songs** (`songs/<a>.json`, `songs/<b>.json`, their gen files):
   key/mode, bpm, ticks, channel roles, instrument palettes, and each song's
   character. `node tools/analyze.js build/<name>.it` if unsure.

2. **Choose the harmonic pivot.** Best: a pitch shared by both keys, ideally
   the DOMINANT of B's key (V→i resolution lands the arrival). E.g. Siege
   (E aeolian) → Night Bus (A minor): E is the dominant of A — sit on an E
   pedal, resolve to Am. If no dominant relationship exists, use a common
   chord tone or a bare root drone (ambiguity is your friend in transit).

3. **Plan the clock.** Bridge starts at A's tempo/speed and steps toward B's
   via `Txx` stamps every ~16 rows on the control channel (ctx.ctrl[0]).
   Switch speed (`Axx`) at the pattern where B's material takes over —
   avoid mid-pattern speed changes (row math gets confusing).

4. **Compose the bridge** in `songs/<a>_to_<b>.gen.js` using
   `mergeSongs(a, b, { bridge: (ctx) => ... })` from `tools/merge.js`:
   - Pattern 1 "dissolve": strip A to 2-3 fading elements (drone/bass/sparse
     percussion), all with written volume shapes and `^^` cuts (ordinary sample loops keep
     ringing after `==`). Hand the pivot pitch from an A
     instrument to a B instrument near the end (timbral handoff).
   - Pattern 2 "arrival": resolve to B's key at a clear moment (~row 32),
     introduce B's bass groove + ONE chord gesture + B's hats fading in.
   - Keep a clear foreground and reduce competing motion during the handoff.
     Use actual sounding registers and note durations, including delayed tails.
   - ctx helpers: `chA(i)/chB(i)` channel mapping, `iA(i)/iB(i)` instrument
     mapping, `ctrl` = [tempo, speed, gvol] control channels, `gvA/gvB`
     loudness stamps, `hex2`.

5. **Verify** (all must pass before done):
   - `node songs/<a>_to_<b>.gen.js && node tools/json2it.js songs/<a>_to_<b>.json`
   - `node tools/lint.js songs/<a>_to_<b>.json` — inspect bridge-order
     warnings and partial-simulation notes, then verify those passages in the render;
     lint does not prove harmony or perceptual quality
   - `node tools/render.js build/<a>_to_<b>.it --stats-only` — no clipping
   - grid-check the stamps: `node tools/analyze.js build/<a>_to_<b>.it
     --pattern <bridgeIdx>` — expect Txx ramp / Axx / Vxx in the control
     columns
   - if a browser is available: load in CozyAdaptive and confirm the path
     `<a>:<loop> → bridge → <b>:<loop>` and the return trip

6. Copy `build/<a>_to_<b>.it` + `.cozy.json` to `demos/` if it should ship
   on the site.
