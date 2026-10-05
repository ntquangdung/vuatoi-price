import fs from "node:fs";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getFirestore,
  getDocs,
  collection,
  query,
  where,
  terminate,
} from "firebase/firestore";
const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);
try {
  const active = await getDocs(
    query(collection(db, "products"), where("active", "==", true)),
  );
  assert.ok(active.docs.every((doc) => doc.data().active === true));
  for (const name of ["products", "admins"]) {
    await assert.rejects(
      getDocs(collection(db, name)),
      (error) => error.code === "permission-denied",
    );
  }
  console.log(
    `Live Firebase read checks passed: ${active.size} active products; unrestricted products/admins queries denied.`,
  );
} finally {
  await terminate(db);
  await deleteApp(app);
}
