import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
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
