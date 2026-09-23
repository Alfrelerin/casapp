// Lógica pura (sin Firebase ni DOM): fechas, rotación A/B, asignaciones y puntos.

export const PEOPLE = {
  alfre: { id: 'alfre', name: 'Alfre' },
  laura: { id: 'laura', name: 'Laura' },
};
export const BOTH = 'both';
export const other = (p) => (p === 'alfre' ? 'laura' : 'alfre');
export const personName = (p) => (p === BOTH ? 'Los dos' : PEOPLE[p]?.name ?? '—');

const DAY = 864e5;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// ---------- Fechas (siempre en hora local, semana de lunes a domingo) ----------
export function mondayOf(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - dow);
  return d;
}
export function toISO(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function fromISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
export function weeksBetween(a, b) {
  return Math.round((fromISO(toISO(b)) - fromISO(toISO(a))) / (7 * DAY));
}
export function weekLabel(monday) {
  const sun = addDays(monday, 6);
  const m1 = MONTHS[monday.getMonth()], m2 = MONTHS[sun.getMonth()];
  return m1 === m2
    ? `${monday.getDate()}–${sun.getDate()} ${m2}`
    : `${monday.getDate()} ${m1} – ${sun.getDate()} ${m2}`;
}
export function shortDate(ms) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// ---------- Rotación ----------
export function weekLetter(monday, weekAStart) {
  const diff = weeksBetween(fromISO(weekAStart), monday);
  return ((diff % 2) + 2) % 2 === 0 ? 'A' : 'B';
}

// Quién tiene la tarea esta semana, teniendo en cuenta los intercambios aceptados.
export function assigneeFor(task, letter, week) {
  const base = letter === 'A' ? task.a : task.b;
  const swap = week?.swaps?.[task.id];
  if (base !== BOTH && swap && swap.status === 'accepted') return swap.to;
  return base;
}

// ---------- Puntos ----------
export function emptyScore() {
  return { alfre: 0, laura: 0 };
}
export function addCompletion(score, c) {
  const pts = Number(c.pts) || 0;
  if (c.by === BOTH) {
    score.alfre += pts;
    score.laura += pts;
  } else if (score[c.by] !== undefined) {
    score[c.by] += pts;
  }
  return score;
}
export function scoreOfWeek(week) {
  const s = emptyScore();
  Object.values(week?.completions ?? {}).forEach((c) => addCompletion(s, c));
  return s;
}
// Puntos previstos para la semana (lo asignado a cada uno, hecho o no).
export function plannedOfWeek(tasks, letter, week) {
  const s = emptyScore();
  tasks.forEach((t) => {
    if (t.active === false) return;
    addCompletion(s, { by: assigneeFor(t, letter, week), pts: t.points });
  });
  return s;
}

// Lista plana de completados de varias semanas (para historial y balance mensual).
export function allCompletions(weeks) {
  const out = [];
  weeks.forEach((w) => {
    Object.entries(w.completions ?? {}).forEach(([taskId, c]) =>
      out.push({ ...c, taskId, weekStart: w.weekStart })
    );
  });
  return out.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
}

export function balanceMessage(score, me) {
  const diff = score[me] - score[other(me)];
  const them = PEOPLE[other(me)].name;
  if (Math.abs(diff) <= 2) return 'Vais equilibrados';
  return diff > 0 ? `Llevas ${diff} pts más que ${them}` : `${them} lleva ${-diff} pts más que tú`;
}

// ---------- Datos iniciales (a partir del Excel) ----------
export const DEFAULT_TASKS = [
  { id: 'aspirar', icon: '🧹', name: 'Aspirar suelo', points: 2, a: 'laura', b: 'alfre', day: 'Sábado', kind: 'casa', note: 'Primero aspirar, luego fregar, el mismo día.' },
  { id: 'fregar', icon: '🪣', name: 'Fregar suelo', points: 3, a: 'alfre', b: 'laura', day: 'Sábado', kind: 'casa', note: 'Justo después de aspirar.' },
  { id: 'cocina', icon: '🍳', name: 'Limpiar cocina', points: 3, a: 'alfre', b: 'laura', day: '', kind: 'casa', note: '' },
  { id: 'bano', icon: '🛁', name: 'Limpiar baño', points: 4, a: 'laura', b: 'alfre', day: '', kind: 'casa', note: '' },
  { id: 'polvo', icon: '🪶', name: 'Quitar el polvo', points: 2, a: 'alfre', b: 'laura', day: '', kind: 'casa', note: '' },
  { id: 'poner-lavadora', icon: '🫧', name: 'Poner lavadoras', points: 1, a: 'laura', b: 'alfre', day: '', kind: 'casa', note: 'Quien pone la lavadora no la recoge.' },
  { id: 'recoger-lavadora', icon: '👕', name: 'Recoger lavadoras', points: 2, a: 'alfre', b: 'laura', day: '', kind: 'casa', note: 'Tender, recoger y doblar.' },
  { id: 'basura', icon: '🗑️', name: 'Tirar la basura', points: 1, a: 'laura', b: 'alfre', day: '', kind: 'casa', note: '' },
  { id: 'compra', icon: '🛒', name: 'Compra semanal', points: 2, a: 'both', b: 'both', day: '', kind: 'casa', note: 'Apuntad las bases del batch para comprar las cantidades justas.' },
  { id: 'menu', icon: '📝', name: 'Planificar menú y lista', points: 2, a: 'alfre', b: 'laura', day: 'Domingo', kind: 'cocina', note: 'Menú de la semana, bases del batch y lista de la compra.' },
  { id: 'batch1', icon: '🍲', name: 'Batch 1', points: 5, a: 'laura', b: 'laura', day: 'Martes mediodía', kind: 'batch', note: 'Comidas martes y miércoles + base para 1–2 cenas rápidas' },
  { id: 'batch2', icon: '🥘', name: 'Batch 2', points: 5, a: 'alfre', b: 'alfre', day: 'Jueves', kind: 'batch', note: 'Comidas y cenas del finde (sábado y domingo)' },
].map((t, i) => ({ ...t, order: i, active: true }));

export const DEFAULT_FINDE = {
  satLunch: 'laura',
  satDinner: 'alfre',
  sunLunch: 'alfre',
  sunDinner: 'both',
};

export const TIPS = [
  'Aspirar y fregar, el mismo día y seguidos (primero aspirar, luego fregar). El sábado suele ir bien.',
  'Quien pone la lavadora no la recoge, así se reparte el estar pendiente.',
  'Repaso semanal el domingo por la tarde para dejarlo todo listo.',
  'La rotación A → B es automática: cada lunes cambia sola.',
  'Los puntos van a quien hace la tarea. Si te cambian una, te llevas sus puntos.',
];

export const BATCH_TIPS = [
  'Etiquetad los táperes con la fecha; enfriad antes de nevera o congelador.',
  'Lo del finde, sacadlo del congelador la noche anterior.',
  '"Responsable" = quien cocina esa tanda; servir/calentar el finde va según el reparto.',
  'Apuntad las bases en la compra semanal para que salgan las cantidades justas.',
];

export function newHouseholdCode() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}
