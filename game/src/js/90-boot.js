// ---------- boot ----------
function bindEvents() {
  const root = document.getElementById('app');
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b || !root.contains(b) || b.disabled) return;
    App.act(b.dataset.action, b.dataset, b, e);
  });
  document.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (App.name === 'chart') Screens.chart.key(e);
    if (e.key === 'Escape') { const m = document.getElementById('modal-root'); if (m.firstChild) m.innerHTML = ''; }
  });
  const onResize = debounce(() => {
    const changed = App.measure();
    if (changed) App.rerender();
    else {
      if (App.name === 'chart' && Screens.chart.ecg) Screens.chart.ecg.resize();
      if (App.name === 'floor') Screens.floor.placeWalker(false);
    }
  }, 150);
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (App.run) Store.saveRun(); Store._local.flush(); Store._cloud.flush(); } });
  window.addEventListener('pagehide', () => { if (App.run) Store.saveRun(); Store._local.flush(); });
  ['pointerdown', 'keydown'].forEach((t) => window.addEventListener(t, () => Sound.unlock(), { once: true, passive: true }));
}

Object.assign(WR, { App, Engine, Content, Store, Screens, Whimsy, Run });

async function start(hot) {
  App.measure();
  try {
    await Content.load();
  } catch (e) {
    document.getElementById('app').innerHTML = `<div class="boot"><p>${esc(e.message || 'Could not load the game.')}</p><button class="btn primary" onclick="location.reload()">Try again</button></div>`;
    return;
  }
  Store.init();
  applySettings();
  WR.debug = location.hash === '#debug';
  bindEvents();
  Store.onChange(() => {
    applySettings();
    if (App.name === 'floor' || App.name === 'stats' || App.name === 'missed' || App.name === 'locker' || App.name === 'cards') App.rerender();
  });
  if (hot && hot.run && hot.screen) {
    try {
      App.run = Run.restore(hot.run);
      App.show(hot.screen === 'chart' && App.run.cur ? 'chart' : hot.screen === 'report' ? 'report' : 'floor');
      return;
    } catch (e) { App.run = null; }
  }
  if (!WR.state.profile.onboarded) { App.show('onboard', { step: 0 }); return; }
  const saved = WR.state.openRun;
  let run = null;
  try { run = saved && Run.resume(saved.run); } catch (e) { run = null; }
  if (!run) {
    if (WR.state.openRun) { WR.state.openRun = null; Store.save(); }
    App.show('floor');
    return;
  }
  Store.holdRun = true;
  App.show('floor');
  offerResume(run);
}

function offerResume(run) {
  const title = run.mode === 'shift' ? Content.unitLabel(run.unit) : run.mode === 'review' ? run.label || 'Missed patients' : MODE_TITLE[run.mode];
  const where = run.total ? `Patient ${run.idx + 1} of ${run.total}` : `Patient ${run.idx + 1}`;
  const extra = run.mode === 'codeblue' ? ` · ${Math.ceil(run.timeLeft)}s left` : run.maxLives ? ` · ${run.lives} of ${run.maxLives} lives` : '';
  App.modal(`<h2>Pick up where you left off?</h2>
    <p class="dim">Your round was autosaved: <b>${esc(title)}</b>, ${where}${extra}. Score ${fmt(run.score)}.</p>
    <div class="actions"><button class="btn" data-m="drop">Discard round</button><button class="btn primary" data-m="go" data-autofocus>Resume</button></div>`,
  (m) => {
    Store.holdRun = false;
    if (m === 'go') {
      App.run = run;
      if (run.mode === 'codeblue') Sound.play('alarm');
      App.show('chart', {}, 'zoom-in');
    } else {
      // answers already given stay saved; timed/boss rounds still count, as with Leave
      if (run.mode === 'codeblue' || run.mode === 'boss') run.finish();
      WR.state.openRun = null;
      Store.save({ now: true });
      App.toast('Round discarded. Answers you gave are still saved.');
    }
    return false;
  });
}

(function boot() {
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) {
    try { hot.snapshot(() => ({ screen: App.name, run: App.run ? App.run.serialize() : null })); } catch (e) { /* optional */ }
  }
  const go = (data) => { start(data || {}); };
  if (hot && hot.ready) hot.ready(go); else go(hot && hot.data);
})();
