import { useEffect, useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import type { Run, Shortlist } from "../../shared/types";
import { terminal } from "./api";
import config from "../../shared/config.json";
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
    { title: "Fetch models", sub: config.provider.name, name: "load_models" },
    { title: "Compare", sub: "TypeSafe", name: "shortlist_models" },
    { title: "Pick model", sub: "TypeSafe", name: "choose_model" },
    { title: "Answer", sub: config.provider.name, name: "write_answer" },
  ];
  const current = steps.filter((s) => !terminal(s.status));
  const retrying = current.find((s) => s.attempts.length > 1);
  const failed = run?.status === "failed";
  let headline = "";
  if (busy && !run) headline = "Connecting to Render…";
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
        <div
          className="live-headline"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span>
            {busy ? (
              <LoaderCircle size={14} className="spin" />
            ) : run?.answer ? (
              <Check size={14} />
            ) : (
              <X size={14} />
            )}
            {headline}
          </span>
          <time>{elapsed}s</time>
        </div>
      )}
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
      {busy && grouped.length > 0 && (
        <div className="parallel-status" aria-label="Parallel task status">
          {grouped.map((step) => (
            <span key={step.id}>
              {succeeded(step.status) ? (
                <Check size={12} />
              ) : terminal(step.status) ? (
                <X size={12} />
              ) : (
                <LoaderCircle size={12} className="spin" />
              )}
              Group {step.group}
            </span>
          ))}
        </div>
      )}
      {run && (
        <details className="trace">
          <summary>
            {steps.length} tasks <span>Run details</span>
          </summary>
          {grouped.length > 0 && (
            <div className="live-groups">
              {grouped.map((s) => {
                const round =
                  s.result &&
                  "stage" in s.result &&
                  s.result.stage === "shortlist"
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
            Run {run.id}. Each child task can retry twice. A fresh run repeats
            the work.
            {mode === "cloud"
              ? " Running on Render."
              : " Running locally with the Render SDK and CLI."}
          </p>
        </details>
      )}
    </section>
  );
}
