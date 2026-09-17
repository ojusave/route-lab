import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const example = ["typescript", "python"].includes(mode)
    ? mode
    : process.env.VITE_EXAMPLE;
  return {
    root: "frontend",
    envDir: process.cwd(),
    define: {
      "import.meta.env.VITE_EXAMPLE": JSON.stringify(example || ""),
      "import.meta.env.VITE_REPOSITORY_URL": JSON.stringify(
        loadEnv(mode, process.cwd(), "VITE_").VITE_REPOSITORY_URL ||
          process.env.VITE_REPOSITORY_URL ||
          (process.env.RENDER_GIT_REPO_SLUG
            ? `https://github.com/${process.env.RENDER_GIT_REPO_SLUG}`
            : ""),
      ),
    },
    plugins: [react()],
    build: { outDir: `../dist/${example || "typescript"}`, emptyOutDir: true },
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      proxy: {
        "/api/health": {
          target:
            example === "python"
              ? "http://127.0.0.1:3002"
              : "http://127.0.0.1:3001",
        },
        "/api/models": {
          target:
            example === "python"
              ? "http://127.0.0.1:3002"
              : "http://127.0.0.1:3001",
        },
        "/api/runs": {
          target:
            example === "python"
              ? "http://127.0.0.1:3002"
              : "http://127.0.0.1:3001",
        },
        "/api/typescript": {
          target: "http://127.0.0.1:3001",
          rewrite: (p) => p.replace("/api/typescript", "/api"),
        },
        "/api/python": {
          target: "http://127.0.0.1:3002",
          rewrite: (p) => p.replace("/api/python", "/api"),
        },
      },
    },
  };
});
