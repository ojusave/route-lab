import { Check, Circle, LoaderCircle, X } from "lucide-react";
import type { Run } from "../../shared/types";
import config from "../../shared/config.json";
import { durationLabel, timeline } from "./timeline";
import { terminal } from "./api";

const labels: Record<string, [string, string]> = {
  load_models: ["Fetch models", config.provider.name],
  shortlist_models: ["Compare", "TypeSafe"],
  choose_model: ["Pick model", "TypeSafe"],
  write_answer: ["Answer", config.provider.name],
};

function Status({ status }: { status: string }) {
  if (status === "completed" || status === "succeeded")
    return <Check size={12} />;
  if (terminal(status)) return <X size={12} />;
  if (status === "running") return <LoaderCircle size={12} className="spin" />;
  return <Circle size={10} />;
}

export default function TaskTimeline({ run, now }: { run: Run; now: number }) {
  const chart = timeline(run, now);
  const rows = [
    {
      id: run.id,
      label: "Workflow",
      provider: "Render",
      status: run.status,
      start: chart.origin,
      duration: chart.duration,
      attempts: 1,
      parent: true,
    },
    ...chart.rows.map(({ step, start, duration }) => ({
      id: step.id,
      label: `${labels[step.taskName]?.[0] ?? step.taskName}${step.group ? ` ${step.group}` : ""}`,
      provider: labels[step.taskName]?.[1] ?? "Render",
      status: step.status,
      start,
      duration,
      attempts: step.attempts.length,
      parent: false,
    })),
  ];
  return (
    <div className="task-timeline" aria-label="Workflow task timeline">
      <div className="timeline-axis" aria-hidden="true">
        <span>Task</span>
        <div>
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <span key={tick}>
              {chart.extent ? durationLabel(chart.extent * tick) : ""}
            </span>
          ))}
        </div>
        <span>Time</span>
      </div>
      <ol className="timeline-rows">
        {rows.map((row) => {
          const state =
            row.status === "completed" || row.status === "succeeded"
              ? "complete"
              : terminal(row.status)
                ? "failed"
                : "running";
          const offset =
            row.start !== null && chart.origin !== null
              ? Math.max(0, row.start - chart.origin)
              : null;
          const timed =
            offset !== null && row.duration !== null && chart.extent > 0;
          return (
            <li
              key={row.id}
              className={`timeline-row ${state}${row.parent ? " parent" : ""}`}
            >
              <div className="timeline-label">
                <Status status={row.status} />
                <span>
                  <strong>{row.label}</strong>
                  <small>
                    {row.provider}
                    {row.attempts > 1 && ` · ${row.attempts} attempts`}
                  </small>
                </span>
                <span className="sr-only">{row.status}</span>
              </div>
              <div
                className="timeline-track"
                title={
                  timed
                    ? `Started at ${durationLabel(offset)}; ${durationLabel(row.duration)} elapsed; ${row.status}`
                    : row.status
                }
              >
                {timed ? (
                  <span
                    className="timeline-bar"
                    style={{
                      left: `${(offset / chart.extent) * 100}%`,
                      width: `${(row.duration! / chart.extent) * 100}%`,
                    }}
                  >
                    <span className="sr-only">
                      Started at {durationLabel(offset)}
                    </span>
                  </span>
                ) : (
                  <span className="timeline-untimed">
                    {row.start === null && !terminal(row.status)
                      ? "Queued"
                      : "Timing unavailable"}
                  </span>
                )}
              </div>
              <span
                className="timeline-duration"
                aria-label={`Duration: ${durationLabel(row.duration)}`}
              >
                {row.duration === null ? "·" : durationLabel(row.duration)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
