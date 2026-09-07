---
name: mod-music
description: Use when composing, revising, analyzing, or rendering chiptune and tracker music with cozy-tracker, especially songs/*.gen.js, song JSON, and Impulse Tracker modules.
---

# Compose music with cozy-tracker

Make a memorable phrase with a clear foreground, supportive rhythm, and deliberate
note lengths. Tracker effects serve the phrase. A valid module is only the start.
Run commands from the repository root; resolve it from this skill's location if needed.

## Read for the task

- **New music or a weak tune:** [composition.md](references/composition.md).
- **Writing notes, samples, timing or effects:** [tracker-format.md](references/tracker-format.md).
- **Learning from the songs:** [example-studies.md](references/example-studies.md)
  selects references and identifies mistakes in the existing generators. Read one
  relevant study before borrowing a technique. The examples are not quality standards.
- **Runnable starting point:** [lantern_walk.gen.js](../../songs/lantern_walk.gen.js)
  demonstrates an original motif, answer, variation, explicit articulation and
  a loop using only synthesized samples. Adapt its decisions, not its melody.

## Work musically, then verify

1. Infer a short brief: scene/emotion, foreground or background, loop or ending,
   style, key, tempo, meter, and channel budget. Honor explicit user choices.
   State the grid: ticks/row, rows/beat, rows/bar, phrase length in seconds.
2. Write a short lead phrase with rhythm and rests before filling the arrangement.
   Give it an identifiable gesture and an answer. Test it with bass alone; fix a
   weak contour or cadence before decorating it. Keep the generator as source.
3. Assign roles and audible registers. Start with lead, bass, one supporting
   gesture and percussion; reduce competing motion when the lead enters.
   Extra voices need a musical purpose. This is a starting budget, not a ban on
   chords, counterpoint, longer echoes, dissonance, or ambient sustains.
4. Write articulation alongside pitch: attack, held level, release/cut, and the
   next note. Empty rows and empty channels do not silence a looping sample.
   Use `^^` to stop ordinary loops: `==` is not an amplitude ending in sample mode.
   Shape a single-cycle wave's volume explicitly; its name does not supply an envelope.
5. Develop the motif through a changed ending, rhythm, register or accompaniment.
   Include contrast and a planned return. Check every section boundary and the
   last-to-first seam, including sample tails and persistent volume/tempo/pan.
6. Generate, lint, compile, inspect the decoded pattern, and render:

   ```sh
   node songs/lantern_walk.gen.js
   node tools/lint.js songs/lantern_walk.json
   node tools/json2it.js songs/lantern_walk.json
   node tools/analyze.js build/lantern_walk.it --pattern 0
   node tools/render.js build/lantern_walk.it
   ```

   `lint --json` gives locations and timing; `--strict` fails on warnings **or
   incomplete simulation**. Fix errors; investigate warnings in musical context.
   Check clipping and silence, then audition the phrase, fullest section, transitions
   and repeated loop at comparable volume. If audio perception is unavailable,
   report structural/render evidence and explicitly leave listening unverified.
7. Revise the most consequential musical problem and re-render. Deliver source,
   `.it`, optional WAV, a short musical rationale and honest verification status.
   Consult `library/ledger.csv` before using external samples; the local library
   is optional and absent from fresh clones. Do not publish unless requested.
