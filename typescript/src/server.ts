import express from "express";
import { z } from "zod";
import { render, readRun, workflow, RunNotFound } from "./runs";
import { InvalidRound, prepareRound } from "./game";
import { fileURLToPath } from "node:url";

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "8kb" }));
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.get("/api/health", (_req, res) =>
  res.json({
    language: "typescript",
    game: "win-the-room",
    mode: process.env.RENDER_LOCAL_DEV_URL ? "local" : "cloud",
  }),
);
const runId = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const input = z
  .object({
    pitch: z.string().trim().min(1).max(700).optional(),
    previousRunId: runId.optional(),
    retryRunId: runId.optional(),
  })
  .strict()
  .refine((b) =>
    b.retryRunId ? !b.pitch && !b.previousRunId : Boolean(b.pitch),
  );
const requests = new Map<string, number[]>();
app.post("/api/runs", async (req, res) => {
  const parsed = input.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({
        error:
          "Enter a pitch of 1 to 700 characters, or retry an unfinished round.",
      });
    return;
  }
  const now = Date.now();
  for (const [key, times] of requests)
    if (times.at(-1)! < now - 60_000) requests.delete(key);
  const key = req.ip || "local";
  const times = (requests.get(key) || []).filter((t) => now - t < 60_000);
  if (times.length >= 12) {
    res
      .status(429)
      .json({ error: "Too many rounds at once. Try again in a minute." });
    return;
  }
  requests.set(key, [...times, now]);
  const args = await prepareRound(parsed.data, readRun);
  const run = await render.workflows.startTask(`${workflow}/play_round`, [
    args,
  ]);
  res.status(202).json({ id: run.taskRunId });
});
app.get("/api/runs/:id", async (req, res) => {
  if (!runId.safeParse(req.params.id).success) {
    res.status(400).json({ error: "Invalid run ID." });
    return;
  }
  res.json(await readRun(req.params.id));
});
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err instanceof InvalidRound) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err instanceof RunNotFound) {
      res
        .status(404)
        .json({ error: "This link is not a game round. Start a new game." });
      return;
    }
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: "Invalid request." });
      return;
    }
    res
      .status(502)
      .json({
        error:
          "Cannot reach Render. Your pitch is still here. Try reconnecting.",
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
