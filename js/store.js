// Capa de datos: todo lo que habla con Firebase está aquí.
// Estructura en Firestore:
//   households/{codigo}                     → { weekAStart, finde, createdAt }
//   households/{codigo}/tasks/{taskId}      → { name, icon, points, a, b, day, note, kind, order, active }
//   households/{codigo}/weeks/{AAAA-MM-DD}  → { weekStart, completions:{taskId:{by,pts,at,name}}, swaps:{taskId:{from,to,status,offer}}, notes:{taskId:texto} }

const V = '12.19.0';
const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
const { getAuth, signInAnonymously, onAuthStateChanged, connectAuthEmulator } = await import(
  `https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`
);
const {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator,
  doc, collection, onSnapshot, setDoc, deleteDoc, getDoc, writeBatch, query, where, deleteField,
} = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);

import { firebaseConfig } from './firebase-config.js';

const params = new URLSearchParams(location.search);
const EMULATOR = params.has('emulator');

export const isConfigured = () => EMULATOR || !String(firebaseConfig.apiKey).includes('PEGA_AQUI');

let db, auth;

export async function connect() {
  const cfg = EMULATOR ? { apiKey: 'demo-key', projectId: 'demo-reparto', authDomain: 'localhost' } : firebaseConfig;
  const app = initializeApp(cfg);
  auth = getAuth(app);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  if (EMULATOR) {
    const host = params.get('emulator') || 'localhost';
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
  }
  await new Promise((resolve, reject) => {
    const off = onAuthStateChanged(auth, (u) => {
      if (u) { off(); resolve(u); }
    });
    signInAnonymously(auth).catch((e) => { off(); reject(e); });
  });
}

const hRef = (hid) => doc(db, 'households', hid);
const weekRef = (hid, ws) => doc(db, 'households', hid, 'weeks', ws);
const taskRef = (hid, id) => doc(db, 'households', hid, 'tasks', id);

export async function householdExists(hid) {
  const snap = await getDoc(hRef(hid));
  return snap.exists();
}

export async function createHousehold(hid, { weekAStart, finde, tasks }) {
  const batch = writeBatch(db);
  batch.set(hRef(hid), { weekAStart, finde, createdAt: Date.now() });
  tasks.forEach((t) => {
    const { id, ...data } = t;
    batch.set(taskRef(hid, id), data);
  });
  await batch.commit();
}

// ---------- Suscripciones (tiempo real) ----------
export function watchHousehold(hid, cb, onError) {
  return onSnapshot(hRef(hid), (s) => cb(s.exists() ? s.data() : null), onError);
}
export function watchTasks(hid, cb, onError) {
  return onSnapshot(collection(db, 'households', hid, 'tasks'), (s) => {
    const list = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    cb(list);
  }, onError);
}
export function watchWeek(hid, ws, cb, onError) {
  return onSnapshot(weekRef(hid, ws), (s) => cb(s.exists() ? s.data() : { weekStart: ws }), onError);
}
export function watchWeeksSince(hid, sinceWs, cb, onError) {
  const q = query(collection(db, 'households', hid, 'weeks'), where('weekStart', '>=', sinceWs));
  return onSnapshot(q, (s) => cb(s.docs.map((d) => d.data())), onError);
}

// ---------- Escrituras ----------
const mergeWeek = (hid, ws, data) => setDoc(weekRef(hid, ws), { weekStart: ws, ...data }, { merge: true });

export const markDone = (hid, ws, task, by) =>
  mergeWeek(hid, ws, { completions: { [task.id]: { by, pts: Number(task.points) || 0, at: Date.now(), name: task.name } } });

export const unmarkDone = (hid, ws, taskId) =>
  mergeWeek(hid, ws, { completions: { [taskId]: deleteField() } });

export const requestSwap = (hid, ws, taskId, from, to, offer = null) =>
  mergeWeek(hid, ws, { swaps: { [taskId]: { from, to, status: 'pending', offer, at: Date.now() } } });

export const acceptSwap = (hid, ws, taskId, swap) => {
  const swaps = { [taskId]: { ...swap, status: 'accepted' } };
  if (swap.offer) swaps[swap.offer] = { from: swap.to, to: swap.from, status: 'accepted', offerOf: taskId, at: Date.now() };
  return mergeWeek(hid, ws, { swaps });
};

export const rejectSwap = (hid, ws, taskId) =>
  mergeWeek(hid, ws, { swaps: { [taskId]: { status: 'rejected' } } });

export const cancelSwap = (hid, ws, taskId, swap) => {
  const swaps = { [taskId]: deleteField() };
  const partner = swap?.offer || swap?.offerOf;
  if (partner && swap.status === 'accepted') swaps[partner] = deleteField();
  return mergeWeek(hid, ws, { swaps });
};

export const setNote = (hid, ws, taskId, text) => mergeWeek(hid, ws, { notes: { [taskId]: text } });

export const saveTask = (hid, task) => {
  const { id, ...data } = task;
  return setDoc(taskRef(hid, id), data, { merge: true });
};
export const deleteTask = (hid, id) => deleteDoc(taskRef(hid, id));

export const updateHousehold = (hid, data) => setDoc(hRef(hid), data, { merge: true });
