# Corpus studies — Drozerix deep dives (July 2026)

Distilled from full pattern-level analysis of five PD modules
(via `tools/analyze.js`). Adopted in: `songs/paper_hearts.gen.js`,
`songs/siege_engine.gen.js`, `songs/winter_orbit.gen.js`, `songs/night_bus.gen.js`.
XM effects cited here map to IT as: 0→J, 3→G, 4→H, 9→O, A→D, 1/2→F/E, EC→SC.

## this_is_how_we_do_it.xm — minimal groove (109 BPM, speed 6, 8ch, 9 patterns)

The restraint masterclass: 5 instruments, no vibrato/porta/arpeggio effects at
all — all dynamics via volume and pan columns. 3-4 elements sounding at any
moment; the busiest bar has 5 and even then the lead physically replaces a
chord note. Two chords total (Fm7 3 bars → Gbmaj9 1 bar).

1. **Swap, don't stack**: budget 4 elements (bass, one chord gesture, drums,
   hat). A lead enters only by REPLACING something — the chord channels are
   deleted for the whole lead section.
2. **Write the death of every sustained note**: chords ring 8-16 rows then
   are re-struck or faded v07→v00 with `===` after; lead phrases end `===`
   plus a volume-fade tail. Nothing rings unattended, ever.
3. **One octave band per role, a buffer octave between**: bass oct 4,
   chords oct 5 (5 voices within ~14 semitones, spread by PAN not pitch),
   lead oct 7, percussion owns oct 6. Zero pitched overlap in the module.
4. **Echo is written, not left to ring**: bass ghosts = same note 1-2 rows
   later at v20/v10 with 9xx offset; lead clone 1 row late on a spare
   channel, with its own explicit fades.
5. **Vary repeats with pan/one-stab/fill, not new material**; E61 pattern-
   loop doubles patterns for free. 2 chords + 2 drum bars carry 97 seconds
   because sections mute different roles (drums-only / chords-only / lead-only).

## silicon_dancer.mod — 4-channel discipline (125 BPM, speed 6, 225s)

MOD, so no volume column: 9xx offset (635 uses!) and Cxx (589) do everything.

1. **Channel roles rotate per section**; within one pattern a channel serves
   two roles by INTERLEAVING (snare ghosts dropped into the bass line's
   rests — the bass is written around them). No channel owns drums.
2. **Row-0 kill**: first row of a pattern explicitly silences (C00) whatever
   the previous pattern left ringing. Standard hygiene.
3. **Gated chords**: looped chord sample retriggered C30→C00→C30→C00 as a
   rhythmic pulse — sustained sound, zero unattended ringing.
4. **Motion from parameters, not pitches**: hold one note and walk 9xx
   offsets (fake filter sweep), volume gates, instrument-retrigger + A0x
   pump. Busy texture with no new harmonic events.
5. **Perceived density**: same-channel echo (previous pitch repeated at C20
   on odd rows), cross-channel 2-3-row delay lines at 1/3 volume, ramping
   vibrato on long notes. At any instant only 1-2 channels move fast.
6. Deliberate ringing exists ONCE per section: a crash decaying into an
   empty half-pattern (D00 break) as a transition.

## her_kiss.xm — dense 4-channel melodic chip (128 BPM, speed 3, D aeolian)

Form: 48 orders, chorus-first (chorus stated quietly as the intro, delivered
loud later). Variation = re-orchestration of the SAME melody: porta/vibrato
lead → arp-chord version → calm long-note version. Ends with a global-volume
fade over a chorus repeat, then a loop jump — no cadence.

Key techniques:
1. **Liquid harp**: one channel plays a chord tone EVERY row (~17/s);
   first note of each phrase retriggers, all others carry 3FF (instant tone
   porta = glide, no retrigger); pan column walks p18→p28 per row.
2. **Chord-carrying melody**: every lead note gets the arpeggio effect for
   its triad, inversion chosen so the melody note stays on top
   (root 037/J37, 3rd-on-top J49/J38, 5th-on-top J58/J59); held notes get
   alternating v40/v10 volume stamps = built-in delay pulse.
