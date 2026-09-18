import config from "../../shared/config.json";
import type { Character, CharacterResult } from "../../shared/types";
import { voteLabel } from "./Character";

const labels = { met: "Addressed", unclear: "Unclear", unmet: "Not addressed" };
export default function Decision({
  person,
  result,
}: {
  person: Character;
  result?: CharacterResult;
}) {
  return (
    <div className="decision-details">
      <p className="panel-lead">{person.concern}</p>
      {!result ? (
        <>
          <p>
            These are {person.name}'s two criteria. Address both to win a vote.
          </p>
          {person.criteria.map((c) => (
            <section key={c.id}>
              <h3>{c.label}</h3>
              <p>{c.question}</p>
            </section>
          ))}
        </>
      ) : (
        <>
          <div className={`decision-verdict ${result.vote}`}>
            {voteLabel[result.vote]} <span>Decided from TypeSafe results</span>
          </div>
          {result.judgments.map((j) => (
            <section key={j.id} className="criterion">
              <div className="criterion-title">
                <h3>{j.label}</h3>
                <span>{labels[j.choice]}</span>
              </div>
              <p>{j.question}</p>
              <div className="probabilities">
                {Object.entries(j.probabilities).map(([key, value]) => (
                  <div key={key}>
                    <span>{labels[key as keyof typeof labels]}</span>
                    <div>
                      <i style={{ width: `${value * 100}%` }} />
                    </div>
                    <strong>{(value * 100).toFixed(0)}%</strong>
                  </div>
                ))}
              </div>
              <small>Returned confidence: {j.confidence.toFixed(2)} / 1</small>
            </section>
          ))}
          <section>
            <h3>The voting rule</h3>
            <p>
              Both criteria addressed with confidence of at least{" "}
              {result.minimumConfidence}: yes. A clear unmet criterion: no.
              Everything else: undecided.
            </p>
            <p className="fineprint">
              The confidence cutoff is this game's rule. These values describe a
              model judgment, not the likelihood a real person would buy your
              invention.
            </p>
          </section>
          <section>
            <h3>What {person.name} read</h3>
            <blockquote>{result.state.pitch}</blockquote>
            {result.state.previousPitch && (
              <details>
                <summary>Previous pitch</summary>
                <blockquote>{result.state.previousPitch}</blockquote>
              </details>
            )}
          </section>
          <section>
            <h3>The short reaction</h3>
            <p>{result.reaction}</p>
            <p className="fineprint">
              {result.reactionSource === "generated"
                ? `Generated dialogue through OpenRouter (${result.dialogueModel}). It does not determine the vote or expose Jev's internal reasoning.`
                : "Authored fallback because dialogue generation did not return a usable short response. The TypeSafe judgment is unchanged."}
            </p>
          </section>
          <details>
            <summary>API inputs & returned decisions</summary>
            <pre className="raw-scroll">
              {JSON.stringify(
                {
                  model: result.typesafeModel,
                  state: result.state,
                  questions: Object.fromEntries(
                    result.judgments.map((j) => [
                      j.id,
                      {
                        type: "choice",
                        instructions: `${result.instructions}\nCriterion: ${j.question}`,
                        criteria: result.options,
                      },
                    ]),
                  ),
                  answers: Object.fromEntries(
                    result.judgments.map((j) => [
                      j.id,
                      {
                        type: "choice",
                        choice: j.choice,
                        probabilities: j.probabilities,
                        confidence: j.confidence,
                      },
                    ]),
                  ),
                  rulesVersion: result.rulesVersion,
                  decisionMs: result.decisionMs,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </>
      )}
      {!result && (
        <p className="fineprint">
          A fictional character. Votes follow the same published rules in both
          SDK examples. Confidence cutoff: {config.minimumConfidence}.
        </p>
      )}
    </div>
  );
}
