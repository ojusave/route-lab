import { Render } from "@renderinc/sdk";
import type { Answer, Decision, Run, RunStep } from "../../shared/types";

export const render = new Render();
export const workflow =
  process.env.RENDER_WORKFLOW_SLUG || "route-lab-typescript";

type TaskMetadata = { name: string; workflowId?: string };
const tasks = new Map<string, TaskMetadata>();
let workflowId: string | undefined;
export class RunNotFound extends Error {}

async function readMetadata(path: string) {
  const base = process.env.RENDER_LOCAL_DEV_URL || "https://api.render.com";
  const response = await fetch(`${base}/v1/${path}`, {
    headers: process.env.RENDER_API_KEY
      ? { Authorization: `Bearer ${process.env.RENDER_API_KEY}` }
      : {},
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Task metadata unavailable.");
  return response.json();
}

async function taskMetadata(id: string): Promise<TaskMetadata> {
  if (!tasks.has(id)) tasks.set(id, await readMetadata(`tasks/${id}`));
  return tasks.get(id)!;
}

async function verifyDemoRun(root: {
  taskId: string;
  parentTaskRunId?: string;
}) {
  const metadata = await taskMetadata(root.taskId);
  if (metadata.name !== "answer_prompt" || root.parentTaskRunId)
    throw new RunNotFound();
  if (!process.env.RENDER_LOCAL_DEV_URL) {
    if (!workflowId) {
      const matching = await readMetadata(
        `tasks?taskSlug=${encodeURIComponent(`${workflow}/answer_prompt`)}&limit=1`,
      );
      workflowId = matching[0]?.task?.workflowId;
    }
    // A public endpoint must not expose runs from other workflows in this account.
    if (!workflowId || metadata.workflowId !== workflowId)
      throw new RunNotFound();
  }
}

export async function readRun(id: string): Promise<Run> {
  const root = await render.workflows.getTaskRun(id);
  await verifyDemoRun(root);
  const listed = await render.workflows.listTaskRuns({
    rootTaskRunId: [id],
    limit: 100,
  });
  const children = await Promise.all(
    listed
      .filter((r) => r.taskRun.id !== id && r.taskRun.rootTaskRunId === id)
      .map((r) => render.workflows.getTaskRun(r.taskRun.id)),
  );
  const steps: RunStep[] = await Promise.all(
    children
      .sort((a, b) => (a.startedAt ?? "").localeCompare(b.startedAt ?? ""))
      .map(async (r) => {
        const { name } = await taskMetadata(r.taskId);
        const input = r.input as unknown[];
        return {
          id: r.id,
          taskName: name,
          status: r.status,
          retries: r.retries,
          group: name === "shortlist_models" ? (input[2] as number) : undefined,
          candidates:
            name === "shortlist_models"
              ? (input[1] as unknown[]).length
              : undefined,
          attempts: (r.attempts ?? []).map((a) => ({
            attempt: a.attempt,
            status: a.status,
          })),
          startedAt: r.startedAt,
          completedAt: r.completedAt,
          result: (r.results?.[0] as RunStep["result"]) ?? null,
        };
      }),
  );
  const final = root.results?.[0] as
    | { decision?: Decision; answer?: Answer }
    | undefined;
  const decision =
    final?.decision ??
    (steps
      .map((s) => s.result)
      .find((r) => r && "stage" in r && r.stage === "route") as
      | Decision
      | undefined);
  const answer =
    final?.answer ??
    (steps
      .map((s) => s.result)
      .find((r) => r && "stage" in r && r.stage === "answer") as
      | Answer
      | undefined);
  const args = root.input as [string, boolean];
  return {
    id,
    startedAt: root.startedAt,
    completedAt: root.completedAt,
    status: root.status,
    steps,
    decision: decision ?? null,
    answer: answer ?? null,
    input: { prompt: args[0], simulateFailure: args[1] ?? false },
    error:
      root.status === "failed"
        ? args[1]
          ? "Intentional demo failure. Render retried the answer task. Turn off failure mode and run again."
          : "A provider task failed after its configured attempts. Check the server credentials, provider access, or retry the request."
        : null,
  };
}
