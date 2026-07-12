---
name: mod-music
description: Compose, edit, render, and analyze Impulse Tracker (.it) module music in this project. Use when writing or modifying songs (songs/*.json), working with the sample library, analyzing tracker modules, or embedding module music in games.
---

# mod-music: composing tracker music

## Pipeline & tools

```sh
node tools/json2it.js songs/<name>.json        # compile → build/<name>.it
node tools/render.js build/<name>.it --stats-only   # verify: duration/peak/RMS/clipping
node tools/render.js build/<name>.it           # also writes build/<name>.wav
node tools/analyze.js <module>                 # structure + stats of any .it/.xm/.mod
node tools/analyze.js <module> --pattern N     # print pattern N as a tracker grid
node tools/analyze.js --corpus <dir> --out build/analysis/x.json
```

Browser player (human listening): `python3 -m http.server 8123` →
`http://localhost:8123/player/`, load `../build/<name>.it`.
Human editing: Schism Tracker opens/saves the same `.it` files.

**Always verify after composing:** compile, then `render --stats-only`, then
`node tools/lint.js songs/<name>.json` — the lint MUST be clean before a song
is done. It simulates note durations and flags forgotten sustains, register
clashes (seconds/b9 between ringing notes), and overcrowding.
Healthy render targets: peak −6..−1 dBFS, no clipped samples, RMS −18..−10 dBFS.
If peak > 0 dBFS, lower `mixvol` or per-sample `volume`.

## RESTRAINT RULES (Arda's feedback — non-negotiable)

Past songs failed on two counts: too many things happening at once, and
notes left ringing that clash with later notes ("a note does not only exist
where it begins"). The rules, validated by the corpus studies:

1. **Swap, don't stack.** Budget ~4 elements: bass, ONE chord gesture,
   drums, hat. A lead enters only by REPLACING something (drop the chords
   for the lead section). Never add a 5th layer onto an intact 4.
2. **Write the death of every sustained note at composition time.** Looped
   samples ring FOREVER: every such note needs `==`, a fade, a re-strike,
   or a next note within ~16 rows. Keep sustains short by default.
3. **Register bands with buffer octaves.** Bass in one octave, chords in
   one octave band (spread voices by PAN, not pitch), lead 1-2 octaves
   above the chord top. Know what is ringing in a register before adding
   a note there.
4. **Echo is written, not left to ring**: clone 1 row late at ~45% volume
   with its own note-ends (2+ row delays clash with moving lines).
5. Two chords can carry a whole song; vary repeats with pan, one added
   stab, or a fill — not new material.

## Song JSON format

itwriter structure (full reference: `vendor/itwriter/UPSTREAM-README.md` + `example.js`):

```jsonc
{
  "title": "...", "bpm": 125, "ticks": 6,     // ticks = IT "speed": rows/beat = 24/ticks at given bpm
  "mixvol": 72,                                // 0-128, keep ≤80 to avoid clipping
  "message": "optional song message",
  "samples": [ /* see below */ ],
  "channelnames": { "0": "kick" },
  "order": [0, 1, 0, 2],                       // pattern indices, patterns may repeat
  "patterns": [{
    "rows": 64,
    "channels": [                              // array index = channel
      { "0":  { "note": "C-5", "instrument": 0, "vol": "v64" },   // row → event
        "4":  { "note": "==" },                // note OFF (release)
        "6":  { "note": "^^" },                // note CUT (hard stop)
        "8":  { "note": "G-5", "instrument": 0, "vol": "v48", "fx": "SD1" } }
    ]
  }]
}
```

- Notes: `C-5`..`B-9`, sharps as `C#5` — ALWAYS 3 chars, never `C#-5`/`F#-4`
  (itwriter parses `note[2]` as the octave; a dash there silently becomes C-0).
  **C-5 plays samples at their C5Speed**; our single-cycle convention tunes
  C-5 = middle C (261.6 Hz).
