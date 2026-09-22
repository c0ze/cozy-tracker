# Gpt-6 Astra — four chip compositions

Created by **Gpt-6 Astra**, 2026-09-23. Original melodies, arrangements and
synthesized sample palettes. These are Impulse Tracker (`.it`) modules, the
repository's native output format. No reference-module audio was extracted.

| Track | Character | Key / meter | BPM / speed | Rows per beat / bar / phrase | Nominal length |
|---|---|---|---|---|---|
| [Pocket Tram](../songs/pocket_tram.gen.js) | Syncopated chip-pop, four voices | Bb major, 4/4 | 132 / 6 | 4 / 16 / 64 | 72.727s |
| [Copper Kite](../songs/copper_kite.gen.js) | Clipped pulse chase, five voices | E Dorian, 4/4 | 150 / 3 | 8 / 32 / 128 | 76.800s |
| [Moth Clock](../songs/moth_clock.gen.js) | Winding melody and ticking waltz, four voices | D minor, 3/4 | 112 / 6 | 4 / 12 / 48 | 77.143s |
| [Glass Harbor](../songs/glass_harbor.gen.js) | Spacious nocturne, five voices, no percussion | F major, 4/4 | 90 / 6 | 4 / 16 / 64 | 85.333s |

Each phrase contains four bars, lasting respectively 7.273, 6.400, 6.429 and
10.667 seconds. Total written duration is about **5:12**. The module messages,
generator headers, demo list and jukebox all record the creator. The `.gen.js`
files are authoritative; `songs/astra.js` supplies only mechanical articulation
and pattern helpers. The six frozen reference songs were not modified.

## Original-module studies

Read both music skills and their composition, format, example-study and chip
idiom references, then decoded the actual local Drozerix modules with
`tools/analyze.js --json` and `--pattern`. The existing generated compositions
were not used as melodic templates. Row and channel numbers below are zero-based;
sample numbers in decoded grids are one-based.

| Original module / inspected pattern | Observed behavior | Applied decision |
|---|---|---|
| `drozerix_-_silicon_dancer.mod`, p4 | Channel 0 runs successive sample offsets `900` through `91E`, then reverses. Channel 3 changes from sample `0A` at row 0 to `05` at row 4, with `C20`/`C10` volume steps at rows 2/3. | Four voices can change roles and articulation. Pocket Tram and Moth Clock share percussion channels and explicitly shape volume; they do not copy the sample-offset texture. |
| `her_kiss.xm`, p0 | Channel 1 repeats `037` through rows 0–5 while alternating volume; `058` runs at 6–11, then `049` at 12–15. | A chord arp is a row-by-row performance. Every held chord-arp row in the new batch restamps IT `J`; upward intervals are calculated from the actual base. |
| `drozerix_-_war_path.xm`, p0 | Channel 2 notes at rows 2, 4, 10 and 12 are released on the next row. Channel 0 introduces a descending pickup at 56–63. | Copper Kite uses short gates, unequal accents and a late introductory pickup, followed by a broader middle melody. Its meter is independently defined. |
| `drozerix_-_sleepy_snow.xm`, p0 and p3 | p0 staggers entrances at rows 0/2/4/6. p3 releases only channels 8–13, leaving the first eight untouched. | Glass Harbor builds harmony with staggered entrances and controlled tails. All sample-mode loops get authored volume decay and `^^` endings. |

Reproduce these reads when the optional library is installed:

```sh
node tools/analyze.js library/modules/drozerix/drozerix_-_silicon_dancer.mod --pattern 4
node tools/analyze.js library/modules/drozerix/her_kiss.xm --pattern 0
node tools/analyze.js library/modules/drozerix/drozerix_-_war_path.xm --pattern 0
node tools/analyze.js library/modules/drozerix/drozerix_-_sleepy_snow.xm --pattern 0
node tools/analyze.js library/modules/drozerix/drozerix_-_sleepy_snow.xm --pattern 3
```

These are structural observations. Listening to the reference modules did not
occur in this session.

## Motifs and development

- **Pocket Tram:** F–Bb–D is the pickup/leap gesture, followed by a longer target
  and a short high pickup. The first answer leaves F open; the related answer
  settles on Bb. Bb–Gm–Eb–F supports the hook; Cm starts the lower side-street
  section. The return changes the high ending, without doubling the melody.