3. **Bass-as-drums**: no drum channel at all. Octave-bounce root 8ths on a
   D pedal (rows 0,4,6,8,10,12,14 per 16-row bar), brighter instrument
   swapped in on the backbeat row; last 8 rows of nearly every pattern
   become an every-2-rows accent roll (the universal fill).
4. **Pedal harmony**: bass never leaves D for ~3 minutes; the i–VII–v drift
   (Dm→C→Am) happens entirely in melody arps and upper channels.
5. Cross-channel echo: lead replayed 4 rows later at ~65% volume on a
   channel that doubles as riser/faller at transitions (1xx/2xx sweeps,
   full glissando cascades via 3F0 chains).

## war_path.xm — aggressive 6-channel driver (144 BPM, speed 4, A aeolian)

Form: layer-additive build (drums → bass → dropout breath → riff → stabs
fading in v08→v28 a full pattern early) → theme A → strip-and-rebuild
breaks → theme B (wailing canon lead) → registral peak → climax adds
counterpoint density instead of height → finale cascade.

Key techniques:
1. **Choked octave-pulse bass**: note every 2 rows alternating root octaves,
   volume-column v10 stamp on the following row chokes each hit — a
   pounding staccato engine from one channel.
2. **Ghost-accent snare march**: snare on EVERY even row; accents (v30)
   placed to outline the kick's syncopation, ghosts (v18) between.
3. **War-horn drone + bVII turnaround**: one channel holds the root pedal
   the whole song (re-pumped with volume swells); the last 8–12 rows of
   most patterns drop bass+drone to bVII, snapping back at the seam —
   a built-in 4-bar tension/release cycle.
4. **8-row riff loop**: octave leap up then stepwise descent
   (A5|A6|E6 D6 C6 B5|G5 B5), every other note a ghost — repeated verbatim
   8× per pattern.
5. **Two-channel canon echo**: lead copied 2–3 rows later at ~half volume;
   works for slow porta wails (3xx+4A2) and fast 2-row descending chains.
6. **037-arp pump pad**: sustained root with minor-triad arpeggio buzz,
   volume re-stamped v38→v28→v18 in 2-row groups = sidechain-feel chord bed.

## sleepy_snow.xm — sparse ambient ballad (124 BPM, speed 12, A aeolian)

Form: symmetric arch — 8-row bookend cells open AND close the piece
(`0,0,8,8 … 0,0,8,8`); pattern lengths follow the phrase (4/8/16/32/40
rows); a 4-row all-note-off "exhale" cell sits between sections; E6x
pattern-loop doubles a section for free.

Key techniques:
1. **Slow clock + ring**: speed 12 (~242ms/row); one event per 2–8 rows;
   long-decay samples ring across empty rows — silence is the reverb.
   Half the channels are deliberately empty in early sections.
2. **Split arpeggio**: one arpeggio distributed across 3 bell channels
   (anchor on downbeats / ostinato every 4 rows offset +2 / answer on
   row 4) so successive notes overlap into a chord.
3. **Channel echo cascade**: each pad source channel has a partner that
   repeats every note 2 rows (~0.5s) later at v20, some with a third
   repeat at v10 — six channels forming a hard-wired delay line.
4. **Shimmer-hold vibrato**: sustained notes enter with 4A1 (fast, very
   shallow) and carry 400 (continue) on every held row — subtle constant
   motion, a poor man's chorus. ~90% of the song's 369 "vibrato" cells
   are continuations.
5. **Signature gestures**: hard-panned L/R semitone call-answer pair
   (p3C then p00 one row later); a porta-down (2xx) "sighing" pedal tone;
   final chords materialize at quarter volume (v10 echoes only).
6. Harmony: i↔bVII sway (Am↔G), one chord per ~4s; bVI (F) bridge with a
   long scalar descent handing back to i.
