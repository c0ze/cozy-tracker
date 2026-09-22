# Composition and tool audit — 2026-09-08

Baseline: `cc2144e`. Scope: composition instructions, all eight existing song JSON
sources and their generators, all 73 local Drozerix reference modules, compiler,
synth, WAV reader, lint/analyze/render tools, merger, web playback and Godot wrapper.
No subjective listening judgment is claimed: the findings below come from source,
decoded pattern grids, actual libopenmpt audio probes and measured renders.

## Main conclusion

There was a concrete disconnect between the written score and what played.
The guide treated `==` as a note ending, but normal sample loops continue after
key-off in this sample-only engine. The old linter repeated that mistake, reset
its state at each pattern and ignored pitch-scaled sample lengths. A “clean”
report therefore did not mean the intended rests existed.

The second problem was instructional: recipes about restraint conflicted with
recipes about echoes, doubling and pads; corpus statistics became rigid rules;
XM instrument behavior was treated as though it transferred to raw IT samples.
The replacement teaches phrase, rhythm, voice leading, articulation, actual effect
lifetime, and a listening/revision process with explicit limits on automated checks.
See [the skill](../skills/mod-music/SKILL.md), its
[song critiques](../skills/mod-music/references/example-studies.md), and the
[rechecked corpus evidence](corpus-studies.md).

## Findings and fixes

| Priority | Location / trigger | Result |
|---|---|---|
| P1 | `songs/*.gen.js`, old skill/lint: `==` used to stop normal loops | Intended endings changed to `^^`; a real render regression proves the difference. Both generators and JSON regenerated. |
| P1 | `tools/wav.js:8`: zero channels caused an unbounded decode loop; PCM32 read as float | Validate channel/chunk/format data; decode PCM32/extensible correctly; reject unsupported/non-finite input. |
| P1 | `vendor/itwriter/index.js:254`: stereo writes left PCM into both planes | Preserve independent left/right audio; binary regression. |
| P1 | compiler: malformed notes/out-of-range rows and oversized packed patterns silently coerce/drop notes | Shared source/resolved-sample validation before writing. Packed pattern byte limit enforced. Winter Orbit's invalid rows fixed in its generator. |
| P2 | `tools/song-analysis.js:32` (replacing old lint): pattern-local state, fixed-length low samples, no arp expansion, zero exit with warnings | Written-order/tick analysis, inherited sample/volume state, pitch-scaled tails and J pitches, basic volume effects; structured report and strict mode. Partial coverage disclosed. |
| P2 | `songs/lib.js:34`, First Light: delayed final cut fell outside pattern and disappeared | Echo helper cuts clipped tails by default; explicit `boundary:"carry"` available for authored continuations. |
| P2 | `songs/paper_hearts.gen.js:75`: J effect only on onset despite sustained chord-melody intent | Repeat arpeggio effects through held lead rows while preserving volume accents. |
| P2 | `tools/synth.js:18`: narrow pulse has large DC mean; random noise changes every build | Center/normalize cycles, seeded repeatable noise. Actual 12.5% pulse render mean improved from −0.13637 to 0.000064. |
| P2 | sample defaults mistaken for gain; writer `mixvol:0` became 48 | Guide explains that vNN replaces default sample volume; explicit zero mixvol now remains silent. |
| P2 | `tools/render.js`: `--rate` value interpreted as output path | Parse options independently; validate rate; create destination directories and free WASM allocations. |
| P2 | `tools/json2it.js`: manifest could overwrite output without lowercase `.it` suffix | Derive a separate manifest path safely, including uppercase/non-IT extensions. |
| P2 | adaptive runtime: request waited until entire source section ended and could never exit full-module loops | Observe next order/row-wrap boundary; preserve complete via-section before destination. Web tests and Godot parity. |
| P2 | browser worklet: input/output allocation leaks; browser sample resolution differed from CLI | Free actual WASM pointers; apply explicit synth overrides in editor. |
| P2 | `tools/merge.js:27`: B00 in song B jumped into A; missing defaults produced TNAN/ANAN | Relocate order jumps, validate bounds/capacity, normalize defaults and zero volume. |
| P2 | `listen/jukebox.js:155`: earlier download could win after newer choice or stop | Generation checks across async steps, shared initialization, stop/dispose invalidation, HTTP failure recovery. |
| P2 | integration snippets called nonexistent web/Godot APIs and implied implemented Unity support | Correct constructors, mark Unity planned, describe observed-pattern timing honestly. |
| P2 | `package.json`: test and default build both failed before doing useful work | Node regression suite, usable demo build, portable teaching fixture and CI. |
| P3 | skill discoverability and contradictory references | Canonical tracked `skills/mod-music/`, Codex/Claude symlinks and root AGENTS.md; focused supporting references. |

