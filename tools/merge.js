/**
 * mergeSongs — combine two cozy song JSONs (+ an authored bridge) into ONE
 * adaptive module, so a game's whole score can live in a single .it and
 * CozyAdaptive can transition between songs seamlessly:
 *
 *   music.transitionTo('nb:groove', { via: 'bridge' });
 *
 * How it works:
 * - B's channels are appended after A's (layers stay independent), B's
 *   instrument indices are remapped into the merged sample list (deduped).
 * - Three control channels are added; row 0 of EVERY pattern is stamped with
 *   that song's tempo (Txx), speed (Axx) and loudness (Vxx global volume,
 *   compensating for differing authored mixvols) — so a jump to any section
 *   lands with the right clock within one row.
 * - The bridge is authored music (composed per pair — this is where the LLM
 *   earns its keep): a factory receiving channel/instrument mapping helpers,
 *   returning patterns in the merged space. It stamps its own tempo ramp.
 * - Section names get prefixed ("siege:explore", "nb:groove"); "bridge"
 *   spans the bridge patterns. Manifest layers are merged with B's channels
 *   offset.
 */

const hex2 = (n) => Math.round(n).toString(16).toUpperCase().padStart(2, "0");

export function mergeSongs(a, b, opts = {}) {
  const nameA = opts.nameA || "a";
  const nameB = opts.nameB || "b";
  const chCount = (s) => Math.max(...s.patterns.map((p) => p.channels.length));
  const chA = chCount(a);
  const chB = chCount(b);
  const ctrl = [chA + chB, chA + chB + 1, chA + chB + 2]; // tempo, speed, gvol
  const totalCh = chA + chB + 3;

  // samples: A's, then B's (deduped by identical definition)
  const samples = a.samples.map((s) => ({ ...s }));
  const key = (d) => JSON.stringify(d);
  const bInst = b.samples.map((def) => {
    const i = samples.findIndex((s) => key(s) === key(def));
    if (i >= 0) return i;
    samples.push({ ...def });
    return samples.length - 1;
  });

  const remapChn = (chn, instMap) => {
    const out = {};
    for (const [r, ev] of Object.entries(chn)) {
      out[r] = ev.instrument !== undefined ? { ...ev, instrument: instMap[ev.instrument] } : { ...ev };
    }
    return out;
  };
  const padTo = (channels, n) => {
    const c = channels.map((x) => ({ ...x }));
    while (c.length < n) c.push({});
    return c;
  };

  // loudness: header mixvol = the louder song's; quieter song compensated via Vxx
  const mixvol = Math.max(a.mixvol || 64, b.mixvol || 64);
  const gvFor = (s) => Math.min(128, Math.round(128 * (s.mixvol || 64) / mixvol));

  const stamp = (pat, { bpm, ticks, gv }) => {
    const channels = padTo(pat.channels, totalCh);
    channels[ctrl[0]] = { ...channels[ctrl[0]], 0: { fx: "T" + hex2(bpm) } };
    channels[ctrl[1]] = { ...channels[ctrl[1]], 0: { fx: "A" + hex2(ticks) } };
    channels[ctrl[2]] = { ...channels[ctrl[2]], 0: { fx: "V" + hex2(gv) } };
    return { ...pat, channels };
  };

  const aPats = a.patterns.map((p) => stamp(p, { bpm: a.bpm, ticks: a.ticks, gv: gvFor(a) }));
  const bPats = b.patterns.map((p) =>
    stamp({ ...p, channels: [...Array(chA).fill(null).map(() => ({})), ...p.channels.map((chn) => remapChn(chn, bInst))] },
      { bpm: b.bpm, ticks: b.ticks, gv: gvFor(b) }));

  // bridge factory: authored against the merged space via these helpers
  const ctx = {
    chA: (i) => i,
    chB: (i) => chA + i,
    iA: (i) => i,
    iB: (i) => bInst[i],
    ctrl,
    totalCh,
    hex2,
    aBpm: a.bpm, bBpm: b.bpm, aTicks: a.ticks, bTicks: b.ticks,
    gvA: gvFor(a), gvB: gvFor(b),
  };
  const bridge = opts.bridge ? opts.bridge(ctx) : { patterns: [] };
  const bridgePats = bridge.patterns.map((p) => ({ ...p, channels: padTo(p.channels, totalCh) }));

  const bridgePatBase = a.patterns.length;
  const bPatBase = bridgePatBase + bridgePats.length;
  const order = [
    ...a.order,
    ...bridgePats.map((_, i) => bridgePatBase + i),
    ...b.order.map((p) => p + bPatBase),
  ];
  const aOrdLen = a.order.length;
  const brOrdLen = bridgePats.length;

  const sections = {};
  for (const [n, [s, e]] of Object.entries(a.adaptive?.sections || {})) sections[`${nameA}:${n}`] = [s, e];
  if (brOrdLen) sections.bridge = [aOrdLen, aOrdLen + brOrdLen - 1];
  for (const [n, [s, e]] of Object.entries(b.adaptive?.sections || {})) sections[`${nameB}:${n}`] = [s + aOrdLen + brOrdLen, e + aOrdLen + brOrdLen];
  const layers = [
    ...(a.adaptive?.layers || []).map((l) => ({ ...l, name: `${nameA}:${l.name}` })),
    ...(b.adaptive?.layers || []).map((l) => ({ ...l, name: `${nameB}:${l.name}`, channels: l.channels.map((c) => c + chA) })),
  ];

  return {
    title: opts.title || `${a.title} -> ${b.title}`,
    message: opts.message || `${a.title} + bridge + ${b.title}\nOne adaptive module, two songs, generated transition.`,
    bpm: a.bpm,
    ticks: a.ticks,
    mixvol,
    samples,
    channelnames: {
      ...Object.fromEntries(Object.entries(a.channelnames || {}).map(([k, v]) => [k, `${nameA[0]}:${v}`])),
      ...Object.fromEntries(Object.entries(b.channelnames || {}).map(([k, v]) => [+k + chA, `${nameB[0]}:${v}`])),
      [ctrl[0]]: "tempo", [ctrl[1]]: "speed", [ctrl[2]]: "gvol",
    },
    order,
    patterns: [...aPats, ...bridgePats, ...bPats],
    adaptive: {
      layers,
      sections,
      loop: opts.loop || (a.adaptive?.loop ? `${nameA}:${a.adaptive.loop}` : undefined),
    },
  };
}
