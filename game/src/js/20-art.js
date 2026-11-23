// ---------- art: nurse avatar, patients, boss (all inline SVG) ----------
const AVATAR = {
  skin: ['#fde3cf', '#f6cba8', '#e6b08a', '#cf946b', '#ad7149', '#8a5534', '#6a3e24', '#4a2b19'],
  hairColor: [
    { n: 'Black', c: '#1f1b19' }, { n: 'Dark brown', c: '#3d2b20' }, { n: 'Brown', c: '#6e4729' }, { n: 'Auburn', c: '#a3542f' },
    { n: 'Blonde', c: '#d8a85c' }, { n: 'Platinum', c: '#ecdcb0' }, { n: 'Silver', c: '#b7bcc8' }, { n: 'Pink', c: '#e07aa8' },
  ],
  hijab: ['#2c4a7a', '#2aa198', '#8e2f4f', '#2b2f36', '#a68bd6', '#d8c3a0', '#7fb3e0', '#e79ab7'],
  hair: ['Bun', 'Ponytail', 'Bob', 'Long', 'Curls', 'Short', 'Braids', 'Hijab'],
  eyes: ['Dots', 'Sparkle', 'Lashes', 'Sleepy'],
  scrubs: [
    { n: 'Ceil blue', c: '#7fa9d9' }, { n: 'Navy', c: '#2f4d80' }, { n: 'Teal', c: '#22a093' }, { n: 'Wine', c: '#8e2f4f' },
    { n: 'Charcoal', c: '#33373f' }, { n: 'Lilac', c: '#a68bd6' }, { n: 'Rose', c: '#e7889f' }, { n: 'Hunter', c: '#2f6b4f' },
  ],
  pattern: ['Solid', 'Hearts', 'Stars', 'Paws', 'Dots', 'Bandages', 'Ducks'],
  shoes: [{ n: 'White', c: '#f4f6f8' }, { n: 'Black', c: '#2b2f36' }, { n: 'Mint', c: '#5cd6c0' }, { n: 'Pink', c: '#ee8fb0' }, { n: 'Sunny', c: '#f6bd52' }, { n: 'Sky', c: '#7fa9d9' }],
  acc: [
    { id: 'stethoscope', n: 'Stethoscope' }, { id: 'badge', n: 'Badge reel' }, { id: 'glasses', n: 'Glasses' },
    { id: 'cap', n: 'Scrub cap' }, { id: 'watch', n: 'Watch' }, { id: 'penlight', n: 'Penlight' }, { id: 'earrings', n: 'Earrings' },
    { id: 'partyhat', n: 'Party hat' },
  ],
};

// items that unlock through play (rank index or badge id)
const UNLOCKS = {
  'pattern:1': { rank: 1 }, 'pattern:2': { badge: 'streak10' }, 'pattern:3': { rank: 3 }, 'pattern:4': { badge: 'shift_perfect' }, 'pattern:5': { badge: 'boss' },
  'scrubs:6': { rank: 2 }, 'scrubs:7': { badge: 'codeblue' },
  'acc:cap': { rank: 1 }, 'acc:penlight': { badge: 'priority' }, 'acc:watch': { badge: 'shift3' },
  'hairColor:7': { rank: 4 }, 'shoes:4': { badge: 'daystreak3' },
  'acc:partyhat': { badge: 'daily3' }, 'pattern:6': { badge: 'daily7' },
};

