import { useEffect, useState } from "react";
import { Check, LoaderCircle, Workflow as WorkflowIcon, X } from "lucide-react";
import type { Run, RunStep, Shortlist } from "../../shared/types";
import { terminal } from "./api";
const succeeded = (s?: string) => s === "succeeded" || s === "completed";
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
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [busy]);
  const steps = run?.steps ?? [];
  const grouped = steps
    .filter((s) => s.taskName === "shortlist_models")
    .sort((a, b) => (a.group ?? 0) - (b.group ?? 0));
  const stages = [
    { title: "Discover", sub: "OpenRouter", name: "load_models" },
    { title: "Compare", sub: "TypeSafe · parallel", name: "shortlist_models" },
    { title: "Select", sub: "TypeSafe", name: "choose_model" },
    { title: "Answer", sub: "Selected model", name: "write_answer" },
  ];
  const current = steps.filter((s) => !terminal(s.status));
  const retrying = current.find((s) => s.attempts.length > 1);
  const failed = run?.status === "failed";
  let headline = "Follow each step as it runs.";
  if (busy && !run) headline = "Sending your prompt to Render…";
  else if (failed)
    headline = "A task failed. Your completed steps are still visible.";
  else if (run?.answer) headline = "Answer ready.";
  else if (retrying)
    headline = `Render is retrying ${retrying.taskName === "write_answer" ? "the answer" : (taskLabels[retrying.taskName]?.toLowerCase() ?? "a task")}.`;
  else if (current.some((s) => s.taskName === "write_answer"))
    headline = `${run?.decision?.model.name ?? "The selected model"} is writing your answer.`;
  else if (current.some((s) => s.taskName === "choose_model"))
    headline = "TypeSafe is choosing among the group winners.";
  else if (grouped.length)
    headline = `TypeSafe is comparing models in ${grouped.length} parallel groups.`;
  else if (busy) headline = "Render is fetching the live OpenRouter catalog.";
  const elapsed = run?.startedAt
    ? Math.max(
        0,
        Math.round(
          ((run.completedAt ? new Date(run.completedAt).getTime() : now) -
            new Date(run.startedAt).getTime()) /
            1000,
        ),
      )
    : 0;
  return (
    <section
      className="workflow-card"
      id="live-workflow"
      tabIndex={-1}
      aria-label="Live workflow progress"
    >
      <div className="card-label">
        <span>
          <WorkflowIcon size={16} />
          LIVE WORKFLOW
        </span>
        <span className="muted">
          {busy
            ? "Updates every second"
            : run
              ? `${elapsed}s elapsed`
              : "Powered by Render"}
        </span>
      </div>
      <div
        className="live-headline"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {busy ? (
          <LoaderCircle size={17} className="spin" />
        ) : run?.answer ? (
          <Check size={17} />
        ) : null}
        <strong>{headline}</strong>
        {busy && run?.startedAt && <time aria-hidden="true">{elapsed}s</time>}
      </div>
      <ol className="pipeline">
        {stages.map((stage, i) => {
          const matching = steps.filter((s) => s.taskName === stage.name);
          const done =
            matching.length > 0 && matching.every((s) => succeeded(s.status));
          const running = matching.some((s) => !terminal(s.status));
          const error = matching.some((s) => s.status === "failed") && failed;
          return (
            <li
              key={stage.name}
              className={
                done ? "done" : running ? "active" : error ? "failed" : ""
              }
            >
              <div className="stage-node">
                {done ? (
                  <Check size={17} />
                ) : running ? (
                  <LoaderCircle size={17} className="spin" />
                ) : error ? (
                  <X size={17} />
                ) : (
                  <span>{String(i + 1).padStart(2, "0")}</span>
                )}
              </div>
              <div>
                <strong>{stage.title}</strong>
                <span>{stage.sub}</span>
              </div>
            </li>
          );
        })}
      </ol>
      {grouped.length > 0 && (
        <div className="live-groups">
          {grouped.map((s) => {
            const round =
              s.result && "stage" in s.result && s.result.stage === "shortlist"
                ? (s.result as Shortlist)
                : null;
            return (
              <div key={s.id} className={round ? "finished" : ""}>
                <div>
                  <span>Group {s.group}</span>
                  <span>
                    {round ? (
                      <Check size={13} />
                    ) : !terminal(s.status) ? (
                      <LoaderCircle size={13} className="spin" />
                    ) : (
                      <X size={13} />
                    )}
                  </span>
                </div>
                <strong>
                  {round ? round.winner.name : `${s.candidates} models`}
                </strong>
                <small>
                  {round
                    ? "Finalist selected"
                    : s.attempts.length > 1
                      ? `Render retry ${s.attempts.length - 1}`
                      : "TypeSafe is comparing"}
                </small>
              </div>
            );
          })}
        </div>
      )}
      {run && (
        <details className="trace">
          <summary>
            Inspect tasks & retries <span>{steps.length} tasks</span>
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
            Run {run.id}. Each task can retry twice. A fresh run repeats the
            work.
            {mode === "cloud"
              ? " Running on Render."
              : " Running locally with the Render SDK and CLI."}
          </p>
        </details>
      )}
    </section>
  );
}
