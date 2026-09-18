import { useEffect, useState } from "react";
import { LoaderCircle, Check } from "lucide-react";
import type { Run } from "../../shared/types";
import TaskTimeline from "./TaskTimeline";
import { durationLabel, timeline } from "./timeline";
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
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [busy]);
  if (!run && !busy) return null;
  return (
    <section className="workflow-card" aria-label="Live Render workflow">
      <div className="workflow-heading">
        <span>
          <img src="/render-mark.svg" alt="" />
          Render Workflows
        </span>
        <span>
          {busy ? (
            <>
              <LoaderCircle size={12} className="spin" />
              Running
            </>
          ) : run?.outcome?.complete ? (
            <>
              <Check size={13} />
              Complete
            </>
          ) : (
            "Incomplete"
          )}
          {run && <time>{durationLabel(timeline(run, now).duration)}</time>}
        </span>
      </div>
      {run ? (
        <TaskTimeline key={run.id} run={run} now={now} />
      ) : (
        <p className="workflow-pending">Starting the round…</p>
      )}
      {run && (
        <details className="trace">
          <summary>
            Task details{" "}
            <span>
              {run.steps.length} child tasks ·{" "}
              {mode === "cloud" ? "On Render" : "Local SDK"}
            </span>
          </summary>
          <div className="trace-grid">
            {run.steps.map((s) => (
              <div key={s.id}>
                <span>
                  {s.result?.name || s.characterId} · {s.taskName}
                </span>
                <strong>{s.status}</strong>
                <span>{s.attempts.length} attempts</span>
                <code>{s.id}</code>
              </div>
            ))}
          </div>
          {Boolean(run.input.carried.length) && (
            <p className="fineprint">
              {run.input.carried.length} completed character results reused from
              the earlier run.
            </p>
          )}
          <p className="fineprint">
            Elapsed time, not percentage complete. Parallel tasks overlap. Each
            evaluation can retry twice. Round {run.id}.
          </p>
        </details>
      )}
    </section>
  );
}