function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt));
  r = f(r); g = f(g); b = f(b);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function face(cx, cy, mood, eyeStyle, scale = 1) {
  const s = scale, ex = 12 * s, ey = cy + 2 * s;
  let eyes = '';
  const dark = '#2a2230';
  if (mood === 'dizzy') {
    // spiral eyes: half-circle arcs of growing radius
    eyes = [cx - ex, cx + ex].map((x) => `<path d="M${x - 1 * s} ${ey} a${1 * s} ${1 * s} 0 1 1 ${2 * s} 0 a${2 * s} ${2 * s} 0 1 1 ${-4 * s} 0 a${3 * s} ${3 * s} 0 1 1 ${6 * s} 0 a${4 * s} ${4 * s} 0 1 1 ${-8 * s} 0" stroke="${dark}" stroke-width="${1.5 * s}" fill="none" stroke-linecap="round"/>`).join('');
  } else if (mood === 'starry') {
    eyes = [cx - ex, cx + ex].map((x) => `<path d="M${x} ${ey - 6 * s} l${1.8 * s} ${4 * s} ${4.2 * s} ${0.5 * s} -${3.1 * s} ${2.9 * s} ${0.9 * s} ${4.2 * s} -${3.8 * s} -${2.1 * s} -${3.8 * s} ${2.1 * s} ${0.9 * s} -${4.2 * s} -${3.1 * s} -${2.9 * s} ${4.2 * s} -${0.5 * s}z" fill="#ffd36b" stroke="${dark}" stroke-width="${1.1 * s}" stroke-linejoin="round"/>`).join('');
  } else if (mood === 'shock') {
    eyes = [cx - ex, cx + ex].map((x) => `<circle cx="${x}" cy="${ey}" r="${6 * s}" fill="#fff" stroke="${dark}" stroke-width="${1.6 * s}"/><circle cx="${x}" cy="${ey}" r="${1.8 * s}" fill="${dark}"/>`).join('');
  } else if (mood === 'cool') {
    eyes = `<path d="M${cx - ex - 8 * s} ${ey - 4 * s} h${16 * s} v${4 * s} q0 ${6 * s} ${-8 * s} ${6 * s} q${-8 * s} 0 ${-8 * s} ${-6 * s}z M${cx + ex - 8 * s} ${ey - 4 * s} h${16 * s} v${4 * s} q0 ${6 * s} ${-8 * s} ${6 * s} q${-8 * s} 0 ${-8 * s} ${-6 * s}z" fill="#1b1d2a"/><path d="M${cx - ex + 8 * s} ${ey - 3 * s} h${2 * ex - 16 * s}" stroke="#1b1d2a" stroke-width="${2 * s}"/><path d="M${cx - ex - 5 * s} ${ey - 2 * s} l${4 * s} 0" stroke="#fff" stroke-width="${1.4 * s}" stroke-linecap="round" opacity=".7"/>`;
  } else if (mood === 'silly') {
    eyes = `<path d="M${cx - ex - 5 * s} ${ey + 1 * s} q${5 * s} ${-6 * s} ${10 * s} 0" stroke="${dark}" stroke-width="${2.6 * s}" fill="none" stroke-linecap="round"/><ellipse cx="${cx + ex}" cy="${ey}" rx="${3.6 * s}" ry="${4.2 * s}" fill="${dark}"/><circle cx="${cx + ex + 1.2 * s}" cy="${ey - 1.3 * s}" r="${1.1 * s}" fill="#fff"/>`;
  } else if (mood === 'cheer' || mood === 'happy' && eyeStyle === 3) {
    eyes = `<path d="M${cx - ex - 5 * s} ${ey + 1 * s} q${5 * s} ${-6 * s} ${10 * s} 0 M${cx + ex - 5 * s} ${ey + 1 * s} q${5 * s} ${-6 * s} ${10 * s} 0" stroke="${dark}" stroke-width="${2.6 * s}" fill="none" stroke-linecap="round"/>`;
  } else if (eyeStyle === 3 || mood === 'sleepy') {
    eyes = `<path d="M${cx - ex - 5 * s} ${ey} q${5 * s} ${4 * s} ${10 * s} 0 M${cx + ex - 5 * s} ${ey} q${5 * s} ${4 * s} ${10 * s} 0" stroke="${dark}" stroke-width="${2.4 * s}" fill="none" stroke-linecap="round"/>`;
  } else {
    const r = (eyeStyle === 1 ? 5.2 : 4) * s;
    eyes = [cx - ex, cx + ex].map((x) => `<ellipse cx="${x}" cy="${ey}" rx="${r * 0.86}" ry="${r}" fill="${dark}"/>` +
      (eyeStyle === 1 ? `<circle cx="${x + 1.6 * s}" cy="${ey - 1.8 * s}" r="${1.7 * s}" fill="#fff"/><circle cx="${x - 1.4 * s}" cy="${ey + 1.6 * s}" r="${0.8 * s}" fill="#fff"/>` : `<circle cx="${x + 1.2 * s}" cy="${ey - 1.3 * s}" r="${1.1 * s}" fill="#fff"/>`) +
      (eyeStyle === 2 ? `<path d="M${x - 5 * s} ${ey - 4 * s} l-2.5 ${-2 * s} M${x + 5 * s} ${ey - 4 * s} l2.5 ${-2 * s}" stroke="${dark}" stroke-width="${1.6 * s}" stroke-linecap="round"/>` : '')).join('');
  }
  let brows = '';
  if (mood === 'worried' || mood === 'sad' || mood === 'shock') brows = `<path d="M${cx - ex - 5 * s} ${ey - 9 * s} l${9 * s} ${-3 * s} M${cx + ex + 5 * s} ${ey - 9 * s} l${-9 * s} ${-3 * s}" stroke="${dark}" stroke-width="${2 * s}" stroke-linecap="round" opacity=".75"/>`;
  else if (mood === 'focus') brows = `<path d="M${cx - ex - 5 * s} ${ey - 11 * s} l${9 * s} ${3 * s} M${cx + ex + 5 * s} ${ey - 11 * s} l${-9 * s} ${3 * s}" stroke="${dark}" stroke-width="${2.2 * s}" stroke-linecap="round" opacity=".8"/>`;
  const my = cy + 14 * s;
  let mouth;
  switch (mood) {
    case 'cheer': mouth = `<path d="M${cx - 7 * s} ${my - 1 * s} q${7 * s} ${10 * s} ${14 * s} 0 z" fill="#7a2b3a"/><path d="M${cx - 4 * s} ${my + 3.2 * s} q${4 * s} ${3 * s} ${8 * s} 0" fill="#ff8fa3"/>`; break;
    case 'happy': mouth = `<path d="M${cx - 6 * s} ${my} q${6 * s} ${7 * s} ${12 * s} 0" stroke="#7a2b3a" stroke-width="${2.4 * s}" fill="none" stroke-linecap="round"/>`; break;
    case 'worried': mouth = `<path d="M${cx - 5 * s} ${my + 3 * s} q${5 * s} ${-4 * s} ${10 * s} 0" stroke="#7a2b3a" stroke-width="${2.2 * s}" fill="none" stroke-linecap="round"/>`; break;
    case 'sad': mouth = `<path d="M${cx - 6 * s} ${my + 4 * s} q${6 * s} ${-6 * s} ${12 * s} 0" stroke="#7a2b3a" stroke-width="${2.4 * s}" fill="none" stroke-linecap="round"/>`; break;
    case 'focus': mouth = `<path d="M${cx - 5 * s} ${my + 1 * s} h${10 * s}" stroke="#7a2b3a" stroke-width="${2.4 * s}" stroke-linecap="round"/>`; break;
    case 'pain': mouth = `<path d="M${cx - 6 * s} ${my + 2 * s} l${3 * s} ${-2 * s} l${3 * s} ${2 * s} l${3 * s} ${-2 * s} l${3 * s} ${2 * s}" stroke="#7a2b3a" stroke-width="${2 * s}" fill="none" stroke-linejoin="round"/>`; break;
    case 'starry': mouth = `<path d="M${cx - 7 * s} ${my - 1 * s} q${7 * s} ${10 * s} ${14 * s} 0 z" fill="#7a2b3a"/>`; break;
    case 'shock': case 'dizzy': mouth = `<ellipse cx="${cx}" cy="${my + 2 * s}" rx="${4 * s}" ry="${5 * s}" fill="#7a2b3a"/>`; break;
    case 'cool': mouth = `<path d="M${cx - 5 * s} ${my + 1 * s} q${6 * s} ${4 * s} ${11 * s} ${-2 * s}" stroke="#7a2b3a" stroke-width="${2.4 * s}" fill="none" stroke-linecap="round"/>`; break;
    case 'silly': mouth = `<path d="M${cx - 6 * s} ${my} q${6 * s} ${7 * s} ${12 * s} 0" stroke="#7a2b3a" stroke-width="${2.4 * s}" fill="none" stroke-linecap="round"/><path d="M${cx - 1 * s} ${my + 3 * s} q${3 * s} ${7 * s} ${6 * s} 0z" fill="#ff8fa3" stroke="#7a2b3a" stroke-width="${1 * s}"/>`; break;
    default: mouth = `<path d="M${cx - 4 * s} ${my} q${4 * s} ${4 * s} ${8 * s} 0" stroke="#7a2b3a" stroke-width="${2.2 * s}" fill="none" stroke-linecap="round"/>`;
  }
  const blush = `<ellipse cx="${cx - 19 * s}" cy="${ey + 8 * s}" rx="${5 * s}" ry="${3 * s}" fill="#ff7f9c" opacity=".35"/><ellipse cx="${cx + 19 * s}" cy="${ey + 8 * s}" rx="${5 * s}" ry="${3 * s}" fill="#ff7f9c" opacity=".35"/>`;
  const extra = mood === 'worried' ? `<path d="M${cx + 27 * s} ${cy - 12 * s} q${-4 * s} ${7 * s} 0 ${9 * s} q${4 * s} ${-2 * s} 0 ${-9 * s}z" fill="#8fd3ff"/>` :
    mood === 'cheer' ? `<path d="M${cx - 34 * s} ${cy - 22 * s} l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#ffd36b"/>` : '';
  return blush + brows + eyes + mouth + extra;
}

