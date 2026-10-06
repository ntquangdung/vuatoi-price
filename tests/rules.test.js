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
test("Home products require Google sign-in; only active products are visible", async () => {
  const publicDb = env.unauthenticatedContext().firestore();
  const db = env
    .authenticatedContext("customer", token("customer@gmail.com"))
    .firestore();
  await assertFails(
    getDocs(
      query(collection(publicDb, "products"), where("active", "==", true)),
    ),
  );
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
      dealerPrice: 200000,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(doc(db, "dealerPrices", "new"), {
      price: 200000,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(db, "dealerPrices", "new"), {
      price: -1,
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
  await assertSucceeds(deleteDoc(doc(db, "dealerPrices", "new")));
});
test("Only Admin-approved Gmail can read dealer prices; revocation is immediate", async () => {
  const adminDb = env
    .authenticatedContext("owner", token("owner@gmail.com"))
    .firestore();
  const viewerDb = env
    .authenticatedContext("dealer", token("dealer@gmail.com"))
    .firestore();
  const publicDb = env.unauthenticatedContext().firestore();
  await assertSucceeds(
    setDoc(doc(adminDb, "dealerPrices", "true"), {
      price: 190000,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(getDoc(doc(publicDb, "dealerPrices", "true")));
  await assertFails(getDoc(doc(viewerDb, "dealerPrices", "true")));
  await assertFails(getDocs(collection(viewerDb, "dealerPrices")));
  await assertFails(
    setDoc(doc(viewerDb, "dealerViewers", "dealer@gmail.com"), {
      email: "dealer@gmail.com",
      active: true,
      createdAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(doc(adminDb, "dealerViewers", "dealer@gmail.com"), {
      email: "dealer@gmail.com",
      active: true,
      createdAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(getDoc(doc(viewerDb, "dealerPrices", "true")));
  await assertSucceeds(getDocs(collection(viewerDb, "dealerPrices")));
  await assertFails(getDocs(collection(viewerDb, "dealerViewers")));
  await assertFails(
    updateDoc(doc(viewerDb, "products", "true"), {
      price: 1,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(adminDb, "dealerViewers", "dealer@gmail.com"), {
      active: false,
    }),
  );
  await assertFails(getDoc(doc(viewerDb, "dealerPrices", "true")));
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
test("Signed-in users may save calculations, while only Admin can read history", async () => {
  const publicDb = env.unauthenticatedContext().firestore();
  const viewerDb = env
    .authenticatedContext("viewer", token("viewer@gmail.com"))
    .firestore();
  const adminDb = env
    .authenticatedContext("owner", token("owner@gmail.com"))
    .firestore();
  const entry = {
    sections: [
      {
        name: "Mục 1",
        address: "450 Nguyễn Lương Bằng",
        paymentMethod: "Thu COD",
        items: [
          {
            name: "Tỏi",
            unit: "kg",
            price: 250000,
            dealerPrice: 200000,
            quantity: 2,
          },
        ],
      },
    ],
    lineCount: 1,
    retailSubtotal: 500000,
    discountType: "percent",
    discountValue: 10,
    discountAmount: 50000,
    total: 450000,
    dealerTotal: 400000,
    savedBy: "viewer@gmail.com",
    createdAt: serverTimestamp(),
  };
  await assertFails(setDoc(doc(publicDb, "calculations", "anonymous"), entry));
  await assertSucceeds(setDoc(doc(viewerDb, "calculations", "saved"), entry));
  await assertSucceeds(setDoc(doc(viewerDb, "calculations", "legacy-shape"), {
    ...entry,
    sections: [{ name: "Mục 1", items: entry.sections[0].items }],
  }));
  await assertFails(getDoc(doc(viewerDb, "calculations", "saved")));
  await assertSucceeds(getDoc(doc(adminDb, "calculations", "saved")));
  await assertFails(
    setDoc(doc(viewerDb, "calculations", "spoofed"), {
      ...entry,
      savedBy: "owner@gmail.com",
    }),
  );
  await assertFails(
    updateDoc(doc(viewerDb, "calculations", "saved"), { total: 0 }),
  );
  await assertFails(
    setDoc(doc(viewerDb, "calculations", "multiple-sections"), {
      ...entry,
      sections: [...entry.sections, ...entry.sections],
    }),
  );
  await assertFails(
    setDoc(doc(viewerDb, "calculations", "bad-payment"), {
      ...entry,
      sections: [{ ...entry.sections[0], paymentMethod: "Ngân hàng khác" }],
    }),
  );
  await assertFails(
    setDoc(doc(viewerDb, "calculations", "too-long-address"), {
      ...entry,
      sections: [{ ...entry.sections[0], address: "x".repeat(301) }],
    }),
  );
});

test("Admin chooses 3, 7, 10 or 30 days and deletes only expired history", async () => {
  const adminDb = env
    .authenticatedContext("owner", token("owner@gmail.com"))
    .firestore();
  const viewerDb = env
    .authenticatedContext("viewer", token("viewer@gmail.com"))
    .firestore();
  const settings = doc(adminDb, "settings", "history");
  await assertFails(getDoc(doc(viewerDb, "settings", "history")));
  await assertFails(
    setDoc(doc(viewerDb, "settings", "history"), {
      retentionDays: 3,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(settings, { retentionDays: 2, updatedAt: serverTimestamp() }),
  );
  await assertSucceeds(
    setDoc(settings, { retentionDays: 3, updatedAt: serverTimestamp() }),
  );
  await assertSucceeds(getDoc(settings));

  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "calculations", "four-days-old"), {
      createdAt: Timestamp.fromMillis(Date.now() - 4 * 24 * 60 * 60 * 1000),
    });
    await setDoc(doc(db, "calculations", "new"), {
      createdAt: Timestamp.now(),
    });
  });
  await assertFails(deleteDoc(doc(viewerDb, "calculations", "four-days-old")));
  await assertFails(deleteDoc(doc(adminDb, "calculations", "new")));
  await assertSucceeds(
    deleteDoc(doc(adminDb, "calculations", "four-days-old")),
  );

  await assertSucceeds(
    setDoc(settings, { retentionDays: 30, updatedAt: serverTimestamp() }),
  );
  await assertFails(deleteDoc(doc(adminDb, "calculations", "new")));
});
