const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { saveSnapshot, restoreSnapshot } = require("./local-snapshot.cjs");

const root = path.resolve(__dirname, "..");
const javaBin = path.join(root, ".tools", "java", "jdk-21.0.12.1+1-jre", "bin");
const localData = path.join(root, ".local-data");
const snapshotFile = path.join(localData, "firestore-snapshot.json");
// Firestore's Windows exporter fails on the Unicode workspace path.
const importDataDir = path.join(os.tmpdir(), `vuatoi-price-import-${process.pid}`);
const env = {
  ...process.env,
  PATH: fs.existsSync(javaBin)
    ? `${javaBin}${path.delimiter}${process.env.PATH}`
    : process.env.PATH,
};
let emulator;
let vite;
let stopping = false;
let snapshotTimer;
let snapshotPending = Promise.resolve();

function queueSnapshot() {
  snapshotPending = snapshotPending.catch(() => {}).then(() => saveSnapshot(snapshotFile));
  snapshotPending.catch((error) => console.error(`Local data save failed: ${error.message}`));
  return snapshotPending;
}

function copyTree(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

async function stop() {
  if (stopping) return;
  stopping = true;
  clearInterval(snapshotTimer);
  if (emulator?.exitCode === null) {
    try {
      const count = await queueSnapshot();
      console.log(`Saved ${count} local documents in .local-data/`);
    } catch (error) {
      console.error(`Local data save failed: ${error.message}`);
    }
  }
  vite?.kill();
  emulator?.kill();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

async function waitForEmulator() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (emulator.exitCode !== null)
      throw new Error("Firebase Emulator stopped before startup.");
    try {
      await fetch("http://127.0.0.1:8080/");
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error("Firestore Emulator did not start on port 8080.");
}

async function runSeed() {
  return new Promise((resolve, reject) => {
    const seed = spawn(
      process.execPath,
      [path.join(root, "scripts", "seed-local.cjs")],
      {
        cwd: root,
        env: { ...env, FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" },
        stdio: "inherit",
      },
    );
    seed.on("error", reject);
    seed.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error("Local data seed failed.")),
    );
  });
}

async function main() {
  const firebaseArgs = [
    path.join(
      root,
      "node_modules",
      "firebase-tools",
      "lib",
      "bin",
      "firebase.js",
    ),
    "emulators:start",
    "--project",
    "vuatoi-price",
    "--only",
    "firestore",
  ];
  const hasJsonSnapshot = fs.existsSync(snapshotFile);
  const hasBinarySnapshot = fs.existsSync(
    path.join(localData, "firebase-export-metadata.json"),
  );
  if (!hasJsonSnapshot && hasBinarySnapshot) {
    copyTree(localData, importDataDir);
    firebaseArgs.push(`--import=${importDataDir}`);
  }
  emulator = spawn(process.execPath, firebaseArgs, {
    cwd: root,
    env,
    stdio: "inherit",
  });
  await waitForEmulator();
  if (hasJsonSnapshot) {
    console.log(`Restored ${await restoreSnapshot(snapshotFile)} local documents.`);
  } else if (!hasBinarySnapshot) await runSeed();
  await queueSnapshot();
  snapshotTimer = setInterval(() => { void queueSnapshot(); }, 15000);
  vite = spawn(
    process.execPath,
    [
      path.join(root, "node_modules", "vite", "bin", "vite.js"),
      "--host",
      "127.0.0.1",
      "--port",
      "5173",
      "--strictPort",
    ],
    {
      cwd: root,
      env: { ...env, VITE_USE_LOCAL_FIRESTORE: "true" },
      stdio: "inherit",
    },
  );
  vite.on("exit", () => stop());
  console.log("Local app: http://127.0.0.1:5173/");
}

main().catch((error) => {
  console.error(error.message);
  stop();
  process.exitCode = 1;
});