function hairBack(style, col, cx, cy) {
  switch (style) {
    case 0: return `<circle cx="${cx}" cy="${cy - 38}" r="15" fill="${col}"/>`;
    case 1: return `<path d="M${cx + 26} ${cy - 18} q26 10 14 52 q-6 10 -12 2 q8 -30 -10 -46z" fill="${col}"/>`;
    case 2: return `<path d="M${cx - 37} ${cy - 4} q-2 30 10 34 h54 q12 -4 10 -34z" fill="${col}"/>`;
    case 3: return `<path d="M${cx - 37} ${cy - 6} q-6 50 6 66 h62 q12 -16 6 -66z" fill="${col}"/>`;
    case 4: return [[-30, -16], [30, -16], [-36, 4], [36, 4], [-30, 22], [30, 22], [-16, -32], [16, -32], [0, -38]].map(([x, y]) => `<circle cx="${cx + x}" cy="${cy + y}" r="15" fill="${col}"/>`).join('');
    case 6: return `<path d="M${cx - 35} ${cy - 10} q-6 40 2 62 M${cx - 27} ${cy - 8} q-4 40 2 64 M${cx + 35} ${cy - 10} q6 40 -2 62 M${cx + 27} ${cy - 8} q4 40 -2 64" stroke="${col}" stroke-width="8" stroke-linecap="round" fill="none"/>`;
    case 7: return `<path d="M${cx - 40} ${cy} q0 -46 40 -46 q40 0 40 46 q2 34 -14 50 h-52 q-16 -16 -14 -50z" fill="${col}"/>`;
    default: return '';
  }
}

function hairFront(style, col, cx, cy) {
  const shine = `<path d="M${cx - 18} ${cy - 26} q10 -8 22 -6" stroke="${lighten(col, 0.35)}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55"/>`;
  switch (style) {
    case 5: return `<path d="M${cx - 34} ${cy - 6} q2 -32 34 -32 q32 0 34 32 q-10 -16 -34 -18 q-24 2 -34 18z" fill="${col}"/>`;
    case 7: return `<path d="M${cx - 31} ${cy + 4} q0 -38 31 -38 q31 0 31 38" stroke="${lighten(col, -0.18)}" stroke-width="5" fill="none"/>`;
    case 4: return `<path d="M${cx - 34} ${cy - 2} q0 -36 34 -36 q34 0 34 36 q-6 -10 -14 -12 q-4 8 -12 2 q-8 8 -16 0 q-8 6 -12 -2 q-8 2 -14 12z" fill="${col}"/>` + shine;
    default: return `<path d="M${cx - 35} ${cy + 2} q-2 -38 35 -38 q37 0 35 38 q-8 -14 -18 -18 q-6 10 -26 10 q-12 0 -14 -6 q-8 6 -12 14z" fill="${col}"/>` + shine;
  }
}

