import config from "../../../shared/config.json";
import type { CharacterResult } from "../../../shared/types";

// Text generation is isolated here. The caller supplies the already-decided vote.
export async function reactToPitch(
  result: Omit<
    CharacterResult,
    "reaction" | "reactionSource" | "dialogueModel" | "durationMs"
  >,
) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: config.dialogueInstructions,
          },
          {
            role: "user",
            content: JSON.stringify({
              pitch: result.state.pitch,
              vote: result.vote,
              findings: result.judgments.map((j) => ({
                criterion: j.label,
                finding: j.choice,
                uncertain: j.confidence < result.minimumConfidence,
              })),
            }),
          },
        ],
        max_tokens: 100,
      }),
    },
  );
  if (!response.ok)
    throw new Error(`Dialogue provider returned HTTP ${response.status}.`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (
    typeof text !== "string" ||
    !text.trim() ||
    text.trim().split(/\s+/).length > 26
  )
    throw new Error("No dialogue returned.");
  return {
    text: text
      .trim()
      .replace(/\u2014/g, ", ")
      .slice(0, 240),
    model: String(data.model),
  };
}
