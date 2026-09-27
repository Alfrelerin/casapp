import {
  PEOPLE, BOTH, other, personName, mondayOf, toISO, fromISO, addDays, weekLabel, shortDate,
  weekLetter, assigneeFor, scoreOfWeek, plannedOfWeek, allCompletions, addCompletion, emptyScore,
  balanceMessage, DEFAULT_TASKS, DEFAULT_FINDE, TIPS, BATCH_TIPS, newHouseholdCode, PERSON_EMOJI, SKIP_REASONS,
  niceDate, todayISO, MEAL_DAYS, MEAL_TIPS, mealState,
} from './logic.js';

// ---------------------------------------------------------------------------
// Estado y utilidades
// ---------------------------------------------------------------------------
const $app = document.getElementById('app');
const $tabs = document.getElementById('tabs');
const $sheet = document.getElementById('sheet-root');
const $toast = document.getElementById('toast');

const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

const S = {
  hid: ls.get('hid'),
  me: ls.get('me'),
  tab: ls.get('tab') || 'semana',
  period: 'semana',
  viewMonday: mondayOf(),
  household: null,
  tasks: [],
  week: null,
  recentWeeks: [],
  profiles: {},
  meals: [],
  unsubs: [],
  weekUnsub: null,
  pendingRender: false,
};

let store = null;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ws = () => toISO(S.viewMonday);
const letter = () => (S.household ? weekLetter(S.viewMonday, S.household.weekAStart) : 'A');
const isCurrentWeek = () => toISO(S.viewMonday) === toISO(mondayOf());
const taskById = (id) => S.tasks.find((t) => t.id === id);
const pts = (n) => `${n} ${Number(n) === 1 ? 'pt' : 'pts'}`;
const activeTasks = () => S.tasks.filter((t) => t.active !== false);

function toast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => $toast.classList.remove('show'), 2200);
}
function run(p, okMsg) {
  // Las escrituras se ven al instante en local; aquí solo capturamos errores.
  Promise.resolve(p).catch((e) => {
    console.error(e);
    toast('No se pudo guardar: ' + (e.code || e.message));
  });
  if (okMsg) toast(okMsg);
}
const buzz = () => { try { navigator.vibrate?.(12); } catch {} };

function avatar(p, size = '') {
  if (p === BOTH) return `<span class="av-pair ${size}" title="Los dos">${avatar('alfre', size)}${avatar('laura', size)}</span>`;
  const photo = S.profiles?.[p]?.photo;
  const inner = photo ? `<img src="${esc(photo)}" alt="" />` : esc(personName(p)[0] || '?');
  return `<span class="av av-${p} ${size} ${photo ? 'has-photo' : ''}" title="${esc(personName(p))}">${inner}</span>`;
}
const setMeClass = () => {
  document.body.classList.remove('me-alfre', 'me-laura');
  if (S.me) document.body.classList.add(`me-${S.me}`);
};

const ICON = {
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h11l-3-3M17 17H6l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  tabSemana: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 3v4M16 3v4M8.5 13l2.3 2.3L15.5 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  tabBalance: '<svg viewBox="0 0 24 24"><path d="M12 4v16M5 20h14M6 8h12M6 8l-3 6a3 3 0 0 0 6 0zM18 8l-3 6a3 3 0 0 0 6 0z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  tabCocina: '<svg viewBox="0 0 24 24"><path d="M4 11h16v2a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6zM2 11h20M9 4c0 2 2 2 2 4M13 4c0 2 2 2 2 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  tabTapers: '<svg viewBox="0 0 24 24"><rect x="3.5" y="9" width="17" height="10.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M2.5 9h19M7 6.5h10a1.5 1.5 0 0 1 1.5 1.5v1h-13V8A1.5 1.5 0 0 1 7 6.5zM9 13.5h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  tabAjustes: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
async function boot() {
  const m = location.hash.match(/h=([a-z0-9]{16,})/i);
  if (m) {
    if (S.hid !== m[1]) ls.del('me');
    ls.set('invited', '1'); // quien entra por enlace no necesita invitar
    S.hid = m[1];
    S.me = ls.get('me');
    ls.set('hid', S.hid);
    history.replaceState(null, '', location.pathname + location.search);
  }

  try {
    store = await import('./store.js');
  } catch (e) {
    console.error(e);
    return renderMessage('Sin conexión', 'No se pudo cargar la app. Comprueba la conexión y vuelve a abrirla.', true);
  }
  if (!store.isConfigured()) {
    return renderMessage(
      'Falta conectar Firebase',
      'Pega la configuración de tu proyecto en <code>js/firebase-config.js</code> (paso 2 del README) y vuelve a subir los cambios.'
    );
  }
  try {
    await store.connect();
  } catch (e) {
    console.error(e);
    return renderMessage(
      'No se pudo iniciar sesión',
      `Revisa que en Firebase → Authentication esté activado el acceso <b>Anónimo</b>.<br><small>${esc(e.code || e.message)}</small>`,
      true
    );
  }
  route();
}

async function route() {
  if (!S.hid) return renderWelcome();
  let exists = false;
  try {
    exists = await store.householdExists(S.hid);
  } catch (e) {
    console.error(e);
    // Sin conexión y sin caché: seguimos y ya llegarán los datos.
    exists = true;
  }
  if (!exists) {
    ls.del('hid');
    S.hid = null;
    toast('No encuentro ese hogar');
    return renderWelcome();
  }
  if (!S.me) return renderWho();
  startApp();
}

function startApp() {
  stopListeners();
  const onErr = (e) => { console.error(e); toast('Error de conexión: ' + (e.code || e.message)); };
  S.unsubs.push(store.watchHousehold(S.hid, (h) => { S.household = h; render(); }, onErr));
  S.unsubs.push(store.watchTasks(S.hid, (t) => { S.tasks = t; render(); }, onErr));
  S.unsubs.push(store.watchProfiles(S.hid, (p) => { S.profiles = p; render(); }, onErr));
  S.unsubs.push(store.watchMeals(S.hid, (m) => { S.meals = m; render(); }, onErr));
  setMeClass();
  const since = toISO(addDays(mondayOf(), -7 * 9));
  S.unsubs.push(store.watchWeeksSince(S.hid, since, (w) => { S.recentWeeks = w; render(); }, onErr));
  watchViewedWeek();
  renderTabs();
  $tabs.hidden = false;
  render();
}
function watchViewedWeek() {
  S.weekUnsub?.();
  S.week = null;
  S.weekUnsub = store.watchWeek(S.hid, ws(), (w) => { S.week = w; render(); }, (e) => console.error(e));
}
function stopListeners() {
  S.unsubs.forEach((u) => u());
  S.unsubs = [];
  S.weekUnsub?.();
  S.weekUnsub = null;
}

// ---------------------------------------------------------------------------
// Render principal
// ---------------------------------------------------------------------------
function render() {
  if (!S.household) return;
  const ae = document.activeElement;
  if (ae && $app.contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) {
    S.pendingRender = true;
    return;
  }
  S.pendingRender = false;
  const views = { semana: viewSemana, balance: viewBalance, cocina: viewCocina, tapers: viewTapers, ajustes: viewAjustes };
  $app.innerHTML = (views[S.tab] || viewSemana)();
  $tabs.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === S.tab));
  const n = notices().length;
  const semTab = $tabs.querySelector('[data-tab="semana"]');
  if (semTab) semTab.dataset.badge = n ? String(n) : '';
  const urgent = activeMeals().filter((m) => mealState(m).status !== 'ok').length;
  const tapTab = $tabs.querySelector('[data-tab="tapers"]');
  if (tapTab) tapTab.dataset.badge = urgent ? String(urgent) : '';
}

