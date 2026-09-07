# Corpus studies — rechecked September 2026

The local collection contains 73 Drozerix modules. Reproduce the structural sweep:

```sh
node tools/analyze.js --corpus library/modules/drozerix --out build/analysis/drozerix.json
node tools/analyze.js library/modules/drozerix/her_kiss.xm --pattern 0
node tools/analyze.js library/modules/drozerix/drozerix_-_sleepy_snow.xm --pattern 3
```

Median: 124.93 seconds, 6 channels, 24 unique stored patterns, 28 order entries,
9 samples. Speeds: 3 in 30 modules, 6 in 19, 4 in 10, other values in 14.
These describe one composer's corpus. They are not quotas or evidence that
particular channel counts, repetition rates or tempos cause musical quality.

## Pattern evidence and adaptations

| Module | Tempo / speed | Channels | Orders / patterns | Nominal seconds |
|---|---|---:|---:|---:|
| this_is_how_we_do_it.xm | 109 / 6 | 8 | 9 / 9 | 96.80 |
| silicon_dancer.mod | 125 / 6 | 4 | 32 / 28 | 224.64 |
| her_kiss.xm | 128 / 3 | 4 | 48 / 33 | 174.59 |
| war_path.xm | 144 / 4 | 6 | 38 / 27 | 165.77 |
| sleepy_snow.xm | 124 / 12 | 14 | 21 / 10 | 87.03 |

For exact filenames, the first, second, fourth and fifth are prefixed
`drozerix_-_` in the local directory. Row indices below are decimal; displayed
XM/MOD effect parameters remain hexadecimal. Channels are zero-based.

### This Is How We Do It: repeated harmony with moving rhythm

Pattern 0 begins with bass on channel 0, a five-voice upper chord across channels
1–5, and rhythmic voices on 6–7. The chord is rearticulated at rows 16, 24, 32,
48, 56 and 60; the harmony changes at 24 and 56. Bass events at rows 12–14 and
44–46 show quieter repeated notes with sample-offset changes. Row 63 contains E61,
a MOD/XM pattern-loop command, so the order list alone is not the complete form.

Transfer the common-tone chord gesture and bass ghost rhythm. The old study's
“no overlap,” “four elements means four sounding pitches,” and universal buffer
octaves were overstatements: this pattern has five chord voices plus bass, and
some bass/chord note registers overlap. Sample tuning and instruments matter.

### Silicon Dancer: sharing four voices

The four-channel MOD uses abundant Cxx volume and 9xx sample-offset commands
(589 and 635 effect cells respectively in the structural sweep). Those controls
let a small palette change articulation/texture without adding a fresh line.
Inspect a chosen phrase's channel swaps before adapting it. Sharing a channel
means the new note replaces the previous sound; compose rests around that theft.
MOD Cxx is **not** IT Cxx. Its volume function should become JSON vNN; IT Cxx
breaks a pattern. A count of offset commands does not describe their audible effect.

### Her Kiss: an arpeggio is performed on every held row

Pattern 0 channel 1 starts D-7 with 037 and alternates volumes while repeating
037 through row 5. A-6/058 follows at rows 6–11, then F-6/049 at 12–15. Channel 3
contains a rapidly moving line with 3FF on many notes and changing pan; channel 2
uses many 6xx continuation rows. The synthesis depends on all those held-row
commands and XM instrument behavior, not just the first note's effect.

In IT, repeat J on the held rows, and design the envelope separately. Arpeggio
offsets rise from their base: F +4/+9 produces F/A/D, so F is not the highest pitch.
Choose actual sounding notes before attaching labels such as “melody on top.”
The 64 rows at speed 3 are two bars under a quarter-note/4/4 interpretation.

### War Path: accent and gate create the drive

Pattern 0 opens by releasing several channels, while channels 2–3 provide short
rhythmic events and volume slides/retriggers. Channel 2 ends many hits on the next
row. The descending pickup on channel 0 at rows 56–63 prepares the next pattern.
The contrast between fixed rhythm, choked articulation and a late pickup is a
more useful recipe than simply adding a drone, riff, canon and arp simultaneously.
At speed 4, 16 rows span 2⅔ quarter notes; a 16-row generator block needs an explicit
meter/tempo interpretation before it can be called a 4/4 bar.

### Sleepy Snow: tails and releases are part of the score

The module has 14 channels but only 3 samples and 3 instruments. Pattern lengths
are 4/8/16/32/40 rows, shaped to its sections. Of its 369 vibrato cells, many are
held-row continuations. Pattern 3 is a four-row cell: row 0 releases channels
8–13 while earlier channels remain untouched. It is not an all-channel silence.

The overlapping tail is the harmony. In sample-only IT, copying a release marker
from an XM instrument is insufficient: an ordinary looping sample ignores key-off
as an amplitude ending. Recreate the envelope with volume and cuts, or deliberately
use one-shots with known pitch-scaled tails. Long delays and sparse overlapping
voicings are legitimate here; a universal one-row-echo rule would destroy the idea.

## Apply the studies

The [composition skill](../skills/mod-music/SKILL.md) routes to the authoring
reference and an original runnable example. Its [example critique](../skills/mod-music/references/example-studies.md)
compares these techniques with the generated songs. The conclusions here are
structural analysis, not a claim of having listened to the collection.