function patternDefs(id, p, base) {
  const ink = lighten(base, base === '#33373f' || base === '#2f4d80' ? 0.35 : -0.25);
  const shapes = {
    1: `<path d="M6 9 q-3 -3 0 -5 q2 -1 3 1 q1 -2 3 -1 q3 2 0 5 l-3 3z" fill="${ink}"/>`,
    2: `<path d="M8 3l1.4 3 3.3.4-2.4 2.2.6 3.3L8 10.3 5.1 11.9l.6-3.3L3.3 6.4l3.3-.4z" fill="${ink}"/>`,
    3: `<circle cx="8" cy="9" r="2.4" fill="${ink}"/><circle cx="5" cy="5.6" r="1.1" fill="${ink}"/><circle cx="8" cy="4.6" r="1.1" fill="${ink}"/><circle cx="11" cy="5.6" r="1.1" fill="${ink}"/>`,
    4: `<circle cx="5" cy="5" r="1.6" fill="${ink}"/><circle cx="12" cy="11" r="1.6" fill="${ink}"/>`,
    5: `<rect x="3" y="6" width="10" height="4" rx="2" fill="#f7e1c8" transform="rotate(-30 8 8)"/><circle cx="7" cy="8" r=".6" fill="#c9a37c"/><circle cx="9" cy="8" r=".6" fill="#c9a37c"/>`,
    6: `<ellipse cx="8" cy="10" rx="4.4" ry="2.8" fill="#ffd84d"/><circle cx="11" cy="6.6" r="2.2" fill="#ffd84d"/><path d="M12.8 6.6 l2 .5 -2 .6z" fill="#f28c28"/><circle cx="11.4" cy="6.1" r=".45" fill="#2a2230"/>`,
  };
  if (!shapes[p]) return '';
  return `<pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse">${shapes[p]}</pattern>`;
}

let _svgId = 0;
// Full-body chibi nurse. viewBox 0 0 120 150.
function nurseSVG(av, mood = 'neutral', opts = {}) {
  const uid = 'n' + (++_svgId);
  const skin = AVATAR.skin[av.skin] || AVATAR.skin[2];
  const skinShade = lighten(skin, -0.12);
  const isHijab = av.hair === 7;
  const hcol = isHijab ? AVATAR.hijab[av.hairColor] || AVATAR.hijab[0] : (AVATAR.hairColor[av.hairColor] || AVATAR.hairColor[0]).c;
  const scrub = (AVATAR.scrubs[av.scrubs] || AVATAR.scrubs[0]).c;
  const scrubDark = lighten(scrub, -0.22);
  const shoe = (AVATAR.shoes[av.shoes] || AVATAR.shoes[0]).c;
  const acc = new Set(av.acc || []);
  const cx = 60, cy = 50;
  const pat = patternDefs(uid + 'p', av.pattern, scrub);
  const headOnly = opts.headOnly;

  let s = `<svg viewBox="${headOnly ? '6 -10 108 108' : '0 0 120 150'}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(opts.label || 'Your nurse')}">`;
  s += `<defs>${pat}</defs>`;
  if (!headOnly) {
    s += `<ellipse cx="60" cy="146" rx="30" ry="4" fill="#000" opacity=".25"/>`;
    // legs + shoes
    s += `<g class="leg-l"><rect x="44" y="112" width="13" height="26" rx="6" fill="${scrubDark}"/><rect x="41" y="134" width="18" height="9" rx="4.5" fill="${shoe}" stroke="#0003"/></g>`;
    s += `<g class="leg-r"><rect x="63" y="112" width="13" height="26" rx="6" fill="${scrubDark}"/><rect x="61" y="134" width="18" height="9" rx="4.5" fill="${shoe}" stroke="#0003"/></g>`;
    // arms
    s += `<rect x="25" y="84" width="13" height="30" rx="6.5" fill="${scrub}" transform="rotate(10 31 86)"/><circle cx="28" cy="115" r="6" fill="${skin}"/>`;
    s += `<rect x="82" y="84" width="13" height="30" rx="6.5" fill="${scrub}" transform="rotate(-10 89 86)"/><circle cx="92" cy="115" r="6" fill="${skin}"/>`;
    if (acc.has('watch')) s += `<rect x="86" y="106" width="12" height="5" rx="2" fill="#2b2f36"/><circle cx="92" cy="108.5" r="2.2" fill="#9be7d8"/>`;
    // torso
    s += `<path d="M36 84 q24 -10 48 0 l4 32 q-28 6 -56 0z" fill="${scrub}"/>`;
    if (pat) s += `<path d="M36 84 q24 -10 48 0 l4 32 q-28 6 -56 0z" fill="url(#${uid}p)" opacity=".9"/>`;
    s += `<path d="M50 80 l10 13 l10 -13" fill="${skin}" stroke="${scrubDark}" stroke-width="2.5" stroke-linejoin="round"/>`;
    s += `<rect x="66" y="99" width="13" height="10" rx="2" fill="${scrubDark}" opacity=".55"/>`;
    if (acc.has('penlight')) s += `<rect x="69" y="93" width="3.4" height="11" rx="1.5" fill="#f6bd52"/><rect x="74" y="94" width="3" height="10" rx="1.4" fill="#e9eef5"/>`;
    if (acc.has('badge')) s += `<line x1="45" y1="92" x2="45" y2="99" stroke="#ccd6e2" stroke-width="1.4"/><rect x="39.5" y="99" width="11" height="14" rx="2" fill="#fff" stroke="#9fb0c6"/><rect x="41.5" y="101.5" width="7" height="5" rx="1" fill="#7fb3e0"/><rect x="41.5" y="108" width="7" height="1.6" fill="#9fb0c6"/>`;
    if (acc.has('stethoscope')) s += `<path d="M47 80 q-4 18 6 24 q7 4 7 12" stroke="#3b4b63" stroke-width="2.8" fill="none" stroke-linecap="round"/><path d="M73 80 q4 18 -6 24" stroke="#3b4b63" stroke-width="2.8" fill="none" stroke-linecap="round"/><circle cx="60" cy="118" r="4.5" fill="#cfd8e3" stroke="#3b4b63" stroke-width="2"/>`;
  }
  // neck + head
  s += `<rect x="53" y="72" width="14" height="12" rx="5" fill="${skinShade}"/>`;
  s += hairBack(av.hair, hcol, cx, cy);
  s += `<circle cx="${cx - 33}" cy="${cy + 4}" r="6" fill="${skinShade}"/><circle cx="${cx + 33}" cy="${cy + 4}" r="6" fill="${skinShade}"/>`;
  if (acc.has('earrings') && !isHijab) s += `<circle cx="${cx - 33}" cy="${cy + 11}" r="2.6" fill="#f6d36b"/><circle cx="${cx + 33}" cy="${cy + 11}" r="2.6" fill="#f6d36b"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="33" fill="${skin}"/>`;
  s += face(cx, cy, mood, av.eyes);
  if (acc.has('glasses')) s += `<g fill="none" stroke="#3b3044" stroke-width="2.2"><circle cx="${cx - 12}" cy="${cy + 2}" r="8.5"/><circle cx="${cx + 12}" cy="${cy + 2}" r="8.5"/><path d="M${cx - 3.5} ${cy + 1} q3.5 -3 7 0"/></g>`;
  s += hairFront(av.hair, hcol, cx, cy);
  if (acc.has('cap') && !isHijab) {
    const capC = lighten(scrub, 0.12);
    s += `<path d="M${cx - 35} ${cy - 6} q0 -34 35 -34 q35 0 35 34 q-35 -10 -70 0z" fill="${capC}"/>`;
    if (pat) s += `<path d="M${cx - 35} ${cy - 6} q0 -34 35 -34 q35 0 35 34 q-35 -10 -70 0z" fill="url(#${uid}p)" opacity=".9"/>`;
    s += `<path d="M${cx - 35} ${cy - 6} q35 -10 70 0" stroke="${scrubDark}" stroke-width="3" fill="none"/>`;
  }
  if (acc.has('partyhat') && !isHijab) {
    s += `<path d="M${cx - 13} ${cy - 29} L${cx + 1} ${cy - 50} L${cx + 13} ${cy - 28} z" fill="#f6bd52" stroke="#c98a1a" stroke-width="1.2"/>`;
    s += `<path d="M${cx - 8} ${cy - 36} l17 -2 M${cx - 3} ${cy - 43} l8 -1" stroke="#ff6b8a" stroke-width="2.6"/><circle cx="${cx + 1}" cy="${cy - 50}" r="4" fill="#ff6b8a"/>`;
  }
  s += `</svg>`;
  return s;
}

