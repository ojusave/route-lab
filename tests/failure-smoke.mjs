import { writeFileSync } from "node:fs";
const records = [];
for (const [language, base] of [
  ["typescript", process.env.TS_URL || "http://127.0.0.1:3001"],
  ["python", process.env.PY_URL || "http://127.0.0.1:3002"],
]) {
  const response = await fetch(`${base}/api/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "Say hello in French.",
      simulateFailure: true,
    }),
  });
  const { id } = await response.json();
  const start = Date.now();
  let done = false;
  while (Date.now() - start < 720_000) {
    const data = await (await fetch(`${base}/api/runs/${id}`)).json();
    if (data.status === "failed") {
      const failed = data.steps.find((s) => s.taskName === "write_answer");
      if (failed?.attempts.length !== 3 || !data.decision || data.answer)
        throw new Error(
          "Failure handling did not preserve route / retry exactly twice",
        );
      const record = {
        language,
        id,
        status: data.status,
        attempts: failed.attempts,
        decisionPreserved: !!data.decision,
        answer: data.answer,
        error: data.error,
      };
      records.push(record);
      console.log(JSON.stringify(record));
      done = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!done) throw new Error(`${language} failure test timed out`);
}
writeFileSync(
  process.env.EVIDENCE_PATH || "tests/failure-evidence.json",
  JSON.stringify(records, null, 2),
);
