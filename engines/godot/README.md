# CozyAdaptive for Godot

Adaptive-music runtime for Godot 4.2+ — the same two calls as the web runtime,
backed by [godot-openmpt](https://github.com/Dudejoe870/godot-openmpt) (MIT).

## Install

1. Install the godot-openmpt GDExtension (grab a release, drop it in `addons/`).
2. Copy `cozy_adaptive.gd` anywhere in your project (it registers the
   `CozyAdaptive` class).
3. Copy your cozy-generated `level1.it` + `level1.cozy.json` into the project.

## Use

```gdscript
var music: CozyAdaptive

func _ready() -> void:
    music = CozyAdaptive.create(self, "res://music/level1.it", "res://music/level1.cozy.json")

func _on_combat_started() -> void:
    music.transition_to("combat", "bridge")   # via the bridge, at the next boundary

func _on_danger_changed(danger: float) -> void:
    music.set_intensity(danger)               # engine-level channel muting
```

Signals: `section_changed(section_name)` fires on every section jump
(requested transitions and self-loops alike).

Notes:
- Sections loop themselves until you request a transition.
- `set_intensity` uses engine-level channel muting via libopenmpt's
  interactive interface — no crossfades, no extra players.
- Multi-song modules made with cozy's `tools/merge.js` work as-is:
  `music.transition_to("nb:groove", "bridge")` crosses songs (key, tempo and
  loudness change with the section — the module carries its own clock stamps).

Status: API-verified against godot-openmpt v1.3 source (`seek(order, row)`,
`set_channel_mute_status`, `get_current_order`); not yet CI-tested inside a
Godot project — report issues.

Transitions are scheduled from frame-polled order/row updates. They are not
sample-accurate and require audition in the target game. The wrapper passes a
Godot syntax/type check with an AudioStreamMPT stub; real GDExtension playback
remains untested in this repository.
