// One-time production migration. Dry-run by default; pass --apply to commit.
const fs = require("node:fs");
const path = require("node:path");
const { getProjectDefaultAccount, getAccessToken } = require("firebase-tools/lib/auth");
const scopes = require("firebase-tools/lib/scopes");

const project = "vuatoi-price";
const owner = "cmavuatoilyson@gmail.com";
const documentBase = `projects/${project}/databases/(default)/documents`;
const base = `https://firestore.googleapis.com/v1/${documentBase}`;
const account = getProjectDefaultAccount(process.cwd());

async function main() {
  if (account?.user.email !== owner) throw new Error(`Firebase CLI must use ${owner}.`);
  const token = await getAccessToken(account.tokens.refresh_token, [scopes.CLOUD_PLATFORM, scopes.FIREBASE_PLATFORM]);
  async function request(url, method = "GET", body) {
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
      body: body && JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(`${method} ${url} failed (${response.status}): ${data.error?.message}`);
    return data;
  }
  async function list(name) {
    const documents = [];
    let pageToken = "";
    do {
      const url = new URL(`${base}/${name}`);
      url.searchParams.set("pageSize", "300");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const page = await request(url);
      documents.push(...(page.documents || []));
      pageToken = page.nextPageToken || "";
    } while (pageToken);
    return documents;
  }
  const [products, privatePrices] = await Promise.all([list("products"), list("dealerPrices")]);
  const privateById = new Map(privatePrices.map((item) => [item.name.split("/").pop(), item]));
  const legacy = products.filter((item) => item.fields?.dealerPrice != null);
  console.log(`Products: ${products.length}; legacy dealer prices: ${legacy.length}; private dealer prices: ${privatePrices.length}.`);
  const writes = [];
  for (const product of legacy) {
    const id = product.name.split("/").pop();
    const oldPrice = product.fields.dealerPrice;
    const existing = privateById.get(id);
    if (existing && JSON.stringify(existing.fields?.price) !== JSON.stringify(oldPrice))
      throw new Error(`Conflicting dealer price for ${id}; no changes made.`);
    if (!existing) writes.push({
      update: { name: `${documentBase}/dealerPrices/${id}`, fields: { price: oldPrice } },
      updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
      currentDocument: { exists: false },
    });
    writes.push({
      update: { name: product.name, fields: {} },
      updateMask: { fieldPaths: ["dealerPrice"] },
      currentDocument: { updateTime: product.updateTime },
    });
  }
  if (!process.argv.includes("--apply")) {
    console.log(`Dry run: ${writes.length} writes planned. Run with --apply to migrate.`);
    return;
  }
  if (writes.length > 450) throw new Error("More than 450 writes; migration must be split safely.");
  if (!writes.length) {
    console.log("Already migrated; no changes made.");
    return;
  }
  const backupDir = path.resolve(".local-data");
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `production-before-dealer-migration-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(backupFile, JSON.stringify({ products, privatePrices }, null, 2));
  console.log(`Backup saved: ${backupFile}`);
  await request(`${base}:commit`, "POST", { writes });
  const [afterProducts, afterPrices] = await Promise.all([list("products"), list("dealerPrices")]);
  const remaining = afterProducts.filter((item) => item.fields?.dealerPrice != null);
  console.log(`Migration verified: ${afterProducts.length} products, ${afterPrices.length} private prices, ${remaining.length} legacy fields.`);
  if (remaining.length) throw new Error("Some legacy fields remain; inspect before deploying rules.");
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
