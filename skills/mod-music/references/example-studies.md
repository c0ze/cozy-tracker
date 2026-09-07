# What to learn from the examples

Choose a reference for a specific musical problem. Inspect its actual grid and
sound envelope before translating it to sample-only IT. This audit read all
73 local Drozerix modules structurally and examined selected patterns; it did
not establish perceptual quality by listening.

## Reference modules

Files are under `library/modules/drozerix/` when the optional library is installed.
The refreshed [corpus studies](../../../docs/corpus-studies.md) record reproducible
commands and corrections to the older claims.

| Need | Reference | Transferable decision | Translation trap |
|---|---|---|---|
| A restrained groove | `drozerix_-_this_is_how_we_do_it.xm` | Let a chord act as one gesture; vary bass ghosts and orchestration | Eight channels and multiple chord voices are not a four-voice ceiling |
| Economy in four channels | `drozerix_-_silicon_dancer.mod` | Time-share percussion, bass and echoes | MOD Cxx is volume; IT Cxx is a pattern break |
| A melodic chip hook | `her_kiss.xm` | Reuse melody with different articulation; continuous tick arps over held notes | Its XM instruments/envelopes and repeated effects are part of the sound |
| An aggressive riff | `drozerix_-_war_path.xm` | Short gates, accented repeated rhythm, tension before return | Speed 4 does not make 16 rows a 4/4 bar at the displayed BPM |
| Ambient space | `drozerix_-_sleepy_snow.xm` | Uneven phrase lengths, overlapping tails, short release cells | Fourteen channels; sample decay and XM envelopes cannot be inferred from empty cells |

The corpus median is 6 channels, 24 patterns, 28 orders, 9 samples and 124.93
seconds. Those values describe this collection, not musical requirements. Some
successful reference designs use few voices; others use long echoes and dense
voicings. Extract the relationship between roles, rhythm and articulation.

## Existing generated songs: study critically

These are structural findings from source and playback probes. The audit fixed
intended `==` endings to `^^` for ordinary looping samples, clipped helper echoes
with explicit cuts, and maintained Paper Hearts' lead arps across held rows.
That repairs execution; it does not certify the arrangements as finished music.

**Night Bus — useful groove, incomplete quality benchmark.**
The bass/percussion groove stays while chord voices give way to lead and echo.
`VOICING` retains C/E between its Am7 and Fmaj7 gestures, a concrete example of
common-tone voice leading. The short lead phrases have written space. However,
the old linter's “clean” verdict missed ordinary loops continuing after `==`.
Its low pluck bass also lasts longer than the declared 1.4 seconds when transposed
down. Several repeated sections change little beyond one stab or the lead line;
check whether the scene needs that steadiness or a more developed answer.

**Paper Hearts — techniques copied without their full behavior.**
The original reference's pattern 0, lead channel 1 rows 0–5, repeats XM 037 on
every row. The original generator wrote J37 only on the note row, then pulsed
volume: its “chord-carrying melody” became mostly a plain held note. This has
been corrected in `addPulse`. J49 on F plays F/A/D above it, not a voicing with
F on top. A “harp” single cycle still needs articulation; GFF does not supply a
harp envelope. A fixed D bass pedal against C and Am should be judged as deliberate
pedal harmony, not assumed to resolve like changing roots. At speed 3, its 64 rows
are two 4/4 bars; the four 16-row generator blocks are two beats each.

**First Light — a hook buried under accumulated layers.**
It has a recognizable short-short-leap gesture and an answering line. Later
patterns combine two detuned lead voices, echo/countermelody, arp, two pad voices,
bass and drums. The likely fatigue risk is simultaneous bright motion and sustain,
not lack of complexity. Try the hook with bass/drums first; introduce either a
brief echo or chord punctuation and compare at matched volume. The final key and
octave lifts are options, not a standard recipe for making a track “better.”
Top-level sample volume reductions did not lower explicitly stamped vNN notes.

**Siege Engine — strong rhythmic identity, weak breathing space.**
An octave-pulse bass, marching percussion, riff and drone all reinforce the same
energy. That can suit a threat cue, but the repeated motion needs a hierarchy and
contrast. Try removing the drone/arp during the riff and placing the answer in its
rests. Speed 4 changes the beat arithmetic: treat 16-row groupings as intentional
meter or rescale them before describing them as 4/4 bars.

**Winter Orbit — sparse onsets can conceal a dense sounding texture.**
Bells overlap into harmony, while looping sigh, pan-pair, drone and echo voices
can remain active after their last event. The exhale cell only addresses pad
channels, so inspecting that cell in isolation misses inherited voices. The source
also placed bass events at rows 40/41 of a 40-row bridge; these silently vanished.
The generator now avoids those invalid rows. Compare the source's full sustained
texture against its opening three-channel bell cell; decide which tails should
bridge a chord change and explicitly end the rest. Hard panning a semitone pair
does not erase its tension.

**Siege → Night — a useful handoff, not a continuous tempo-map importer.**
It uses E as a common/pivot pitch before settling into A minor. Inspect actual
order positions, tempo/speed stamps and the bass handoff. The merger now relocates
song B's order jumps, but its per-pattern clock/volume reset still limits songs
with persistent internal tempo maps. The adaptive runtime schedules from playback
updates, so section changes require an audition for attack timing.

**demo / akwf_test — plumbing fixtures.**
Use them to check compiling and sample import. They are not reference-quality
compositions or targets for arrangement density.

## A portable teaching song

[Lantern Walk](../../../songs/lantern_walk.gen.js) is an original G-major loop:
four channels, a rising pickup cell, a related answer, a quieter lower section,
and a return with a changed pickup. Its helper writes pitch, accent, held level
and cut together and throws on event collisions. The harmony sounds briefly then
leaves room for the melodic target. Its 64-row phrases at speed 6 are four bars.

Compile and render it, then try one controlled revision: alter the answer's rhythm,
move a bass pickup, or swap a chord gesture for an echo. Compare the phrase before
and after at matched volume. Passing its strict lint fixture validates supported
mechanics, not whether a listener prefers the music.
