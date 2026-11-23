// ---------- synthesized sound (no audio files) ----------
const Sound = {
  ctx: null,
  master: null,

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },

  on() { return !!(this.ctx && WR.state && WR.state.settings.sound); },

  tone(freq, start, dur, type = 'sine', vol = 1, slideTo) {
    const t0 = this.ctx.currentTime + start;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  },

  play(name) {
    if (!this.on()) return;
    try {
      switch (name) {
        case 'tap': this.tone(660, 0, 0.06, 'triangle', 0.35); break;
        case 'right': this.tone(784, 0, 0.14, 'triangle', 0.8); this.tone(1175, 0.09, 0.22, 'triangle', 0.7); break;
        case 'wrong': this.tone(220, 0, 0.22, 'sawtooth', 0.35, 150); this.tone(196, 0.12, 0.25, 'square', 0.18, 140); break;
        case 'part': this.tone(523, 0, 0.12, 'triangle', 0.6); this.tone(494, 0.1, 0.18, 'triangle', 0.5); break;
        case 'beep': this.tone(1046, 0, 0.07, 'sine', 0.25); break;
        case 'alarm': [0, 0.28, 0.56].forEach((s) => this.tone(880, s, 0.18, 'square', 0.35, 660)); break;
        case 'hit': this.tone(180, 0, 0.18, 'square', 0.5, 70); this.tone(900, 0, 0.08, 'triangle', 0.5); break;
        case 'heal': this.tone(392, 0, 0.3, 'sine', 0.5, 784); break;
        case 'coffee': this.tone(587, 0, 0.12, 'sine', 0.6); this.tone(880, 0.1, 0.2, 'sine', 0.6); break;
        case 'colleague': this.tone(440, 0, 0.1, 'triangle', 0.5); this.tone(554, 0.08, 0.1, 'triangle', 0.5); break;
        case 'door': this.tone(300, 0, 0.12, 'triangle', 0.3, 420); break;
        case 'win': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, i * 0.11, 0.3, 'triangle', 0.7)); break;
        case 'rank': [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, i * 0.09, 0.32, 'triangle', 0.6)); break;
        case 'lose': [392, 349, 311, 262].forEach((f, i) => this.tone(f, i * 0.16, 0.3, 'triangle', 0.5)); break;
        case 'badge': this.tone(988, 0, 0.12, 'sine', 0.6); this.tone(1318, 0.1, 0.3, 'sine', 0.6); break;
      }
    } catch (e) { /* audio is optional */ }
  },
};
