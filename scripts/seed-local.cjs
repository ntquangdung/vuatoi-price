// Read a product snapshot from vuatoi-price and write only to the local emulator.
const {
  getProjectDefaultAccount,
  getAccessToken,
} = require("firebase-tools/lib/auth");
const scopes = require("firebase-tools/lib/scopes");
const { initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const { doc, writeBatch, Timestamp } = require("firebase/firestore");

const projectId = "vuatoi-price";
const ownerEmail = "cmavuatoilyson@gmail.com";

function value(field) {
  if (!field) return null;
  if ("stringValue" in field) return field.stringValue;
  if ("integerValue" in field) return Number(field.integerValue);
  if ("doubleValue" in field) return Number(field.doubleValue);
  if ("booleanValue" in field) return field.booleanValue;
  if ("timestampValue" in field)
    return Timestamp.fromDate(new Date(field.timestampValue));
  return null;
}

async function main() {
  if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080")
    throw new Error(
      "Refusing to seed anything except Firestore Emulator on 127.0.0.1:8080.",
    );
  const account = getProjectDefaultAccount(process.cwd());
  if (account?.user.email !== ownerEmail)
    throw new Error(`Firebase CLI must be signed in as ${ownerEmail}.`);
  const token = await getAccessToken(account.tokens.refresh_token, [
    scopes.CLOUD_PLATFORM,
    scopes.FIREBASE_PLATFORM,
  ]);
  async function list(collectionName) {
    const documents = [];
    let pageToken = "";
    do {
      const url = new URL(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}`,
      );
      url.searchParams.set("pageSize", "300");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (response.status === 404) return [];
      if (!response.ok)
        throw new Error(
          `Reading ${collectionName} failed (${response.status}).`,
        );
      const page = await response.json();
      documents.push(...(page.documents || []));
      pageToken = page.nextPageToken || "";
    } while (pageToken);
    return documents;
  }

  const [products, privatePrices] = await Promise.all([
    list("products"),
    list("dealerPrices"),
  ]);
  if (!products.length)
    throw new Error("No products found; local data was not changed.");
  const existingPrices = new Map(
    privatePrices.map((entry) => [
      entry.name.split("/").pop(),
      value(entry.fields.price),
    ]),
  );
  const env = await initializeTestEnvironment({
    projectId,
    firestore: { host: "127.0.0.1", port: 8080 },
  });
  try {
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const batch = writeBatch(db);
      for (const entry of products) {
        const id = entry.name.split("/").pop();
        const fields = entry.fields || {};
        batch.set(doc(db, "products", id), {
          name: value(fields.name),
          unit: value(fields.unit),
          price: value(fields.price),
          active: value(fields.active),
          createdAt: value(fields.createdAt),
          updatedAt: value(fields.updatedAt),
        });
        const dealerPrice = existingPrices.has(id)
          ? existingPrices.get(id)
          : value(fields.dealerPrice);
        if (dealerPrice != null)
          batch.set(doc(db, "dealerPrices", id), {
            price: dealerPrice,
            updatedAt: Timestamp.now(),
          });
      }
      batch.set(doc(db, "admins", ownerEmail), {
        email: ownerEmail,
        active: true,
        createdAt: Timestamp.now(),
      });
      await batch.commit();
    });
    console.log(
      `Local emulator seeded with ${products.length} products and the first Admin.`,
    );
  } finally {
    await env.cleanup();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
