import { useEffect, useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import type { Run } from "../../shared/types";
import { terminal } from "./api";
import TaskTimeline from "./TaskTimeline";
import { durationLabel, timeline } from "./timeline";
const taskLabels: Record<string, string> = {
  load_models: "Fetch live models",
  shortlist_models: "Compare a model group",
  choose_model: "Choose a finalist",
  write_answer: "Generate the answer",
};

export default function Workflow({
  run,
  busy,
  mode,
}: {
  run: Run | null;
  busy: boolean;
  mode: string;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!busy) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [busy]);
  if (!run && !busy) return null;

  const steps = run?.steps ?? [];
  const grouped = steps
    .filter((s) => s.taskName === "shortlist_models")
    .sort((a, b) => (a.group ?? 0) - (b.group ?? 0));
  const current = steps.filter((s) => !terminal(s.status));
  const retrying = current.find((s) => s.attempts.length > 1);
  const failed = run?.status === "failed";
  let headline = "";
  if (busy && !run) headline = "Connecting to Render…";
  else if (run?.status === "canceled") headline = "Run canceled.";
  else if (failed) headline = "Task failed. Completed steps are saved.";
  else if (run?.answer) headline = "Answer ready.";
  else if (retrying)
    headline = `Render is retrying ${retrying.taskName === "write_answer" ? "the answer" : (taskLabels[retrying.taskName]?.toLowerCase() ?? "a task")}.`;
  else if (current.some((s) => s.taskName === "write_answer"))
    headline = `${run?.decision?.model.name ?? "The selected model"} is writing your answer.`;
  else if (current.some((s) => s.taskName === "choose_model"))
    headline = "TypeSafe is choosing a model.";
  else if (grouped.length)
    headline = `TypeSafe is comparing models in ${grouped.length} parallel groups.`;
  else if (busy) headline = "Render is fetching the live model catalog.";
  const elapsed = run ? timeline(run, now).duration : null;
  return (
    <section
      className="workflow-card"
      id="live-workflow"
      tabIndex={-1}
      aria-label="Live workflow progress"
    >
      <div className="workflow-heading">
        <span>
          <img src="/render-mark.svg" alt="" />
          Render Workflows
        </span>
        <span>
          {mode === "cloud"
            ? "Live task execution"
            : mode === "local"
              ? "Local SDK"
              : "Connecting…"}
        </span>
      </div>
      {(busy || run) && (
        <div className="live-headline">
          <span role="status" aria-live="polite" aria-atomic="true">
            {busy ? (
              <LoaderCircle size={14} className="spin" />
            ) : run?.answer ? (
              <Check size={14} />
            ) : (
              <X size={14} />
            )}
            {headline}
          </span>
          <time>{elapsed !== null ? durationLabel(elapsed) : ""}</time>
        </div>
      )}
      {run && <TaskTimeline key={run.id} run={run} now={now} />}
      {run && (
        <details className="trace">
          <summary>
            {steps.length} tasks <span>Run details</span>
          </summary>
          <div className="trace-grid">
            {steps.map((s) => (
              <div key={s.id}>
                <span>
                  {taskLabels[s.taskName] ?? s.taskName}
                  {s.group ? ` ${s.group}` : ""}
                </span>
                <code>{s.id}</code>
                <strong className={s.status === "failed" ? "warning-text" : ""}>
                  {s.status}
                </strong>
                <span>
                  {s.attempts.length} attempt
                  {s.attempts.length === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
          <p className="fineprint">
            Run {run.id}. Task times include retries and waits. Each child task
            can retry twice. A fresh run repeats the work.
            {mode === "cloud"
              ? " Running on Render."
              : " Running locally with the Render SDK and CLI."}
          </p>
        </details>
      )}
    </section>
  );
}
