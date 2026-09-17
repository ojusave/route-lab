import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
import config from "../../shared/config.json";
import type { Catalog, Decision, Model, Shortlist } from "../../shared/types";

export function modelGroups(catalog: Catalog, prompt: string): Model[][] {
  const models = catalog.models
    .filter(
      (m) =>
        m.eligible &&
        m.contextLength >= Buffer.byteLength(prompt, "utf8") + 2000,
    )
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const groups: Model[][] = [];
  for (let i = 0; i < models.length; i += 200)
    groups.push(models.slice(i, i + 200));
  return groups;
}

async function select(prompt: string, models: Model[]) {
  const criteria = Object.fromEntries(
    models.map((m) => [
      m.id,
      {
        about: m.description.slice(0, 200),
        context: m.contextLength,
        inputPrice: m.inputPrice,
        outputPrice: m.outputPrice,
        reasoning: m.reasoning,
      },
    ]),
  );
  const client = new TypeSafeClient({
    timeout: 60_000,
    retry: { maxRetries: 0 },
  });
  return client.systemOne({
    state: { prompt },
    questions: { model: choice(config.instructions, criteria) },
  });
}

export async function shortlist(
  prompt: string,
  models: Model[],
  group: number,
): Promise<Shortlist> {
  const started = performance.now();
  const result = await select(prompt, models);
  const selected = result.answers.model;
  const winner = models.find((m) => m.id === selected.choice);
  if (!winner)
    throw new Error("TypeSafe selected a model outside the supplied group.");
  return {
    stage: "shortlist",
    group,
    candidates: models.length,
    winner,
    confidence: selected.confidence,
    probabilities: selected.probabilities,
    durationMs: Math.round(performance.now() - started),
  };
}

export async function decide(
  prompt: string,
  rounds: Shortlist[],
  catalogFetchedAt: string,
): Promise<Decision> {
  const started = performance.now();
  const models = rounds.map((r) => r.winner);
  if (!models.length || models.length > 255)
    throw new Error("Catalog size is outside the supported selection range.");
  const result = await select(prompt, models);
  const selected = result.answers.model;
  const model = models.find((m) => m.id === selected.choice);
  if (!model)
    throw new Error("TypeSafe selected a model outside the finalists.");
  return {
    stage: "route",
    choice: selected.choice,
    confidence: selected.confidence,
    probabilities: selected.probabilities,
    model,
    routerModel: result.model,
    durationMs: Math.round(performance.now() - started),
    candidateCount: rounds.reduce((n, r) => n + r.candidates, 0),
    catalogFetchedAt,
    usage: result.usage,
    rounds,
  };
}
