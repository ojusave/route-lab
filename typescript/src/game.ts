import config from "../../shared/config.json";
import type {
  Character,
  CharacterResult,
  Judgment,
  Outcome,
  RoundInput,
  Run,
  Vote,
} from "../../shared/types";
export const characters: Character[] = config.characters;
export const character = (id: string) => {
  const found = characters.find((c) => c.id === id);
  if (!found) throw new Error("Unknown character.");
  return found;
};
export function voteFor(judgments: Judgment[]): Vote {
  if (
    judgments.some(
      (j) => j.choice === "unmet" && j.confidence >= config.minimumConfidence,
    )
  )
    return "no";
  if (
    judgments.length &&
    judgments.every(
      (j) => j.choice === "met" && j.confidence >= config.minimumConfidence,
    )
  )
    return "yes";
  return "undecided";
}
export function summarize(
  results: CharacterResult[],
  failed: string[],
): Outcome {
  const votes = results.filter((r) => r.vote === "yes").length;
  const complete =
    failed.length === 0 &&
    new Set(results.map((r) => r.characterId)).size === characters.length;
  return { results, failed, votes, complete, won: complete && votes >= 2 };
}
export class InvalidRound extends Error {}
export async function prepareRound(
  body: { pitch?: string; previousRunId?: string; retryRunId?: string },
  read: (id: string) => Promise<Run>,
): Promise<RoundInput> {
  if (body.retryRunId) {
    const old = await read(body.retryRunId);
    if (
      !["completed", "succeeded", "failed", "canceled"].includes(old.status) ||
      old.outcome?.complete
    )
      throw new InvalidRound("This round does not need a retry.");
    return { ...old.input, carried: old.results, recoveryOf: old.id };
  }
  if (!body.pitch?.trim()) throw new InvalidRound("Write your pitch first.");
  const input: RoundInput = {
    pitch: body.pitch.trim(),
    round: 1,
    previousRunId: null,
    previousPitch: null,
    previous: [],
    carried: [],
    recoveryOf: null,
  };
  if (body.previousRunId) {
    const previous = await read(body.previousRunId);
    if (
      !previous.outcome?.complete ||
      !["completed", "succeeded"].includes(previous.status)
    )
      throw new InvalidRound(
        "Finish the current round before revising your pitch.",
      );
    if (previous.input.round >= config.maxRounds)
      throw new InvalidRound("Both attempts are used. Start a new game.");
    if (input.pitch === previous.input.pitch)
      throw new InvalidRound("Change your pitch before trying again.");
    Object.assign(input, {
      round: previous.input.round + 1,
      previousRunId: previous.id,
      previousPitch: previous.input.pitch,
      previous: previous.results,
    });
  }
  return input;
}
