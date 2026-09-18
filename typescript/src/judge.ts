import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
import config from "../../shared/config.json";
import { character, voteFor } from "./game";
import type {
  CharacterResult,
  Finding,
  Judgment,
  RoundInput,
} from "../../shared/types";

export async function judge(
  input: RoundInput,
  characterId: string,
): Promise<
  Omit<
    CharacterResult,
    "reaction" | "reactionSource" | "dialogueModel" | "durationMs"
  >
> {
  const person = character(characterId);
  const state = { pitch: input.pitch, previousPitch: input.previousPitch };
  const started = performance.now();
  const client = new TypeSafeClient({
    timeout: 30_000,
    retry: { maxRetries: 0 },
  });
  const result = await client.systemOne({
    state,
    questions: Object.fromEntries(
      person.criteria.map((c) => [
        c.id,
        choice(
          `${config.instructions}\nCriterion: ${c.question}`,
          config.options,
        ),
      ]),
    ),
  });
  const judgments: Judgment[] = person.criteria.map((c) => {
    const answer = result.answers[c.id];
    if (!answer || !(answer.choice in config.options))
      throw new Error("Missing TypeSafe criterion result.");
    return {
      ...c,
      choice: answer.choice as Finding,
      confidence: answer.confidence,
      probabilities: answer.probabilities as Record<Finding, number>,
    };
  });
  return {
    stage: "character",
    characterId,
    name: person.name,
    vote: voteFor(judgments),
    previousVote:
      input.previous.find((r) => r.characterId === characterId)?.vote ?? null,
    judgments,
    typesafeModel: result.model,
    decisionMs: Math.round(performance.now() - started),
    rulesVersion: config.rulesVersion,
    instructions: config.instructions,
    options: config.options,
    state,
    minimumConfidence: config.minimumConfidence,
  };
}
