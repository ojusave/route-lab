import type { Answer, Catalog, Model } from "../../../shared/types";

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

export async function generate(prompt: string, model: Model): Promise<Answer> {
  const started = performance.now();
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      signal: AbortSignal.timeout(90_000),
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.id,
        messages: [
          {
            role: "system",
            content:
              "Give a useful, concise answer. Use Markdown when helpful. Keep the answer under 250 words.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1600,
        ...(model.reasoning ? { reasoning: { effort: "low" } } : {}),
      }),
    },
  );
  if (!response.ok)
    throw new Error(
      `OpenRouter request failed (HTTP ${response.status}). Check the API key, credits, and model access.`,
    );
  const data = await response.json();
  const message = data.choices?.[0];
  if (!message?.message?.content)
    throw new Error(
      "OpenRouter returned no answer text. Try again or use a shorter prompt.",
    );
  return {
    stage: "answer",
    text: message.message.content,
    model: data.model,
    durationMs: Math.round(performance.now() - started),
    usage: data.usage ?? null,
    finishReason: message.finish_reason ?? null,
  };
}
