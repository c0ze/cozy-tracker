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
var _next_boundary: bool = false
var _settling: String = ""
var _last_order: int = -1
var _last_row: int = -1


static func create(parent: Node, module_path: String, manifest_path: String) -> CozyAdaptive:
	var ca := CozyAdaptive.new()
	parent.add_child(ca)
	ca.load_module(module_path, manifest_path)
	return ca


## Returns false (with push_error) when the manifest or module cannot load.
## Validation uses push_error rather than assert, which release exports strip.
func load_module(module_path: String, manifest_path: String) -> bool:
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(manifest_path))
	if not _valid_manifest(parsed):
		push_error("CozyAdaptive: invalid .cozy.json manifest: " + manifest_path)
		return false
	var data := FileAccess.get_file_as_bytes(module_path)
	if data.is_empty():
		push_error("CozyAdaptive: cannot read module: " + module_path)
		return false
	manifest = parsed

	var stream := AudioStreamMPT.new()
	stream.set_data(data)
	stream.loop_mode = AudioStreamMPT.LOOP_ENABLED

	player = AudioStreamPlayer.new()
	player.stream = stream
	add_child(player)
	player.play()
	_playback = player.get_stream_playback()

	var sections: Dictionary = manifest["sections"]
	var start: String = manifest.get("loop", sections.keys().front())
	_jump(start)
	set_intensity(intensity)
	return true


func _valid_manifest(m) -> bool:
	if not (m is Dictionary) or not (m.get("sections") is Dictionary) or m["sections"].is_empty():
		return false
	for sec in m["sections"]:
		var r = m["sections"][sec]
		if not (r is Array) or r.size() != 2 or int(r[0]) < 0 or int(r[1]) < int(r[0]):
			return false
	if m.has("loop") and not m["sections"].has(m["loop"]):
		return false
	for layer in m.get("layers", []):
		if not (layer is Dictionary) or not (layer.get("channels") is Array):
			return false
	return true


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
	if _playback == null:
		push_error("CozyAdaptive: no module loaded")
		return
	for sec in [section_name, via]:
		if sec != "" and not manifest["sections"].has(sec):
			push_error("CozyAdaptive: unknown section: " + sec)
			return
	_queue = [via, section_name] if via != "" else [section_name]
	_next_boundary = true
	if now or not player.playing:
		_advance()


func pause() -> void:
	if player:
		player.stream_paused = true

func resume() -> void:
	if player:
		player.stream_paused = false

func set_volume_db(db: float) -> void:
	if player:
		player.volume_db = db


func _range_of(section_name: String) -> Array:
	return manifest["sections"][section_name]


func _jump(section_name: String) -> void:
	section = section_name
	_settling = section_name
	_last_order = -1  # force re-evaluation: the jump may target the order we're on
	_last_row = -1
	_playback.seek(int(_range_of(section_name)[0]), 0)
	section_changed.emit(section_name)


func _advance() -> void:
	if not _queue.is_empty():
		# A via section plays its complete range before the destination.
		_next_boundary = false
		_jump(_queue.pop_front())


func _process(_delta: float) -> void:
	if _playback == null or not player.playing:
		return
	var order: int = _playback.get_current_order()
	var row: int = _playback.get_current_row()
	var previous_order := _last_order
	# Same-order row resets catch one-order module wraps. Adaptive sections
	# use linear patterns; an SBx loop to row zero is indistinguishable here.
	var row_wrapped := order == previous_order and row == 0 and _last_row > 0
	var boundary := order != previous_order or row_wrapped
	_last_order = order
	_last_row = row
	if not boundary:
		return

	var r := _range_of(section) if section != "" else [0, 1 << 30]
	if _settling != "":
		if order >= int(r[0]) and order <= int(r[1]):
			_settling = ""
		return
	var section_ended := order > int(r[1]) or order < int(r[0]) or (previous_order == int(r[1]) and (order < previous_order or row_wrapped))
	if not _queue.is_empty() and _next_boundary:
		_advance()
	elif section_ended:
		# Finish the whole bridge, or loop with no pending request.
		if not _queue.is_empty():
			_advance()
		else:
			_jump(section)
