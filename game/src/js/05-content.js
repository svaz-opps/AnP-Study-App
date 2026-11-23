// ---------- content: sections + question bank ----------
const Content = {
  data: null,
  byId: {},
  byUnit: {},
  units: [],
  unitById: {},
  sections: {},

  async load() {
    let data;
    const inline = document.getElementById('wr-data');
    if (inline) {
      data = JSON.parse(inline.textContent);
    } else {
      const res = await fetch('data.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Could not load the question bank (' + res.status + ').');
      data = await res.json();
    }
    this.data = data;
    this.units = data.units;
    this.sections = data.sections;
    data.units.forEach((u) => { this.unitById[u.id] = u; this.byUnit[u.id] = []; });
    data.questions.forEach((q) => {
      this.byId[q.id] = q;
      (this.byUnit[q.unit] = this.byUnit[q.unit] || []).push(q);
    });
  },

  all() { return this.data.questions; },
  unitLabel(uid) { const u = this.unitById[uid]; return u ? `Room ${u.room} · ${u.ward}` : ''; },
  section(sid) { return this.sections[sid]; },
  // single-tap types work under a ticking clock
  isQuick(q) { return q.type === 'mcq' || q.type === 'priority' || q.type === 'teaching' || q.type === 'math'; },
};

const TYPE_INFO = {
  mcq: { label: 'Single answer', base: 100, tip: 'Read the last line of the question first, so you know exactly what it is asking. Then predict the answer before you look at the options.' },
  sata: { label: 'Select all that apply', base: 150, tip: 'Treat every option as its own true-or-false question. There can be 2 correct answers or all of them.' },
  priority: { label: 'Who do you see first?', base: 150, tip: 'Airway, breathing, circulation first. Acute before chronic, unstable before stable, physical needs before teaching.' },
  teaching: { label: 'Needs more teaching', base: 150, tip: '"Needs further teaching" means you are hunting for the WRONG statement. Three options are correct facts.' },
  order: { label: 'Put in order', base: 150, tip: 'Find the obvious first and last steps, then fill in the middle.' },
  math: { label: 'Med math', base: 200, tip: 'Desired over Have, times Quantity. Then check that your answer makes sense.' },
};
