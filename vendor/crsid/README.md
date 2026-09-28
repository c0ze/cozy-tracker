# cRSID (vendored)

cRSID by Hermit (Mihaly Horvath), 2022: a cycle-exact, integer-only 6502 + SID 6581/8580
emulator. Used for the SID player (`player/sid-player.js`) and the tests, through
`player/vendor/crsid/crsid.wasm`.

- Source: github.com/r-moeritz/crsid-by-hermit, commit 641f09a (2022-03-30).
- Licence (from its README): "WTF: Do what the fuck you want with this code, but it would be
  nice mentioning me as the original author."
- Copied: `C64/*`, `libcRSID.c/h`, `host/file.c`, `host/audio.c` (the SDL and file-loading
  parts are behind `CRSID_PLATFORM_PC`, which is not defined here).

## Changes

clang has no GNU nested functions, which cRSID uses in two places:
- `C64/CPU.c`: the helpers inside `cRSID_emulateCPU` (`rd`, `wr`, the addressing modes, the
  flag helpers) and its static state moved to file scope; `push` in
  `cRSID_handleCPUinterrupts` became a macro.
- `C64/SID.c`: `combinedWF` moved out of `cRSID_emulateWaves`, with the enclosing function's
  `SID`, `Channel` and `ChannelPtr` as parameters.

Checked on 2026-09-28: the original (gcc) and the changed source (clang) render the same
bytes for 20 s of four tunes, including the combined-waveform and filter test tunes, and the
wasm build matches them.

`wasm/crsid_wasm.c` is the WebAssembly interface (ours). Build with `tools/build-crsid.sh`.