- `instrument` is **0-based** in JSON (itwriter converts to 1-based IT).
- `vol` column: `v00`-`v64` volume, `p00`-`p64` pan; also `a/b/c/d` vol-slides, `g` tone-porta.
- `fx`: IT effect string, letter+2 hex digits. Common IT effects:
  `Jxy` arpeggio (chip chords!), `Dxy` vol slide (D01 fade out), `EFx/FFx` porta down/up,
  `Gxx` tone portamento, `Hxy` vibrato, `SDx` note delay, `SCx` note cut after x ticks,
  `Qxy` retrigger, `Oxx` sample offset, `Axx` set speed, `Txx` set tempo, `Cxx` pattern break.

### Samples (three declaration styles)

```jsonc
{ "name": "bass",  "synth": { "wave": "square", "pulse": 0.25, "volume": 42 } },
  // waves: sine|square|saw|triangle (single-cycle, auto-looped, C-5 = middle C)
  //        noise (seconds, decay) | kick (seconds, freqStart, freqEnd) — one-shots
{ "name": "flute", "file": "library/samples/akwf/AKWF/AKWF_flute/AKWF_flute_0011.wav",
  "loop": "cycle", "volume": 34, "detune": -4 },
  // loop:"cycle" = loop whole file as single-cycle waveform, auto-tuned
  // loop:{start,end} for sampled instruments with loop regions; omit for one-shots
  // detune (cents): load the same file twice at ±4 and play both on two
  // channels panned L/R for a fat chorus lead
{ "name": "raw", "samplerate": 44100, "channels": [[/* floats -1..1 */]] }
```

Constraint: **sample mode only** (no IT instrument envelopes yet). Looping
samples sustain FOREVER — every looped-sample note needs an explicit end:
`==`/`^^`, a new note on the channel, or a `D0x` fade. One-shots (drums) don't.

## Sample library

- `library/samples/akwf/AKWF/<family>/` — ~4k PD single-cycle waveforms.
  Families: `AKWF_bw_saw|squ|tri|sin` + `bw_perfectwaves` (basics), `AKWF_flute`,
  `AKWF_epiano`, `AKWF_piano`, `AKWF_eorgan`, `AKWF_violin`, `AKWF_stringbox`,
  `AKWF_aguitar`, `AKWF_altosax`, `AKWF_0001..0065` (numbered misc). Always `"loop": "cycle"`.
- `library/samples/sagamusix/` — real drums & material: `bass_drums/` (kicks),
  `drums/` (snares, claps, hats, cymbals), `tr-808/`, `tr-909/`, `bass/`, `synths/`,
  `pads_strings/`, `fx/`, `powerchords/`. One-shots; use without loop.
- `library/modules/drozerix/` — 73 PD modules for study (`analyze.js`), mostly XM chip.
  Analysis dump: `build/analysis/drozerix.json`.

## Composition guidelines (from Drozerix corpus analysis, 73 modules)

Structure:
- **64-row patterns** are the standard (72/73 modules). 32 for half-length sections.
- Median song: ~28 order entries, ~24 unique patterns, ~2 min. Patterns are reused
  sparingly (reuse ratio ~1.2) — prefer *writing variations* over repeating patterns;
  repeat a pattern at most twice, then vary melody, drop a layer, or change bass.
- Arrange sections: sparse intro (pad/bass only) → theme → variation (add
  countermelody/echo) → break (drop drums) → theme reprise. Order lists like
  `[16,0,1,2,17,3,5,4,6..15,14,6..11]` show intros/breaks as dedicated patterns.
- Tempo: median 128 BPM (range ~110-160 typical). Speed (ticks): 3 = fast/smooth
  (30 modules), 6 = classic (19). Fewer ticks/row = finer timing resolution per row.