- **Copper Kite:** E–E–B attacks fall at eighth-note positions 0, 3 and 6.
  The A-major bar's C# makes the Dorian color explicit. Em–D–A–Bm accompanies
  the question; Em closes the answer. The G-major middle uses long notes,
  followed by exposed bass machinery and a staged melodic re-entry.
- **Moth Clock:** short A–D steps climb to a held F; the occasional A above it
  is the local high point. Dm–Gm–Dm–A gives way to Bb–F–C–A in the middle.
  Chords on beats two and three identify the waltz. The final A-major phrase
  supplies C# and a breath before returning to D minor.
- **Glass Harbor:** a separated C–A gesture answers with F; D–F provides the
  upward second half. The Dm–Bb–Gm–C middle broadens the note lengths. A lower
  triangle reflection takes over in the interlude. The final return echoes
  only two stable cadence notes, while removing an upper accompaniment voice.

## Revisions and verification

The first score review found Pocket Tram's chord punctuation overlapping the
answer's C against Bb. Moving it from row 13 to row 14 places it after the
melodic cut. Glass Harbor's return initially accumulated five pitched voices;
the echo now replaces the upper reflection in its two bars. Copper Kite's
50% pulse bass had much more energy than the narrow lead, so its actual note
volumes were reduced to 72% before the final render. These are score/measurement
based revisions, not claims of audible improvement established by listening.

Validation on the final batch:

- Strict lint: zero errors, warnings or simulation limitations for all four.
- Decoded all compiled patterns; inspected hook onsets, decimal-to-hex volume
  conversion, held `J` rows, sample indices, entry cuts and final release rows.
- Rendered full mixes and lead/bass reductions of the first question/answer
  with the repository's libopenmpt at 48 kHz.
- Simulated two copies of each order list with zero seam warnings. Also rendered
  the real modules with libopenmpt repeat count 1: one musical restart and two
  complete cycles, with no clipping or silent output. Every looping sample has
  a written endpoint. The short boundary breaths are part of the score.
- Read `message` back from each binary module to confirm the Gpt-6 Astra credit.
- `npm test`: all 76 tests passed, including portable generator reproduction
  and unchanged frozen-reference JSON. `npm run build` passed.

| Final full render | WAV seconds, including renderer tail | Peak dBFS | RMS dBFS | Clipped samples |
|---|---:|---:|---:|---:|
| Pocket Tram | 72.82 | -6.1 | -22.3 | 0 |
| Copper Kite | 76.90 | -5.1 | -22.4 | 0 |
| Moth Clock | 77.21 | -5.8 | -21.9 | 0 |
| Glass Harbor | 85.41 | -10.0 | -23.7 | 0 |

First-hook versus quiet-middle section RMS was -21.6/-23.6 dBFS for Pocket
Tram, -22.1/-22.9 for Copper Kite, -21.1/-22.8 for Moth Clock and -23.0/-25.5
for Glass Harbor. Copper Kite's contrast is primarily rhythm and articulation;
its level change is modest. Tracker tick rounding accounts for small differences
between calculated duration and libopenmpt playback duration. WAV exports include
a renderer tail and should not be treated as sample-trimmed seamless PCM loops.

**Listening did not occur.** Audio perception was unavailable. Melody, timbre,
mix comfort and the perceived loop seam still need a human audition; healthy
RMS and clean lint do not certify musical quality.

## Build and play

The checked-in [Pocket Tram](../demos/pocket_tram.it),
[Copper Kite](../demos/copper_kite.it), [Moth Clock](../demos/moth_clock.it) and
[Glass Harbor](../demos/glass_harbor.it) modules play without the sample library.
They are available in the repository's jukebox and individual browser players.

From the repository root:

```sh
for song in pocket_tram copper_kite moth_clock glass_harbor; do
  node "songs/$song.gen.js"
  node tools/lint.js "songs/$song.json" --strict
  node tools/json2it.js "songs/$song.json"
  node tools/analyze.js "build/$song.it" --pattern 1
  node tools/render.js "build/$song.it"
done
npm test
npm run build
```

This regenerates editable JSON and local `build/*.it` / `build/*.wav` artifacts.
To update the shipped batch after a reviewed revision, copy just these four
compiled modules from `build/` to `demos/`. Do not regenerate the frozen demos.