// ---------- patients ----------
const PT_NAMES = ['Rosa', 'Malik', 'Ana', 'Jun', 'Priya', 'Diego', 'Grace', 'Omar', 'Mei', 'Luis', 'Aisha', 'Tom', 'Fatima', 'Sam', 'Lena', 'Kofi',
  'Nina', 'Ravi', 'Elena', 'Marcus', 'Yuki', 'Isaac', 'Leila', 'Ben', 'Carmen', 'Andre', 'Hana', 'Joe', 'Sofia', 'Tariq', 'Ruth', 'Wes',
  'Imani', 'Hugo', 'Zara', 'Eli', 'Amara', 'Noah', 'Ines', 'Raj'];
const PT_INITIALS = 'ABCDEGHJKLMNOPRSTVW';

// ---------- room themes: props that match the patient's ward ----------
// head: drawn on the bed patient's head (head centre 40,34, r 16) and, scaled, on patient busts
// body / bed / iv: drawn on the bed patient's blanket, bed frame and IV pole (viewBox 0 0 160 110)
// bust: drawn on patient busts (viewBox 0 0 100 100)
const UNIT_THEME = {
  ch1: {
    bed: '<path d="M136 50v5" stroke="#8fa3bd" stroke-width="1.2"/><rect class="th-tag" x="131" y="55" width="10" height="13" rx="1.5" fill="#ffd36b" stroke="#c98a1a"/><path d="M133 59h6M133 62h4" stroke="#8a5a00" stroke-width="1"/>',
    bust: '<path d="M72 74v6" stroke="#8fa3bd" stroke-width="1.4"/><rect x="66" y="80" width="12" height="15" rx="2" fill="#ffd36b" stroke="#c98a1a"/><path d="M69 85h6M69 89h4" stroke="#8a5a00" stroke-width="1.2"/>',
  },
  ch2: {
    head: '<path d="M24 25 q16 -6 32 0" stroke="#3b4b63" stroke-width="2" fill="none"/><rect x="28" y="21" width="10" height="7" rx="3" fill="#bfe6ff" fill-opacity=".85" stroke="#3b4b63"/><rect x="42" y="21" width="10" height="7" rx="3" fill="#bfe6ff" fill-opacity=".85" stroke="#3b4b63"/>',
    body: '<g class="th-tube"><rect x="100" y="24" width="5" height="16" rx="2.5" fill="#e3f4ff" stroke="#3b4b63" stroke-width=".8"/><rect x="100.6" y="31" width="3.8" height="8.4" rx="1.9" fill="#7dffb2"/><circle class="th-bubble" cx="102.5" cy="21" r="1.3" fill="#7dffb2"/><circle class="th-bubble" cx="101.5" cy="16" r="1" fill="#7dffb2"/></g>',
  },
  ch3: {
    iv: '<rect x="122" y="14" width="14" height="13" rx="3" fill="#ffe08a" opacity=".6"/><g class="th-drip"><circle cx="129" cy="34" r="1.4" fill="#8fd3ff"/><circle cx="129" cy="39" r="1.1" fill="#8fd3ff"/></g>',
    bust: '<path d="M100 58 q-22 4 -30 26" stroke="#b8d4ef" stroke-width="2.2" fill="none"/><rect x="66" y="82" width="9" height="6" rx="1" fill="#fff" stroke="#d3deeb"/>',
  },
  ch4: {
    body: '<rect x="82" y="38" width="32" height="4" rx="2" fill="#c9d5e6"/><g class="th-donut"><circle cx="91" cy="34.5" r="4.6" fill="#e7a35a"/><circle cx="91" cy="34" r="4" fill="#ff8fb5"/><circle cx="91" cy="34" r="1.4" fill="#e7a35a"/></g><rect x="103" y="30" width="6" height="8" rx="1.5" fill="#fff" stroke="#c9d5e6"/>',
    bust: '<g transform="translate(26 84)"><circle r="8.5" fill="#e7a35a"/><circle r="7.4" cy="-.6" fill="#ff8fb5"/><circle r="2.6" cy="-.6" fill="#e7a35a"/></g>',
  },
  ch5: {
    body: '<rect x="94" y="38" width="13" height="3" rx="1" fill="#3b4b63"/><rect x="99" y="26" width="4" height="13" rx="1.2" fill="#5d708d" transform="rotate(-20 101 32)"/><circle cx="97" cy="25" r="2.2" fill="#3b4b63"/><rect x="103" y="33" width="5" height="2" fill="#8fa3bd"/>',
    bust: '<g transform="translate(70 76)"><rect x="0" y="16" width="16" height="4" rx="1" fill="#3b4b63"/><rect x="5" y="0" width="5" height="17" rx="1.5" fill="#5d708d" transform="rotate(-20 7 9)"/><circle cx="3" cy="0" r="3" fill="#3b4b63"/></g>',
  },
  ch6: {
    head: '<circle cx="40" cy="36" r="13" fill="#ff5a5a" opacity=".22"/><ellipse cx="40" cy="38.6" rx="2.4" ry="1.7" fill="#f2fff4"/><circle cx="31" cy="39" r="1.3" fill="#f2fff4"/>',
  },
  ch7: {
    bed: '<path d="M114 22V3M96 3h36" stroke="#8fa3bd" stroke-width="1.6"/>',
    body: '<g class="th-cast"><path d="M108 46 L114 23" stroke="#f4f6f8" stroke-width="10" stroke-linecap="round"/><path d="M108 46 L114 23" stroke="#d3deeb" stroke-width="10" stroke-linecap="round" stroke-dasharray="1 4" opacity=".6"/><path d="M110 24 h9" stroke="#8fa3bd" stroke-width="2"/></g>',
    bust: '<path d="M28 76 L72 92 L32 98z" fill="#fff" stroke="#d3deeb" stroke-width="1.4"/>',
  },
  ch8: {
    body: '<g class="th-ice"><rect x="104" y="35" width="15" height="8" rx="3" fill="#8fd3ff" stroke="#5fb4ff"/><path d="M111.5 36v6M108.5 39h6" stroke="#fff" stroke-width="1"/></g>',
    bust: '<rect x="62" y="72" width="18" height="10" rx="3.5" fill="#8fd3ff" stroke="#5fb4ff"/><path d="M71 73.5v7M67.5 77h7" stroke="#fff" stroke-width="1.2"/>',
  },
  ch9: {
    body: '<g class="th-dumbbell"><rect x="90" y="36" width="16" height="2.6" fill="#5d708d"/><rect x="87" y="32" width="4" height="10" rx="1" fill="#2b2f36"/><rect x="105" y="32" width="4" height="10" rx="1" fill="#2b2f36"/></g>',
    bust: '<g transform="translate(22 84)"><rect x="0" y="-1.5" width="18" height="3" fill="#5d708d"/><rect x="-3" y="-6" width="5" height="12" rx="1.2" fill="#2b2f36"/><rect x="16" y="-6" width="5" height="12" rx="1.2" fill="#2b2f36"/></g>',
  },
  ch10: {
    head: '<path class="th-bolt" d="M28 16 l4 -6 h-3 l4 -7" stroke="#ffd36b" stroke-width="2" fill="none" stroke-linejoin="round"/><path class="th-bolt" d="M50 16 l-3 -6 h3 l-3 -7" stroke="#ffd36b" stroke-width="2" fill="none" stroke-linejoin="round"/>',
  },
  ch11: {
    head: '<path d="M24.6 27 q15.4 -8 30.8 0 v5.5 q-15.4 -8 -30.8 0z" fill="#fff" stroke="#d3deeb" stroke-width=".8"/><circle cx="50" cy="27.5" r="1.8" fill="#ff8a8a"/>',
  },
  ch12: {
    head: '<path d="M25 29 L56 37" stroke="#1b1d2a" stroke-width="1.1"/><ellipse cx="45.6" cy="35" rx="4" ry="3.6" fill="#1b1d2a"/>',
  },
};