The synthesized timbres and corrected note endings change rebuilt audio. They do
not change key, tempo or the existing songs' overall form. Paper Hearts also now
performs the intended held-row arpeggios. Original sources remain available at the
baseline commit for comparison. Rebuilt demos accompany these source changes.

## Baseline song renders

Actual renders before edits, 48 kHz stereo, one playback. Peak/RMS in dBFS; every
file had **zero clipped samples**. These figures expose technical levels, not taste.

| Song | Channels | Speed | Patterns / orders | Render seconds | Peak | RMS | Old lint warnings |
|---|---:|---:|---:|---:|---:|---:|---:|
| demo | 5 | 6 | 2 / 4 | 15.46 | −1.3 | −11.7 | 5 |
| akwf_test | 6 | 6 | 2 / 2 | 6.96 | −3.6 | −14.9 | 7 |
| First Light | 10 | 6 | 9 / 16 | 116.45 | −1.2 | −16.7 | 73 |
| Night Bus | 6 | 6 | 7 / 13 | 111.48 | −3.0 | −18.4 | 0 |
| Paper Hearts | 6 | 3 | 8 / 19 | 71.31 | −4.6 | −15.7 | 116 |
| Siege Engine | 9 | 4 | 12 / 21 | 89.70 | −1.5 | −14.7 | 158 |
| Siege → Night | 18 | 4 | 21 / 36 | 214.28 | −0.5 | −14.0 | 158 |
| Winter Orbit | 12 | 12 | 7 / 17 | 67.79 | −5.3 | −18.3 | 147 |

The old warning counts underestimate some real problems and overstate others.
New counts cannot be compared as quality scores: analysis now follows repeated
orders and real arpeggio ticks, and explicitly reports unsupported effect families.

## New teaching example

[Lantern Walk](../songs/lantern_walk.gen.js): original G-major, 118 BPM, speed 6,
four voices, A/A′/B/A″, 32.54-second source timeline. Render including tail:
32.61 seconds, peak −5.7 dBFS, RMS −21.4 dBFS, zero clipping. Strict lint has zero
warnings and no unsupported effects. All PCM is synthesized, so it builds on a
fresh checkout without the optional library. It is a teaching study ready for
an audition, not a claim of listener preference.

```sh
npm test
npm run build
npm run build:example
npm run lint:example
node tools/render.js build/lantern_walk.it
```

The new skill was exercised by a separate agent on an original two-bar four-channel
request, using a temporary workspace. The old guide's baseline exercise exposed
contradictory echo/layer rules and unspecified effect lifetime even though the
agent could work around them. The fresh forward test built a four-second,
four-channel original loop, a 500 ms echo variant and a continuous-arpeggio/fade
probe; all passed strict lint and rendered non-silent without clipping. It found
two documentation/helper gaps (hexadecimal decoded volume display and full-envelope
echo copying), now addressed with documentation and a tested `echoChannel` helper.
This is a behavioral sanity check, not a controlled
experiment proving that all agents now compose better music.

## Verification

- `npm test`: 61 regression tests pass, including actual libopenmpt renders,
  source/JSON generator consistency in an isolated directory, and async playback tests.
- `npm run build`, `npm run build:example`, `npm run lint:example` pass.
- All nine source JSON files compile and render; every render has zero clipping.
- The skill frontmatter validator passes; both discovery symlinks resolve.
- Local browser smoke: rapid selection/stop stays consistent, adaptive explore→combat
  works, Lantern Walk IT and JSON play, and editing a note recompiles successfully.
  The AudioContext runs and produces nonzero PCM; no observed console/network errors.
  This is playback verification, not a listening judgment.
- Independent code review and actual engine probes caught key-off, volume-memory,
  packed-pattern and special-slide errors during implementation; those were fixed
  and their regressions pass. Godot syntax/type check uses a stub, not a game run.

The final independent Codex CLI review reported:

> No actionable regressions found. All 51 read-only regression tests passed; generators matched their JSON and rebuilt demo bytes. Seven demo renders completed without clipping; listening did not occur.

