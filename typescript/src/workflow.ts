import { task } from "@renderinc/sdk/workflows";
import { modelGroups, shortlist, decide, generate } from "./providers";
import { fetchCatalog } from "./catalog";
import type { Decision, Model, Shortlist } from "../../shared/types";

const retry = { maxRetries: 2, waitDurationMs: 1000, backoffScaling: 2 };
const loadModels = task(
  { name: "load_models", plan: "flex", retry, timeoutSeconds: 30 },
  async () => fetchCatalog(),
);
const shortlistModels = task(
  { name: "shortlist_models", plan: "flex", retry, timeoutSeconds: 90 },
  async (_ctx, prompt: string, models: Model[], group: number) =>
    shortlist(prompt, models, group),
);
const chooseModel = task(
  { name: "choose_model", plan: "flex", retry, timeoutSeconds: 90 },
  async (_ctx, prompt: string, rounds: Shortlist[], fetchedAt: string) =>
    decide(prompt, rounds, fetchedAt),
);
const writeAnswer = task(
  { name: "write_answer", plan: "flex", retry, timeoutSeconds: 120 },
  async (_ctx, prompt: string, decision: Decision, simulateFailure: boolean) =>
    generate(prompt, decision, simulateFailure),
);

// No parent retry: restarting a parent can repeat previously completed subtasks.
task(
  {
    name: "answer_prompt",
    plan: "flex",
    retry: { maxRetries: 0, waitDurationMs: 1000 },
    timeoutSeconds: 720,
  },
  async (ctx, prompt: string, simulateFailure: boolean) => {
    const catalog = await ctx.run(loadModels);
    // Every eligible model participates. TypeSafe allows at most 255 choices per question.
    const rounds = await Promise.all(
      modelGroups(catalog, prompt).map((models, i) =>
        ctx.run(shortlistModels, prompt, models, i + 1),
      ),
    );
    const decision = await ctx.run(
      chooseModel,
      prompt,
      rounds,
      catalog.fetchedAt,
    );
    const answer = await ctx.run(
      writeAnswer,
      prompt,
      decision,
      simulateFailure,
    );
    return { state: "completed", decision, answer };
  },
);