// Avisos para mí en la semana que estoy viendo: peticiones de cambio y tareas que "no hace falta hacer".
function notices() {
  const me = S.me, w = S.week || {};
  const out = [];
  Object.entries(w.swaps || {}).forEach(([id, s]) => { if (s.status === 'pending' && s.to === me) out.push({ kind: 'swap', id, s }); });
  Object.entries(w.skips || {}).forEach(([id, s]) => { if (s.by !== me && !s.seen?.[me]) out.push({ kind: 'skip', id, s }); });
  return out;
}
$app.addEventListener('focusout', () => setTimeout(() => S.pendingRender && render(), 50));

function renderTabs() {
  const items = [
    ['semana', 'Semana', ICON.tabSemana],
    ['cocina', 'Cocina', ICON.tabCocina],
    ['tapers', 'Tápers', ICON.tabTapers],
    ['balance', 'Balance', ICON.tabBalance],
    ['ajustes', 'Ajustes', ICON.tabAjustes],
  ];
  $tabs.innerHTML = items
    .map(([id, label, ico]) => `<button class="tab" data-tab="${id}">${ico}<span>${label}</span></button>`)
    .join('');
}
$tabs.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  S.tab = b.dataset.tab;
  ls.set('tab', S.tab);
  render();
  window.scrollTo({ top: 0 });
});

function weekHeader() {
  const L = letter();
  return `
  <header class="top">
    <button class="icon-btn" data-act="prev-week" aria-label="Semana anterior">${ICON.left}</button>
    <div class="week-title">
      <span class="pill pill-${L}">Semana ${L}</span>
      <span class="week-dates">${weekLabel(S.viewMonday)}</span>
      ${isCurrentWeek() ? '<span class="week-now">esta semana</span>' : '<button class="link" data-act="today">Volver a hoy</button>'}
    </div>
    <button class="icon-btn" data-act="next-week" aria-label="Semana siguiente">${ICON.right}</button>
  </header>`;
}
const simpleHeader = (title, sub = '') =>
  `<header class="top simple"><div><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div></header>`;

// ---------------------------------------------------------------------------
// Vista: Semana
// ---------------------------------------------------------------------------
function taskState(t) {
  const w = S.week || {};
  const L = letter();
  const base = L === 'A' ? t.a : t.b;
  const who = assigneeFor(t, L, w);
  const done = w.completions?.[t.id] || null;
  const swap = w.swaps?.[t.id] || null;
  const skip = w.skips?.[t.id] || null;
  return { t, base, who, done, swap, skip };
}

function badges(st) {
  const { t, base, who, done, swap, skip } = st;
  const me = S.me, them = other(S.me);
  const out = [];
  if (skip) {
    out.push(`<span class="tag tag-skip">🙅 no hace falta${skip.by !== me ? ` · lo dice ${esc(personName(skip.by))}` : ''}</span>`);
    if (skip.reason && skip.reason !== 'Otro motivo') out.push(`<span>${esc(skip.reason)}</span>`);
    return out.join('<i class="dot">·</i>');
  }
  if (t.day) out.push(`<span>${esc(t.day)}</span>`);
  out.push(`<b>${pts(t.points)}</b>`);
  if (swap?.status === 'accepted' && base !== BOTH) {
    if (swap.offer || swap.offerOf) out.push(`<span class="tag tag-swap">${ICON.swap} intercambio</span>`);
    else if (who === me) out.push(`<span class="tag tag-swap">te la ha pedido ${esc(personName(swap.from))}</span>`);
    else out.push(`<span class="tag tag-swap">cedida a ${esc(personName(who))}</span>`);
  }
  if (swap?.status === 'pending') {
    out.push(swap.from === me
      ? `<span class="tag tag-wait">esperando a ${esc(personName(them))}…</span>`
      : `<span class="tag tag-wait">te pide cambio</span>`);
  }
  if (swap?.status === 'rejected' && swap.from === me) out.push(`<span class="tag tag-no">${esc(personName(them))} no puede</span>`);
  if (done && done.by !== who) out.push(`<span class="tag tag-by">hecha por ${esc(personName(done.by))}</span>`);
  return out.join('<i class="dot">·</i>');
}

function taskCard(st) {
  const { t, done, skip, who } = st;
  return `
  <div class="task own-${who} ${done ? 'done' : ''} ${skip ? 'skipped' : ''}" data-id="${esc(t.id)}">
    <button class="check" data-act="check" data-id="${esc(t.id)}" aria-label="${done ? 'Desmarcar' : skip ? 'No hace falta' : 'Marcar como hecha'}">${skip ? '<span class="skip-ico">–</span>' : ICON.check}</button>
    <button class="task-body" data-act="task-menu" data-id="${esc(t.id)}">
      <span class="task-title"><span class="emoji">${esc(t.icon || '•')}</span>${esc(t.name)}</span>
      <span class="task-meta">${badges(st)}</span>
    </button>
    ${done ? avatar(done.by, 'sm') : ''}
  </div>`;
}

function section(title, list, extraCls = '') {
  if (!list.length) return '';
  const rank = (s) => (s.skip ? 2 : s.done ? 1 : 0);
  const sorted = [...list].sort((a, b) => (rank(a) - rank(b)) || ((a.t.order ?? 0) - (b.t.order ?? 0)));
  const doneN = list.filter((s) => s.done).length;
  const totalN = list.filter((s) => !s.skip).length;
  return `
  <section class="group ${extraCls}">
    <h2>${title}<span class="count">${doneN}/${totalN}</span></h2>
    <div class="cards">${sorted.map(taskCard).join('')}</div>
  </section>`;
}

function progressRow(p, done, planned) {
  const pct = planned ? Math.min(100, Math.round((done / planned) * 100)) : 0;
  return `
  <div class="prog">
    ${avatar(p)}
    <div class="prog-main">
      <div class="prog-top"><b>${p === S.me ? 'Tú' : esc(personName(p))}</b><span>${done} / ${planned} pts</span></div>
      <div class="bar"><i class="fill-${p}" style="width:${pct}%"></i></div>
    </div>
  </div>`;
}

