import { ArrowUpRight, Braces, Check, GitBranch, Sparkles } from "lucide-react";
import type { Decision as RoutingDecision } from "../../shared/types";
import { price } from "./Catalog";
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
export default function Decision({
  decision,
  busy,
}: {
  decision: RoutingDecision | null;
  busy: boolean;
}) {
  const finalists = decision
    ? Object.entries(decision.probabilities).sort((a, b) => b[1] - a[1])
    : [];
  return (
    <section className="decision-card" aria-labelledby="decision-title">
      <div className="card-label">
        <span>
          <GitBranch size={16} />
          TYPESAFE AI · THE DECISION
        </span>
        <span className={`pill ${decision ? "green" : ""}`}>
          {decision ? "Selected" : busy ? "Evaluating" : "Waiting"}
        </span>
      </div>
      {!decision ? (
        <div className="decision-empty">
          <div className="decision-graphic">
            <span className="mini-node">01</span>
            <span className="mini-node">02</span>
            <span className="mini-node">03</span>
            <div className="join-line" />
            <div className="chosen-node">
              <Sparkles size={20} />
            </div>
          </div>
          <div>
            <h2 id="decision-title">TypeSafe chooses a model</h2>
            <p>The selection and its probabilities appear here.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="selected-model">
            <div>
              <span className="eyebrow">SELECTED MODEL</span>
              <h2 id="decision-title">{decision.model.name}</h2>
              <code>{decision.choice}</code>
            </div>
            <span className="selected-icon">
              <Check size={24} />
            </span>
          </div>
          <div className="decision-stats">
            <div>
              <span>Decision confidence</span>
              <strong>{pct(decision.confidence)}</strong>
            </div>
            <div>
              <span>Models considered</span>
              <strong>{decision.candidateCount}</strong>
            </div>
            <div>
              <span>Listed input price</span>
              <strong>
                {price(decision.model.inputPrice)}
                <small> / 1M</small>
              </strong>
            </div>
          </div>
          <div className="finalists-heading">
            <strong>Final-round probabilities</strong>
            <span>{decision.rounds.length} group winners</span>
          </div>
          <div className="probabilities">
            {finalists.map(([id, value]) => (
              <div className="probability" key={id}>
                <span title={id}>{id}</span>
                <div className="bar-track">
                  <div
                    style={{ width: `${value * 100}%` }}
                    className={id === decision.choice ? "winner" : ""}
                  />
                </div>
                <strong>{pct(value)}</strong>
              </div>
            ))}
          </div>
          <p className="fineprint">
            Among finalists only. Confidence is not answer accuracy.{" "}
            {decision.confidence < 0.5 && (
              <strong className="warning-text">
                This selection is uncertain.
              </strong>
            )}
          </p>
          <details className="round-details">
            <summary>
              <Braces size={14} />
              Inspect all selection rounds
            </summary>
            <p>
              All compatible models enter groups of up to 200. TypeSafe chooses
              one winner per group, then chooses among the winners. Grouping can
              affect the result; this is a routing policy, not a benchmark.
            </p>
            {decision.rounds.map((round) => (
              <details key={round.group}>
                <summary>
                  Group {round.group} · {round.candidates} models ·{" "}
                  {round.winner.name}
                </summary>
                <div className="raw-scroll">
                  <pre>
                    {JSON.stringify(
                      {
                        winner: round.winner.id,
                        confidence: round.confidence,
                        probabilities: round.probabilities,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </details>
            ))}
            <details>
              <summary>Final typed response</summary>
              <pre className="raw-scroll">
                {JSON.stringify(
                  {
                    model: decision.routerModel,
                    choice: decision.choice,
                    confidence: decision.confidence,
                    probabilities: decision.probabilities,
                    usage: decision.usage,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
          </details>
        </>
      )}
    </section>
  );
}
