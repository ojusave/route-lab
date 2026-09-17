import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  Copy,
  LoaderCircle,
  RotateCcw,
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
  const [panel, setPanel] = useState<
    "models" | "code" | "about" | "decision" | null
  >(null);

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
  const decision = run?.decision ?? null;
  const answer = run?.answer;

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Route Lab home">
          <img src="/render-mark.svg" alt="" width="22" height="22" />
          <span>Route Lab</span>
        </a>
        <nav aria-label="Main navigation">
          <button onClick={() => setPanel("models")}>Models</button>
          <button
            onClick={() => {
              setCodeLanguage(language);
              setPanel("code");
            }}
          >
            Code
          </button>
          <ProjectLinks language={language} />
        </nav>
      </header>
      <main className={run || busy ? "has-run" : "welcome"}>
        <div className="intro">
          <span className="demo-label">RENDER WORKFLOWS × TYPESAFE AI</span>
          <h1>One prompt. Every step, live.</h1>
          <p>Render runs the tasks. TypeSafe picks the model.</p>
        </div>
        <form className="composer" onSubmit={submit}>
          <label htmlFor="prompt" className="sr-only">
            Your prompt
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={6000}
            placeholder="Ask a question, write some code, or solve a problem…"
            disabled={busy}
          />
          <div className="composer-actions">
            {example ? (
              <span className="sdk-badge">
                {example === "python" ? "Python" : "TypeScript"}
              </span>
            ) : (
              <div
                className="segmented"
                role="group"
                aria-label="Backend language"
              >
                {(["typescript", "python"] as const).map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={language === value}
                    className={language === value ? "chosen" : ""}
                    onClick={() => changeLanguage(value)}
                    disabled={busy}
                  >
                    {value === "python" ? "Python" : "TypeScript"}
                  </button>
                ))}
              </div>
            )}
            <button
              className="run-button"
              disabled={busy || !prompt.trim()}
              type="submit"
            >
              {busy ? (
                <>
                  <LoaderCircle size={16} className="spin" /> Running
                </>
              ) : (
                <>
                  Run prompt <ArrowUp size={16} />
                </>
              )}
            </button>
          </div>
        </form>
        {!run && !busy && (
          <div className="examples" aria-label="Example prompts">
            {config.examples.map((ex) => (
              <button
                type="button"
                key={ex.label}
                onClick={() => {
                  setPrompt(ex.prompt);
                  document.getElementById("prompt")?.focus();
                }}
              >
                {ex.label}
                <ArrowUpRight size={13} />
              </button>
            ))}
          </div>
        )}
        {simulateFailure && (
          <p className="test-mode">
            Failure demo is on.{" "}
            <button onClick={() => setSimulateFailure(false)} disabled={busy}>
              Turn off
            </button>
          </p>
        )}
        <Workflow run={run} busy={busy} mode={health?.mode || "connecting"} />
        {error && (
          <div className="error-banner" role="alert">
            <strong>Couldn’t connect</strong>
            <p>{error}</p>
            {runId && (
              <button
                className="secondary"
                onClick={() => {
                  setBusy(true);
                  setPollVersion((v) => v + 1);
                }}
              >
                Reconnect
              </button>
            )}
          </div>
        )}
        {run?.error && (
          <div className="error-banner" role="alert">
            <strong>
              {run.input.simulateFailure
                ? "Failure demo finished"
                : "This run failed"}
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
              Try again
            </button>
          </div>
        )}
        {decision && (
          <section className="result" aria-label="Selected model and answer">
            <div className="result-heading">
              <div>
                <span className="muted">TypeSafe picked</span>
                <h2>{decision.model.name}</h2>
              </div>
              <button
                className="text-button"
                onClick={() => setPanel("decision")}
              >
                Selection details <ArrowUpRight size={14} />
              </button>
            </div>
            {answer ? (
              <>
                <div className="markdown">
                  <ReactMarkdown>{answer.text}</ReactMarkdown>
                </div>
                <div className="answer-receipt">
                  <span>
                    {(answer.durationMs / 1000).toFixed(1)}s
                    {answer.usage?.total_tokens != null &&
                      ` · ${answer.usage.total_tokens.toLocaleString()} tokens`}
                    {answer.usage?.cost != null &&
                      ` · $${answer.usage.cost.toFixed(6)}`}
                  </span>
                  <button
                    className="text-button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(answer.text);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      } catch {
                        setError("Select the answer text to copy it.");
                      }
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                {answer.finishReason === "length" && (
                  <p className="warning-text">
                    The answer reached the output limit and may be incomplete.
                  </p>
                )}
              </>
            ) : (
              busy && (
                <div className="answer-pending">
                  <LoaderCircle size={16} className="spin" />
                  <span>Writing the answer…</span>
                </div>
              )
            )}
          </section>
        )}
        <footer>
          <button onClick={() => setPanel("about")}>About this demo</button>
          <SignupLink />
        </footer>
      </main>
      {panel === "models" && (
        <Panel title="Live models" close={() => setPanel(null)}>
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
      {panel === "decision" && decision && (
        <Panel title="Model selection" close={() => setPanel(null)}>
          <Decision decision={decision} busy={busy} />
        </Panel>
      )}
      {panel === "code" && (
        <Panel title="Workflow code" close={() => setPanel(null)}>
          <div className="section-heading">
            <div className="segmented">
              {(["typescript", "python"] as const).map((value) => (
                <button
                  key={value}
                  className={codeLanguage === value ? "chosen" : ""}
                  onClick={() => setCodeLanguage(value)}
                  aria-pressed={codeLanguage === value}
                >
                  {value === "python" ? "Python" : "TypeScript"}
                </button>
              ))}
            </div>
          </div>
          <div className="code-window">
            <div>
              {codeLanguage === "typescript"
                ? "typescript/src/workflow.ts"
                : "python/app/workflow.py"}
            </div>
            <pre>
              <code>{codeLanguage === "typescript" ? tsCode : pyCode}</code>
            </pre>
          </div>
        </Panel>
      )}
      {panel === "about" && (
        <Panel title="How it works" close={() => setPanel(null)}>
          <div className="about-panel">
            <h2>One prompt, three services.</h2>
            <dl>
              <dt>TypeSafe AI</dt>
              <dd>
                Picks a model using its description, capabilities, and price.
              </dd>
              <dt>{config.provider.name}</dt>
              <dd>Provides the live catalog and calls the selected model.</dd>
              <dt>Render Workflows</dt>
              <dd>
                Runs each task, compares groups in parallel, and retries
                failures.
              </dd>
            </dl>
            <p>
              Every run fetches the full catalog. Text-compatible models enter
              groups of up to 200, below TypeSafe’s 255-choice limit. Group
              winners enter a final selection.
            </p>
            <p>
              Grouping can affect the winner. Selection probabilities are not a
              measure of answer quality. Costs shown beside the answer cover
              generation only.
            </p>
            <p>
              Your prompt goes to TypeSafe, then to the chosen model through{" "}
              {config.provider.name}.
            </p>
            <div className="about-links">
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
            </div>
            <div className="failure-option">
              <label className="check">
                <input
                  type="checkbox"
                  checked={simulateFailure}
                  disabled={busy}
                  onChange={(e) => setSimulateFailure(e.target.checked)}
                />
                Try a failed task
              </label>
              <p>
                The answer task fails on purpose. Watch Render retry it twice.
                No answer-generation call is made.
              </p>
            </div>
          </div>
        </Panel>
      )}
    </>
  );
}
