# Writing chip music that holds up

## Choose a musical identity before a sound palette

A scene brief should affect musical choices. A quiet walking loop might use a
small rising gesture, an unhurried answer and a bass pickup. A danger cue may use
an insistent short rhythm, narrow pitch cell and dissonance that delays resolution.
“Cozy” does not require the same minor-key progression, bell sample or lo-fi drum
pattern for every request. Choose a specific character and preserve it when revising.

Use constraints as creative tools: two pulse-like voices, one rounded bass and a
shared percussion voice are one useful chip palette. Cozy-tracker is a sample-based
IT composer, not an NES/Game Boy hardware emulator. Do not claim hardware accuracy
without enforcing that hardware's actual voice, waveform and timing constraints.

## Compose a phrase you can recognize without the arrangement

Start with a short rhythmic identity: a pickup plus held note, two short notes and
a leap, or a repeated note answered by a descent. Give rhythm at least as much
attention as scale selection. Uniform eighth-note chord tones often sound like an
exercise because every note receives the same weight.

Write the phrase as a question and answer:

- Establish a cell, then repeat enough of its rhythm or contour to make recognition possible.
- Give the question an open ending, such as a held non-tonic chord tone.
- Make the answer related but more settled; land a stable tone with room after it.
- Place one local high point. An octave jump on every return stops sounding like a peak.

Strong-beat chord tones are a useful starting point. Passing tones, neighbors,
suspensions and chromatic approaches need a destination and an intentional duration.
An E over D minor can be a lovely ninth; holding it against an equally loud F in
the same register is a different choice. Diagnose that duration and voicing rather
than banning E or accepting every in-key note as equally stable.

Keep a phrase map near the generator: chord/bass target, lead goal, rhythm, and
what changes on its return. Do not generate a melody by randomly selecting scale
members and then rely on effects or a title to give it character.

## Give accompaniment something specific to do

Bass has two jobs: clarify harmony and make the groove. Start with stable roots,
then choose occasional fifths, pickups or stepwise approaches that point to the
next bass note. Vary the length and accent of repeated notes; a root-octave bounce
on every subdivision can erase the melody's phrasing. Audition the bass with the
kick, then with the lead. In the project's tuning, A-2 is 55 Hz; A-1 is 27.5 Hz.
A waveform down there may provide little useful bass on small speakers.

Voice leading makes a chord change coherent: retain common tones and move the
remaining voice to a nearby target when possible. Root-position arpeggios jumping
whole octaves at every bar can make all parts sound disconnected. Keep wide spacing
in the low register; test closer upper voicings according to the desired color.
Panning changes spatial placement, not harmonic friction, and mono playback reveals
what hard panning disguises.

A lead, a rapid arp, a moving bass and an echo can all compete for attention even
with only four channels. Count **independent moving lines**, not just tracks. Thin
or gate the accompaniment under the important notes; put answers in the lead's
rests. Conversely, several quiet sustained chord tones may behave as one gesture.
Do not mechanically delete harmony whenever a lead enters.

For a shared percussion channel, choose collisions deliberately: a snare replaces
a hi-hat or kick on that row and cuts the previous sample. Strong/weak accents and
one deliberate pickup often create more groove than adding another drum layer.
Use note delay only after defining the beat grid; keep its tick below the current
speed. Swing should move chosen subdivisions consistently, not randomize timing.

## Make a waveform behave like an instrument

A single-cycle “piano”, “flute” or “violin” contains a repeating timbre, not the
attack, decay or release of that instrument. A fixed-volume loop has an organ-like
sustain whatever the filename says. Author a short attack/accent, a softer held
level, and a tail or cut. The useful difference between a bass, lead and arp can
come from articulation and register before adding new samples.

Use a strong initial volume followed by lower explicit `vNN` stamps for a plucked
pulse. For a long lead, give its arrival a stable pitch and introduce shallow
vibrato on selected held rows. A glide is a transition between sounding notes;
it is not decoration to attach to every note. Check its target and speed in the
render. See the format reference for effect lifetime and sample-mode limitations.

Project synth pulses are centered to remove DC; noise has a repeatable seed.
Changing the seed makes a reproducible alternative drum texture. Lower the actual
note volumes or `mixvol` for balance: `sample.volume` only supplies the default
when a note does not override it.

## Use echoes as counterpoint

Compute the delay in beats and milliseconds. A one-row echo at speed 3 and 120 BPM
is 62.5 ms; four rows is 250 ms. Neither delay is universally correct. The former
may thicken the attack, while the latter becomes an audible answering rhythm.
Inspect what the delayed note sounds against **now**, particularly at chord changes.

Copy articulation as well as note starts, scale the actual event volumes, and
lower or shorten an echo that competes. Prefer selected phrase endings to an
uninterrupted duplicate of the whole melody. If a delay crosses a pattern boundary,
author its continuation or shorten it intentionally; do not silently drop the cut.
Test the combined phrase in mono. Adding a detuned double plus an echo plus a busy
arp is a major density change, not a free polish step.

## Arrange a return with a reason

An A / A′ / B / A″ loop is one practical sketch: state an idea, change its answer,
create contrast, and return with a clear resolution into A. A groove can repeat
verbatim when repetition serves the scene. A sparse ambient cue can use long held
notes and irregular phrase lengths. Corpus medians are observations, not quotas.

Do not make every final section louder, higher and busier simultaneously. Pick
one dominant source of contrast. A short rest before the hook can be more effective
than an extra pad. Check whether the final phrase points toward the first chord,
and whether the returning first note resets all the voices that should change.

For adaptive music, test the lowest layer set as a complete texture, then add the
next set. Each layer should have a role that remains intelligible when other
layers disappear. Section entry must not depend on an earlier pan or volume stamp.
The current runtime's boundary scheduling is approximate; audition transition
attacks rather than claiming sample-accurate section changes.

## A useful revision pass

Compare at similar perceived volume. Render metrics detect technical problems;
they do not measure a hook, warmth, groove, emotional fit or listener fatigue.

| Symptom | Inspect first | Small revision to try |
|---|---|---|
| Forgettable melody | Rhythm and ending of the naked lead | Repeat a recognizable cell; rewrite the answer and its rest |
| Mechanical motion | Identical note lengths/accents | Lengthen a target note; remove one pickup; change the answer's rhythm |
| Busy or tiring | Concurrent fast lines, bright sustained waves | Gate the arp under the hook; remove full-line echo; soften sustain |
| Thin or disconnected | Bass register and chord-to-chord movement | Raise inaudible bass; retain a common tone; simplify root motion |
| Droney or muddy | Real note tails across orders | Shorten the tail or explicitly fade/cut the conflicting voice |
| Abrupt loop | Last-to-first harmony, tails, timing/state | Add a pickup/rest; reset state; audition several repeats |

Audition the lead/bass reduction, full mix, transition and loop in the intended
context. Record one concrete criticism and the corresponding revision. If you
cannot hear the render, leave perceptual judgment open and provide the files;
do not describe measurements as a listening pass.