function viewSemana() {
  const me = S.me, them = other(me);
  const sts = activeTasks().map(taskState);
  const L = letter();
  const doneScore = scoreOfWeek(S.week);
  const planned = plannedOfWeek(activeTasks(), L, S.week);

  const requests = notices().map(({ kind, id, s }) => {
    const t = taskById(id), off = s.offer && taskById(s.offer);
    if (!t) return '';
    if (kind === 'skip') return `
    <div class="card notice notice-${esc(s.by)}">
      <div class="req-text">${avatar(s.by, 'sm')}<p><b>${esc(personName(s.by))}</b> dice que <b>${esc(t.name)}</b> no hace falta esta semana${s.reason && s.reason !== 'Otro motivo' ? ` · <span class="muted">${esc(s.reason)}</span>` : ''}.</p></div>
      <div class="req-actions">
        <button class="btn ghost" data-act="skip-undo" data-id="${esc(id)}">Sí hace falta</button>
        <button class="btn primary" data-act="skip-ack" data-id="${esc(id)}">Vale 👍</button>
      </div>
    </div>`;
    return `
    <div class="card request">
      <div class="req-text">${avatar(s.from, 'sm')}<p><b>${esc(personName(s.from))}</b> te pide que hagas <b>${esc(t.name)}</b> (${pts(t.points)})${off ? ` y a cambio hace <b>${esc(off.name)}</b> (${pts(off.points)})` : ''}.</p></div>
      <div class="req-actions">
        <button class="btn ghost" data-act="swap-reject" data-id="${esc(id)}">No puedo</button>
        <button class="btn primary" data-act="swap-accept" data-id="${esc(id)}">Aceptar</button>
      </div>
    </div>`;
  }).join('');

  const invite = ls.get('invited') ? '' : `
    <div class="card invite">
      <p><b>Invita a ${esc(personName(them))}</b><br><span class="muted">Mándale el enlace para que tenga la misma app en su móvil.</span></p>
      <div class="req-actions">
        <button class="btn ghost" data-act="invite-dismiss">Luego</button>
        <button class="btn primary" data-act="share">Enviar enlace</button>
      </div>
    </div>`;

  const hello = isCurrentWeek() ? `<p class="hello">¡Hola, ${esc(personName(me))}! ${PERSON_EMOJI[me]}</p>` : '';
  return `
  ${weekHeader()}
  <main class="view">
    ${hello}
    ${invite}
    ${requests}
    <div class="card summary">
      ${progressRow(me, doneScore[me], planned[me])}
      ${progressRow(them, doneScore[them], planned[them])}
    </div>
    ${section(`${PERSON_EMOJI[me]} Tus tareas`, sts.filter((s) => s.who === me))}
    ${section(`${PERSON_EMOJI.both} Los dos`, sts.filter((s) => s.who === BOTH))}
    ${section(`${PERSON_EMOJI[them]} Tareas de ${esc(personName(them))}`, sts.filter((s) => s.who === them), 'theirs')}
    ${!sts.length ? '<p class="empty">No hay tareas. Añádelas en Ajustes.</p>' : ''}
    <details class="card tips">
      <summary>Cómo funciona</summary>
      <ul>${TIPS.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    </details>
  </main>`;
}

