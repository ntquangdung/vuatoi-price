import test, { before, after } from "node:test";
import fs from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
let env;
const token = (email) => ({
  email,
  email_verified: true,
  firebase: { sign_in_provider: "google.com" },
});
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-vuatoi-price",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: fs.readFileSync("firestore.rules", "utf8"),
    },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "admins", "owner@gmail.com"), {
      email: "owner@gmail.com",
      active: true,
      createdAt: Timestamp.now(),
    });
    for (const active of [true, false])
      await setDoc(doc(db, "products", String(active)), {
        name: "Test",
        unit: "kg",
        price: 250000,
        active,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
  });
});
after(async () => {
  await env?.cleanup();
});
test("Public reads only active products; no writes or admin list", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertSucceeds(
    getDocs(query(collection(db, "products"), where("active", "==", true))),
  );
  await assertFails(getDocs(collection(db, "products")));
  await assertFails(getDoc(doc(db, "products", "false")));
  await assertFails(updateDoc(doc(db, "products", "true"), { price: 1 }));
  await assertFails(getDocs(collection(db, "admins")));
});
test("Non-admin can check own access but cannot list or elevate", async () => {
  const db = env
    .authenticatedContext("outsider", token("outsider@gmail.com"))
    .firestore();
  await assertSucceeds(getDoc(doc(db, "admins", "outsider@gmail.com")));
  await assertFails(getDocs(collection(db, "admins")));
  await assertFails(
    setDoc(doc(db, "admins", "outsider@gmail.com"), {
      email: "outsider@gmail.com",
      active: true,
      createdAt: serverTimestamp(),
    }),
  );
});
test("Admin CRUD validates data and preserves timestamps", async () => {
  const db = env
    .authenticatedContext("owner", token("OWNER@gmail.com"))
    .firestore();
  await assertSucceeds(getDocs(collection(db, "products")));
  await assertSucceeds(
    setDoc(doc(db, "products", "new"), {
      name: "Tỏi",
      unit: "kg",
      price: 250000,
      dealerPrice: 200000,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(db, "products", "new"), {
      price: -1,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(db, "products", "new"), {
      price: "250.000đ",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(db, "products", "new"), {
      dealerPrice: -1,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(db, "products", "new"), {
      dealerPrice: "200.000đ",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(db, "products", "new"), {
      dealerPrice: null,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(db, "products", "new"), {
      price: 300000,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(deleteDoc(doc(db, "products", "new")));
});
test("Admin manages Gmail, cannot remove own access; revocation takes effect", async () => {
  const db = env
    .authenticatedContext("owner", token("owner@gmail.com"))
    .firestore();
  await assertSucceeds(
    setDoc(doc(db, "admins", "second@gmail.com"), {
      email: "second@gmail.com",
      active: true,
      createdAt: serverTimestamp(),
    }),
  );
  const second = env
    .authenticatedContext("second", token("second@gmail.com"))
    .firestore();
  await assertSucceeds(getDocs(collection(second, "admins")));
  await assertFails(deleteDoc(doc(db, "admins", "owner@gmail.com")));
  await assertFails(
    updateDoc(doc(db, "admins", "owner@gmail.com"), { active: false }),
  );
  await assertSucceeds(
    updateDoc(doc(db, "admins", "second@gmail.com"), { active: false }),
  );
  await assertFails(getDocs(collection(second, "admins")));
  await assertSucceeds(deleteDoc(doc(db, "admins", "second@gmail.com")));
});
test("Unverified or password accounts cannot become admin", async () => {
  for (const extra of [
    { email_verified: false },
    { firebase: { sign_in_provider: "password" } },
  ]) {
    const db = env
      .authenticatedContext("fake", { ...token("owner@gmail.com"), ...extra })
      .firestore();
    await assertFails(getDocs(collection(db, "admins")));
  }
});
