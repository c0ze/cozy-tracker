/**
 * Minimal WAV reader: PCM 8/16/24-bit and float32, mono or stereo.
 * Returns { samplerate, channels: [Float array, ...] } for itwriter.
 * Enough for AKWF single-cycles and typical CC0 sample packs.
 */

export function readWav(buffer) {
  const view = new DataView(buffer.buffer || buffer, buffer.byteOffset || 0, buffer.byteLength);
  const tag = (off) => String.fromCharCode(view.getUint8(off), view.getUint8(off + 1), view.getUint8(off + 2), view.getUint8(off + 3));

  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("Not a WAV file");

  let fmt = null;
  let dataOff = -1;
  let dataLen = 0;

  let off = 12;
  while (off + 8 <= view.byteLength) {
    const id = tag(off);
    const size = view.getUint32(off + 4, true);
    if (id === "fmt ") {
      fmt = {
        format: view.getUint16(off + 8, true),
        numChannels: view.getUint16(off + 10, true),
        samplerate: view.getUint32(off + 12, true),
        bitsPerSample: view.getUint16(off + 22, true),
      };
    } else if (id === "data") {
      dataOff = off + 8;
      dataLen = size;
    }
    off += 8 + size + (size & 1); // chunks are word-aligned
  }

  if (!fmt || dataOff < 0) throw new Error("Missing fmt/data chunk");
  // 1 = PCM, 3 = IEEE float, 0xFFFE = extensible (assume layout matches bits)
  if (![1, 3, 0xfffe].includes(fmt.format)) throw new Error(`Unsupported WAV format code ${fmt.format}`);

  const bytesPer = fmt.bitsPerSample / 8;
  const frames = Math.floor(dataLen / (bytesPer * fmt.numChannels));
  const channels = Array.from({ length: fmt.numChannels }, () => new Array(frames));

  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < fmt.numChannels; c++) {
      const p = dataOff + (i * fmt.numChannels + c) * bytesPer;
      let v;
      switch (fmt.bitsPerSample) {
        case 8: v = (view.getUint8(p) - 128) / 128; break;
        case 16: v = view.getInt16(p, true) / 32768; break;
        case 24: {
          let u = view.getUint8(p) | (view.getUint8(p + 1) << 8) | (view.getUint8(p + 2) << 16);
          if (u & 0x800000) u -= 0x1000000;
          v = u / 8388608;
          break;
        }
        case 32: v = view.getFloat32(p, true); break;
        default: throw new Error(`Unsupported bit depth ${fmt.bitsPerSample}`);
      }
      channels[c][i] = v;
    }
  }

  return { samplerate: fmt.samplerate, channels };
}