// ---------------------------------------------------------------------------
// Vista: Balance
// ---------------------------------------------------------------------------
function viewBalance() {
  const me = S.me, them = other(me);
  const thisMon = mondayOf();
  const L = weekLetter(thisMon, S.household.weekAStart);
  const byWs = Object.fromEntries(S.recentWeeks.map((w) => [w.weekStart, w]));
  let score, label;

  if (S.period === 'semana') {
    score = scoreOfWeek(byWs[toISO(thisMon)]);
    label = `Semana ${L} · ${weekLabel(thisMon)}`;
  } else if (S.period === 'quincena') {
    const aMon = L === 'A' ? thisMon : addDays(thisMon, -7);
    const bMon = addDays(aMon, 7);
    score = emptyScore();
    [aMon, bMon].forEach((m) => {
      const s = scoreOfWeek(byWs[toISO(m)]);
      score.alfre += s.alfre; score.laura += s.laura;
    });
    label = `Quincena A+B · ${weekLabel(aMon).split('–')[0]}–${weekLabel(bMon).split('–')[1]}`;
  } else {
    const now = new Date();
    score = emptyScore();
    allCompletions(S.recentWeeks)
      .filter((c) => { const d = new Date(c.at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .forEach((c) => addCompletion(score, c));
    label = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase());
  }

  const total = score[me] + score[them];
  const pctMe = total ? Math.round((score[me] / total) * 100) : 50;

  const lastWeeks = [0, 1, 2, 3].map((i) => {
    const m = addDays(thisMon, -7 * i);
    const s = scoreOfWeek(byWs[toISO(m)]);
    return `<tr><td><span class="pill pill-${weekLetter(m, S.household.weekAStart)} xs">${weekLetter(m, S.household.weekAStart)}</span> ${weekLabel(m)}</td><td class="num c-${me}">${s[me]}</td><td class="num c-${them}">${s[them]}</td></tr>`;
  }).join('');

  const hist = allCompletions(S.recentWeeks).slice(0, 20).map((c) => `
    <li>${avatar(c.by, 'sm')}<span class="h-name">${esc(c.name || taskById(c.taskId)?.name || c.taskId)}</span><span class="h-pts">+${c.pts}</span><span class="h-date">${c.at ? shortDate(c.at) : ''}</span></li>`).join('');

  const seg = (id, txt) => `<button class="${S.period === id ? 'on' : ''}" data-act="period" data-p="${id}">${txt}</button>`;

  return `
  ${simpleHeader('Balance', 'Puntos de lo que cada uno ha hecho')}
  <main class="view">
    <div class="seg">${seg('semana', 'Semana')}${seg('quincena', 'Quincena')}${seg('mes', 'Mes')}</div>
    <div class="card scoreboard">
      <p class="muted cap">${esc(label)}</p>
      <div class="score-row">
        <div class="score c-${me}"><span>Tú</span><strong>${score[me]}</strong></div>
        <div class="score c-${them}"><span>${esc(personName(them))}</span><strong>${score[them]}</strong></div>
      </div>
      <div class="split"><i class="fill-${me}" style="width:${pctMe}%"></i><i class="fill-${them}" style="width:${100 - pctMe}%"></i></div>
      <p class="verdict">${total ? esc(balanceMessage(score, me)) : 'Aún no hay tareas hechas en este periodo'}</p>
    </div>
    <section class="group">
      <h2>Últimas semanas</h2>
      <div class="card"><table class="weeks"><thead><tr><th></th><th class="num">Tú</th><th class="num">${esc(personName(them))}</th></tr></thead><tbody>${lastWeeks}</tbody></table></div>
    </section>
    <section class="group">
      <h2>Historial</h2>
      ${hist ? `<ul class="card hist">${hist}</ul>` : '<p class="empty">Todavía no hay nada marcado.</p>'}
    </section>
  </main>`;
}

// ---------------------------------------------------------------------------
// Vista: Cocina (batch cooking + finde)
// ---------------------------------------------------------------------------
function viewCocina() {
  const sts = activeTasks().filter((t) => t.kind === 'batch' || t.kind === 'cocina').map(taskState);
  const batch = sts.filter((s) => s.t.kind === 'batch');
  const plan = sts.filter((s) => s.t.kind === 'cocina');
  const f = { ...DEFAULT_FINDE, ...(S.household.finde || {}) };
  const cell = (k) => `<button class="finde-cell" data-act="finde" data-k="${k}">${avatar(f[k])}<span>${esc(personName(f[k]))}</span></button>`;

  const batchCards = batch.map((st) => {
    const { t, who, done, skip } = st;
    const note = S.week?.notes?.[t.id] ?? '';
    return `
    <div class="card batch own-${who} ${done ? 'done' : ''} ${skip ? 'skipped' : ''}">
      <div class="batch-head">
        <button class="check" data-act="check" data-id="${esc(t.id)}" aria-label="Hecho">${skip ? '<span class="skip-ico">–</span>' : ICON.check}</button>
        <button class="task-body" data-act="task-menu" data-id="${esc(t.id)}">
          <span class="task-title"><span class="emoji">${esc(t.icon || '•')}</span>${esc(t.name)}</span>
          <span class="task-meta">${badges(st)}</span>
        </button>
        ${avatar(who)}
      </div>
      ${t.note ? `<p class="batch-for"><span class="muted">Para:</span> ${esc(t.note)}</p>` : ''}
      <label class="field">
        <span>Base a cocinar</span>
        <textarea rows="2" data-note="${esc(t.id)}" placeholder="p. ej. Garbanzos + verdura asada">${esc(note)}</textarea>
      </label>
      <button class="btn small ghost to-taper" data-act="batch-to-taper" data-id="${esc(t.id)}">🍱 Apuntar en tápers</button>
    </div>`;
  }).join('');

  return `
  ${weekHeader()}
  <main class="view">
    <p class="intro muted">El finde no se cocina: las comidas del sábado y domingo salen de las tandas de entre semana.</p>
    ${batchCards || '<p class="empty">No hay tareas de batch. Crea una en Ajustes con tipo «Batch».</p>'}
    ${plan.length ? `<section class="group"><h2>Planificación</h2><div class="cards">${plan.map(taskCard).join('')}</div></section>` : ''}
    <section class="group">
      <h2>Reparto del finde</h2>
      <div class="card finde">
        <div></div><div class="fh">Sábado</div><div class="fh">Domingo</div>
        <div class="fr">Comida</div>${cell('satLunch')}${cell('sunLunch')}
        <div class="fr">Cena</div>${cell('satDinner')}${cell('sunDinner')}
      </div>
      <p class="hint muted">Toca una casilla para cambiar quién se encarga (servir y calentar).</p>
    </section>
    <details class="card tips">
      <summary>Buenas prácticas</summary>
      <ul>${BATCH_TIPS.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    </details>
  </main>`;
}

// ---------------------------------------------------------------------------
// Vista: Tápers (comidas hechas y hasta cuándo aguantan)
// ---------------------------------------------------------------------------
const activeMeals = () => S.meals.filter((m) => m.status !== 'done');
const PLACE = { nevera: { icon: '🧊', name: 'Nevera' }, congelador: { icon: '❄️', name: 'Congelador' } };

function mealCard(m) {
  const st = mealState(m);
  const left = Number(m.left ?? m.portions ?? 0);
  return `
  <div class="meal meal-${st.status}" data-id="${esc(m.id)}">
    <button class="meal-main" data-act="meal-menu" data-id="${esc(m.id)}">
      <span class="meal-top"><b class="meal-name">${esc(m.name)}</b><span class="meal-pill">${esc(st.label)}</span></span>
      <span class="meal-meta">${avatar(m.by || BOTH, 'sm')}<span>Hecho el ${esc(niceDate(m.madeOn))}${m.note ? ` · ${esc(m.note)}` : ''}</span></span>
    </button>
    <div class="meal-foot">
      <span class="portions">${'<i></i>'.repeat(Math.min(left, 12))}<em>${left} ${left === 1 ? 'ración' : 'raciones'}</em></span>
      <button class="btn small primary" data-act="meal-eat" data-id="${esc(m.id)}">🍽 Comer 1</button>
    </div>
  </div>`;
}

function viewTapers() {
  const act = activeMeals().sort((a, b) => (a.useBy || '').localeCompare(b.useBy || ''));
  const group = (place) => {
    const list = act.filter((m) => (m.place || 'nevera') === place);
    return `
    <section class="group">
      <h2>${PLACE[place].icon} ${PLACE[place].name}<span class="count">${list.length}</span></h2>
      ${list.length ? `<div class="cards">${list.map(mealCard).join('')}</div>` : `<p class="empty small">Nada en ${place === 'nevera' ? 'la nevera' : 'el congelador'}.</p>`}
    </section>`;
  };
  const done = S.meals.filter((m) => m.status === 'done').sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 12);
  return `
  ${simpleHeader('Tápers', 'Lo que hay cocinado y hasta cuándo aguanta')}
  <main class="view">
    <button class="btn block primary big" data-act="meal-new">＋ Apuntar comida</button>
    ${group('nevera')}
    ${group('congelador')}
    ${done.length ? `
    <details class="card tips">
      <summary>Terminados (${done.length})</summary>
      <ul class="done-list">${done.map((m) => `<li><span>${m.doneHow === 'tirado' ? '🗑️' : '✅'} ${esc(m.name)}</span><span class="muted">${m.doneAt ? shortDate(m.doneAt) : ''}</span></li>`).join('')}</ul>
    </details>` : ''}
    <details class="card tips">
      <summary>Cuánto aguanta</summary>
      <ul>${MEAL_TIPS.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    </details>
  </main>`;
}

const addDaysISO = (iso, n) => toISO(addDays(fromISO(iso), n));

function mealForm(m = null, preset = {}) {
  const isNew = !m;
  m = m || {
    id: '', name: preset.name || '', madeOn: todayISO(), place: 'nevera', portions: preset.portions || 4,
    by: preset.by || S.me, note: preset.note || '',
  };
  const useBy = m.useBy || addDaysISO(m.madeOn, MEAL_DAYS[m.place || 'nevera']);
  const opt = (cur) => ['alfre', 'laura', BOTH].map((p) => `<option value="${p}" ${cur === p ? 'selected' : ''}>${personName(p)}</option>`).join('');
  sheetActions = [];
  openSheet(`
    <h3>${isNew ? '🍱 Apuntar comida' : 'Editar táper'}</h3>
    <form class="form" data-form="meal" data-id="${esc(m.id)}">
      <label class="field"><span>¿Qué habéis hecho?</span><input name="name" value="${esc(m.name)}" required placeholder="p. ej. Lentejas con verduras" /></label>
      <div class="field"><span>¿Dónde está?</span>
        <div class="seg">
          <button type="button" class="${(m.place || 'nevera') === 'nevera' ? 'on' : ''}" data-place="nevera">🧊 Nevera</button>
          <button type="button" class="${m.place === 'congelador' ? 'on' : ''}" data-place="congelador">❄️ Congelador</button>
        </div>
        <input type="hidden" name="place" value="${esc(m.place || 'nevera')}" />
      </div>
      <div class="form-row">
        <label class="field grow"><span>Hecho el</span><input type="date" name="madeOn" value="${esc(m.madeOn)}" required /></label>
        <label class="field grow"><span>Consumir antes del</span><input type="date" name="useBy" value="${esc(useBy)}" required /></label>
      </div>
      <p class="hint muted" data-usehint>Orientativo: nevera ${MEAL_DAYS.nevera} días · congelador ~3 meses. Se calcula solo, pero puedes cambiarlo.</p>
      <div class="form-row">
        <label class="field grow"><span>Raciones${isNew ? '' : ' que quedan'}</span>
          <div class="stepper"><button type="button" data-step="-1">−</button><input name="portions" type="number" min="0" max="30" value="${Number(isNew ? m.portions : (m.left ?? m.portions)) || 0}" inputmode="numeric" /><button type="button" data-step="1">+</button></div>
        </label>
        <label class="field grow"><span>Lo ha hecho</span><select name="by">${opt(m.by || S.me)}</select></label>
      </div>
      <label class="field"><span>Nota</span><input name="note" value="${esc(m.note)}" placeholder="opcional (p. ej. para el finde)" /></label>
      <div class="actions">
        <button class="btn block primary" type="submit">Guardar</button>
        <button class="btn block plain" type="button" data-close>Cancelar</button>
      </div>
    </form>`);
}

// Recalcula "consumir antes" al cambiar fecha o sitio (salvo que se haya tocado a mano).
function mealFormRecalc(f) {
  const ub = f.querySelector('[name="useBy"]');
  if (ub.dataset.touched) return;
  const place = f.querySelector('[name="place"]').value;
  const made = f.querySelector('[name="madeOn"]').value || todayISO();
  ub.value = addDaysISO(made, MEAL_DAYS[place]);
}
$sheet.addEventListener('input', (e) => {
  const f = e.target.closest('form[data-form="meal"]');
  if (!f) return;
  if (e.target.name === 'useBy') e.target.dataset.touched = '1';
  if (e.target.name === 'madeOn') mealFormRecalc(f);
});
$sheet.addEventListener('click', (e) => {
  const b = e.target.closest('[data-place]');
  if (!b) return;
  const f = b.closest('form');
  f.querySelectorAll('[data-place]').forEach((x) => x.classList.toggle('on', x === b));
  f.querySelector('[name="place"]').value = b.dataset.place;
  f.querySelector('[name="useBy"]').dataset.touched = '';
  mealFormRecalc(f);
});
$sheet.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-form="meal"]');
  if (!f) return;
  e.preventDefault();
  const fd = new FormData(f);
  const name = String(fd.get('name')).trim();
  if (!name) return;
  const id = f.dataset.id || `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const existing = S.meals.find((m) => m.id === id);
  const portions = Math.max(0, Math.min(30, Number(fd.get('portions')) || 0));
  const meal = {
    id, name,
    place: fd.get('place') || 'nevera',
    madeOn: fd.get('madeOn') || todayISO(),
    useBy: fd.get('useBy') || addDaysISO(todayISO(), 3),
    by: fd.get('by') || S.me,
    note: String(fd.get('note')).trim(),
    left: portions,
    portions: existing ? Math.max(existing.portions || 0, portions) : portions,
    status: 'active',
  };
  if (!existing) meal.createdAt = Date.now();
  closeSheet();
  run(store.saveMeal(S.hid, meal), existing ? 'Táper actualizado' : '¡Apuntado! 🍱');
});

function mealMenu(m) {
  const st = mealState(m);
  const acts = [];
  acts.push({ label: '✅ Nos lo hemos terminado', cls: 'primary', run: () => finishMeal(m, 'comido') });
  if (m.place === 'congelador') {
    acts.push({ label: '🧊 Descongelar (pasar a la nevera)', run: () => run(store.saveMeal(S.hid, { id: m.id, place: 'nevera', useBy: addDaysISO(todayISO(), 1), frozenOn: null }), 'A la nevera: consumir en 24 h') });
  } else {
    acts.push({ label: '❄️ Pasar al congelador', run: () => run(store.saveMeal(S.hid, { id: m.id, place: 'congelador', useBy: addDaysISO(todayISO(), MEAL_DAYS.congelador), frozenOn: todayISO() }), 'Al congelador ❄️') });
  }
  acts.push({ label: 'Editar', run: () => setTimeout(() => mealForm(m), 240) });
  acts.push({ label: '🗑️ Lo hemos tirado', cls: 'danger-ghost', run: () => finishMeal(m, 'tirado') });
  actionSheet({
    title: `🍱 ${esc(m.name)}`,
    text: `${PLACE[m.place || 'nevera'].icon} ${PLACE[m.place || 'nevera'].name} · hecho el ${esc(niceDate(m.madeOn))} · ${esc(st.label.toLowerCase())}`,
    actions: acts,
  });
}
function finishMeal(m, how) {
  run(store.saveMeal(S.hid, { id: m.id, status: 'done', doneHow: how, doneAt: Date.now(), left: 0 }), how === 'tirado' ? 'Tirado 🗑️' : '¡Táper terminado! 🎉');
}

// Guardado de "Base a cocinar" (con pequeña espera mientras se escribe)
const noteTimers = {};
$app.addEventListener('input', (e) => {
  const ta = e.target.closest('textarea[data-note]');
  if (!ta) return;
  const id = ta.dataset.note, week = ws();
  clearTimeout(noteTimers[id]);
  noteTimers[id] = setTimeout(() => run(store.setNote(S.hid, week, id, ta.value.trim())), 700);
});

// Foto de perfil: se recorta cuadrada, se reduce a 320 px y se guarda como JPEG ligero (≈20–40 KB).
$app.addEventListener('change', async (e) => {
  const input = e.target.closest('input[data-photo]');
  if (!input || !input.files?.[0]) return;
  try {
    toast('Preparando foto…');
    const dataUrl = await squarePhoto(input.files[0], 320);
    run(store.setPhoto(S.hid, S.me, dataUrl), '¡Foto guardada! 📸');
  } catch (err) {
    console.error(err);
    toast('No se pudo leer la foto');
  }
  input.value = '';
});

async function squarePhoto(file, size) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return c.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------------------------------------------------------------------------
// Vista: Ajustes
// ---------------------------------------------------------------------------
function viewAjustes() {
  const thisMon = mondayOf();
  const L = weekLetter(thisMon, S.household.weekAStart);
  const who = (p) => (p === BOTH ? 'Los dos' : personName(p)[0]);
  const rows = S.tasks.map((t) => `
    <button class="trow ${t.active === false ? 'off' : ''}" data-act="edit-task" data-id="${esc(t.id)}">
      <span class="emoji">${esc(t.icon || '•')}</span>
      <span class="trow-name">${esc(t.name)}${t.active === false ? ' <small>(pausada)</small>' : ''}</span>
      <span class="trow-ab"><i>A</i>${esc(who(t.a))} <i>B</i>${esc(who(t.b))}</span>
      <span class="trow-pts">${t.points}</span>
    </button>`).join('');

  const sum = { A: emptyScore(), B: emptyScore() };
  activeTasks().forEach((t) => {
    addCompletion(sum.A, { by: t.a, pts: t.points });
    addCompletion(sum.B, { by: t.b, pts: t.points });
  });

  return `
  ${simpleHeader('Ajustes')}
  <main class="view">
    <section class="group">
      <h2>Perfil</h2>
      <div class="profiles">
        ${['alfre', 'laura'].map((p) => `
        <div class="profile own-${p} ${p === S.me ? 'is-me' : ''}">
          ${avatar(p, 'xl')}
          <b>${esc(personName(p))} ${PERSON_EMOJI[p]}</b>
          ${p === S.me ? `
            <label class="btn small primary">📷 ${S.profiles?.[p]?.photo ? 'Cambiar foto' : 'Poner foto'}<input type="file" accept="image/*" data-photo hidden /></label>
            ${S.profiles?.[p]?.photo ? '<button class="link" data-act="photo-remove">Quitar foto</button>' : ''}`
          : `<span class="muted small">${S.profiles?.[p]?.photo ? '' : 'Aún sin foto'}</span>`}
        </div>`).join('')}
      </div>
    </section>

    <section class="group">
      <h2>¿Quién usa este móvil?</h2>
      <div class="seg">
        <button class="${S.me === 'alfre' ? 'on' : ''}" data-act="set-me" data-p="alfre">☀️ Alfre</button>
        <button class="${S.me === 'laura' ? 'on' : ''}" data-act="set-me" data-p="laura">🌸 Laura</button>
      </div>
    </section>

    <section class="group">
      <h2>Rotación</h2>
      <div class="card row-between">
        <span>Esta semana (${weekLabel(thisMon)}) es</span>
        <div class="seg small">
          <button class="${L === 'A' ? 'on' : ''}" data-act="set-letter" data-l="A">A</button>
          <button class="${L === 'B' ? 'on' : ''}" data-act="set-letter" data-l="B">B</button>
        </div>
      </div>
      <p class="hint muted">Equilibrio previsto · Semana A: Alfre ${sum.A.alfre} – Laura ${sum.A.laura} pts · Semana B: Alfre ${sum.B.alfre} – Laura ${sum.B.laura} pts · Quincena: ${sum.A.alfre + sum.B.alfre} – ${sum.A.laura + sum.B.laura}</p>
    </section>

    <section class="group">
      <h2>Tareas y puntos</h2>
      <div class="card tlist">${rows}</div>
      <button class="btn block ghost" data-act="new-task">+ Añadir tarea</button>
    </section>

    <section class="group">
      <h2>Compartir</h2>
      <div class="card">
        <p class="muted small">Código del hogar</p>
        <p class="code">${esc(S.hid)}</p>
        <button class="btn block primary" data-act="share">Enviar enlace a ${esc(personName(other(S.me)))}</button>
      </div>
    </section>

    <details class="card tips">
      <summary>Instalarla en el móvil</summary>
      <ul>
        <li><b>iPhone (Safari):</b> botón Compartir → «Añadir a pantalla de inicio».</li>
        <li><b>Android (Chrome):</b> menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio».</li>
        <li>Se abre a pantalla completa y funciona sin conexión; al volver la red se sincroniza.</li>
      </ul>
    </details>

    <button class="btn block danger-ghost" data-act="leave">Salir de este hogar en este móvil</button>
    <p class="foot muted">Reparto de tareas · Laura y Alfre</p>
  </main>`;
}

// ---------------------------------------------------------------------------
// Hojas (bottom sheets)
// ---------------------------------------------------------------------------
function openSheet(html) {
  $sheet.innerHTML = `<div class="backdrop" data-close></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  requestAnimationFrame(() => $sheet.classList.add('open'));
}
function closeSheet() {
  $sheet.classList.remove('open');
  setTimeout(() => { if (!$sheet.classList.contains('open')) $sheet.innerHTML = ''; }, 220);
}
let sheetActions = [];
function actionSheet({ title, text = '', actions }) {
  sheetActions = actions;
  openSheet(`
    <h3>${title}</h3>${text ? `<p class="muted">${text}</p>` : ''}
    <div class="actions">
      ${actions.map((a, i) => `<button class="btn block ${a.cls || 'ghost'}" data-sheet-act="${i}">${a.label}</button>`).join('')}
      <button class="btn block plain" data-close>Cancelar</button>
    </div>`);
}
$sheet.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) return closeSheet();
  const b = e.target.closest('[data-sheet-act]');
  if (b) {
    const a = sheetActions[Number(b.dataset.sheetAct)];
    if (!a?.keepOpen) closeSheet();
    a?.run?.();
  }
});

