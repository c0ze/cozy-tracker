---
name: chiptune
description: Use when writing chiptune, 8-bit or tracker-style parts in cozy-tracker — J arpeggio chords, echo channels, canon/shimmer arps, octave bass, gated hats, vibrato, portamento, pan sweeps — or when chip parts clash with the lead, the bass sounds thin, a loop seam rubs, or lint reports many clash warnings between an echo or arp and the lead.
---

# Chiptune idioms that survive the mix

**REQUIRED BACKGROUND:** read `skills/mod-music/SKILL.md` first (phrase, articulation, `^^`
endings, verification). This skill adds the chip idioms and where each one may sound.

Chip idioms are cheap to write and expensive to stack. The same few mistakes recur:
an echo or delayed arp placed a second away from the lead, bass written in the
wrong octave, and a canon that wraps across the loop point. Place each idiom
where it is consonant, then prove it with lint and a render.

## Placement rules

| Idiom | Plays where | Never |
|---|---|---|
| Canon shimmer (one arp line, 2-3 channels, +1 row each) | Intro, breakdown, or bars where the lead rests | Under the hook: its delayed notes form seconds with the lead |
| Echo channel (delayed lead copy) | Only notes whose delayed copy lands a 3rd, 5th, 6th or unison against the lead at that row — usually a cadence or a held note | Whole-lead copies of stepwise lines |
| J chord stab | Off-beats, 1-2 rows, J repeated on each held row | Sustained under a held lead of the same register |
| Harmony voice | Under the lead's held notes, in the final chorus only | Doubling every note |
| Fast arp sweep / flicker | One fast line at a time against the lead | Several moving lines plus an echo at once |

**Echo test:** for each echoed onset at row `r + d`, compare it with the lead note sounding at
that row. If the interval is 1, 2, 10 or 11 semitones (mod 12), drop that echo note or
shorten its source. Slice the echo to the passing notes (`slice`), don't lower its volume.

## Register and seams

- **Tuning:** C-5 = middle C (262 Hz), one octave below scientific names. Center bass roots
  around **D-3 to C-4 (73-131 Hz)**. F-2/G-2 (44-49 Hz) mostly vanish on small speakers,
  so compute Hz before choosing an octave. The band is a center, not a fence: dipping to
  A#2-C-3 (58-65 Hz) to keep the line connected beats jumping an octave between chords.
- **Canon seams:** start every pattern's delayed voices with `^^` on rows before their first
  note. Never let a delayed copy carry the previous bar's chord into a new downbeat.
- **Pan stamps:** put pan in an empty row, or in the volume column (`pNN`), never where it would
  evict a J/SC/H effect from a note row. A shared helper that picks the first free
  effect slot works (`pan()` in `songs/opus55.js`).
- **Loop tail:** a stab or bass note that ends on the last row rings across the seam.
  Stop the stab loop one step early, or confirm row 0 retriggers that channel.

## Verify

1. `node tools/lint.js song.json`: every remaining clash must be explained as a deliberate
   tension that lasts 1-2 rows. Seconds between the lead and an echo/arp are bugs.
2. Check J pitches by arithmetic: offsets add upward from the base (see the table in
   `references/idioms.md`). D major on A-4 is **J59**, not J58.
3. Lint does not simulate H (vibrato) or G (portamento). Render, and say they are unverified
   unless you listened.
4. Compare the per-section RMS of the render: a breakdown should dip, and nothing should drop out.

Event recipes and worked examples for every idiom: [references/idioms.md](references/idioms.md).
Full songs using them: `songs/peach_orchard.gen.js`, `tide_pool_radio.gen.js`,
`crypt_lanterns.gen.js`, `skyline_relay.gen.js` (helpers in `songs/opus55.js`).