// SVG for one part of a patient's room theme ('' if none)
function themeProps(p, part) {
  const t = p && p.theme && UNIT_THEME[p.theme];
  return (t && t[part]) || '';
}
// the head-level theme props, scaled onto a bust whose head is at (cx, cy) with radius r
function themeOnBust(p, cx, cy, r) {
  const h = themeProps(p, 'head');
  const k = r / 16;
  return (h ? `<g transform="translate(${cx} ${cy}) scale(${k}) translate(-40 -34)">${h}</g>` : '') + themeProps(p, 'bust');
}

function patientFor(q, salt = '') {
  const r = rng(q.id + salt);
  const m = /(\d{1,3})-year-old/.exec(q.stem);
  let age = m ? +m[1] : 0;
  if (!age) age = 19 + Math.floor(r() * 66);
  const old = age >= 65, kid = age < 14;
  const p = {
    name: pick(PT_NAMES, r) + ' ' + pick(PT_INITIALS.split(''), r) + '.',
    age,
    bed: 'ABCD'[Math.floor(r() * 4)],
    skin: Math.floor(r() * AVATAR.skin.length),
    hair: old ? 6 : Math.floor(r() * 6),
    hairStyle: Math.floor(r() * 7),
    gown: ['#9cc6e8', '#a8d8c8', '#c9b6e8', '#f1c0b6'][Math.floor(r() * 4)],
    old, kid,
    glasses: old ? r() < 0.6 : r() < 0.15,
    theme: q.unit || null,
  };
  return p;
}