function whoDidSheet(t) {
  const me = S.me, them = other(me);
  actionSheet({
    title: `¿Quién ha hecho «${esc(t.name)}»?`,
    text: 'Los puntos van a quien la hace.',
    actions: [
      { label: `${esc(personName(them))}`, cls: 'primary', run: () => done(t, them) },
      { label: `Yo`, run: () => done(t, me) },
      { label: 'Los dos', run: () => done(t, BOTH) },
    ],
  });
}

function done(t, by) {
  buzz();
  run(store.markDone(S.hid, ws(), t, by));
  toast(`✓ ${t.name} · +${pts(t.points)}`);
}

function taskMenu(t) {
  const st = taskState(t);
  const me = S.me, them = other(me);
  const acts = [];
  if (st.skip) {
    acts.push({ label: 'Sí hay que hacerla', cls: 'primary', run: () => run(store.unskipTask(S.hid, ws(), t.id), 'Vuelve a la lista') });
    acts.push({ label: 'Editar tarea', cls: 'plain', run: () => setTimeout(() => editTask(t), 240) });
    const who = st.skip.by === me ? 'Tú' : personName(st.skip.by);
    return actionSheet({
      title: `${esc(t.icon || '')} ${esc(t.name)}`,
      text: `${esc(who)} ${st.skip.by === me ? 'has' : 'ha'} marcado que no hace falta esta semana${st.skip.reason && st.skip.reason !== 'Otro motivo' ? ` · ${esc(st.skip.reason)}` : ''}.`,
      actions: acts,
    });
  }
  if (st.done) {
    acts.push({ label: 'Desmarcar', run: () => run(store.unmarkDone(S.hid, ws(), t.id), 'Desmarcada') });
  } else {
    acts.push({ label: 'La he hecho yo', cls: 'primary', run: () => done(t, me) });
    acts.push({ label: `La ha hecho ${esc(personName(them))}`, run: () => done(t, them) });
    acts.push({ label: 'La hemos hecho los dos', run: () => done(t, BOTH) });
  }
  if (!st.done && st.base !== BOTH) {
    if (!st.swap && st.who === me) {
      acts.push({ label: `${ICON.swap} Pedir cambio a ${esc(personName(them))}…`, run: () => setTimeout(() => swapSheet(t), 240) });
    } else if (st.swap?.status === 'pending' && st.swap.from === me) {
      acts.push({ label: 'Cancelar petición de cambio', run: () => run(store.cancelSwap(S.hid, ws(), t.id, st.swap), 'Petición cancelada') });
    } else if (st.swap?.status === 'rejected' && st.swap.from === me) {
      acts.push({ label: 'Quitar aviso', run: () => run(store.cancelSwap(S.hid, ws(), t.id, st.swap)) });
    } else if (st.swap?.status === 'accepted') {
      acts.push({ label: 'Deshacer intercambio', run: () => run(store.cancelSwap(S.hid, ws(), t.id, st.swap), 'Intercambio deshecho') });
    }
  }
  if (!st.done) acts.push({ label: '🙅 No hace falta esta semana', cls: 'soft', run: () => setTimeout(() => skipSheet(t), 240) });
  acts.push({ label: 'Editar tarea', cls: 'plain', run: () => setTimeout(() => editTask(t), 240) });
  const info = [t.day, `${pts(t.points)}`, `Esta semana: ${personName(st.who)}`].filter(Boolean).join(' · ');
  actionSheet({ title: `${esc(t.icon || '')} ${esc(t.name)}`, text: esc(info) + (t.note ? `<br><em>${esc(t.note)}</em>` : ''), actions: acts });
}

