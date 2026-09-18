import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Circle, LoaderCircle, X } from "lucide-react";
import type { Run } from "../../shared/types";
import config from "../../shared/config.json";
import { durationLabel, timeline, timelineScale } from "./timeline";
import { terminal } from "./api";

function Status({ status }: { status: string }) {
  if (status === "completed" || status === "succeeded")
    return <Check size={12} />;
  if (terminal(status)) return <X size={12} />;
  if (status === "running") return <LoaderCircle size={12} className="spin" />;
  return <Circle size={10} />;
}

export default function TaskTimeline({ run, now }: { run: Run; now: number }) {
  const chart = timeline(run, now);
  // Keep pixels per second fixed while running. Saved runs fit in one view.
  const [windowMs] = useState(() =>
    terminal(run.status)
      ? Math.max(10_000, Math.ceil(chart.extent / 1000) * 1000)
      : 10_000,
  );
  const scale = timelineScale(chart.extent, windowMs);
  const scroller = useRef<HTMLDivElement>(null);
  const lastScroll = useRef(0);
  useEffect(() => {
    const view = scroller.current;
    if (!view || terminal(run.status)) return;
    // Scrolling back manually leaves the earlier tasks in view.
    if (Math.abs(view.scrollLeft - lastScroll.current) > 4) return;
    const track = view.querySelector<HTMLElement>(".timeline-track");
    if (!track) return;
    const visibleTrack = track.clientWidth / scale.pages;
    view.scrollLeft = Math.max(0, (chart.extent / windowMs - 1) * visibleTrack);
    lastScroll.current = view.scrollLeft;
  }, [chart.extent, scale.pages, windowMs, run.status]);
  const rows = [
    {
      id: run.id,
      taskName: "play_round",
      label: "Round",
      provider: "Render",
      status: run.status,
      start: chart.origin,
      duration: chart.duration,
      attempts: 1,
      parent: true,
    },
    ...chart.rows.map(({ step, start, duration }) => ({
      id: step.id,
      taskName: step.characterId ?? step.taskName,
      label:
        config.characters.find((c) => c.id === step.characterId)?.name ??
        step.taskName,
      provider: "Evaluate + reply",
      status: step.status,
      start,
      duration,
      attempts: step.attempts.length,
      parent: false,
    })),
  ];
  return (
    <div className="task-timeline">
      <div
        className="timeline-scroll"
        ref={scroller}
        tabIndex={0}
        role="region"
        aria-label="Workflow task timeline"
      >
        <div
          className="timeline-canvas"
          style={{ "--timeline-pages": scale.pages } as CSSProperties}
        >
          <div className="timeline-axis" aria-hidden="true">
            <span>Task</span>
            <div>
              {scale.ticks.map((tick) => (
                <span
                  key={tick}
                  style={{ left: `${(tick / scale.rangeMs) * 100}%` }}
                >
                  {durationLabel(tick)}
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
                  data-task={row.taskName}
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
                      <span className="timeline-window">
                        <span
                          className="timeline-bar"
                          style={{
                            left: `${(offset / windowMs) * 100}%`,
                            width: `${(row.duration! / windowMs) * 100}%`,
                          }}
                        >
                          <span className="sr-only">
                            Started at {durationLabel(offset)}
                          </span>
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
      </div>
    </div>
  );
}
