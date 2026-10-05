import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocsFromServer,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
export const normalizeEmail = (value) => value.trim().toLowerCase();
export const watchProducts = (all, next, error) =>
  onSnapshot(
    all
      ? collection(db, "products")
      : query(collection(db, "products"), where("active", "==", true)),
    (snapshot) =>
      next(
        snapshot.docs
          .map((d) => ({ ...d.data(), id: d.id }))
          .sort((a, b) => a.name.localeCompare(b.name, "vi")),
      ),
    error,
  );
export const watchAccess = (email, next, error) =>
  onSnapshot(
    doc(db, "admins", normalizeEmail(email)),
    (d) => next(d.exists() && d.data().active === true),
    error,
  );
export const watchAdmins = (next, error) =>
  onSnapshot(
    collection(db, "admins"),
    (s) =>
      next(
        s.docs
          .map((d) => ({ ...d.data(), id: d.id }))
          .sort((a, b) => a.email.localeCompare(b.email)),
      ),
    error,
  );
export const saveProduct = (id, data) =>
  id
    ? updateDoc(doc(db, "products", id), {
        ...data,
        updatedAt: serverTimestamp(),
      })
    : addDoc(collection(db, "products"), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
export const toggleProduct = (p) =>
  updateDoc(doc(db, "products", p.id), {
    active: !p.active,
    updatedAt: serverTimestamp(),
  });
export const saveAdmin = (email, active) =>
  setDoc(doc(db, "admins", normalizeEmail(email)), {
    email: normalizeEmail(email),
    active,
    createdAt: serverTimestamp(),
  });
export const toggleAdmin = (a) =>
  updateDoc(doc(db, "admins", a.id), { active: !a.active });
export const removeAdmin = (id) => deleteDoc(doc(db, "admins", id));
export const saveCalculation = (data, email) =>
  addDoc(collection(db, "calculations"), {
    ...data,
    savedBy: normalizeEmail(email),
    createdAt: serverTimestamp(),
  });
export const watchCalculations = (next, error) =>
  onSnapshot(
    query(
      collection(db, "calculations"),
      orderBy("createdAt", "desc"),
      limit(100),
    ),
    (snapshot) => next(snapshot.docs.map((d) => ({ ...d.data(), id: d.id }))),
    error,
  );

export const watchHistorySettings = (next, error) =>
  onSnapshot(
    doc(db, "settings", "history"),
    (snapshot) => next(snapshot.exists() ? snapshot.data().retentionDays : 7),
    error,
  );

export const saveHistorySettings = (retentionDays) =>
  setDoc(doc(db, "settings", "history"), {
    retentionDays,
    updatedAt: serverTimestamp(),
  });

export const deleteExpiredCalculations = async (retentionDays) => {
  // Cleanup runs while an Admin has the history page open. A small cushion
  // keeps the client clock from requesting deletion before the server cutoff.
  const cutoff = Timestamp.fromMillis(
    Date.now() - retentionDays * 24 * 60 * 60 * 1000 - 5 * 60 * 1000,
  );
  let deleted = 0;
  while (true) {
    const expired = await getDocsFromServer(
      query(
        collection(db, "calculations"),
        where("createdAt", "<=", cutoff),
        limit(20),
      ),
    );
    if (expired.empty) return deleted;
    await Promise.all(expired.docs.map((entry) => deleteDoc(entry.ref)));
    deleted += expired.size;
  }
};