function patientHead(p, mood = 'neutral', size = 'bust') {
  const skin = AVATAR.skin[p.skin];
  const hcol = AVATAR.hairColor[p.hair].c;
  const cx = 50, cy = p.kid ? 52 : 46;
  const r = p.kid ? 26 : 28;
  let s = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;
  s += `<path d="M14 100 q2 -26 36 -28 q34 2 36 28z" fill="${p.gown}"/><path d="M14 100 q2 -26 36 -28 q34 2 36 28z" fill="none" stroke="#0002"/>`;
  s += `<circle cx="34" cy="90" r="2" fill="#fff8"/><circle cx="62" cy="86" r="2" fill="#fff8"/><circle cx="48" cy="95" r="2" fill="#fff8"/>`;
  const style = p.hairStyle;
  if (style === 3 || style === 6) s += `<path d="M${cx - r - 3} ${cy - 2} q-3 34 6 40 h${2 * r - 6} q9 -6 6 -40z" fill="${hcol}"/>`;
  if (style === 4) s += [[-20, -12], [20, -12], [-26, 4], [26, 4], [0, -26]].map(([x, y]) => `<circle cx="${cx + x}" cy="${cy + y}" r="12" fill="${hcol}"/>`).join('');
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${skin}"/>`;
  s += face(cx, cy, mood, p.kid ? 1 : 0, r / 34);
  if (p.old) s += `<path d="M${cx - 18} ${cy - 14} q5 -3 10 0 M${cx + 8} ${cy - 14} q5 -3 10 0" stroke="#0003" stroke-width="1.4" fill="none"/>`;
  if (p.glasses) s += `<g fill="none" stroke="#3b3044" stroke-width="1.8"><circle cx="${cx - 10}" cy="${cy + 2}" r="7"/><circle cx="${cx + 10}" cy="${cy + 2}" r="7"/><path d="M${cx - 3} ${cy + 1} h6"/></g>`;
  if (style !== 5) s += `<path d="M${cx - r - 1} ${cy + 2} q-2 -32 ${r + 1} -32 q${r + 3} 0 ${r + 1} 32 q-8 -14 -18 -16 q-8 8 -22 6 q-8 4 -12 10z" fill="${hcol}"/>`;
  else s += `<path d="M${cx - r + 2} ${cy - 8} q4 -22 ${r - 2} -22 q${r - 2} 0 ${r - 2} 22 q-10 -10 -${r - 2} -12 q-14 2 -${r - 4} 12z" fill="${hcol}"/>`;
  s += themeOnBust(p, cx, cy, r);
  s += `</svg>`;
  return s;
}

