import test from "node:test";
import assert from "node:assert/strict";
import type { Run, RunStep } from "../shared/types";
import { timeline, timelineScale } from "../frontend/src/timeline";

const at = (ms: number) => new Date(ms).toISOString();
const task = (
  id: string,
  start: number,
  end: number | null,
  group?: number,
): RunStep => ({
  id,
  taskName: group ? "shortlist_models" : "load_models",
  group,
  startedAt: at(start),
  completedAt: end === null ? null : at(end),
  status: end === null ? "running" : "completed",
  retries: 0,
  attempts: [{ attempt: 0, status: "completed" }],
  result: null,
});
const run = (steps: RunStep[]): Run => ({
  id: "run",
  status: "completed",
  startedAt: at(1000),
  completedAt: at(7000),
  steps,
  decision: null,
  answer: null,
  error: null,
  input: { prompt: "test", simulateFailure: false },
});

test("parallel groups retain their observed overlap and ordered labels", () => {
  const chart = timeline(
    run([
      task("group2", 3001, 4900, 2),
      task("catalog", 1200, 2400),
      task("group1", 3000, 5000, 1),
    ]),
    9000,
  );
  assert.deepEqual(
    chart.rows.map((row) => row.step.id),
    ["catalog", "group1", "group2"],
  );
  assert.equal(chart.origin, 1000);
  assert.equal(chart.extent, 6000);
  assert.equal(chart.rows[2].start! - chart.rows[1].start!, 1);
  assert.equal(chart.rows[1].duration, 2000);
});

test("active spans grow, completed and failed spans stay fixed", () => {
  const sample = run([
    task("running", 3000, null),
    {
      ...task("retry", 1200, 5000),
      status: "failed",
      attempts: [
        { attempt: 0, status: "failed" },
        { attempt: 1, status: "failed" },
      ],
    },
  ]);
  sample.status = "running";
  sample.completedAt = undefined;
  assert.equal(timeline(sample, 6000).rows[0].duration, 3000);
  assert.equal(timeline(sample, 8000).rows[0].duration, 5000);
  assert.equal(timeline(sample, 8000).rows[1].duration, 3800);
  assert.equal(timeline(run([task("done", 1200, 2000)]), 99000).duration, 6000);
});

test("missing or invalid timestamps never invent a task duration", () => {
  const sample = run([
    { ...task("missing", 1000, 2000), startedAt: undefined },
    { ...task("ended", 1000, 2000), completedAt: "invalid" },
  ]);
  assert.equal(timeline(sample, 99000).rows[0].duration, null);
  assert.equal(timeline(sample, 99000).rows[1].duration, null);
  assert.equal(timeline(sample, 99000).extent, 6000);
});

test("a newly observed completion cannot extend past the active parent", () => {
  const sample = run([task("done", 1200, 4000)]);
  sample.status = "paused";
  sample.completedAt = undefined;
  const chart = timeline(sample, 3500);
  assert.equal(chart.duration, 3000);
  assert.equal(chart.extent, 3000);
});

test("the live scale leaves room for forward progress", () => {
  const early = timelineScale(1500);
  const later = timelineScale(3000);
  assert.equal(early.rangeMs, 10_000);
  assert.equal(later.rangeMs, early.rangeMs);
  assert.ok(3000 / later.rangeMs > 1500 / early.rangeMs);
});

test("extending the canvas preserves task positions and widths in pixels", () => {
  const before = timelineScale(9900);
  const after = timelineScale(10100);
  const pixels = (ms: number, scale: ReturnType<typeof timelineScale>) =>
    (ms / scale.rangeMs) * (500 * scale.pages);
  assert.equal(pixels(2000, before), pixels(2000, after));
  assert.ok(pixels(10100, after) > pixels(9900, before));
  assert.equal(after.pages, 2);
  assert.deepEqual(
    after.ticks,
    [0, 2500, 5000, 7500, 10000, 12500, 15000, 17500, 20000],
  );
});
