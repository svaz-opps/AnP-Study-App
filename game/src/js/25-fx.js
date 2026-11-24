// ---------- one animation loop for everything that ticks ----------
const Loop = {
  fns: new Set(),
  running: false,
  last: 0,
  add(fn) { this.fns.add(fn); this.start(); return () => this.fns.delete(fn); },
  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const step = (t) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      if (!document.hidden) this.fns.forEach((fn) => { try { fn(dt, t); } catch (e) { console.error(e); } });
      if (this.fns.size) requestAnimationFrame(step); else this.running = false;
    };
    requestAnimationFrame(step);
  },
};

// ---------- ECG monitor ----------
function gauss(t, mu, sd) { return Math.exp(-((t - mu) ** 2) / (2 * sd * sd)); }
function pqrst(t) {
  return 0.12 * gauss(t, 0.16, 0.025) - 0.14 * gauss(t, 0.27, 0.008) + 1.0 * gauss(t, 0.30, 0.011)
    - 0.28 * gauss(t, 0.335, 0.011) + 0.26 * gauss(t, 0.56, 0.045);
}

class ECG {
  constructor(canvas, hrEl, monitorEl) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.stress = 0.15; this.shown = 0.15;
    this.phase = 0; this.x = 0; this.ys = []; this.beep = false;
    this.w = 0; this.h = 0;
    this.rebind(hrEl, monitorEl);
    // A ResizeObserver reports the canvas size after the browser's own layout, so measuring
    // it never forces an extra layout. Older browsers fall back to measuring directly.
    if (window.ResizeObserver) {
      this.ro = new ResizeObserver((entries) => {
        const r = entries[0].contentRect;
        this.resize(r.width, r.height);
      });
      this.ro.observe(canvas);
    } else {
      this.resize();
    }
    this.off = Loop.add((dt) => this.tick(dt));
  }

  // point the readout at a new screen's HR number and monitor frame (the canvas moves with
  // the round from patient to patient, so the trace keeps running instead of restarting)
  rebind(hrEl, monitorEl) {
    this.hrEl = hrEl; this.mon = monitorEl;
    this.lastBpm = 0;
  }

  resize(cssW, cssH) {
    if (cssW == null) { const r = this.c.getBoundingClientRect(); cssW = r.width; cssH = r.height; }
    const w = Math.max(40, Math.round(cssW)), h = Math.max(30, Math.round(cssH));
    if (w === this.w && h === this.h) return;
    const dpr = Math.min(CONFIG.monitor.maxPixelRatio, window.devicePixelRatio || 1);
    this.w = w; this.h = h;
    this.c.width = w * dpr; this.c.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ys = new Array(w).fill(h * ECG.BASELINE);
    this.x = 0;
    this.drewStill = false;
    this.grid = this.makeGrid(w, h, dpr);
  }

  // the faint graph-paper grid, drawn once per size instead of every frame
  makeGrid(w, h, dpr) {
    const g = document.createElement('canvas');
    g.width = w * dpr; g.height = h * dpr;
    const ctx = g.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = 'rgba(82,240,164,.08)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx < w; gx += ECG.GRID) { ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, h); }
    for (let gy = 0; gy < h; gy += ECG.GRID) { ctx.moveTo(0, gy + 0.5); ctx.lineTo(w, gy + 0.5); }
    ctx.stroke();
    return g;
  }

  bpm() { const M = CONFIG.monitor; return Math.round(M.bpmCalm + (M.bpmMax - M.bpmCalm) * this.shown); }
  color() {
    const M = CONFIG.monitor;
    return this.shown > M.redAt ? '#ff4757' : this.shown > M.amberAt ? '#f6bd52' : '#52f0a4';
  }

  tick(dt) {
    const M = CONFIG.monitor;
    if (!this.c.isConnected) { this.destroy(); return; }
    if (!this.w || App.modalOpen()) return; // not sized yet, or paused under a dialog
    this.shown += (this.stress - this.shown) * Math.min(1, dt * 1.5);
    const bpm = this.bpm();
    if (bpm !== this.lastBpm) {
      this.lastBpm = bpm;
      if (this.hrEl) this.hrEl.textContent = bpm;
      if (this.mon) {
        this.mon.classList.toggle('amber', this.shown > M.amberAt && this.shown <= M.redAt);
        this.mon.classList.toggle('red', this.shown > M.redAt);
      }
    }
    if (calmChosen()) {
      if (!this.drewStill) { this.drawStill(); this.drewStill = true; }
      return;
    }
    this.drewStill = false;
    const base = this.h * ECG.BASELINE, amp = this.h * ECG.AMPLITUDE;
    const adv = (this.w / M.sweepSeconds) * dt; // pixels to advance this frame
    const n = Math.max(1, Math.round(adv));
    for (let i = 0; i < n; i++) {
      const prev = this.phase;
      this.phase = (this.phase + (bpm / 60) * (dt / n)) % 1;
      if (this.beep && prev < 0.3 && this.phase >= 0.3) Sound.play('beep');
      this.x = (this.x + 1) % this.w;
      this.ys[this.x] = base - amp * pqrst(this.phase);
    }
    this.draw();
  }

  drawStill() {
    const M = CONFIG.monitor;
    const base = this.h * ECG.BASELINE, amp = this.h * ECG.AMPLITUDE, beats = M.sweepSeconds * (this.bpm() / 60);
    for (let x = 0; x < this.w; x++) this.ys[x] = base - amp * pqrst(((x / this.w) * beats) % 1);
    this.x = this.w - 1;
    this.draw(true);
  }

  draw(noGap) {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.grid, 0, 0, w, h);
    // the trace, with a gap just ahead of the pen like a real sweep monitor
    const gap = noGap ? 0 : ECG.GAP;
    const path = new Path2D();
    let pen = false;
    for (let x = 0; x < w; x++) {
      const d = (x - this.x + w) % w;
      if (d > 0 && d <= gap) { pen = false; continue; }
      if (!pen) { path.moveTo(x, this.ys[x]); pen = true; } else path.lineTo(x, this.ys[x]);
    }
    // glow: two wide faint strokes under the line (canvas shadowBlur looks the same but is slow on iPad)
    const col = this.color();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = col;
    ctx.globalAlpha = 0.12; ctx.lineWidth = 10; ctx.stroke(path);
    ctx.globalAlpha = 0.28; ctx.lineWidth = 5; ctx.stroke(path);
    ctx.globalAlpha = 1; ctx.lineWidth = 2.2; ctx.stroke(path);
    if (!noGap) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(this.x, this.ys[this.x], 2.6, 0, Math.PI * 2); ctx.fill(); }
  }

  destroy() {
    if (this.off) this.off();
    this.off = null;
    if (this.ro) { this.ro.disconnect(); this.ro = null; }
  }
}
// drawing geometry (fractions of the canvas height, pixels for the grid and the gap)
ECG.BASELINE = 0.62;
ECG.AMPLITUDE = 0.5;
ECG.GRID = 16;
ECG.GAP = 14;

