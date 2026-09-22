# Chip idiom recipes (cozy-tracker JSON)

Rows below assume speed 6 (4 rows/beat) unless stated. Volumes are decimal `vNN`;
effects are a letter plus two hex digits. Sources: structural reads of the Drozerix
corpus (`docs/corpus-studies.md`) and the Opus 5.5 batch generators.

## J chord stab

`J` plays base, +x, +y semitones in turn on every tick of **that row only**. Repeat it
on each held row, and pick a base that keeps voicings in one band so chords share tones.

```js
{2: {note: 'A-4', instrument: STAB, vol: 'v24', fx: 'J47'},  // A C# E
 3: {vol: 'v11', fx: 'J47'},
 4: {note: '^^'}}
```

| Chord | Base | J | Sounds |
|---|---|---|---|
| major, root position | root | J47 | 1 3 5 |
| minor, root position | root | J37 | 1 b3 5 |
| major, 1st inversion | 3rd | J38 | 3 5 1 |
| minor, 1st inversion | b3 | J49 | b3 5 1 |
| major, 2nd inversion | 5th | J59 | 5 1 3 |
| minor, 2nd inversion | 5th | J58 | 5 1 b3 |
| octave flicker | tone | J0C | tone, tone, +12 |

Worked example: D major over A-4 is the 2nd inversion (A D F#): A→D is 5, A→F# is 9, so `J59`.
`J58` would give A D F, which is D minor.

## Canon shimmer

One broken-chord line, a note every row. Voices 2 and 3 are copies delayed 1 and 2 rows
at about 60% and 35% volume (`echoChannel(line, {delay, scale})`). Rewrite row 0 of each
delayed voice as a `^^`, so the previous chord never carries into a downbeat. Use it
without the lead, or where the lead holds a chord tone that the arp spells.

## Echo channel

```js
const cadence = slice(leadChannel, 48, 64);             // only the ending
const echo = echoChannel(cadence, {delay: 3, scale: 0.45, rows: 64});
```

At 132 BPM, 3 rows is a dotted eighth (340 ms). Before keeping the echo, list each
echoed onset against the lead note at that row, and drop any that land a second
or a seventh away. Echoing E-C#-A over a held A gives thirds and a unison; echoing
a stepwise run gives seconds.

## Octave-bounce bass

Eighth notes alternating root (v40) and root+12 (v22) on a triangle or 50% pulse.
Legato: each note is retriggered by the next, so no cut is needed inside the bar.
For a breakdown, switch to half-time: root for most of the bar and one octave pickup.

## Gated hat

A long noise sample (0.25-0.4 s, slow decay) plus `SCx` on every hit, with `1 <= x < speed`.
`SC2` at speed 4 or 6 gives a tight closed hat; a larger x on one off-beat gives a half-open accent.
Give hats their own channel, so a cut never chokes the kick or snare.

## Auto-pan arp sweep

Put `pNN` in the volume column of every arp note and let the sample's `volume` set the
level (e.g. `volume: 13`). Sweep p08 to p56 across one bar and back across the next.
Don't also stamp `X` pan on that channel.

## Vibrato and glides

- **Vibrato:** `Hxy` (x speed, y depth). Start it 2-3 rows after the attack and stamp it on
  every held row. `H32` to `H44` is gentle, and deeper settings go sour fast. Render to check it.
- **Glide:** a note with `G10` and **no instrument** bends the sounding note toward it. Repeat
  `G10` (or `G00`) on the next row until it arrives. At speed 6, G10 moves about 5 semitones per row.
  Use it on chosen approach notes, not on every note.

## Compound meter

At speed 4, 6 rows make a dotted-quarter beat, so 12/8 is 24 rows per bar. A long-short
gallop is 4 rows + 2 rows. Put kicks on beats 1 and 3 (rows 0 and 12) and snares on 2 and 4 (6 and 18).

## Section contrast

Add one new element per section: the echo on the last A, a harmony voice in the last
chorus, or shimmer in the breakdown. A section that gets louder, higher and busier all
at once is the usual cause of fatigue.
