import type { Catalog, Model } from "../../shared/types";

export function normalizeModel(raw: any): Model {
  const input = raw.architecture?.input_modalities ?? [];
  const output = raw.architecture?.output_modalities ?? [];
  const exclusion =
    !input.includes("text") || !output.includes("text")
      ? "Not a text-in, text-out model."
      : raw.id.startsWith("openrouter/")
        ? "A routing alias; this demo selects the underlying model itself."
        : null;
  const price = (value: unknown) =>
    value !== null &&
    value !== undefined &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0
      ? Number(value) * 1_000_000
      : null;
  return {
    id: raw.id,
    name: raw.name,
    description: (raw.description ?? "").slice(0, 500),
    contextLength: raw.context_length ?? 0,
    inputPrice: price(raw.pricing?.prompt),
    outputPrice: price(raw.pricing?.completion),
    inputModalities: input,
    outputModalities: output,
    eligible: !exclusion,
    exclusion,
    reasoning: (raw.supported_parameters ?? []).includes("reasoning"),
  };
}

export async function fetchCatalog(): Promise<Catalog> {
  const started = performance.now();
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      `OpenRouter catalog unavailable (HTTP ${response.status}).`,
    );
  const data = await response.json();
  if (!Array.isArray(data.data) || !data.data.length)
    throw new Error("OpenRouter returned an empty catalog.");
  return {
    stage: "catalog",
    models: data.data.map(normalizeModel),
    fetchedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - started),
  };
}
