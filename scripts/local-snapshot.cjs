const fs = require("node:fs");
const path = require("node:path");

const project = "vuatoi-price";
const base = `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents`;
const collections = ["products", "dealerPrices", "dealerViewers", "admins", "settings", "calculations"];

async function listCollection(name) {
  const documents = [];
  let pageToken = "";
  do {
    const url = new URL(`${base}/${name}`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, { headers: { Authorization: "Bearer owner" } });
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`Local snapshot read ${name}: HTTP ${response.status}`);
    const page = await response.json();
    documents.push(...(page.documents || []));
    pageToken = page.nextPageToken || "";
  } while (pageToken);
  return documents;
}

async function saveSnapshot(file) {
  const snapshot = Object.fromEntries(await Promise.all(
    collections.map(async (name) => [name, await listCollection(name)]),
  ));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const pending = `${file}.pending`;
  fs.writeFileSync(pending, JSON.stringify(snapshot));
  fs.renameSync(pending, file);
  return Object.values(snapshot).reduce((sum, documents) => sum + documents.length, 0);
}

async function restoreSnapshot(file) {
  const snapshot = JSON.parse(fs.readFileSync(file, "utf8"));
  const documents = collections.flatMap((name) => snapshot[name] || []);
  const prefix = `projects/${project}/databases/(default)/documents/`;
  if (documents.some((item) => !item.name?.startsWith(prefix)))
    throw new Error("Local snapshot contains a document outside the emulator project.");
  for (let i = 0; i < documents.length; i += 100) {
    const response = await fetch(`${base}:commit`, {
      method: "POST",
      headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
      body: JSON.stringify({ writes: documents.slice(i, i + 100).map((item) => ({
        update: { name: item.name, fields: item.fields || {} },
      })) }),
    });
    if (!response.ok) throw new Error(`Local snapshot restore: HTTP ${response.status}: ${await response.text()}`);
  }
  return documents.length;
}

module.exports = { saveSnapshot, restoreSnapshot };
