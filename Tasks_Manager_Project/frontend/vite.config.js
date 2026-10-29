import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In local development, forward /api/* to the FastAPI server on port 8000
// (stripping /api), the same way Caddy does in production.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
