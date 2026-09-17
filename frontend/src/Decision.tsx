import { useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import type { Catalog, Model, Run, Shortlist } from "../../shared/types";
import config from "../../shared/config.json";
import { terminal, type Language } from "./api";
import { price } from "./Catalog";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
type Comparison = {
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
  durationMs: number;
};

export default function Decision({
  run,
  language,
}: {
  run: Run;
  language: Language;
}) {
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const groups = run.steps
    .filter((step) => step.taskName === "shortlist_models")
    .sort((a, b) => (a.group ?? 0) - (b.group ?? 0));
  const rounds =
    run.decision?.rounds ??
    groups.flatMap((step) =>
      step.result && "stage" in step.result && step.result.stage === "shortlist"
        ? [step.result as Shortlist]
        : [],
    );
  if (!groups.length && !rounds.length && !run.decision) return null;
  const active =
    selectedRound ?? (run.decision ? "final" : String(rounds[0]?.group ?? ""));
  const round = rounds.find((item) => String(item.group) === active);
  const comparison: Comparison | undefined =
    active === "final"
      ? (run.decision ?? undefined)
      : round
        ? { ...round, choice: round.winner.id }
        : undefined;
  const snapshot = run.steps
    .map((step) => step.result)
    .find(
      (result): result is Catalog =>
        !!result && "stage" in result && result.stage === "catalog",
    );
  const models = new Map(
    (snapshot?.models ?? rounds.map((item) => item.winner)).map((model) => [
      model.id,
      model,
    ]),
  );
  const groupNumbers = [
    ...new Set([
      ...groups.map((step) => step.group),
      ...rounds.map((item) => item.group),
    ]),
  ]
    .filter((group): group is number => group !== undefined)
    .sort((a, b) => a - b);
  return (
    <section className="selection" aria-labelledby="selection-title">
      <div className="selection-heading">
        <h2 id="selection-title">TypeSafe comparison</h2>
        <span>
          {run.decision
            ? `${run.decision.candidateCount} models considered`
            : "Results arrive as tasks finish"}
        </span>
      </div>
      <div
        className="selection-rounds"
        role="group"
        aria-label="Comparison round"
      >
        {groupNumbers.map((group) => (
          <button
            key={group}
            disabled={!rounds.some((item) => item.group === group)}
            aria-pressed={active === String(group)}
            onClick={() => setSelectedRound(String(group))}
          >
            Group {group}
          </button>
        ))}
        <button
          disabled={!run.decision}
          aria-pressed={active === "final"}
          onClick={() => setSelectedRound("final")}
        >
          Final choice
        </button>
      </div>
      {comparison ? (
        <ComparisonResult
          key={active}
          comparison={comparison}
          models={models}
          prompt={run.input.prompt}
          language={language}
          final={active === "final"}
        />
      ) : (
        <p className="selection-pending" role="status">
          {terminal(run.status) ? (
            "No comparison completed."
          ) : (
            <>
              <LoaderCircle size={14} className="spin" />
              Waiting for the first comparison.
            </>
          )}
        </p>
      )}
    </section>
  );
}

function ComparisonResult({
  comparison,
  models,
  prompt,
  language,
  final,
}: {
  comparison: Comparison;
  models: Map<string, Model>;
  prompt: string;
  language: Language;
  final: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const [inspectedModel, setInspectedModel] = useState(comparison.choice);
  const ranked = Object.entries(comparison.probabilities).sort(
    (a, b) => b[1] - a[1],
  );
  const shown = showAll ? ranked : ranked.slice(0, 5);
  const model = models.get(inspectedModel);
  const description = model
    ? language === "python"
      ? Array.from(model.description).slice(0, 200).join("")
      : model.description.slice(0, 200)
    : "";
  return (
    <>
      <div className="selection-scope">
        <span>
          {ranked.length} {final ? "finalists" : "models in this group"}
        </span>
        <span title="Confidence summarizes how concentrated this round's probability distribution is.">
          Confidence {comparison.confidence.toFixed(2)} / 1
        </span>
      </div>
      <ol
        className={`selection-ranking ${showAll ? "expanded" : ""}`}
        aria-label="Model selection probabilities"
      >
        {shown.map(([id, probability]) => (
          <li key={id} className={id === comparison.choice ? "chosen" : ""}>
            <div className="selection-model">
              <span title={id}>{models.get(id)?.name ?? id}</span>
              {id === comparison.choice && (
                <Check
                  size={14}
                  aria-label={final ? "Selected" : "Group winner"}
                />
              )}
            </div>
            <div className="bar-track" aria-hidden="true">
              <div style={{ width: `${probability * 100}%` }} />
            </div>
            <strong>{pct(probability)}</strong>
          </li>
        ))}
      </ol>
      {ranked.length > 5 && (
        <button
          className="text-button"
          onClick={() => setShowAll(!showAll)}
          aria-expanded={showAll}
        >
          {showAll
            ? "Show top 5"
            : `Show all ${ranked.length} models · remaining ${pct(ranked.slice(5).reduce((sum, [, p]) => sum + p, 0))}`}
        </button>
      )}
      <p className="selection-note">
        {final
          ? "Highest probability selected. Finalists only, not answer quality."
          : "One winner advances. Each group has its own probability distribution."}
      </p>
      <details className="selection-inspect">
        <summary>Inputs & response</summary>
        <div className="selection-inputs">
          <h3>Prompt</h3>
          <p>{prompt}</p>
          <h3>Current routing rule</h3>
          <p>{config.instructions}</p>
          <label htmlFor="inspected-model">Model data from this run</label>
          <select
            id="inspected-model"
            value={inspectedModel}
            onChange={(event) => setInspectedModel(event.target.value)}
          >
            {ranked.map(([id]) => (
              <option key={id} value={id}>
                {models.get(id)?.name ?? id}
              </option>
            ))}
          </select>
          {model ? (
            <>
              <code className="selection-model-id">{model.id}</code>
              <p>{description || "No description supplied."}</p>
              <dl className="selection-metadata">
                <div>
                  <dt>Context</dt>
                  <dd>{model.contextLength.toLocaleString()} tokens</dd>
                </div>
                <div>
                  <dt>Input / 1M</dt>
                  <dd>{price(model.inputPrice)}</dd>
                </div>
                <div>
                  <dt>Output / 1M</dt>
                  <dd>{price(model.outputPrice)}</dd>
                </div>
                <div>
                  <dt>Reasoning flag</dt>
                  <dd>{model.reasoning ? "Yes" : "No"}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p>This run has no saved metadata for this model.</p>
          )}
          <p className="selection-note">
            Routing uses the first 200 characters of each vendor description,
            plus context, prices, and the reasoning flag. These inputs do not
            tell us how much each factor influenced the choice.
          </p>
          <details>
            <summary>Returned Choice fields</summary>
            <pre className="raw-scroll">
              {JSON.stringify(
                {
                  choice: comparison.choice,
                  confidence: comparison.confidence,
                  probabilities: comparison.probabilities,
                },
                null,
                2,
              )}
            </pre>
          </details>
          <p className="selection-note">
            TypeSafe returns probabilities, not a written explanation.
            Confidence measures their concentration, not the chance of a correct
            answer. Grouping can change the winner.{" "}
            <a
              href="https://docs.typesafe.ai/confidence"
              target="_blank"
              rel="noreferrer"
            >
              About confidence ↗
            </a>
          </p>
        </div>
      </details>
    </>
  );
}
