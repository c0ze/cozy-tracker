/**
 * cozy jukebox — self-rendering playlist player component.
 * Used by the landing page (collapsed playlist) and /listen (expanded).
 *
 *   import { mountJukebox } from './listen/jukebox.js';
 *   mountJukebox(document.querySelector('#jukebox'), { base: 'demos/', collapsedPlaylist: true });
 *
 * No autostart: audio begins only on an explicit user click.
 */
import { ChiptuneJsPlayer } from '../player/vendor/chiptune3/chiptune3.js';

const TRACKS = [
  { file: 'night_bus.it', title: 'Night Bus', note: 'laid-back groove · lint-clean' },
  { file: 'paper_hearts.it', title: 'Paper Hearts', note: 'chip-pop · liquid harp, no drums' },
  { file: 'first_light.it', title: 'First Light', note: 'melodic · key-change climax' },
  { file: 'winter_orbit.it', title: 'Winter Orbit', note: 'sparse ambient · music-box bells' },
  { file: 'siege_engine.it', title: 'Siege Engine', note: 'aggressive driver · war drums' },
  { file: 'siege_to_night.it', title: 'Siege → Night Bus', note: 'two songs + a generated bridge, one file' },
];

const CSS = `
.jb { background:var(--panel,#14171f); border:1px solid var(--line,#2a3040); border-radius:14px; overflow:hidden;
  font:15px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color:var(--text,#e6e9ef); }
.jb .mono { font-family:ui-monospace,"SF Mono",Menlo,monospace; }
.jb canvas.jb-viz { display:block; width:100%; height:170px; background:#0a0c10; cursor:pointer; }
.jb .jb-vizbar { display:flex; align-items:center; gap:.4rem; padding:.45rem .9rem; border-top:1px solid var(--line,#2a3040); }
.jb .jb-vmode { font:600 .7rem/1 ui-monospace,monospace; letter-spacing:.08em; color:var(--dim,#8b93a7);
  background:var(--panel2,#1b1f2b); border:1px solid var(--line,#2a3040); border-radius:6px; padding:.28rem .55rem; cursor:pointer; }
.jb .jb-vmode.on { color:#0b0d12; background:var(--cyan,#4fc1ff); border-color:var(--cyan,#4fc1ff); }
.jb .jb-now { padding:.75rem 1rem .2rem; display:flex; align-items:baseline; gap:.8rem; }
.jb .jb-title { font-size:1.08rem; font-weight:700; }
.jb .jb-time { margin-left:auto; color:var(--dim,#8b93a7); font-size:.84rem; }
.jb .jb-controls { display:flex; gap:.5rem; align-items:center; padding:.5rem 1rem .9rem; }
.jb .jb-btn { width:40px; height:40px; border-radius:50%; border:1px solid var(--line,#2a3040);
  background:var(--panel2,#1b1f2b); color:var(--text,#e6e9ef); font-size:.95rem; cursor:pointer; }
.jb .jb-btn:hover { border-color:var(--cyan,#4fc1ff); }
.jb .jb-btn.main { width:52px; height:52px; font-size:1.2rem; border:none; color:#12060f;
  background:linear-gradient(135deg,var(--magenta,#ff5ac0),var(--gold,#e0a458)); }
.jb .jb-hint { margin-left:auto; color:var(--dim,#8b93a7); font-size:.75rem; }
.jb details { border-top:1px solid var(--line,#2a3040); }
.jb summary { padding:.6rem 1rem; cursor:pointer; color:var(--dim,#8b93a7); font-size:.85rem; user-select:none; }
.jb summary:hover { color:var(--cyan,#4fc1ff); }
.jb .jb-track { display:flex; align-items:center; gap:.9rem; padding:.55rem 1rem; cursor:pointer; }
.jb .jb-track:hover { background:var(--panel2,#1b1f2b); }
.jb .jb-track.current { background:var(--panel2,#1b1f2b); }
.jb .jb-track .idx { color:var(--dim,#8b93a7); font-size:.8rem; width:1.4em; text-align:right; }
.jb .jb-track .t { font-weight:600; font-size:.92rem; }
.jb .jb-track .n { color:var(--dim,#8b93a7); font-size:.78rem; }
.jb .jb-track .dur { margin-left:auto; color:var(--dim,#8b93a7); font-size:.8rem; }
.jb .jb-eq { display:none; gap:2px; align-items:flex-end; height:13px; width:15px; }
.jb .jb-track.playing .jb-eq { display:flex; }
.jb .jb-track.playing .idx { display:none; }
.jb .jb-eq i { width:3px; height:60%; background:var(--green,#7ee787); animation:jbeq .9s ease-in-out infinite; }
.jb .jb-eq i:nth-child(2) { animation-delay:.25s; height:100%; }
.jb .jb-eq i:nth-child(3) { animation-delay:.5s; }
.jb .jb-track.paused .jb-eq i { animation-play-state:paused; }
@keyframes jbeq { 0%,100% { transform:scaleY(.3);} 50% { transform:scaleY(1);} }
`;

