import test from "node:test";
import assert from "node:assert/strict";
import {
  voteFor,
  summarize,
  prepareRound,
  InvalidRound,
} from "../typescript/src/game";
import type { CharacterResult, Judgment, Run } from "../shared/types";
const judgment = (choice: Judgment["choice"], confidence = 0.9): Judgment => ({
  id: "criterion",
  label: "Criterion",
  question: "Does it work?",
  choice,
  confidence,
  probabilities: { met: 0.9, unclear: 0.1, unmet: 0 },
});
const result = (id: string, vote: CharacterResult["vote"] = "yes") =>
  ({ characterId: id, vote }) as CharacterResult;
const input = {
  pitch: "A small invention",
  round: 1,
  previousRunId: null,
  previousPitch: null,
  previous: [],
  carried: [],
  recoveryOf: null,
};
const run = (overrides: Partial<Run> = {}): Run => ({
  id: "round1",
  status: "completed",
  steps: [],
  input,
  results: [result("mina"), result("ravi"), result("jules", "no")],
  outcome: { results: [], failed: [], votes: 2, won: true, complete: true },
  error: null,
  ...overrides,
});
test("votes require addressed criteria and sufficient confidence", () => {
  assert.equal(voteFor([judgment("met"), judgment("met")]), "yes");
  assert.equal(voteFor([judgment("met"), judgment("met", 0.2)]), "undecided");
  assert.equal(voteFor([judgment("met"), judgment("unclear")]), "undecided");
  assert.equal(voteFor([judgment("met"), judgment("unmet")]), "no");
  assert.equal(voteFor([judgment("met"), judgment("unmet", 0.2)]), "undecided");
  assert.equal(voteFor([]), "undecided");
});
test("a missing vote never becomes a no or a finished game", () => {
  const partial = summarize([result("mina"), result("ravi")], ["jules"]);
  assert.equal(partial.votes, 2);
  assert.equal(partial.complete, false);
  assert.equal(partial.won, false);
  assert.equal(
    summarize([result("mina"), result("ravi"), result("jules", "no")], []).won,
    true,
  );
});
test("a revision reads prior results on the server", async () => {
  const next = await prepareRound(
    { pitch: "A revised invention", previousRunId: "round1" },
    async () => run(),
  );
  assert.equal(next.round, 2);
  assert.equal(next.previousPitch, input.pitch);
  assert.equal(next.previous.length, 3);
});
test("a third attempt, an unchanged pitch, and an unfinished round are rejected", async () => {
  await assert.rejects(
    () =>
      prepareRound({ pitch: "third", previousRunId: "r2" }, async () =>
        run({ input: { ...input, round: 2 } }),
      ),
    InvalidRound,
  );
  await assert.rejects(
    () =>
      prepareRound({ pitch: input.pitch, previousRunId: "r1" }, async () =>
        run(),
      ),
    InvalidRound,
  );
  await assert.rejects(
    () =>
      prepareRound({ pitch: "new", previousRunId: "r1" }, async () =>
        run({ status: "running", outcome: null }),
      ),
    InvalidRound,
  );
});
test("recovery preserves pitch and round and reuses only completed character results", async () => {
  const partial = run({
    results: [result("mina")],
    outcome: null,
    status: "failed",
  });
  const recovered = await prepareRound(
    { retryRunId: "round1" },
    async () => partial,
  );
  assert.equal(recovered.round, 1);
  assert.equal(recovered.pitch, input.pitch);
  assert.equal(recovered.carried.length, 1);
  assert.equal(recovered.recoveryOf, "round1");
  await assert.rejects(
    () => prepareRound({ retryRunId: "round1" }, async () => run()),
    InvalidRound,
  );
});
