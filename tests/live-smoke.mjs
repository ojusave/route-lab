import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
const base = process.env.DEMO_API_URL || "http://127.0.0.1:3002/api";
const terminal = (s) =>
  ["completed", "succeeded", "failed", "canceled"].includes(s);
async function call(path, body) {
  const r = await fetch(base + path, {
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await r.json();
  assert.ok(r.ok, JSON.stringify(data));
  return data;
}
async function play(body) {
  const start = await call("/runs", body);
  let run;
  for (let i = 0; i < 100; i++) {
    run = await call("/runs/" + start.id);
    if (terminal(run.status)) break;
    await new Promise((r) => setTimeout(r, 800));
  }
  assert.equal(
    run.outcome?.complete,
    true,
    JSON.stringify({ status: run.status, error: run.error }),
  );
  assert.equal(run.steps.length, 3);
  assert.ok(run.steps.every((s) => s.taskName === "evaluate_character"));
  assert.ok(
    run.results.every(
      (r) => r.judgments.length === 2 && r.typesafeModel.startsWith("jev-"),
    ),
  );
  return run;
}
const first = await play({
  pitch:
    "A little pot that waters your desk plant while you are away. No more coming back to a sad fern.",
});
const second = await play({
  pitch:
    "A $24 self-watering pot for people away for a week. A cotton wick draws water from a refillable reservoir into the soil, reducing daily watering compared with a normal pot. No subscription or electricity. It holds seven days of water, but is unsuitable for cacti and needs refilling before longer trips.",
  previousRunId: first.id,
});
assert.equal(second.input.round, 2);
assert.equal(second.input.previousPitch, first.input.pitch);
assert.ok(
  second.results.every(
    (r) =>
      r.previousVote ===
      first.results.find((p) => p.characterId === r.characterId).vote,
  ),
);
const blocked = await fetch(base + "/runs", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ pitch: "One more attempt", previousRunId: second.id }),
});
assert.equal(blocked.status, 409);
mkdirSync("work", { recursive: true });
const language = (await call("/health")).language;
writeFileSync(
  `work/${language}-game-live.json`,
  JSON.stringify({ first, second }, null, 2),
);
console.log(
  JSON.stringify(
    {
      language,
      first: { id: first.id, votes: first.outcome.votes },
      second: { id: second.id, votes: second.outcome.votes },
      thirdAttempt: blocked.status,
      models: second.results.map((r) => r.typesafeModel),
      reactions: second.results.map((r) => r.reactionSource),
    },
    null,
    2,
  ),
);