function skipSheet(t) {
  const them = personName(other(S.me));
  actionSheet({
    title: `¿Por qué no hace falta «${esc(t.name)}»?`,
    text: `Le avisaremos a ${esc(them)}. No suma puntos a nadie y se puede deshacer.`,
    actions: SKIP_REASONS.map((r, i) => ({
      label: esc(r),
      cls: i === 0 ? 'primary' : 'ghost',
      run: () => { buzz(); run(store.skipTask(S.hid, ws(), t.id, S.me, r), `Avisamos a ${them}`); },
    })),
  });
}

function swapSheet(t) {
  const me = S.me, them = other(me);
  const offers = activeTasks()
    .map(taskState)
    .filter((s) => s.who === them && !s.done && !s.skip && !s.swap && s.base !== BOTH);
  actionSheet({
    title: `Pedir a ${esc(personName(them))} que haga «${esc(t.name)}»`,
    text: `¿Le ofreces algo a cambio? (${pts(t.points)})`,
    actions: [
      { label: 'Nada, es un favor', cls: 'primary', run: () => run(store.requestSwap(S.hid, ws(), t.id, me, them), 'Petición enviada') },
      ...offers.map((s) => ({
        label: `Hago yo «${esc(s.t.name)}» (${pts(s.t.points)})`,
        run: () => run(store.requestSwap(S.hid, ws(), t.id, me, them, s.t.id), 'Petición enviada'),
      })),
    ],
  });
}

