## CozyAdaptive — adaptive-music runtime for Godot 4.2+.
##
## Pairs a cozy-generated module (.it) with its manifest (.cozy.json):
##
##   var music := CozyAdaptive.create(self, "res://music/level1.it", "res://music/level1.cozy.json")
##   music.set_intensity(0.7)                       # mutes layers above the threshold
##   music.transition_to("combat")                  # jumps at the next pattern boundary
##   music.transition_to("explore", "bridge")       # musical transition via a bridge section
##
## Requires the godot-openmpt GDExtension (MIT):
##   https://github.com/Dudejoe870/godot-openmpt
##
## Manifest shape (emitted by cozy's json2it next to the .it):
##   { "layers":   [{ "name": "...", "channels": [..], "above": 0.0 }, ...],
##     "sections": { "name": [firstOrder, lastOrder], ... },
##     "loop": "explore" }
##
## Sections loop themselves until a transition is requested. Layer control is
## engine-level channel muting (libopenmpt interactive interface) — sample-
## accurate and free.
class_name CozyAdaptive
extends Node

signal section_changed(section_name: String)

var manifest: Dictionary = {}
var section: String = ""
var intensity: float = 1.0
var player: AudioStreamPlayer

var _playback  # AudioStreamPlaybackMPT
var _queue: Array = []
var _settling: String = ""
var _last_order: int = -1


static func create(parent: Node, module_path: String, manifest_path: String) -> CozyAdaptive:
	var ca := CozyAdaptive.new()
	parent.add_child(ca)
	ca.load_module(module_path, manifest_path)
	return ca


func load_module(module_path: String, manifest_path: String) -> void:
	manifest = JSON.parse_string(FileAccess.get_file_as_string(manifest_path))
	assert(manifest is Dictionary and manifest.has("sections"), "invalid .cozy.json manifest")

	var stream := AudioStreamMPT.new()
	stream.set_data(FileAccess.get_file_as_bytes(module_path))
	stream.loop_mode = AudioStreamMPT.LOOP_ENABLED

	player = AudioStreamPlayer.new()
	player.stream = stream
	add_child(player)
	player.play()
	_playback = player.get_stream_playback()

	var start: String = manifest.get("loop", (manifest["sections"] as Dictionary).keys().front())
	_jump(start)
	set_intensity(intensity)


## 0..1 — layers with `above` greater than this are muted.
func set_intensity(x: float) -> void:
	intensity = clampf(x, 0.0, 1.0)
	if _playback == null:
		return
	for layer in manifest.get("layers", []):
		var active := intensity >= float(layer.get("above", 0.0))
		for ch in layer["channels"]:
			_playback.set_channel_mute_status(int(ch), not active)


## Names of layers currently sounding at this intensity.
func active_layers() -> Array:
	var out: Array = []
	for layer in manifest.get("layers", []):
		if intensity >= float(layer.get("above", 0.0)):
			out.append(layer["name"])
	return out


## Move to a named section at the next pattern boundary.
## Pass a `via` section (e.g. "bridge") to route through it once on the way.
func transition_to(section_name: String, via: String = "", now: bool = false) -> void:
	assert(manifest["sections"].has(section_name), "unknown section: " + section_name)
	if via != "":
		assert(manifest["sections"].has(via), "unknown section: " + via)
		_queue = [via, section_name]
	else:
		_queue = [section_name]
	if now or not player.playing:
		_advance()


func pause() -> void:
	player.stream_paused = true

func resume() -> void:
	player.stream_paused = false

func set_volume_db(db: float) -> void:
	player.volume_db = db


func _range_of(section_name: String) -> Array:
	return manifest["sections"][section_name]


func _jump(section_name: String) -> void:
	section = section_name
	_settling = section_name
	_last_order = -1  # force re-evaluation: the jump may target the order we're on
	_playback.seek(int(_range_of(section_name)[0]), 0)
	section_changed.emit(section_name)


func _advance() -> void:
	if not _queue.is_empty():
		_jump(_queue.pop_front())


func _process(_delta: float) -> void:
	if _playback == null or not player.playing:
		return
	var order: int = _playback.get_current_order()
	if order == _last_order:
		return
	_last_order = order

	var r := _range_of(section) if section != "" else [0, 1 << 30]
	if _settling != "":
		if order >= int(r[0]) and order <= int(r[1]):
			_settling = ""
		return
	if order > int(r[1]) or order < int(r[0]):
		# pattern boundary crossed out of the section: transition or loop
		if not _queue.is_empty():
			_advance()
		else:
			_jump(section)
