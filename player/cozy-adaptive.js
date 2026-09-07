/**
 * CozyAdaptive — the drop-in adaptive-music runtime for the web.
 *
 * Pairs a cozy-generated module (.it) with its manifest (.cozy.json):
 *
 *   const music = await CozyAdaptive.create('level1.it', 'level1.cozy.json');
 *   music.setIntensity(0.7);      // mutes layers above the threshold
 *   music.transitionTo('combat'); // jumps at the next pattern boundary
 *   music.transitionTo('explore', { via: 'bridge' }); // musical transition
 *
 * Manifest shape:
 *   { layers:   [{ name, channels: [..], above: 0.0 }, ...],   // intensity-ordered
 *     sections: { name: [firstOrder, lastOrder], ... },
 *     loop: "explore" }
 *
 * Sections loop themselves until a transition is requested. Layer control is
 * real engine-level channel muting (libopenmpt ext interactive interface),
 * so intensity changes are sample-accurate and free.
 */
import { ChiptuneJsPlayer } from './vendor/chiptune3/chiptune3.js';

export class CozyAdaptive {
  constructor(player, manifest) {
    this.player = player;
    this.manifest = manifest;
    this.intensity = 1;
    this.section = null;
    this._queue = [];        // pending section transitions
    this._nextBoundary = false; // start a new request at the next pattern
    this._settling = null;   // section we just jumped to, until observed
    this._lastOrder = -1;
    this._lastRow = -1;
    this._sectionCbs = [];
    this._progressCbs = [];
    this.playing = false;

    player.onProgress((d) => this._onProgress(d));
  }

  /** Load module + manifest and start (paused audio contexts resume on play). */
  static async create(moduleUrl, manifest, opts = {}) {
    if (!window.isSecureContext || !('audioWorklet' in (window.AudioContext?.prototype ?? {}))) {
      throw new Error(`audio needs HTTPS — open https://${location.host}${location.pathname}`);
    }
    if (typeof manifest === 'string') manifest = await (await fetch(manifest)).json();
    const player = new ChiptuneJsPlayer({ repeatCount: -1, context: opts.context });
    await new Promise((resolve) => player.onInitialized(resolve));
    const buf = await (await fetch(moduleUrl)).arrayBuffer();
    const ready = new Promise((resolve) => player.onMetadata(resolve));
    player.play(buf);
    await ready;
    const ca = new CozyAdaptive(player, manifest);
    ca.playing = true;
    ca._jump(manifest.loop || Object.keys(manifest.sections || {})[0]);
    ca.setIntensity(opts.intensity ?? 1);
    return ca;
  }

  /** 0..1 — layers with `above` greater than this are muted. */
  setIntensity(x) {
    this.intensity = Math.max(0, Math.min(1, x));
    for (const layer of this.manifest.layers || []) {
      const active = this.intensity >= (layer.above ?? 0);
      for (const ch of layer.channels) this.player.setChannelMute(ch, !active);
    }
    return this;
  }

  /** Names of layers currently sounding at this intensity. */
  activeLayers() {
    return (this.manifest.layers || [])
      .filter((l) => this.intensity >= (l.above ?? 0))
      .map((l) => l.name);
  }

  /**
   * Move to a named section at the next pattern boundary.
   * opts.via: play another section (e.g. a bridge) once on the way.
   * opts.now: jump immediately instead of waiting for the boundary.
   */
  transitionTo(name, opts = {}) {
    if (!this.manifest.sections?.[name]) throw new Error(`unknown section: ${name}`);
    if (opts.via && !this.manifest.sections[opts.via]) throw new Error(`unknown section: ${opts.via}`);
    this._queue = opts.via ? [opts.via, name] : [name];
    this._nextBoundary = true;
    if (opts.now || !this.playing) this._advance();
    return this;
  }

  onSection(cb) { this._sectionCbs.push(cb); return this; }
  onProgress(cb) { this._progressCbs.push(cb); return this; }

  pause() { this.player.pause(); this.playing = false; return this; }
  resume() { this.player.unpause(); this.playing = true; return this; }
  setVolume(v) { this.player.setVol(v); return this; }
  stop() { this.player.stop(); this.playing = false; return this; }

  // --- internals -------------------------------------------------------------
  _range(name) { return this.manifest.sections[name]; }

  _jump(name) {
    this.section = name;
    this._settling = name;
    this._lastOrder = -1; // force re-evaluation: the jump may target the order we're already on
    this._lastRow = -1;
    this.player.setOrderRow(this._range(name)[0], 0);
    for (const cb of this._sectionCbs) cb(name);
  }

  _advance() {
    if (!this._queue.length) return;
    // After entering a via section, play its complete range before advancing.
    this._nextBoundary = false;
    this._jump(this._queue.shift());
  }

  _onProgress(d) {
    for (const cb of this._progressCbs) cb(d);
    const previousOrder = this._lastOrder;
    // A one-order module wraps without changing order. Internal SBx loops to
    // row zero are indistinguishable here; adaptive sections use linear patterns.
    const rowWrapped = d.order === previousOrder && d.row === 0 && this._lastRow > 0;
    const boundary = d.order !== previousOrder || rowWrapped;
    this._lastOrder = d.order;
    this._lastRow = d.row;
    if (!boundary) return;
    const [s, e] = this.section ? this._range(this.section) : [0, Infinity];

    if (this._settling) {
      // ignore stale progress until we land inside the section we jumped to
      if (d.order >= s && d.order <= e) this._settling = null;
      return;
    }
    const sectionEnded = d.order > e || d.order < s ||
      (previousOrder === e && (d.order < previousOrder || rowWrapped));
    if (this._queue.length && this._nextBoundary) {
      this._advance();
    } else if (sectionEnded) {
      // Finish the whole bridge, or loop the section with no pending request.
      if (this._queue.length) this._advance();
      else this._jump(this.section); // loop the section
    }
  }
}
