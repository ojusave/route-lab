import type { Run, RunStep } from "../../shared/types";

const phases = [
  "load_models",
  "shortlist_models",
  "choose_model",
  "write_answer",
];
const finished = (status: string) =>
  ["completed", "succeeded", "failed", "canceled"].includes(status);
const timestamp = (value?: string | null) => {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : null;
};

function interval(
  item: Pick<RunStep, "startedAt" | "completedAt" | "status">,
  now: number,
) {
  const start = timestamp(item.startedAt);
  const end =
    timestamp(item.completedAt) ?? (finished(item.status) ? null : now);
  return {
    start,
    end,
    duration: start !== null && end !== null ? Math.max(0, end - start) : null,
  };
}

export function timeline(run: Run, now: number) {
  // A poll can contain a completion newer than the last display clock tick.
  const observedNow = Math.max(
    now,
    ...run.steps.map((step) => timestamp(step.completedAt) ?? 0),
  );
  const parent = interval(run, observedNow);
  const rows = [...run.steps]
    .sort(
      (a, b) =>
        phases.indexOf(a.taskName) - phases.indexOf(b.taskName) ||
        (a.group ?? 0) - (b.group ?? 0),
    )
    .map((step) => ({ step, ...interval(step, observedNow) }));
  const starts = rows.flatMap((row) => (row.start === null ? [] : [row.start]));
  const origin = parent.start ?? (starts.length ? Math.min(...starts) : null);
  const ends = [parent, ...rows].flatMap((row) =>
    row.start === null ? [] : [row.end ?? row.start],
  );
  const extent = origin === null ? 0 : Math.max(origin, ...ends) - origin;
  return { origin, extent, duration: parent.duration, rows };
}

export function durationLabel(ms: number | null) {
  if (ms === null) return "Unavailable";
  if (ms === 0) return "0s";
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function timelineScale(extent: number, windowMs = 10_000) {
  const pages = Math.max(1, Math.ceil(extent / windowMs));
  return {
    pages,
    rangeMs: pages * windowMs,
    ticks: Array.from({ length: pages * 4 + 1 }, (_, i) => (i * windowMs) / 4),
  };
}
