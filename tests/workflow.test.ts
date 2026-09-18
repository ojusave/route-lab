import test from "node:test";
import assert from "node:assert/strict";
import { playRound } from "../typescript/src/workflow";
import type { CharacterResult, RoundInput } from "../shared/types";
const input: RoundInput = {
  pitch: "test",
  round: 1,
  previous: [],
  previousPitch: null,
  previousRunId: null,
  carried: [],
  recoveryOf: null,
};
test("the parent preserves successful characters when a sibling fails, then only schedules missing characters", async () => {
  const calls: string[] = [];
  const ctx = {
    run: async (_task: unknown, _input: RoundInput, id: string) => {
      calls.push(id);
      if (id === "jules") throw new Error("provider timeout after retries");
      return { characterId: id, vote: "yes" } as CharacterResult;
    },
  } as unknown as Parameters<typeof playRound.func>[0];
  const partial = await playRound.func(ctx, input);
  assert.deepEqual(calls.sort(), ["jules", "mina", "ravi"]);
  assert.deepEqual(partial.failed, ["jules"]);
  assert.equal(partial.complete, false);
  assert.equal(partial.results.length, 2);
  const recoveryCalls: string[] = [];
  const retryCtx = {
    run: async (_task: unknown, _input: RoundInput, id: string) => {
      recoveryCalls.push(id);
      return { characterId: id, vote: "yes" } as CharacterResult;
    },
  } as unknown as Parameters<typeof playRound.func>[0];
  const recovered = await playRound.func(retryCtx, {
    ...input,
    carried: partial.results,
    recoveryOf: "old",
  });
  assert.deepEqual(recoveryCalls, ["jules"]);
  assert.equal(recovered.complete, true);
  assert.equal(recovered.votes, 3);
});
