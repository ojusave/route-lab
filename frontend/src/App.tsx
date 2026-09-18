import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Code2,
  LoaderCircle,
  RotateCcw,
  Trophy,
} from "lucide-react";
import config from "../../shared/config.json";
import type { Run } from "../../shared/types";
import tsCode from "../../typescript/src/workflow.ts?raw";
import pyCode from "../../python/app/workflow.py?raw";
import { api, terminal, example, type Language } from "./api";
import Character from "./Character";
import Decision from "./Decision";
import Workflow from "./Workflow";
import Panel from "./Panel";
import { ProjectLinks, PoweredByRender } from "./ProjectLinks";

export default function App() {
  const params = new URLSearchParams(location.search);
  const [language, setLanguage] = useState<Language>(
    example || (params.get("sdk") === "python" ? "python" : "typescript"),
  );
  const [pitch, setPitch] = useState("");
  const [run, setRun] = useState<Run | null>(null);
  const [runId, setRunId] = useState<string | null>(params.get("run"));
  const [busy, setBusy] = useState(Boolean(params.get("run")));
  const [error, setError] = useState("");
  const [mode, setMode] = useState("connecting");
  const [panel, setPanel] = useState<string | null>(null);
  const [codeLanguage, setCodeLanguage] = useState<Language>(language);
  const [pollVersion, setPollVersion] = useState(0);
  const loaded = useRef<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    let live = true;
    api<{ mode: string }>(language, "/health")
      .then((h) => {
        if (live) setMode(h.mode);
      })
      .catch(() => {
        if (live) setMode("offline");
      });
    return () => {
      live = false;
    };
  }, [language]);
  useEffect(() => {
    if (!runId) return;
    let canceled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const data = await api<Run>(language, `/runs/${runId}`);
        if (canceled) return;
        setRun(data);
        setError("");
        if (loaded.current !== data.id) {
          setPitch(data.input.pitch);
          loaded.current = data.id;
        }
        if (terminal(data.status)) {
          setBusy(false);
          return;
        }
        timer = setTimeout(poll, 1200);
      } catch (e) {
        if (!canceled) {
          setError((e as Error).message);
          setBusy(false);
        }
      }
    }
    poll();
    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [runId, language, pollVersion]);
  const waiting = busy || Boolean(run && !terminal(run.status));
  const complete = Boolean(run?.outcome?.complete);
  const finished =
    complete &&
    Boolean(run?.outcome?.won || run!.input.round >= config.maxRounds);
  const person = config.characters.find((c) => c.id === panel);
  const result = run?.results.find((r) => r.characterId === panel);
  const votes = run?.results.filter((r) => r.vote === "yes").length ?? 0;
  const readyToRevise = complete && !finished;
  function reset(nextLanguage = language) {
    setRun(null);
    setRunId(null);
    setError("");
    setPitch("");
    setBusy(false);
    loaded.current = null;
    setLanguage(nextLanguage);
    history.replaceState(null, "", `?sdk=${nextLanguage}`);
    requestAnimationFrame(() => inputRef.current?.focus());
  }
  async function start(retry = false) {
    if (waiting) return;
    setBusy(true);
    setError("");
    try {
      const body =
        retry && run
          ? { retryRunId: run.id }
          : {
              pitch: pitch.trim(),
              ...(readyToRevise && run ? { previousRunId: run.id } : {}),
            };
      const response = await api<{ id: string }>(language, "/runs", body);
      setRun(null);
      setRunId(response.id);
      history.replaceState(null, "", `?sdk=${language}&run=${response.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Start a new game">
          <img src="/render-mark.svg" alt="" width="20" height="20" />
          <span>Render demos</span>
        </a>
        <nav aria-label="Main navigation">
          <button
            className="how-link"
            aria-label="How it works"
            onClick={() => setPanel("code")}
          >
            <Code2 size={16} />
            <span>How it works</span>
          </button>
          <ProjectLinks />
        </nav>
      </header>
      <main className="game">
        <div className="intro">
          <h1>
            Win the room<span>.</span>
          </h1>
          <p>Get two votes. You have two attempts.</p>
        </div>
        <div className="room-meta">
          <span>YOUR THREE JUDGES</span>
          <span>
            {run ? `ATTEMPT ${run.input.round} OF 2` : "FICTIONAL CHARACTERS"}
          </span>
        </div>
        <section className="room" aria-label="The three judges">
          {config.characters.map((person) => {
            const current = run?.results.find(
              (r) => r.characterId === person.id,
            );
            const step = run?.steps.find((s) => s.characterId === person.id);
            const status = current
              ? "done"
              : step?.status === "failed" || step?.status === "canceled"
                ? "failed"
                : step?.startedAt && !terminal(step.status)
                  ? "running"
                  : waiting
                    ? "queued"
                    : run?.outcome?.failed.includes(person.id)
                      ? "failed"
                      : "idle";
            return (
              <Character
                key={person.id}
                person={person}
                result={current}
                previous={run?.input.previous.find(
                  (r) => r.characterId === person.id,
                )}
                status={status}
                onInspect={() => setPanel(person.id)}
              />
            );
          })}
        </section>
        <div
          className="round-status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {finished ? (
            <>
              <Trophy size={18} />
              <strong>
                {run?.outcome?.won
                  ? `You won over ${votes} of 3.`
                  : `You won over ${votes} of 3. A tough room.`}
              </strong>
            </>
          ) : readyToRevise ? (
            <>
              <span className="vote-dots">
                {config.characters.map((c) => (
                  <i
                    key={c.id}
                    className={
                      run?.results.find((r) => r.characterId === c.id)?.vote ===
                      "yes"
                        ? "yes"
                        : ""
                    }
                  />
                ))}
              </span>
              <strong>{votes} of 3 on board.</strong>
              <span>Address their concerns. One attempt left.</span>
            </>
          ) : waiting ? (
            <>
              <LoaderCircle className="spin" size={14} />
              <span>{run?.results.length ?? 0} of 3 responses received</span>
            </>
          ) : (
            <span>Pitch an invention. See who you can convince.</span>
          )}
        </div>
        {!finished ? (
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              start();
            }}
          >
            <label htmlFor="pitch">
              {readyToRevise ? "Your revised pitch" : "Your invention"}
            </label>
            <textarea
              ref={inputRef}
              id="pitch"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              maxLength={config.maxPitchLength}
              placeholder="What is it, and why should they want it?"
              disabled={waiting || Boolean(run?.error)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  if (pitch.trim() && !waiting && !run?.error) start();
                }
              }}
            />
            <div className="composer-actions">
              <span className="character-count">
                {pitch.length} / {config.maxPitchLength}
              </span>
              <button
                className="run-button"
                type="submit"
                disabled={
                  waiting ||
                  !pitch.trim() ||
                  Boolean(run?.error) ||
                  (readyToRevise && pitch.trim() === run?.input.pitch)
                }
              >
                {waiting ? (
                  <>
                    <LoaderCircle className="spin" size={15} />
                    Hearing your pitch
                  </>
                ) : (
                  <>
                    {readyToRevise
                      ? "Try your revised pitch"
                      : "Make your pitch"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="finished-actions">
            <button className="run-button" onClick={() => reset()}>
              Play again <RotateCcw size={15} />
            </button>
            <button className="text-button" onClick={() => setPanel("pitch")}>
              View your pitch
            </button>
          </div>
        )}
        {!run && !busy && (
          <div className="examples">
            <span>Try an idea</span>
            {config.examples.map((ex) => (
              <button
                key={ex.label}
                onClick={() => {
                  setPitch(ex.pitch);
                  inputRef.current?.focus();
                }}
              >
                {ex.label}
                <ArrowRight size={12} />
              </button>
            ))}
          </div>
        )}
        {(error || run?.error) && (
          <div className="error-banner" role="alert">
            <p>{error || run?.error}</p>
            {run?.error ? (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => start(true)}
              >
                Retry missing votes
              </button>
            ) : runId ? (
              <button
                className="secondary"
                onClick={() => {
                  setBusy(true);
                  setPollVersion((v) => v + 1);
                }}
              >
                Reconnect
              </button>
            ) : null}
            <button
              className="text-button"
              disabled={busy}
              onClick={() => reset()}
            >
              Start a new game
            </button>
          </div>
        )}
        <Workflow run={run} busy={waiting} mode={mode} />
        <div className="sdk-line">
          {example ? (
            <span>
              {example === "python" ? "Python" : "TypeScript"} example
            </span>
          ) : (
            <div
              className="segmented"
              role="group"
              aria-label="Backend language"
            >
              {(["typescript", "python"] as const).map((value) => (
                <button
                  key={value}
                  aria-pressed={language === value}
                  disabled={waiting}
                  onClick={() => reset(value)}
                >
                  {value === "python" ? "Python" : "TypeScript"}
                </button>
              ))}
            </div>
          )}
          <span>Votes by TypeSafe AI · dialogue via OpenRouter</span>
        </div>
      </main>
      <footer className="site-footer">
        <PoweredByRender />
      </footer>
      {person && (
        <Panel title={`${person.name}'s decision`} close={() => setPanel(null)}>
          <Decision person={person} result={result} />
        </Panel>
      )}
      {panel === "pitch" && (
        <Panel title="Your pitch" close={() => setPanel(null)}>
          <blockquote>{run?.input.pitch}</blockquote>
        </Panel>
      )}
      {panel === "code" && (
        <Panel title="Behind the votes" close={() => setPanel(null)}>
          <div className="about-panel">
            <p className="panel-lead">Three tasks. Three different concerns.</p>
            <dl>
              <dt>Render Workflows</dt>
              <dd>
                Runs a task for each character in parallel. Failed evaluations
                retry independently.
              </dd>
              <dt>TypeSafe AI</dt>
              <dd>
                Jev evaluates two criteria per character. The code turns those
                results into a vote.
              </dd>
              <dt>OpenRouter</dt>
              <dd>
                Writes the short reaction after the decision. It cannot change
                the vote.
              </dd>
            </dl>
            <p className="fineprint">
              Your pitch is processed by Render, TypeSafe, and OpenRouter. These
              are fictional characters, not predictions of real people's
              opinions. Run links include the submitted pitch and results.
            </p>
          </div>
          <div className="section-heading">
            <h3>The actual workflow</h3>
            <div className="segmented">
              {(["typescript", "python"] as const).map((value) => (
                <button
                  key={value}
                  aria-pressed={codeLanguage === value}
                  onClick={() => setCodeLanguage(value)}
                >
                  {value === "python" ? "Python" : "TypeScript"}
                </button>
              ))}
            </div>
          </div>
          <pre className="raw-scroll">
            <code>{codeLanguage === "typescript" ? tsCode : pyCode}</code>
          </pre>
        </Panel>
      )}
    </>
  );
}