function editTask(t) {
  const isNew = !t;
  t = t || { id: '', icon: '✨', name: '', points: 2, a: S.me, b: other(S.me), day: '', note: '', kind: 'casa', active: true };
  const opt = (v, cur) => ['alfre', 'laura', BOTH].map((p) => `<option value="${p}" ${cur === p ? 'selected' : ''}>${personName(p)}</option>`).join('');
  sheetActions = [];
  openSheet(`
    <h3>${isNew ? 'Nueva tarea' : 'Editar tarea'}</h3>
    <form class="form" data-form="task" data-id="${esc(t.id)}">
      <div class="form-row">
        <label class="field icon-f"><span>Icono</span><input name="icon" value="${esc(t.icon)}" maxlength="4" /></label>
        <label class="field grow"><span>Nombre</span><input name="name" value="${esc(t.name)}" required placeholder="p. ej. Cambiar sábanas" /></label>
      </div>
      <label class="field"><span>Puntos (esfuerzo)</span>
        <div class="stepper"><button type="button" data-step="-1">−</button><input name="points" type="number" min="0" max="10" value="${Number(t.points) || 0}" inputmode="numeric" /><button type="button" data-step="1">+</button></div>
      </label>
      <div class="form-row">
        <label class="field grow"><span>Semana A</span><select name="a">${opt('a', t.a)}</select></label>
        <label class="field grow"><span>Semana B</span><select name="b">${opt('b', t.b)}</select></label>
      </div>
      <div class="form-row">
        <label class="field grow"><span>Día sugerido</span><input name="day" value="${esc(t.day)}" placeholder="opcional" /></label>
        <label class="field grow"><span>Tipo</span><select name="kind">
          <option value="casa" ${t.kind === 'casa' ? 'selected' : ''}>Casa</option>
          <option value="cocina" ${t.kind === 'cocina' ? 'selected' : ''}>Cocina</option>
          <option value="batch" ${t.kind === 'batch' ? 'selected' : ''}>Batch cooking</option>
        </select></label>
      </div>
      <label class="field"><span>Nota</span><input name="note" value="${esc(t.note)}" placeholder="opcional" /></label>
      <label class="check-row"><input type="checkbox" name="active" ${t.active !== false ? 'checked' : ''}/> Activa (desmárcala para pausarla sin borrarla)</label>
      <div class="actions">
        <button class="btn block primary" type="submit">Guardar</button>
        ${isNew ? '' : '<button class="btn block danger-ghost" type="button" data-act-sheet="delete-task">Borrar tarea</button>'}
        <button class="btn block plain" type="button" data-close>Cancelar</button>
      </div>
    </form>`);
}
$sheet.addEventListener('click', (e) => {
  const step = e.target.closest('[data-step]');
  if (step) {
    const inp = step.parentElement.querySelector('input');
    inp.value = Math.max(Number(inp.min) || 0, Math.min(Number(inp.max) || 10, (Number(inp.value) || 0) + Number(step.dataset.step)));
  }
  const del = e.target.closest('[data-act-sheet="delete-task"]');
  if (del) {
    const id = del.closest('form').dataset.id;
    if (del.dataset.confirm) {
      closeSheet();
      run(store.deleteTask(S.hid, id), 'Tarea borrada');
    } else {
      del.dataset.confirm = '1';
      del.textContent = '¿Seguro? Toca otra vez para borrar';
    }
  }
});
$sheet.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-form="task"]');
  if (!f) return;
  e.preventDefault();
  const fd = new FormData(f);
  const name = String(fd.get('name')).trim();
  if (!name) return;
  let id = f.dataset.id;
  if (!id) {
    const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
    id = `${slug || 'tarea'}-${Math.random().toString(36).slice(2, 6)}`;
  }
  const existing = taskById(id);
  const task = {
    id,
    icon: String(fd.get('icon')).trim() || '•',
    name,
    points: Math.max(0, Math.min(10, Number(fd.get('points')) || 0)),
    a: fd.get('a'),
    b: fd.get('b'),
    day: String(fd.get('day')).trim(),
    note: String(fd.get('note')).trim(),
    kind: fd.get('kind'),
    active: fd.get('active') === 'on',
    order: existing?.order ?? (Math.max(-1, ...S.tasks.map((t) => t.order ?? 0)) + 1),
  };
  closeSheet();
  run(store.saveTask(S.hid, task), 'Tarea guardada');
});

