import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};
const hasConfig = Boolean(
  config.apiKey &&
  config.authDomain &&
  config.projectId === "vuatoi-price" &&
  config.appId,
);
let auth = null;
let db = null;
let setupError = "";
const usingEmulators = import.meta.env.DEV && env.VITE_USE_LOCAL_FIRESTORE === "true";
if (hasConfig) {
  try {
    const app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    if (usingEmulators) {
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
    }
  } catch {
    setupError =
      "Cấu hình Firebase không hợp lệ. Vui lòng kiểm tra Web config trong .env.local.";
  }
}
export { auth, db };
export const configured = Boolean(auth && db);
export const firebaseSetupError = setupError;
export { usingEmulators };
