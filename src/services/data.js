import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocsFromServer,
  getDocFromServer,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  deleteField,
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
          .map((d) => {
            const { dealerPrice: _legacyDealerPrice, ...product } = d.data();
            return { ...product, id: d.id };
          })
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
export const watchDealerAccess = (email, next, error) =>
  onSnapshot(
    doc(db, "dealerViewers", normalizeEmail(email)),
    (snapshot) => next(snapshot.exists() && snapshot.data().active === true),
    error,
  );
export const watchDealerViewers = (next, error) =>
  onSnapshot(
    collection(db, "dealerViewers"),
    (snapshot) =>
      next(
        snapshot.docs
          .map((entry) => ({ ...entry.data(), id: entry.id }))
          .sort((a, b) => a.email.localeCompare(b.email)),
      ),
    error,
  );
export const watchDealerPrices = (next, error) =>
  onSnapshot(
    collection(db, "dealerPrices"),
    (snapshot) =>
      next(
        Object.fromEntries(
          snapshot.docs.map((entry) => [entry.id, entry.data().price]),
        ),
      ),
    error,
  );
export const saveProduct = async (id, data) => {
  const { dealerPrice, ...product } = data;
  const productRef = id || doc(collection(db, "products")).id;
  const batch = writeBatch(db);
  if (id) {
    batch.update(doc(db, "products", productRef), {
      ...product,
      dealerPrice: deleteField(),
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.set(doc(db, "products", productRef), {
      ...product,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  const dealerRef = doc(db, "dealerPrices", productRef);
  if (dealerPrice == null) batch.delete(dealerRef);
  else
    batch.set(dealerRef, {
      price: dealerPrice,
      updatedAt: serverTimestamp(),
    });
  await batch.commit();
};
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
export const saveDealerViewer = (email) =>
  setDoc(doc(db, "dealerViewers", normalizeEmail(email)), {
    email: normalizeEmail(email),
    active: true,
    createdAt: serverTimestamp(),
  });
export const toggleDealerViewer = (viewer) =>
  updateDoc(doc(db, "dealerViewers", viewer.id), {
    active: !viewer.active,
  });
export const removeDealerViewer = (id) =>
  deleteDoc(doc(db, "dealerViewers", id));
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

export const canExportDealerPricesForEmail = async (email) => {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  const [admin, viewer] = await Promise.all([
    getDocFromServer(doc(db, "admins", normalized)),
    getDocFromServer(doc(db, "dealerViewers", normalized)),
  ]);
  return (
    (admin.exists() && admin.data().active === true) ||
    (viewer.exists() && viewer.data().active === true)
  );
};

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
