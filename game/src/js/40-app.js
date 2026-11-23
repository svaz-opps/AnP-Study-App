// ---------- app shell: router, size classes, modals, toasts ----------
const Screens = {};

const App = {
  name: null,
  params: null,
  run: null,
  size: null,
  layout: null,
  el: null,

  measure() {
    const w = window.innerWidth, h = window.innerHeight;
    const size = w >= 1000 ? 'wide' : w >= 700 ? 'regular' : 'compact';
    const layout = size === 'wide' && w > h ? 'h' : 'v';
    const changed = size !== this.size || layout !== this.layout;
    this.size = size; this.layout = layout;
    document.documentElement.dataset.size = size;
    document.documentElement.dataset.layout = layout;
    return changed;
  },

  show(name, params = {}, anim = '') {
    const root = document.getElementById('app');
    const old = this.el;
    const scr = Screens[name];
    if (this.name && Screens[this.name] && Screens[this.name].leave) Screens[this.name].leave();
    this.name = name; this.params = params;
    const sec = document.createElement('section');
    sec.className = 'screen ' + (scr.cls || name) + (anim ? ' ' + anim : '');
    sec.setAttribute('data-screen', name);
    sec.innerHTML = scr.render(params);
    if (old) {
      old.classList.add('leaving');
      setTimeout(() => old.remove(), 220);
      root.appendChild(sec);
    } else {
      root.innerHTML = '';
      root.appendChild(sec);
    }
    this.el = sec;
    if (scr.mount) scr.mount(sec, params);
    const focusEl = sec.querySelector('[data-autofocus]') || sec.querySelector('h1');
    if (focusEl && focusEl.focus && !('ontouchstart' in window)) focusEl.focus({ preventScroll: true });
    Store.saveRun();
  },

  rerender() {
    if (!this.name) return;
    const scr = Screens[this.name];
    if (scr.leave) scr.leave();
    const sec = this.el;
    const y = sec.scrollTop;
    sec.className = 'screen ' + (scr.cls || this.name);
    sec.innerHTML = scr.render(this.params);
    if (scr.mount) scr.mount(sec, this.params);
    sec.scrollTop = y;
  },

  act(action, data, el, ev) {
    Sound.unlock();
    const scr = Screens[this.name];
    let out;
    if (scr && scr.act && scr.act[action]) out = scr.act[action](data, el, ev);
    else if (Global[action]) out = Global[action](data, el, ev);
    if (App.run) Store.saveRun();
    return out;
  },

  toast(text, ms = 2600) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms);
  },

  modal(html, onAct) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="modal-backdrop" data-modal-bg><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
    const bg = root.firstChild;
    const close = () => { root.innerHTML = ''; };
    bg.addEventListener('click', (e) => {
      if (e.target === bg) { close(); return; }
      const b = e.target.closest('[data-m]');
      if (!b) return;
      Sound.unlock();
      const keep = onAct ? onAct(b.dataset.m, b, close) : false;
      if (!keep) close();
    });
    const first = bg.querySelector('[data-autofocus]') || bg.querySelector('button');
    if (first) first.focus({ preventScroll: true });
    return close;
  },

  confirm(title, body, okLabel, danger) {
    return new Promise((resolve) => {
      this.modal(`<h2>${esc(title)}</h2><p class="dim">${esc(body)}</p>
        <div class="actions"><button class="btn" data-m="no">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-m="yes">${esc(okLabel)}</button></div>`,
      (m) => { resolve(m === 'yes'); return false; });
    });
  },
};

// actions available on every screen
const Global = {
  home() { App.run = null; App.show('floor'); },
  locker() { App.show('locker'); },
  stats() { App.show('stats'); },
  settings() { App.show('settings'); },
  missed() { App.show('missed'); },
};

function celebrate(run) {
  if (run.rankUp != null) {
    Sound.play('rank');
    FX.confetti(180);
    App.toast(`Promoted to ${RANKS[run.rankUp].n}!`, 3200);
    run.rankUp = null;
  }
}

function badgeToast(ids) {
  ids.forEach((id, k) => {
    const b = BADGES.find((x) => x.id === id);
    if (!b) return;
    setTimeout(() => { Sound.play('badge'); App.toast(`Badge earned: ${b.n}`); }, 600 + k * 1400);
  });
}
