# cozy-tracker — adaptive game music, generated

**Live: [tracker.coze.org](https://tracker.coze.org)** — hear the tracks and
drive the adaptive demos in your browser.

## Why it exists

Game music forces a bad trade. Either you license a flat loop that plays the
same eight bars whether the player is picking flowers or fighting for their
life — or you hand-build a multi-stem crossfade rig that bloats your download,
eats engineering time, and *still* only fades between fixed mixes.

Interactive worlds deserve music that reacts like the rest of the game does.

cozy-tracker generates music that **is** the adaptive system: one tiny file
that layers, re-sequences, and re-scores itself in real time — described in
plain language, rendered from a clean-to-ship sample library, and dropped into
your engine with two lines of code.

## What it is

An AI-native music pipeline. You describe a mood; it composes a tracker module
and the manifest that makes it adaptive. Your game calls `setIntensity()` and
`transitionTo()`. The score rearranges itself — no crossfades, no stem stacks,
no re-exports.

## What makes it different

**1. Adaptive by construction.**
Tracker modules give you two superpowers for free, and cozy generates music
built to use them:
- *Vertical layering* — every instrument lives on its own channel, so intensity
  is just muting and unmuting layers. Exploration keeps pad and bass; combat
  brings in drums and lead. Instant, sample-accurate, one file.
- *Horizontal re-sequencing* — named sections with clean musical jump points.
  Walk from exploration into a boss theme at the next bar, seamlessly.
- Real-time tempo and pitch, with no artifacts.

**2. Generated, not hand-drawn.**
Describe it, get it. Batch-generate a whole soundtrack in CI. Spin twelve
variations for procedural levels from a seed. Regenerate the moment the vibe
of your game changes.

**3. LLM transitions.**
Ask for a bridge that walks your combat theme into your exploration theme —
matched in key and tempo — and get a module that musically connects them.
Design-time today; the horizon is a runtime agent scoring transitions live.

**4. Cleared to ship.**
Every sound traces to a public-domain or CC0 source in a provenance ledger.
No sample-license landmines in your commercial release.

**5. Tiny.**
An adaptive score is tens of kilobytes. A five-stem crossfade rig is tens of
megabytes. That gap decides whether your web or mobile game ships with music.

**6. Data-driven and reproducible.**
Songs are JSON — diffable, version-controlled, seedable, parameterizable by the
game itself. Your soundtrack is source code.

**7. Music QA, automated.**
A linter catches dissonance and register clashes before you hear them. Offline
rendering and level metering give you a soundtrack you can regression-test.

**8. Drop-in for every engine.**
Small runtime bundles for web, Godot, Unity, and more expose the same two calls.
The hard part — reaching into the playback engine to mute individual layers —
is already done and wrapped for you.

## Drop it into your game

Alongside every module, cozy emits a manifest describing its layers and sections:

```jsonc
// level1.cozy.json
{ "layers":   { "drums":[0,1,2], "bass":[3], "harmony":[4,6,7], "lead":[5] },
  "sections": { "explore":[1,4], "combat":[5,10], "bridge":[11,11] },
  "loop": "explore" }
```

**Web**
```js
const music = new CozyAdaptive('level1.it', 'level1.cozy.json');
music.setIntensity(0.7);      // mutes layers above the threshold
music.transitionTo('combat'); // jumps at the next bar
```

**Godot**
```gdscript
var music = CozyAdaptive.load("res://music/level1.it")
music.set_intensity(0.7)
music.transition_to("combat")
```

Same manifest, same two calls, on Unity, LÖVE/SDL, and Bevy.

## The pitch in one line

**Describe the mood — get an adaptive score that reacts to your game, in
30 kilobytes, cleared to ship.**
