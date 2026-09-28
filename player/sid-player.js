// A SID player with the ChiptuneJsPlayer interface the tracker page uses (play, stop, pause,
// setOrderRow, setChannelMute, setVol, events), playing PSID files through cRSID in an
// AudioWorklet (sid-worklet.js).
//
// play({ psid, org, meta, orderMap }): psid bytes; org = the cozy-tracker driver's address
// (null for other PSID files); meta = what onMetadata reports; orderMap[i] = the driver order
// where song order i starts (patterns over 255 rows are split), for positions and seeking.

const WASM = new URL('./vendor/crsid/crsid.wasm', import.meta.url);
const CHUNK_ROWS = 255; // tools/sid-tracks.js

export class SidPlayer {
  constructor() {
    this.context = new AudioContext({ sampleRate: 48000 }); // cRSID takes rates up to 65535
    this.gain = this.context.createGain();
    this.gain.connect(this.context.destination);
    this.handlers = [];
    this.orderMap = null;
    this.mutes = [false, false, false];
    this.init();
  }

  async init() {
    try {
      const wasm = await (await fetch(WASM)).arrayBuffer();
      await this.context.audioWorklet.addModule(new URL('./sid-worklet.js', import.meta.url));
      this.processNode = new AudioWorkletNode(this.context, 'sid-processor', {
        numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2], processorOptions: { wasm },
      });
      this.processNode.port.onmessage = (e) => this.message(e.data);
      this.processNode.connect(this.gain);
      this.fire('onInitialized');
    } catch (e) {
      console.error(e);
      this.fire('onError', { type: 'Init', error: e });
    }
  }

  // Driver order -> song order and row.
  songPosition(order, row) {
    const map = this.orderMap;
    if (!map) return { order, row };
    let i = 0;
    while (i + 1 < map.length && map[i + 1] <= order) i++;
    return { order: i, row: (order - map[i]) * CHUNK_ROWS + row };
  }

  message(d) {
    if (d.cmd === 'err') return this.fire('onError', { type: d.val });
    if (d.cmd !== 'pos') return;
    const { order, row } = this.songPosition(d.order, d.row);
    this.fire('onProgress', { pos: d.pos, order, row, pattern: this.meta?.song?.orders?.[order]?.pat ?? 0, vu: d.vu });
  }

  fire(name, value) { for (const h of this.handlers) if (h.name === name) h.fn(value); }
  on(name, fn) { this.handlers.push({ name, fn }); }
  onInitialized(fn) { this.on('onInitialized', fn); }
  onError(fn) { this.on('onError', fn); }
  onMetadata(fn) { this.on('onMetadata', fn); }
  onProgress(fn) { this.on('onProgress', fn); }
  onEnded(fn) { this.on('onEnded', fn); }

  post(cmd, val) { this.processNode?.port.postMessage({ cmd, val }); }
  play({ psid, org = null, meta = {}, orderMap = null }) {
    this.orderMap = orderMap;
    this.meta = meta;
    this.post('load', { psid, org });
    this.fire('onMetadata', meta);
  }
  stop() { this.post('stop'); }
  pause() { this.post('pause'); }
  unpause() { this.post('unpause'); }
  setOrderRow(o) { this.post('order', { order: this.orderMap ? this.orderMap[o] ?? 0 : o }); } // rows: from 0
  setChannelMute(ch, mute) {
    this.mutes[ch] = mute;
    this.post('mute', { mask: this.mutes.reduce((m, on, i) => m | (on ? 1 << i : 0), 0) });
  }
  setModel(model) { this.post('model', { model }); }
  playSfx(n) { this.post('sfx', { n }); }
  setVol(v) { this.gain.gain.value = v; }
  setPos() {}    // SID tunes seek by order (setOrderRow)
  setTempo() {}  // the driver runs at the PAL frame rate
  setPitch() {}
}