// ---------------------------------------------------------------------------
// Acciones (delegación de clics en la vista)
// ---------------------------------------------------------------------------
$app.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const t = el.dataset.id ? taskById(el.dataset.id) : null;

  switch (act) {
    case 'prev-week':
    case 'next-week':
    case 'today':
      S.viewMonday = act === 'today' ? mondayOf() : addDays(S.viewMonday, act === 'prev-week' ? -7 : 7);
      watchViewedWeek();
      render();
      break;

    case 'check': {
      if (!t) break;
      const st = taskState(t);
      if (st.skip) { taskMenu(t); break; }
      if (st.done) { run(store.unmarkDone(S.hid, ws(), t.id)); toast('Desmarcada'); break; }
      if (st.who === S.me) done(t, S.me);
      else if (st.who === BOTH) done(t, BOTH);
      else whoDidSheet(t);
      break;
    }
    case 'task-menu':
      if (t) taskMenu(t);
      break;

    case 'swap-accept': {
      const id = el.dataset.id, s = S.week?.swaps?.[id];
      if (s) run(store.acceptSwap(S.hid, ws(), id, s), 'Cambio aceptado');
      break;
    }
    case 'swap-reject': {
      const id = el.dataset.id;
      run(store.rejectSwap(S.hid, ws(), id), 'Le avisamos de que no puedes');
      break;
    }

    case 'meal-new':
      mealForm();
      break;
    case 'meal-menu': {
      const m = S.meals.find((x) => x.id === el.dataset.id);
      if (m) mealMenu(m);
      break;
    }
    case 'meal-eat': {
      const m = S.meals.find((x) => x.id === el.dataset.id);
      if (!m) break;
      buzz();
      const left = Math.max(0, Number(m.left ?? m.portions ?? 0) - 1);
      if (left === 0) finishMeal(m, 'comido');
      else run(store.saveMeal(S.hid, { id: m.id, left }), `🍽 Quedan ${left} ${left === 1 ? 'ración' : 'raciones'}`);
      break;
    }
    case 'batch-to-taper': {
      const st = t ? taskState(t) : null;
      const base = (S.week?.notes?.[el.dataset.id] || '').trim();
      mealForm(null, { name: base, by: st?.who || S.me, note: t?.note || '' });
      break;
    }

    case 'skip-ack':
      run(store.ackSkip(S.hid, ws(), el.dataset.id, S.me));
      break;
    case 'skip-undo':
      run(store.unskipTask(S.hid, ws(), el.dataset.id), 'Vuelve a la lista');
      break;
    case 'photo-remove':
      run(store.setPhoto(S.hid, S.me, null), 'Foto quitada');
      break;

    case 'period':
      S.period = el.dataset.p;
      render();
      break;

    case 'finde': {
      const k = el.dataset.k;
      const f = { ...DEFAULT_FINDE, ...(S.household.finde || {}) };
      const cycle = { alfre: 'laura', laura: BOTH, both: 'alfre' };
      f[k] = cycle[f[k]] || 'alfre';
      run(store.updateHousehold(S.hid, { finde: f }));
      break;
    }

    case 'set-me':
      S.me = el.dataset.p;
      ls.set('me', S.me);
      setMeClass();
      render();
      toast(`Hola, ${personName(S.me)}`);
      break;

    case 'set-letter': {
      const thisMon = mondayOf();
      const start = el.dataset.l === 'A' ? thisMon : addDays(thisMon, -7);
      run(store.updateHousehold(S.hid, { weekAStart: toISO(start) }), `Esta semana es la ${el.dataset.l}`);
      break;
    }

    case 'edit-task':
      if (t) editTask(t);
      break;
    case 'new-task':
      editTask(null);
      break;

    case 'share':
      share();
      break;
    case 'invite-dismiss':
      ls.set('invited', '1');
      render();
      break;

    case 'leave':
      actionSheet({
        title: '¿Salir de este hogar?',
        text: 'Solo se olvida en este móvil. Los datos siguen guardados y puedes volver a entrar con el enlace.',
        actions: [{ label: 'Salir', cls: 'danger', run: () => { ls.del('hid'); ls.del('me'); location.reload(); } }],
      });
      break;
  }
});

async function share() {
  const url = `${location.origin}${location.pathname}#h=${S.hid}`;
  const them = personName(other(S.me));
  ls.set('invited', '1');
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Reparto de tareas', text: `${them}, aquí tienes nuestra app de tareas:`, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast('Enlace copiado');
    }
  } catch (e) {
    if (e?.name !== 'AbortError') {
      try { await navigator.clipboard.writeText(url); toast('Enlace copiado'); } catch { prompt('Copia este enlace:', url); }
    }
  }
  render();
}

// ---------------------------------------------------------------------------
// Pantallas de entrada
// ---------------------------------------------------------------------------
const LOGO = '<img class="logo" src="icons/icon.svg" alt="" width="72" height="72" />';

function renderMessage(title, html, retry = false) {
  $tabs.hidden = true;
  $app.innerHTML = `
  <main class="onb">
    ${LOGO}
    <h1>${title}</h1>
    <p class="muted">${html}</p>
    ${retry ? '<button class="btn primary" onclick="location.reload()">Reintentar</button>' : ''}
  </main>`;
}

function renderWelcome() {
  $tabs.hidden = true;
  $app.innerHTML = `
  <main class="onb">
    ${LOGO}
    <h1>Casapp</h1>
    <p class="muted">Rotación A/B, puntos por esfuerzo y batch cooking, sincronizado entre los dos móviles.</p>
    <button class="btn primary block" id="create">Crear nuestro hogar</button>
    <div class="or"><span>o únete con el código</span></div>
    <form id="join" class="join">
      <input name="code" placeholder="Código del hogar" autocomplete="off" autocapitalize="off" spellcheck="false" />
      <button class="btn ghost" type="submit">Unirme</button>
    </form>
    <p class="hint muted">Si te han mandado un enlace, ábrelo directamente y entrarás sin código.</p>
  </main>`;

  document.getElementById('create').onclick = async (e) => {
    e.target.disabled = true;
    e.target.textContent = 'Creando…';
    const code = newHouseholdCode();
    try {
      await store.createHousehold(code, { weekAStart: toISO(mondayOf()), finde: DEFAULT_FINDE, tasks: DEFAULT_TASKS });
      S.hid = code;
      ls.set('hid', code);
      renderWho();
    } catch (err) {
      console.error(err);
      toast(`No se pudo crear: ${err.code || err.message} (${store.sessionInfo()})`);
      e.target.disabled = false;
      e.target.textContent = 'Crear nuestro hogar';
    }
  };
  document.getElementById('join').onsubmit = async (e) => {
    e.preventDefault();
    const code = new FormData(e.target).get('code').trim().toLowerCase().replace(/.*#h=/, '');
    if (code.length < 16) return toast('Ese código es demasiado corto');
    S.hid = code;
    ls.set('hid', code);
    route();
  };
}

function renderWho() {
  $tabs.hidden = true;
  $app.innerHTML = `
  <main class="onb">
    ${LOGO}
    <h1>¿Quién eres?</h1>
    <p class="muted">Se recordará en este móvil. Puedes cambiarlo en Ajustes.</p>
    <div class="who">
      <button class="who-btn who-alfre" data-p="alfre">${avatar('alfre', 'lg')}<span>Soy Alfre ☀️</span></button>
      <button class="who-btn who-laura" data-p="laura">${avatar('laura', 'lg')}<span>Soy Laura 🌸</span></button>
    </div>
  </main>`;
  $app.querySelectorAll('.who-btn').forEach((b) => (b.onclick = () => {
    S.me = b.dataset.p;
    ls.set('me', S.me);
    setMeClass();
    startApp();
  }));
}

boot();
