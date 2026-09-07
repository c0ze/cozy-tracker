# Cozy-tracker authoring facts

These are the project's JSON/writer conventions. Foreign module grids use their
own pitch tuning and display conventions; copy the musical relationship, not the
printed octave or effect letter blindly.

## Time and pitch

Classic IT tick duration is `2.5 / bpm` seconds. A row has `ticks` ticks; a quarter
note has 24 ticks. With a quarter-note beat in 4/4:

| Speed (`ticks`) | Rows/beat | Rows/bar | 64 rows at 120 BPM |
|---|---:|---:|---:|
| 3 | 8 | 32 | 2 bars / 4 seconds |
| 4 | 6 | 24 | 2⅔ bars / 5⅓ seconds |
| 6 | 4 | 16 | 4 bars / 8 seconds |
| 12 | 2 | 8 | 8 bars / 16 seconds |

Choose meter and grid deliberately. “64 rows = four bars” is only true at speed 6
under this beat convention. A speed-4 composition may intentionally group 16 rows
as a different meter; state that interpretation. Tempo/speed effects change timing.
The repository WASM confirmed the 3/6/12 duration examples above in a rendered-module
probe. See [OpenMPT song properties](https://wiki.openmpt.org/Manual:_Song_Properties).

JSON notes are `C-0` through `B-9`, sharps `C#5` (never `C#-5`), plus `==` note-off
and `^^` hard cut. JSON sample indices are **zero-based**. The decoded IT grid
shows sample indices one-based. C-5 plays a sample at its `c5speed` rate. Synth
cycles, `loop:"cycle"` WAVs and synth plucks are tuned here so C-5 is 261.6256 Hz
(conventional middle C), one octave below scientific C5. A-5 is 440 Hz. Imported
one-shots can have a different root pitch; verify them before choosing a register.

`tools/analyze.js` also prints volume numbers in hexadecimal in its decoded grid:
JSON `v30` appears as `v1E`. Compare values numerically; do not feed those printed
digits back into decimal JSON volume/pan columns unchanged.

A one-shot's duration changes with playback pitch. For raw/WAV PCM:
`duration = frames / (c5speed * 2 ** ((noteNumber - 60) / 12))`.
A 1-second sample at C-5 lasts 4 seconds at C-3. Natural decay is not an automatic
short gate when that sample is transposed down. Its tail persists across patterns.

## Events and sample definitions

```js
{
  title: "Example", bpm: 120, ticks: 6, mixvol: 48,
  samples: [{name: "pulse", synth: {wave: "square", pulse: 0.25}}],
  channelnames: {0: "lead"}, order: [0],
  patterns: [{rows: 16, channels: [{
    0: {note: "D-5", instrument: 0, vol: "v36", fx: "J37"},
    1: {vol: "v24", fx: "J37"},
    2: {vol: "v16", fx: "J37"},
    3: {vol: "v08", fx: "J37"},
    4: {note: "^^"}
  }]}]
}
```

That gesture arpeggiates D/F/A for four rows while its amplitude falls. It is a
format example, not a complete composition. `patterns[].rows` is explicit (1–1024);
events outside it are errors. Maximum 64 channels, 254 patterns and 255 samples.
`order` is a list of pattern indices, not section numbers. Blank cells sustain
current state; a new pattern does not clear sample, note, volume or pan memory.

Samples choose one source:

- `synth:{wave:"sine"|"triangle"|"square"|"saw", pulse?, cycle?, volume?}`:
  repeating single cycle. `pulse` applies to square only.
- `synth:{wave:"pluck"|"noise"|"kick", seconds?, decay?, samplerate?, volume?}`:
  one-shot. Kick also accepts `freqStart`, `freqEnd`, `sweep`; noise accepts `seed`.
- `file:"library/…/sample.wav"`: path relative to the repository root. Omit loop
  for a one-shot; `loop:"cycle"` loops and tunes the entire waveform as one cycle;
  `loop:{start,end}` uses PCM-frame loop points, end exclusive.
- `samplerate:44100, channels:[[...]]`: raw mono/stereo finite float PCM.

Top-level `volume`, `c5speed`, `susloop` override derived sample settings; `detune`
is cents. **Default sample volume is not an independent gain stage:** a note's
`vol:"v40"` replaces it. Change event volumes or `mixvol` to turn down notes that
already stamp volume. This was verified by identical float renders with sample
volume 16 vs 64 when both notes used v64.

This writer uses sample mode: no IT instruments, envelopes or NNA. XM instrument
envelopes do not transfer simply by copying note/effect rows. Use authored volume
shapes or a decaying sample. **`==` does not stop an ordinary looping sample in this sample-only engine.**
A libopenmpt probe confirmed that it kept playing at full level after key-off.
Use `^^` for a guaranteed endpoint; fade first if the abrupt cut clicks. A sustain
loop can release into its tail on `==`, but that does not supply an instrument envelope.

## Effect lifetime, not just effect names

`vol` values are **decimal**: v00–v64 volume, p00–p64 pan (p32 center);
a/b fine up/down and c/d regular up/down volume slides take 0–9. `fx` uses a
letter plus two **hex** digits: T78 is 120 BPM, X80 is near center. A printed XM
`p18` can be a hexadecimal display; do not paste its digits as decimal JSON pan.

The following summaries were checked against the [IT effect reference](https://wiki.openmpt.org/Manual:_Effect_Reference#IT_Effect_Commands)
and the vendored writer. For unusual commands, consult the IT table and render a probe.

| Command | Authoring use |
|---|---|
| Jxy | Base, +x, +y semitones cycle on ticks. Stamp it on every intended arp row. |
| Hxy / H00 | Start vibrato / call its remembered settings on subsequent rows. |
| Gxx / G00 | Slide an already sounding note toward a target; continue on chosen rows. |
| D0y | Reduce volume on noninitial ticks of this row. Repeat for a longer fade. |
| SCx / SDx | Cut / delay within the row; choose `1 <= x < ticks`. |
| Axx / Txx | Set speed / tempo (T20 or higher sets tempo; smaller values slide). |
| Vxx / Wxy | Global volume / its slide; reset deliberately when returning to a loop. |
| Bxx / Cxx | Jump to an order / break to a row in the next order. |

Effect memory retains a **parameter**, not automatic execution on blank rows.
At speed 6, D01 normally subtracts five volume units on its stamped row. D01 on
rows 8, 16 and 24 is three small steps, not a continuous fade over sixteen rows.
Use explicit v32→v24→v16→v08→v00 stamps when a predictable envelope matters, then cut.

Arpeggio offsets are **upward**. D-5 J37 plays D5/F5/A5. F-5 J49 plays F5/A5/D6:
F is the base, not the top. To keep a melodic F on top, a suitable lower base
might be A-4 with J58 (A4/D5/F5). Derive actual pitches and listen: changing base
also changes which note lands on each tick. Do not call every J49 a “third-on-top”
voicing without naming the sounding pitches.

## Tools and limits

```sh
node tools/lint.js songs/example.json --json
node tools/json2it.js songs/example.json build/example.it
node tools/analyze.js build/example.it --pattern 0
node tools/render.js build/example.it build/example.wav --rate 48000
```

`lint` validates syntax and simulates the written order list, inherited samples,
note endings, pitch-scaled one-shot lengths, row tempo/speed, arpeggio ticks and
basic volume shapes. Its interval/density warnings are review prompts, not bans
on tensions or large ensembles. Drum inference uses sample names or
`role:"percussion"`. Tail estimates use the PCM length, not a loudness threshold.

Portamento/vibrato pitch motion, global/channel gain, offsets/retriggers,
sustain-loop release, flow jumps/loops/delays and adaptive paths are not fully
simulated. The report names encountered effect families outside its model.
`--strict` returns nonzero for warnings or partial analysis; errors always fail.
For those cases use actual libopenmpt renders and inspect the relevant passage.
Do not weaken a song merely to satisfy a heuristic.

`render` plays a module once and may include a release/ramp tail beyond its
musical duration. `analyze` reports the module's nominal timeline. Exporting a
WAV does not automatically make a seamless PCM loop; determine the musical sample
boundary and audition it. `.it` looping and rendered-tail playback differ.

The optional AKWF and Saga Musix assets are not part of a fresh clone or the
public editor's deployed library. Start with synthesis if absent. Follow the
actual license/provenance in `library/ledger.csv`; Saga Musix's permission is not
identical to a CC0 declaration. Learn composition from reference modules without
assuming their embedded samples are cleared for reuse.

`songs/lib.js` provides `mel` (tuples `[row,note,volume?,fx?]`) and `echo`.
`echo` defaults to cutting a delayed phrase at the last pattern row when its
ending would fall outside. Choose `boundary:"carry"` only when explicitly writing
the continuation in the next pattern. The new teaching song's duration helper
also refuses event collisions instead of overwriting a note or its cut.

For authored envelopes use `echoChannel`, which accepts the full event map instead
of melody tuples. It preserves volume-only rows, effects and cuts, scales vNN
stamps, and leaves pan and relative slide parameters intact:

```js
import { echoChannel } from './lib.js'; // from a songs/*.gen.js file
const lead = {
  0: {note: 'D-5', instrument: 0, vol: 'v32', fx: 'J37'},
  1: {vol: 'v16', fx: 'J37'},
  2: {note: '^^'},
};
const delayed = echoChannel(lead, {delay: 4, scale: 0.4, rows: 64});
```

Do not feed `[row, undefined, volume]` into `mel` or tuple-based `echo`; those
helpers expect note names. Use event maps when copying a performed volume shape.