// Patient lying in bed. viewBox 0 0 160 110. Parts sit in named groups so whimsy
// reactions (22-whimsy.js, 35-whimsy.css) can move them on their own:
// .pt-all (everything) > .pt-bed, .pt-person (> .pt-legs, .pt-head > .pt-hair, .pt-body, .pt-arm-*), .pt-iv, .pt-props.
// Room-theme props (UNIT_THEME) ride along inside the part they belong to.
function patientInBed(p, mood = 'neutral') {
  const skin = AVATAR.skin[p.skin];
  const hcol = AVATAR.hairColor[p.hair].c;
  const cx = 40, cy = 34, r = p.kid ? 15 : 16;
  let s = `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Patient in bed" class="pt-svg">`;
  s += `<g class="pt-all">`;
  s += `<g class="pt-bed"><rect x="8" y="58" width="132" height="12" rx="4" fill="#5d708d"/><rect x="8" y="40" width="8" height="54" rx="3" fill="#6f84a3"/><rect x="132" y="50" width="8" height="44" rx="3" fill="#6f84a3"/>`;
  s += `<circle cx="12" cy="97" r="3.5" fill="#3b4b63"/><circle cx="136" cy="97" r="3.5" fill="#3b4b63"/>`;
  s += `<rect x="12" y="50" width="124" height="14" rx="7" fill="#eef3f9"/><ellipse cx="38" cy="48" rx="22" ry="9" fill="#ffffff" stroke="#d3deeb"/>${themeProps(p, 'bed')}</g>`;
  s += `<g class="pt-person">`;
  // legs only show in the upside-down gag
  s += `<g class="pt-legs"><rect x="112" y="62" width="7" height="22" rx="3.5" fill="${skin}"/><rect x="123" y="62" width="7" height="22" rx="3.5" fill="${skin}"/><rect x="110" y="80" width="11" height="7" rx="3.5" fill="#f4f6f8"/><rect x="121" y="80" width="11" height="7" rx="3.5" fill="#f4f6f8"/></g>`;
  s += `<g class="pt-head"><path d="M${cx - r - 2} ${cy + 2} q-2 -18 ${r + 2} -18 q${r + 4} 0 ${r + 2} 18z" fill="${hcol}"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${skin}"/>`;
  s += face(cx, cy, mood, p.kid ? 1 : 0, r / 34);
  if (p.glasses && mood !== 'cool') s += `<g fill="none" stroke="#3b3044" stroke-width="1.3"><circle cx="${cx - 6}" cy="${cy + 1}" r="4"/><circle cx="${cx + 6}" cy="${cy + 1}" r="4"/></g>`;
  s += `<g class="pt-hair"><path d="M${cx - r - 1} ${cy + 1} q-1 -17 ${r + 1} -17 q${r + 2} 0 ${r + 1} 17 q-5 -8 -11 -9 q-5 5 -12 3 q-5 2 -${r - 6} 6z" fill="${hcol}"/></g>${themeProps(p, 'head')}</g>`;
  s += `<g class="pt-body"><path d="M52 44 q40 -6 84 2 v18 h-90z" fill="${p.gown}"/><path d="M52 44 q40 -6 84 2" stroke="#0002" fill="none"/><rect x="70" y="50" width="62" height="5" rx="2.5" fill="#fff6"/>${themeProps(p, 'body')}</g>`;
  // arms only show in some reactions (thumbs up, dancing, finger guns)
  s += `<g class="pt-arm pt-arm-r"><rect x="56" y="26" width="7" height="22" rx="3.5" fill="${p.gown}" stroke="#0002"/><circle cx="59.5" cy="24" r="4.6" fill="${skin}"/><rect x="58" y="15" width="3.2" height="7" rx="1.6" fill="${skin}"/></g>`;
  s += `<g class="pt-arm pt-arm-l"><rect x="70" y="27" width="7" height="21" rx="3.5" fill="${p.gown}" stroke="#0002"/><circle cx="73.5" cy="25" r="4.6" fill="${skin}"/></g>`;
  s += `</g>`;
  s += `<g class="pt-iv"><rect x="128" y="6" width="3" height="80" fill="#8fa3bd"/><rect x="120" y="8" width="18" height="22" rx="5" fill="#d9ecff" stroke="#8fa3bd"/><path d="M129 30 q0 30 -28 34" stroke="#b8d4ef" stroke-width="1.6" fill="none"/><rect x="122" y="84" width="16" height="3" rx="1.5" fill="#8fa3bd"/>${themeProps(p, 'iv')}</g>`;
  s += `<g class="pt-props"></g>`;
  s += `</g></svg>`;
  return s;
}

// ---------- boss: "The Superbug" ----------
function bossSVG(phase = 0, mood = 'grin') {
  const cols = [['#5fd38d', '#2f9c5c'], ['#f2a33a', '#c26b12'], ['#e0567a', '#9a2449']][phase] || ['#5fd38d', '#2f9c5c'];
  const [c1, c2] = cols;
  let spikes = '';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, x = 100 + Math.cos(a) * 66, y = 108 + Math.sin(a) * 62;
    const x2 = 100 + Math.cos(a) * 86, y2 = 108 + Math.sin(a) * 82;
    spikes += `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${c2}" stroke-width="7" stroke-linecap="round"/><circle cx="${x2}" cy="${y2}" r="6" fill="${c1}" stroke="${c2}" stroke-width="3"/>`;
  }
  const brow = phase >= 1 ? `<path d="M64 84 l26 10 M136 84 l-26 10" stroke="#2a1630" stroke-width="7" stroke-linecap="round"/>` : `<path d="M66 86 l22 6 M134 86 l-22 6" stroke="#2a1630" stroke-width="6" stroke-linecap="round"/>`;
  const mouth = mood === 'hurt'
    ? `<path d="M76 134 q24 -14 48 0" stroke="#2a1630" stroke-width="7" fill="none" stroke-linecap="round"/>`
    : `<path d="M70 124 q30 30 60 0 z" fill="#2a1630"/><path d="M80 126 l6 8 6 -7 6 8 6 -8 6 7 6 -8" fill="#fff" stroke="#fff" stroke-width="1"/>`;
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Superbug boss">
    <ellipse cx="100" cy="194" rx="60" ry="6" fill="#000" opacity=".3"/>
    ${spikes}
    <ellipse cx="100" cy="108" rx="70" ry="66" fill="${c1}" stroke="${c2}" stroke-width="5"/>
    <circle cx="70" cy="72" r="9" fill="#fff" opacity=".35"/><circle cx="130" cy="150" r="7" fill="${c2}" opacity=".5"/><circle cx="58" cy="128" r="5" fill="${c2}" opacity=".5"/>
    <circle cx="78" cy="102" r="14" fill="#fff"/><circle cx="122" cy="102" r="14" fill="#fff"/>
    <circle cx="81" cy="105" r="7" fill="#2a1630"/><circle cx="119" cy="105" r="7" fill="#2a1630"/>
    ${brow}${mouth}
    <path d="M70 46 l10 -24 14 16 6 -22 6 22 14 -16 10 24z" fill="#ffd36b" stroke="#c48a12" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="100" cy="30" r="4" fill="#ff5d8f"/>
  </svg>`;
}

function starRow(n, of = 3) {
  let s = '';
  for (let i = 0; i < of; i++) s += `<span class="${i < n ? 'on' : ''}">${icon('star')}</span>`;
  return s;
}