export function mountJukebox(container, opts = {}) {
  const base = opts.base ?? '../demos/';
  if (!document.getElementById('jb-css')) {
    const st = document.createElement('style');
    st.id = 'jb-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  container.innerHTML = `
    <div class="jb">
      <canvas class="jb-viz" title="click to cycle visualizer"></canvas>
      <div class="jb-vizbar">
        <span style="color:var(--dim,#8b93a7); font-size:.72rem; margin-right:.3rem;">viz</span>
        <button class="jb-vmode on" data-m="wave">~ wave</button>
        <button class="jb-vmode" data-m="bars">|| bars</button>
        <button class="jb-vmode" data-m="rings">◎ rings</button>
      </div>
      <div class="jb-now">
        <div class="jb-title">pick a track</div>
        <div class="jb-time mono">--:-- / --:--</div>
      </div>
      <div class="jb-controls">
        <button class="jb-btn jb-prev" title="previous">⏮</button>
        <button class="jb-btn main jb-play" title="play/pause">▶</button>
        <button class="jb-btn jb-stop" title="stop">■</button>
        <button class="jb-btn jb-next" title="next">⏭</button>
        <span class="jb-hint">all tracks generated by the pipeline</span>
      </div>
      <details class="jb-list"${opts.collapsedPlaylist ? '' : ' open'}>
        <summary>playlist · ${TRACKS.length} tracks</summary>
        <div class="jb-rows"></div>
      </details>
    </div>`;

  const q = (sel) => container.querySelector(sel);
  const rows = q('.jb-rows');
  TRACKS.forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'jb-track';
    row.innerHTML = `<span class="idx mono">${i + 1}</span>
      <span class="jb-eq"><i></i><i></i><i></i></span>
      <span><div class="t">${t.title}</div><div class="n">${t.note}</div></span>
      <span class="dur mono"></span>`;
    row.addEventListener('click', () => playTrack(i));
    rows.appendChild(row);
  });

  let player = null, analyser = null, timeData = null, freqData = null;
  let cur = -1, state = 'stopped', dur = 0, pos = 0, lastStart = 0;

  const fmt = (s) => (isNaN(s) || s === undefined) ? '--:--' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const updateNow = () => { q('.jb-time').textContent = `${fmt(state === 'stopped' ? NaN : pos)} / ${fmt(dur || NaN)}`; };
  const markRows = () => {
    [...rows.children].forEach((row, i) => {
      row.classList.toggle('current', i === cur);
      row.classList.toggle('playing', i === cur && state !== 'stopped');
      row.classList.toggle('paused', i === cur && state === 'paused');
    });
  };

  async function ensurePlayer() {
    if (player) return;
    // AudioWorklet requires a secure context — plain http gets a clear hint
    if (!window.isSecureContext || !('audioWorklet' in (window.AudioContext?.prototype ?? {}))) {
      q('.jb-title').innerHTML = `⚠ audio needs HTTPS — try <a href="https://${location.host}${location.pathname}">https://${location.host}</a>`;
      throw new Error('secure context required for AudioWorklet');
    }
    player = new ChiptuneJsPlayer({ repeatCount: 0 });
    await new Promise((r) => player.onInitialized(r));
    analyser = player.context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.82;
    timeData = new Float32Array(analyser.fftSize);
    freqData = new Uint8Array(analyser.frequencyBinCount);
    player.gain.connect(analyser);
    player.onMetadata((m) => {
      dur = m.dur;
      if (cur >= 0) rows.children[cur].querySelector('.dur').textContent = fmt(m.dur);
      updateNow();
    });
    player.onProgress((d) => { pos = d.pos; updateNow(); });
    // worklet spams 'end' every tick once finished — dead-zone guard prevents skips
    player.onEnded(() => {
      if (state !== 'playing' || Date.now() - lastStart < 1500) return;
      playTrack((cur + 1) % TRACKS.length);
    });
  }

  async function playTrack(i) {
    try { await ensurePlayer(); } catch { return; } // message already shown
    if (player.context.state === 'suspended') await player.context.resume();
    cur = i;
    lastStart = Date.now();
    pos = 0; dur = 0;
    const buf = await (await fetch(base + TRACKS[i].file)).arrayBuffer();
    player.play(buf);
    state = 'playing';
    q('.jb-play').textContent = '⏸';
    q('.jb-title').textContent = TRACKS[i].title;
    markRows();
  }
  function togglePlay() {
    if (state === 'stopped') { playTrack(cur < 0 ? 0 : cur); return; }
    if (state === 'playing') { player.pause(); state = 'paused'; q('.jb-play').textContent = '▶'; }
    else { player.unpause(); state = 'playing'; q('.jb-play').textContent = '⏸'; }
    markRows();
  }
  function stopAll() {
    if (player) player.stop();
    state = 'stopped'; pos = 0;
    q('.jb-play').textContent = '▶';
    updateNow(); markRows();
  }

  q('.jb-play').addEventListener('click', togglePlay);
  q('.jb-stop').addEventListener('click', stopAll);
  q('.jb-next').addEventListener('click', () => playTrack(((cur < 0 ? -1 : cur) + 1) % TRACKS.length));
  q('.jb-prev').addEventListener('click', () => playTrack(((cur < 0 ? 1 : cur) - 1 + TRACKS.length) % TRACKS.length));
  if (opts.keyboard) {
    addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !/input|button|select|textarea/i.test(e.target.tagName)) { e.preventDefault(); togglePlay(); }
    });
  }

  // ---------- visualizers ----------
  const viz = q('.jb-viz');
  const MODES = ['wave', 'bars', 'rings'];
  let mode = opts.mode || 'wave';
  let ringPhase = 0;
  const barPeaks = [];
  const setMode = (m) => {
    mode = m;
    container.querySelectorAll('.jb-vmode').forEach((b) => b.classList.toggle('on', b.dataset.m === m));
  };
  container.querySelectorAll('.jb-vmode').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.m)));
  viz.addEventListener('click', () => setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]));
  setMode(mode);

  const fit = (c) => {
    const r = c.getBoundingClientRect();
    const dpr = devicePixelRatio || 1;
    if (c.width !== Math.round(r.width * dpr)) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
    return { w: r.width, h: r.height, dpr };
  };
  const grad3 = (ctx, w) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#4fc1ff'); g.addColorStop(.5, '#ff5ac0'); g.addColorStop(1, '#e0a458');
    return g;
  };

  function draw() {
    requestAnimationFrame(draw);
    const { w, h, dpr } = fit(viz);
    const ctx = viz.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const live = state === 'playing' && analyser;

    if (mode === 'bars') ctx.clearRect(0, 0, w, h);
    else { ctx.fillStyle = 'rgba(10,12,16,.28)'; ctx.fillRect(0, 0, w, h); }

    if (live) { analyser.getFloatTimeDomainData(timeData); analyser.getByteFrequencyData(freqData); }
    else { timeData && timeData.fill(0); freqData && freqData.fill(0); }

    if (mode === 'wave') {
      ctx.strokeStyle = grad3(ctx, w);
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(79,193,255,.6)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      const n = timeData ? timeData.length : 2;
      for (let x = 0; x <= w; x += 2) {
        const v = timeData ? timeData[Math.floor(x / w * (n - 1))] : 0;
        const y = h / 2 - v * h * 0.42;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (mode === 'bars') {
      const N = 48;
      const bw = w / N;
      const bins = freqData ? Math.floor(freqData.length * 0.72) : N;
      for (let i = 0; i < N; i++) {
        let v = 0;
        if (freqData) {
          const a = Math.floor(i / N * bins), b = Math.floor((i + 1) / N * bins);
          for (let j = a; j < Math.max(b, a + 1); j++) v = Math.max(v, freqData[j]);
          v /= 255;
        }
        const bh = v * (h - 16);
        ctx.fillStyle = `hsla(${190 + (i / N) * 130}, 80%, 60%, .9)`;
        ctx.fillRect(i * bw + 1, h - bh, bw - 2, bh);
        barPeaks[i] = Math.max(bh, (barPeaks[i] || 0) - 1.6);
        ctx.fillStyle = 'rgba(230,233,239,.85)';
        ctx.fillRect(i * bw + 1, h - barPeaks[i] - 3, bw - 2, 2);
      }
    } else {
      ringPhase += 0.0035;
      const cx = w / 2, cy = h / 2;
      let bass = 0;
      if (freqData) { for (let i = 0; i < 24; i++) bass += freqData[i]; bass /= 24 * 255; }
      const R = Math.min(w, h) * 0.28 + bass * 14;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * (0.55 + bass * 0.5));
      glow.addColorStop(0, `rgba(224,164,88,${0.25 + bass * 0.55})`);
      glow.addColorStop(1, 'rgba(224,164,88,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = grad3(ctx, w);
      ctx.lineWidth = 1.8;
      ctx.shadowColor = 'rgba(255,90,192,.55)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      const STEPS = 256;
      const n = timeData ? timeData.length : 2;
      for (let i = 0; i <= STEPS; i++) {
        const th = (i / STEPS) * Math.PI * 2 + ringPhase;
        const v = timeData ? timeData[Math.floor(i / STEPS * (n - 1))] : 0;
        const rr = R + v * h * 0.3;
        i === 0 ? ctx.moveTo(cx + Math.cos(th) * rr, cy + Math.sin(th) * rr)
                : ctx.lineTo(cx + Math.cos(th) * rr, cy + Math.sin(th) * rr);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
  draw();

  return { playTrack, togglePlay, stopAll, get state() { return state; } };
}
