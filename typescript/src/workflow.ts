import { task } from "@renderinc/sdk/workflows";
import { characters, summarize } from "./game";
import { judge } from "./judge";
import { reactToPitch } from "./provider";
import type { CharacterResult, RoundInput } from "../../shared/types";

export const evaluateCharacter = task(
  {
    name: "evaluate_character",
    plan: "flex",
    timeoutSeconds: 60,
    retry: { maxRetries: 2, waitDurationMs: 1000, backoffScaling: 2 },
  },
  async (
    _ctx,
    input: RoundInput,
    characterId: string,
  ): Promise<CharacterResult> => {
    const started = performance.now();
    const decision = await judge(input, characterId);
    const concern = decision.judgments.find(
      (j) => j.choice !== "met" || j.confidence < decision.minimumConfidence,
    );
    const fallback =
      decision.vote === "yes"
        ? "That addresses both of my concerns. I'm in."
        : `Tell me more: ${concern?.label.toLowerCase() ?? "how would this help me"}?`;
    // A dialogue outage must not discard a completed decision or invent a new vote.
    const dialogue = await reactToPitch(decision).catch(() => null);
    return {
      ...decision,
      reaction: dialogue?.text ?? fallback,
      reactionSource: dialogue ? "generated" : "authored",
      dialogueModel: dialogue?.model ?? null,
      durationMs: Math.round(performance.now() - started),
    };
  },
);

// Retry children, not the parent. A recovery run reuses completed character results.
export const playRound = task(
  {
    name: "play_round",
    plan: "flex",
    timeoutSeconds: 240,
    retry: { maxRetries: 0, waitDurationMs: 1000 },
  },
  async (ctx, input: RoundInput) => {
    const pending = characters.filter(
      (c) => !input.carried.some((r) => r.characterId === c.id),
    );
    const settled = await Promise.allSettled(
      pending.map((c) => ctx.run(evaluateCharacter, input, c.id)),
    );
    const results = [...input.carried];
    const failed: string[] = [];
    settled.forEach((item, index) => {
      if (item.status === "fulfilled") results.push(item.value);
      else failed.push(pending[index].id);
    });
    return summarize(results, failed);
  },
);
