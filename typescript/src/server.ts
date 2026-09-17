import express from "express";
import { provider } from "./provider";
import { z } from "zod";
import { render, readRun, workflow } from "./runs";
import { fileURLToPath } from "node:url";

const app = express();
app.use(express.json({ limit: "64kb" }));
app.get("/api/health", (_req, res) =>
  res.json({
    language: "typescript",
    mode: process.env.RENDER_LOCAL_DEV_URL ? "local" : "cloud",
    typesafe: Boolean(process.env.TYPESAFE_API_KEY),
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
  }),
);
app.get("/api/models", async (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await provider.fetchCatalog());
});
const input = z
  .object({
    prompt: z.string().trim().min(1).max(6000),
    simulateFailure: z.boolean().default(false),
  })
  .strict();
app.post("/api/runs", async (req, res) => {
  const parsed = input.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Enter a prompt between 1 and 6,000 characters." });
    return;
  }
  const configured = process.env.RENDER_LOCAL_DEV_URL
    ? process.env.TYPESAFE_API_KEY
    : process.env.RENDER_API_KEY && process.env.RENDER_WORKFLOW_SLUG;
  if (!configured) {
    res.status(503).json({
      error: "Workflow setup is incomplete. Check the server environment.",
    });
    return;
  }
  const { prompt, simulateFailure } = parsed.data;
  const run = await render.workflows.startTask(`${workflow}/answer_prompt`, [
    prompt,
    simulateFailure,
  ]);
  res.status(202).json({ id: run.taskRunId });
});
app.get("/api/runs/:id", async (req, res) => {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(req.params.id)) {
    res.status(400).json({ error: "Invalid run ID." });
    return;
  }
  res.json(await readRun(req.params.id));
});
app.use(
  (
    _err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res.status(502).json({
      error:
        "Cannot reach the workflow run. Check that the task server is running, then reconnect.",
    });
  },
);
app.use(
  express.static(
    fileURLToPath(new URL("../../dist/typescript", import.meta.url)),
  ),
);
app.listen(
  Number(process.env.PORT || 3001),
  process.env.HOST || "127.0.0.1",
  () => console.log("TypeScript API ready"),
);