// ---------- floating text, shake, confetti ----------
const FX = {
  layer() { return document.getElementById('fx-layer'); },

  float(text, anchor, cls = '') {
    const layer = this.layer();
    if (!layer || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'float-text ' + cls;
    el.textContent = text;
    el.style.left = r.left + r.width / 2 + 'px';
    el.style.top = r.top + r.height / 3 + 'px';
    layer.appendChild(el);
    setTimeout(() => el.remove(), CONFIG.timing.floatTextMs);
  },

  shake(el) {
    if (!el || reducedMotion()) return;
    replayClass(el, 'shake');
    setTimeout(() => el.classList.remove('shake'), 650);
  },

  flash(kind) {
    const layer = this.layer();
    if (!layer || reducedMotion()) return;
    const el = document.createElement('div');
    el.className = 'screen-flash ' + kind;
    layer.appendChild(el);
    setTimeout(() => el.remove(), CONFIG.timing.flashMs);
  },

  confetti(amount = 140) {
    if (reducedMotion()) return;
    const layer = this.layer();
    const c = document.createElement('canvas');
    c.className = 'confetti';
    layer.appendChild(c);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth, H = window.innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ['#5cd6c0', '#f6bd52', '#ff6b7a', '#8fa8ff', '#52f0a4', '#ffffff', '#e7889f'];
    const ps = Array.from({ length: amount }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35,
      vx: (Math.random() - 0.5) * 900, vy: -Math.random() * 900 - 250,
      r: 4 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12,
      col: pick(colors), shape: Math.random() < 0.3 ? 'c' : 'r',
    }));
    let life = 0;
    const off = Loop.add((dt) => {
      life += dt;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (const p of ps) {
        p.vy += 1400 * dt; p.vx *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        // move + rotate in one call (cheaper than save/translate/rotate/restore per piece)
        const cos = Math.cos(p.rot) * dpr, sin = Math.sin(p.rot) * dpr;
        ctx.setTransform(cos, sin, -sin, cos, p.x * dpr, p.y * dpr);
        ctx.fillStyle = p.col;
        if (p.shape === 'c') { ctx.beginPath(); ctx.arc(0, 0, p.r * 0.6, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.r, -p.r / 2.5, p.r * 2, p.r / 1.25);
      }
      if (life > CONFIG.timing.confettiSeconds) { off(); c.remove(); }
    });
  },

  projectile(from, to, color) {
    if (!from || !to || reducedMotion()) return Promise.resolve();
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'projectile';
    if (color) el.style.background = `radial-gradient(circle, #fff, ${color} 60%, transparent 70%)`;
    this.layer().appendChild(el);
    const x0 = a.left + a.width * 0.7, y0 = a.top + a.height * 0.4, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
    el.style.left = '0px'; el.style.top = '0px';
    const anim = el.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(.6)` },
      { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 60}px) scale(1.1)` },
      { transform: `translate(${x1}px, ${y1}px) scale(1.4)`, opacity: 0.9 },
    ], { duration: 420, easing: 'ease-in' });
    return anim.finished.then(() => el.remove()).catch(() => el.remove());
  },
};
