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
    this.c = canvas; this.hrEl = hrEl; this.mon = monitorEl;
    this.ctx = canvas.getContext('2d');
    this.stress = 0.15; this.shown = 0.15;
    this.phase = 0; this.x = 0; this.ys = []; this.beep = false;
    this.lastBpm = 0;
    this.resize();
    this.off = Loop.add((dt) => this.tick(dt));
  }
  resize() {
    const r = this.c.getBoundingClientRect();
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    this.w = Math.max(40, Math.round(r.width)); this.h = Math.max(30, Math.round(r.height));
    this.c.width = this.w * dpr; this.c.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ys = new Array(this.w).fill(this.h * 0.62);
    this.x = 0;
  }
  bpm() { return Math.round(62 + 92 * this.shown); }
  color() { return this.shown > 0.72 ? '#ff4757' : this.shown > 0.45 ? '#f6bd52' : '#52f0a4'; }
  tick(dt) {
    if (!this.c.isConnected) { this.destroy(); return; }
    this.shown += (this.stress - this.shown) * Math.min(1, dt * 1.5);
    const bpm = this.bpm();
    if (bpm !== this.lastBpm) {
      this.lastBpm = bpm;
      if (this.hrEl) this.hrEl.textContent = bpm;
      if (this.mon) { this.mon.classList.toggle('amber', this.shown > 0.45 && this.shown <= 0.72); this.mon.classList.toggle('red', this.shown > 0.72); }
    }
    const still = reducedMotion();
    const speed = this.w / 3.2; // one sweep every ~3 s
    const adv = still ? 0 : speed * dt;
    const base = this.h * 0.62, amp = this.h * 0.5;
    let n = Math.max(1, Math.round(adv));
    if (still && !this.drewStill) { this.drawStill(); this.drewStill = true; return; }
    if (still) return;
    this.drewStill = false;
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
    const base = this.h * 0.62, amp = this.h * 0.5;
    for (let x = 0; x < this.w; x++) this.ys[x] = base - amp * pqrst(((x / this.w) * 3.2 * (this.bpm() / 60)) % 1);
    this.x = this.w - 1;
    this.draw(true);
  }
  draw(noGap) {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(82,240,164,.08)'; ctx.lineWidth = 1;
    for (let gx = 0; gx < w; gx += 16) { ctx.beginPath(); ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, h); ctx.stroke(); }
    for (let gy = 0; gy < h; gy += 16) { ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(w, gy + 0.5); ctx.stroke(); }
    const col = this.color();
    ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    ctx.shadowColor = col; ctx.shadowBlur = 6;
    const gap = noGap ? 0 : 14;
    ctx.beginPath();
    let pen = false;
    for (let x = 0; x < w; x++) {
      const d = (x - this.x + w) % w;
      if (d > 0 && d <= gap) { pen = false; continue; }
      if (!pen) { ctx.moveTo(x, this.ys[x]); pen = true; } else ctx.lineTo(x, this.ys[x]);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (!noGap) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(this.x, this.ys[this.x], 2.6, 0, Math.PI * 2); ctx.fill(); }
  }
  destroy() { if (this.off) this.off(); this.off = null; }
}

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
    setTimeout(() => el.remove(), 1300);
  },

  shake(el) {
    if (!el || reducedMotion()) return;
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 600);
  },

  flash(kind) {
    const layer = this.layer();
    if (!layer || reducedMotion()) return;
    const el = document.createElement('div');
    el.className = 'screen-flash ' + kind;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 500);
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
      ctx.clearRect(0, 0, W, H);
      for (const p of ps) {
        p.vy += 1400 * dt; p.vx *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col;
        if (p.shape === 'c') { ctx.beginPath(); ctx.arc(0, 0, p.r * 0.6, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.r, -p.r / 2.5, p.r * 2, p.r / 1.25);
        ctx.restore();
      }
      if (life > 3.2) { off(); c.remove(); }
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
