import { defineConfig } from "vite";
export default defineConfig({
  esbuild: { jsx: "automatic" },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "firebase-app": ["firebase/app"],
          "firebase-auth": ["firebase/auth"],
          "firebase-firestore": ["firebase/firestore"],
          react: ["react", "react-dom/client", "react-router-dom"],
        },
      },
    },
  },
});
