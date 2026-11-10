import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages үшін: base: "/репозиторий-атауы/"
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          maps: ["leaflet", "react-leaflet"],
        },
      },
    },
  },
});
