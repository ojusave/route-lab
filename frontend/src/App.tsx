import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  Copy,
  GitBranch,
  LoaderCircle,
  Play,
  RotateCcw,
  Terminal,
  Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Catalog as ModelCatalog, Run } from "../../shared/types";
import config from "../../shared/config.json";
import tsCode from "../../typescript/src/workflow.ts?raw";
import pyCode from "../../python/app/workflow.py?raw";
import { api, terminal, example, type Language } from "./api";
import Catalog from "./Catalog";
import Decision from "./Decision";
import Workflow from "./Workflow";
import Panel from "./Panel";
import { ProjectLinks, SignupLink } from "./ProjectLinks";

export default function App() {
  const params = new URLSearchParams(location.search);
  const [language, setLanguage] = useState<Language>(
    example || (params.get("sdk") === "python" ? "python" : "typescript"),
  );
  const [prompt, setPrompt] = useState("");
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [health, setHealth] = useState<{
    mode: string;
    typesafe: boolean;
    openrouter: boolean;
  } | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [runId, setRunId] = useState<string | null>(params.get("run"));
  const [busy, setBusy] = useState(Boolean(params.get("run")));
  const [error, setError] = useState("");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<Language>("typescript");
  const [copied, setCopied] = useState(false);
  const [pollVersion, setPollVersion] = useState(0);
  const generation = useRef(0);
  const [panel, setPanel] = useState<"models" | "code" | null>(null);

  async function refreshCatalog() {
    const gen = ++generation.current;
    setCatalogLoading(true);
    setCatalogError("");
    try {
      const data = await api<ModelCatalog>(language, "/models");
      if (gen === generation.current) setCatalog(data);
    } catch (e) {
      if (gen === generation.current) setCatalogError((e as Error).message);
    } finally {
      if (gen === generation.current) setCatalogLoading(false);
    }
  }
  useEffect(() => {
    let live = true;
    setHealth(null);
    api<typeof health>(language, "/health")
      .then((data) => {
        if (live) setHealth(data);
      })
      .catch(() => {
        if (live) setError("Cannot reach this example. Try reconnecting.");
      });
    refreshCatalog();
    return () => {
      live = false;
      generation.current++;
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
        setPrompt(data.input.prompt);
        setError("");
        const snapshot = data.steps.find(
          (s) =>
            s.result && "stage" in s.result && s.result.stage === "catalog",
        )?.result;
        if (snapshot && "stage" in snapshot && snapshot.stage === "catalog")
          setCatalog(snapshot);
        if (terminal(data.status)) {
          setBusy(false);
          return;
        }
        timer = setTimeout(poll, 1000);
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

  function changeLanguage(value: Language) {
    setLanguage(value);
    setRun(null);
    setRunId(null);
    setError("");
    history.replaceState(null, "", `?sdk=${value}`);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError("");
    setRun(null);
    setRunId(null);
    if (matchMedia("(max-width: 850px)").matches)
      requestAnimationFrame(() => {
        const progress = document.getElementById("live-workflow");
        progress?.focus({ preventScroll: true });
        progress?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
          block: "start",
        });
      });
    try {
      const started = await api<{ id: string }>(language, "/runs", {
        prompt: prompt.trim(),
        simulateFailure,
      });
      history.replaceState(null, "", `?sdk=${language}&run=${started.id}`);
      setRunId(started.id);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  const eligible =
    catalog?.models.filter(
      (m) =>
        m.eligible &&
        m.contextLength >= new TextEncoder().encode(prompt).length + 2000,
    ).length ?? 0;
  const groups = Math.ceil(eligible / 200);
  const decision = run?.decision ?? null;
  const answer = run?.answer;

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Route Lab home">
          <span className="brand-symbol">
            <GitBranch size={21} />
          </span>
          <span>
            route<span className="brand-light">lab</span>
            <span className="brand-slash"> / </span>
            <span className="brand-demo">interactive demo</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <button onClick={() => setPanel("models")}>Models</button>
          <button onClick={() => setPanel("code")}>Code</button>
          <ProjectLinks language={language} />
        </nav>
      </header>
      <main>
        <div className="intro">
          <div>
            <span className="eyebrow">TYPESAFE AI × RENDER WORKFLOWS</span>
            <h1>
              Which model should answer<span className="lime">?</span>
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setPanel("models")}
            className="catalog-counter"
          >
            <span className="live-indicator" />
            <div>
              <strong>{catalog?.models.length ?? "..."}</strong>
              <span>models in the live catalog</span>
            </div>
            <ArrowUpRight size={18} />
          </button>
        </div>
        <div className="workspace">
          <aside className="composer-column">
            <form className="composer" onSubmit={submit}>
              <div className="card-label">
                <span>
                  <Terminal size={16} />
                  YOUR PROMPT
                </span>
                <span className="tiny">01 / INPUT</span>
              </div>
              <label htmlFor="prompt" className="composer-title">
                Enter a prompt
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={6000}
                placeholder="Ask a question, solve a problem, or write some code..."
                disabled={busy}
              />
              <div className="input-footer">
                <span>Try an example</span>
                <span>{prompt.length.toLocaleString()} / 6,000</span>
              </div>
              <div className="examples">
                {config.examples.map((ex, i) => (
                  <button
                    type="button"
                    key={ex.label}
                    disabled={busy}
                    onClick={() => setPrompt(ex.prompt)}
                  >
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {ex.label}
                    <ArrowUpRight size={14} />
                  </button>
                ))}
              </div>
              {!example && (
                <>
                  <div className="sdk-label">
                    <span>Backend</span>
                    <span>Same steps, either language</span>
                  </div>
                  <div
                    className="segmented"
                    role="group"
                    aria-label="Backend language"
                  >
                    <button
                      type="button"
                      aria-pressed={language === "typescript"}
                      className={language === "typescript" ? "chosen" : ""}
                      onClick={() => changeLanguage("typescript")}
                      disabled={busy}
                    >
                      <span className="ts-icon">TS</span>TypeScript
                    </button>
                    <button
                      type="button"
                      aria-pressed={language === "python"}
                      className={language === "python" ? "chosen" : ""}
                      onClick={() => changeLanguage("python")}
                      disabled={busy}
                    >
                      <span className="py-icon">Py</span>Python
                    </button>
                  </div>
                </>
              )}
              {example && (
                <p className="example-label">
                  {example === "python" ? "Python" : "TypeScript"} example
                </p>
              )}
              <button
                className="run-button"
                disabled={busy || !prompt.trim()}
                type="submit"
              >
                {busy ? (
                  <>
                    <LoaderCircle size={18} className="spin" />
                    Workflow running
                  </>
                ) : (
                  <>
                    Run prompt
                    <ArrowRight size={19} />
                  </>
                )}
              </button>
              <p className="sending-note">
                Live API calls. Uses your configured credits.
              </p>
              <details className="failure-option">
                <summary>Try a failure</summary>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={simulateFailure}
                    disabled={busy}
                    onChange={(e) => setSimulateFailure(e.target.checked)}
                  />
                  Fail the answer task on purpose
                </label>
                <p>
                  Render will retry it twice. No OpenRouter generation call is
                  made in this mode. Turn it off to start a fresh run.
                </p>
              </details>
            </form>
            <details className="why-card" id="how">
              <summary>How it works</summary>
              <div>
                <span className="explain-icon">
                  <GitBranch size={17} />
                </span>
                <p>
                  <strong>TypeSafe picks the model.</strong> It returns a
                  choice, probabilities, and confidence.
                </p>
              </div>
              <div>
                <span className="explain-icon">
                  <Zap size={17} />
                </span>
                <p>
                  <strong>Render runs the workflow.</strong> It starts parallel
                  tasks, joins results, and retries failures.
                </p>
              </div>
              <p className="fineprint">
                Your prompt is sent to TypeSafe, then to the chosen model
                through OpenRouter. The catalog is fetched for every run. Groups
                of 200 stay below TypeSafe's 255-choice limit. Grouping can
                affect the winner.
              </p>
              <a
                href="https://docs.typesafe.ai/primitives/choice"
                target="_blank"
                rel="noreferrer"
              >
                TypeSafe docs <ArrowUpRight size={13} />
              </a>
              <a
                href="https://render.com/docs/workflows"
                target="_blank"
                rel="noreferrer"
              >
                Render docs <ArrowUpRight size={13} />
              </a>
            </details>
          </aside>
          <div className="results-column">
            <Workflow run={run} busy={busy} mode={health?.mode || "local"} />
            <div className="selection-explainer">
              <GitBranch size={14} />
              <span>
                {catalog ? eligible : "…"} eligible models{" "}
                <span className="route-arrow">→</span> {catalog ? groups : "…"}{" "}
                groups <span className="route-arrow">→</span> 1 selection
              </span>
              <button
                className="text-button"
                onClick={() => setPanel("models")}
              >
                View models <ArrowUpRight size={12} />
              </button>
            </div>
            <div aria-live="polite">
              {error && (
                <div className="error-banner" role="alert">
                  <strong>Connection interrupted</strong>
                  <p>{error}</p>
                  {runId && (
                    <button
                      className="secondary"
                      onClick={() => {
                        setBusy(true);
                        setPollVersion((v) => v + 1);
                      }}
                    >
                      Reconnect to this run
                    </button>
                  )}
                </div>
              )}
              {run?.error && (
                <div className="error-banner" role="alert">
                  <strong>
                    {run.input.simulateFailure
                      ? "Failure demo completed"
                      : "Workflow failed"}
                  </strong>
                  <p>{run.error}</p>
                  <button
                    className="secondary"
                    onClick={() => {
                      setSimulateFailure(false);
                      document.getElementById("prompt")?.focus();
                    }}
                  >
                    <RotateCcw size={14} />
                    Prepare a fresh run
                  </button>
                </div>
              )}
            </div>
            <Decision decision={decision} busy={busy} />
            <section className="answer-card" aria-labelledby="answer-title">
              <div className="card-label">
                <span>
                  <Zap size={16} />
                  OPENROUTER · THE ANSWER
                </span>
                {answer && (
                  <button
                    className="text-button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(answer.text);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      } catch {
                        setError(
                          "Copy unavailable. Select the answer text to copy it.",
                        );
                      }
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
                    {copied ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
              {answer ? (
                <>
                  <div className="answer-meta">
                    <h2 id="answer-title">Your answer</h2>
                    <span>{(answer.durationMs / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="markdown">
                    <ReactMarkdown>{answer.text}</ReactMarkdown>
                  </div>
                  <div className="answer-receipt">
                    <span>
                      Answered by <code>{answer.model}</code>
                    </span>
                    <span>
                      {answer.usage?.total_tokens ?? "Unreported"} tokens
                    </span>
                    {answer.usage?.cost != null && (
                      <span>
                        ${answer.usage.cost.toFixed(6)} generation cost
                      </span>
                    )}
                  </div>
                  {answer.finishReason === "length" && (
                    <p className="warning-text">
                      The model reached the output limit. This answer may be
                      incomplete.
                    </p>
                  )}
                </>
              ) : (
                <div className="answer-empty">
                  <span className="answer-empty-icon">
                    <Braces size={23} />
                  </span>
                  <div>
                    <h2 id="answer-title">
                      {decision && busy
                        ? "Writing your answer…"
                        : "Your answer"}
                    </h2>
                    <p>
                      {decision
                        ? "OpenRouter is calling the selected model."
                        : "Run a prompt to see the result."}
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
        {panel === "models" && (
          <Panel title="Models" close={() => setPanel(null)}>
            <Catalog
              promptBytes={new TextEncoder().encode(prompt).length}
              catalog={catalog}
              decision={decision}
              loading={catalogLoading}
              refresh={refreshCatalog}
              error={catalogError}
            />
          </Panel>
        )}
        {panel === "code" && (
          <Panel title="Workflow code" close={() => setPanel(null)}>
            <section className="code-section" id="code">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">TYPESCRIPT & PYTHON</span>
                  <h2>Workflow code</h2>
                </div>
                <div className="segmented compact">
                  <button
                    className={codeLanguage === "typescript" ? "chosen" : ""}
                    onClick={() => setCodeLanguage("typescript")}
                    aria-pressed={codeLanguage === "typescript"}
                  >
                    TypeScript
                  </button>
                  <button
                    className={codeLanguage === "python" ? "chosen" : ""}
                    onClick={() => setCodeLanguage("python")}
                    aria-pressed={codeLanguage === "python"}
                  >
                    Python
                  </button>
                </div>
              </div>
              <div className="code-window">
                <div>
                  <span className="code-dots">● ● ●</span>
                  <span>
                    {codeLanguage === "typescript"
                      ? "typescript/src/workflow.ts"
                      : "python/app/workflow.py"}
                  </span>
                  <span>actual source</span>
                </div>
                <pre>
                  <code>{codeLanguage === "typescript" ? tsCode : pyCode}</code>
                </pre>
              </div>
            </section>
          </Panel>
        )}
        <footer>
          <span>
            <GitBranch size={16} /> Route Lab
          </span>
          <p>
            Selection uses model descriptions and prices. Answer quality is not
            benchmarked.
          </p>
          <SignupLink />
        </footer>
      </main>
    </>
  );
}