Its 51-test read-only subset is separate from the full 61-test local suite above.

## Follow-up audit — 2026-09-23

Baseline `bd3d251`. Code-only pass over the runtime, web pages, compiler and tools;
every fix below has a regression test that fails on the baseline (76 tests total),
except the browser-only UI changes, which were exercised in a local browser.
No listening occurred and no song content changed: every song rebuilds to the
same rendered peak/RMS as its shipped module.

| Priority | Location | Result |
|---|---|---|
| P1 | `chiptune3.worklet.js` tempo/pitch | Each slider event leaked WASM stack; ~1,090 changes corrupted memory and silenced audio. Stack-scoped `ctl_set`. |
| P1 | `tools/analyze.js` CLI | `--json x.it x.it` overwrote the module; flag values were read as paths. `parseArgs`, self-overwrite refusal, range checks, non-zero exit on load failure. |
| P1 | `json2it` / `writeSong` | Output could resolve to the input (non-`.json` input; non-`.gen.js` generator). Both now refuse. |
| P1 | `cozy-adaptive.js` `create()` | Hung forever on worklet/module/HTTP failure. Now rejects with a timeout and closes its AudioContext; `dispose()` added. Landing demos no longer leak a context per Start/Stop. |
| P2 | `player/index.html` | Default song needed unshipped `library/` samples; load errors were swallowed; ▶ after ■ discarded unsaved edits; infinite init poll; 18-channel songs were unreachable past the viewport. |
| P2 | `listen/jukebox.js`, `index.html` | Failed engine start cached forever; unreadable modules left a silent "playing" state; jukebox and adaptive demos played simultaneously. |
| P2 | `chiptune3.worklet.js` | Metadata strings leaked (~6.8 KB/load); `end` posted every render quantum after a song finished. |
| P2 | `songs/lib.js` `echoChannel` | Boundary cut replaced an echoed onset on the final row. |
| P2 | `json2it` | `detune` ignored on raw PCM samples; `loop` dropped on synth samples although lint modelled it. |
| P2 | `vendor/itwriter` | Unicode wrote low bytes (`→` became `0x92`); Special bit 1 promised an absent edit-history block. Text is transliterated before truncation; messages use CR. |
| P3 | validator | Non-string `title`/`message`/names and bad `channelnames` crashed the writer; >8000-char messages were truncated. |
| P3 | `engines/godot` | Validation relied on `assert` (stripped in release exports); a parse failure assigned `null` to a typed Dictionary. Headless Godot check with a stubbed extension. |
| P3 | misc | `serve.py` bound all interfaces (serving `.git/`); streamed WAV size markers rejected; editor sample paths could reach another host; keyboard access for jukebox rows and snippet tabs; ARIA labels; stale landing copy. |

Not addressed: canvas mute/solo still needs a mouse; the lint warnings in the older
songs are musical prompts that need audition, not mechanical fixes.

## Remaining limits

- **Perceptual quality:** the old dense arrangements still need audition and musical
  revision. New lint warnings are prompts to inspect sounding voices, not reasons
  to ban deliberate seconds, pedals, ambient tails or counterpoint.
- **Precise adaptive timing:** section control reacts to rendered progress and
  main-thread/frame updates. The next order can begin before a seek arrives.
  Scheduling inside the audio engine is needed for precise boundaries. Internal
  row-zero pattern loops also resemble a one-order song wrap to the current heuristic.
- **Complex tempo maps in merging:** per-pattern entry stamps reset tempo, speed
  and global volume. Stateful source tempo maps require an explicit translation
  strategy and rendered transition tests; Bxx relocation alone does not solve that.
- **Public JSON editing:** existing file-backed songs depend on `library/...`
  assets omitted from deployment. Their prebuilt `.it` files play, but rebuilding
  those JSONs in the public editor needs sample packaging. Lantern Walk and demo
  use synthesis and do not have that dependency.
- **Godot:** syntax/type checking passed with an AudioStreamMPT stub and methods
  were checked against the upstream bindings. Actual GDExtension audio playback
  has not been tested in a game.
- **Model coverage:** lint is deliberately smaller than libopenmpt. Unsupported
  effect families, control flow, adaptive paths and sustain-loop releases require
  actual playback inspection. There are still no IT instrument envelopes/NNA or
  `.it`-to-JSON round trips for human tracker edits.
