import { writeFileSync } from "node:fs";
const evidence = [];
for (const [language, base] of [
  ["typescript", process.env.TS_URL || "http://127.0.0.1:3001"],
  ["python", process.env.PY_URL || "http://127.0.0.1:3002"],
]) {
  const start = Date.now();
  const response = await fetch(`${base}/api/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "Explain how rainbows form in two sentences.",
      simulateFailure: false,
    }),
  });
  const { id, error } = await response.json();
  if (!id) throw new Error(`${language}: ${error}`);
  console.log(language, "started", id);
  let finished = false;
  let previous = "";
  while (Date.now() - start < 720_000) {
    const r = await fetch(`${base}/api/runs/${id}`);
    const run = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(run));
    const status = run.steps
      .map((s) => `${s.taskName}${s.group || ""}:${s.status}`)
      .join(", ");
    if (status !== previous) {
      console.log(language, status);
      previous = status;
    }
    if (["completed", "succeeded", "failed", "canceled"].includes(run.status)) {
      const record = {
        language,
        id,
        status: run.status,
        elapsedMs: Date.now() - start,
        model: run.decision?.choice,
        candidates: run.decision?.candidateCount,
        steps: run.steps.map((s) => ({
          name: s.taskName,
          group: s.group,
          status: s.status,
          attempts: s.attempts.length,
        })),
        answer: run.answer?.text,
        error: run.error,
      };
      evidence.push(record);
      console.log(JSON.stringify(record));
      if (!run.answer) throw new Error(`${language} failed`);
      const expected = Math.ceil(run.decision.candidateCount / 200) + 3;
      if (run.steps.length !== expected)
        throw new Error(
          `Expected ${expected} child runs, got ${run.steps.length}`,
        );
      finished = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!finished) throw new Error(`${language} timed out`);
}
writeFileSync(
  process.env.EVIDENCE_PATH || "tests/live-evidence.json",
  JSON.stringify(evidence, null, 2),
);