Channels & instruments:
- 4-6 channels cover most songs (median 6); ~9 samples. Small palettes, used hard.
- Give each channel a stable role and name it: bass, lead, harmony/arp, drums (1-2),
  echo. Drums often share one channel (kick+hat interleaved) in 4ch songs.

Idioms that make it sound like tracker music (all seen in corpus):
- **Arpeggio effect for chords**: one channel plays `Jxy` (e.g. `J47` = root+4+7
  semitones cycling per tick) instead of spending 3 channels on a triad.
- **Echo channels**: copy the lead 2-4 rows later at lower volume with different pan
  (`v32` + `p10` vs lead `p40`). Corpus shows chains panned progressively p00→p1C.
- **Staccato**: `==`/`^^` 1-2 rows after short notes; don't let everything ring.
- **Volume-column fades**: sustained notes get `d01`-`d04` on following rows.
- **Pan the arrangement**: vol-column `pXX` per channel (bass center, leads spread).
- **Hat variation**: alternate `v40`/`v28` accents; `Oxx` sample offset for texture.
- Bassline: root 8ths alternating octaves (A-2/A-3), approach notes into chord
  changes (row 30 walks to next root). Kick every 4 rows at speed-6/64-row grid.

Effect frequency in corpus (XM letters → IT equivalent): arpeggio 0→`J` (by far #1),
vibrato 4→`H`, tone porta 3→`G`, set vol C→vol column, vol slide A→`D`, porta 1/2→`F/E`.

## Deep-dive technique library

`docs/corpus-studies.md` holds pattern-level studies of five Drozerix
modules with adoptable recipes: **this_is_how_we_do_it** (RESTRAINT: swap
don't stack, written note-deaths, register bands — read this one first),
**silicon_dancer** (4ch discipline: row-0 kills, gated chords, motion from
parameters, interleaved dual-role channels), **her_kiss** (melodic chip-pop:
liquid-harp channel, chord-carrying melody, bass-as-drums, chorus-first
re-orchestration), **war_path** (aggressive: choked octave bass,
ghost-accent snare march, drone + bVII turnaround, canon echo, pump pad),
**sleepy_snow** (ambient: slow clock, split arpeggios, channel echo
cascades, shimmer-hold vibrato, phrase-length patterns, exhale cells).
Read it before composing; reference implementations live in songs/*.gen.js —
night_bus.gen.js is the restraint-rules reference (lint-clean).
Shared note-math/melody helpers: songs/lib.js. Synth waves now include
"pluck" (tuned music-box bell with natural decay).

## Composing full tracks: use a generator script

Hand-writing 64-row × 10-channel patterns as JSON does not scale. Write a
small Node script (`songs/<name>.gen.js`, see `songs/first_light.gen.js`)
that emits the song JSON: hand-author melodies as `[row, note, vol, fx]`
lists; build drums/bass/arps/pads with helper functions; derive echo and
harmony channels by transforming the melody (delay + volume scale +
transpose). Keep note-name helpers that handle sharps correctly. More
arrangement tricks that worked: whole-step key change for the final
sections (with a build pattern on the new key's dominant), dual detuned
leads, pad + pad-a-fifth-up panned apart.

## Licensing rules

- AKWF, Saga Musix samples, Drozerix modules: cleared, see `library/ledger.csv`.
  New assets MUST get a ledger row (source URL, author, license, date).
- `library/corpus/` (if populated later) is analysis-only — never sample or ship it.
- Old modules' embedded samples may be unlicensed rips even in PD modules — the PD
  grant covers pattern data. Rebuild timbres from AKWF/Saga instead of extracting.
- Shipping `.it` files ships extractable PCM — only CC0/PD samples go into modules.

## Game embedding

Same `.it` plays bit-identically everywhere via libopenmpt: web = `chiptune3`
(vendored in `player/vendor/chiptune3/`), Godot = godot-openmpt GDExtension,
SDL/native = libopenmpt C API, SDL_mixer ≥2.6 = libxmp. Ship `build/*.it`.
