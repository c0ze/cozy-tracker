# The SID driver and its data

`sid/driver.s` + `sid/voice.s` is a 3-voice SID music driver with sound effects on voice 3, written for cozy-tracker (ISC, like the rest of the repository). `tools/sid-compile.js` turns a song JSON into this data, appends it to the driver source and assembles both with `tools/asm6502.js`.

Design follows Cadaver's "Building a musicroutine" (covert bitops rants, `music.html`):
- hard restart the "old" way (§2.6.1): the gate is cleared and ADSR set to 0 two frames before a new note, and a note starts by writing waveform, attack/decay, sustain/release in that order;
- ghost registers written every frame (§1.1);
- a combined waveform/arpeggio table per instrument (§2.5);
- sound effects interrupt voice 3 while the music keeps its timing underneath (§2.9).

## Entry points (at the load address)

| Offset | What |
|---|---|
| +0 | `jmp init`: A is ignored. Starts at order `start_order`. |
| +3 | `jmp play`: call once per PAL frame (50 Hz). |
| +6 | `jmp sfx`: A = effect number. Safe to call from the main loop while `play` runs in an IRQ. |
| +9 | `start_order`: written by the host before `init`. |
| +10 | `mute`: bit n silences voice n (bit 2 also silences effects). |
| +11, +12 | `cur_order`, `cur_row`: the row playing now, for the host to read. |

## Frame

1. `tick` advances. On tick 0 the pending row (fetched earlier) is applied.
2. On tick `max(1, speed - HR_FRAMES)` the next row is fetched: the order position advances, each voice's track is decoded into pending state, and a voice with a new, non-legato note gets its hard restart now.
3. Each voice runs its wavetable, arpeggio, slide, vibrato and pulse, and its 7 registers are written.
4. The filter runs and `$D415`-`$D418` are written.

## Track bytes (one track per voice per pattern)

| Byte | Meaning | Ends the row |
|---|---|---|
| `$00`-`$5F` | note (0 = C-1 in cozy-tracker names, 48 = C-5) | yes |
| `$60` | key off (gate off) | yes |
| `$61` | note cut (gate off, ADSR 0) | yes |
| `$62`+n | empty row, then n more empty rows (n = 0..29) | yes |
| `$80`+i | instrument i (0..31) for this row's note | no |
| `$A0`+s | sustain level s (0..15) for this row's note, from the volume column | no |
| `$B0`+f, p | effect f with parameter p | no |

Prefixes come in this order: effect, instrument, volume, then the note. A row whose note needs a hard restart therefore never begins with a `G` effect.

Effects: 1 arpeggio (`J`), 2 slide up (`F`), 3 slide down (`E`), 4 tone portamento (`G`, legato: no restart), 5 vibrato (`H`), 6 speed (`A`), 7 jump to order (`B`), 8 break to the next order (`C`). Parameters of 0 have already been replaced by the channel's last parameter (effect memory resolved at compile time).

## Wavetable

`wt_wave`/`wt_note` pairs, one step per frame from the instrument's start:
- `wt_wave`: waveform bits for `$D404` without the gate (the driver owns the gate), or `$FF` for a jump.
- `wt_note`: `$00`-`$3F` up 0..63 semitones, `$40`-`$7F` down 64..1, `$80`+n absolute note n. After a `$FF` wave, it is the step to jump to (executed in the same frame), or `$FF` to hold the last step.
