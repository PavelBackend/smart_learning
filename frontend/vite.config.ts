import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api/words": {
        target: "http://localhost:8001",
        rewrite: (path) => path.replace("/api", ""),
      },
      "/api/practice": {
        target: "http://localhost:8002",
        rewrite: (path) => path.replace("/api", ""),
      },
      "/api/insights": {
        target: "http://localhost:8003",
        rewrite: (path) => path.replace("/api", ""),
      },
      "/api/journal": {
        target: "http://localhost:8004",
        rewrite: (path) => path.replace("/api", ""),
      },
    },
  },
});
