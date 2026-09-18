# Development notes

## What runs

Each `play_round` parent starts three `evaluate_character` tasks in parallel. Each child batches two TypeSafe Choice questions, applies a deterministic voting rule, and asks OpenRouter for a short reaction. The parent collects completed results and failures.

Child evaluations retry twice. The parent does not retry automatically. A recovery starts a new parent with completed results carried forward and schedules only missing characters. It preserves the pitch and round number. Dialogue errors use a labeled authored response without discarding the TypeSafe decision.

## Decisions and state

Characters, criteria, examples, and options live in `shared/config.json`. A confident unmet criterion means no. Both criteria met with confidence at least 0.35 means yes. Otherwise the vote is undecided. This cutoff is a game policy, not an empirical accuracy guarantee.

TypeSafe receives the latest pitch, previous pitch when present, and two narrow criterion questions. The latest pitch replaces the old one. Every result snapshots the instructions, options, probabilities, confidence, model, cutoff, and rules version. Clicking a character shows these inputs and returned fields. Generated dialogue does not expose Jev's internal reasoning or control the vote.

The server retrieves a previous run from its own workflow before allowing a revision. Clients cannot supply votes, criteria, or a round number. A third round is rejected. A failed round can be recovered without consuming the second attempt. Starting a new game is always allowed; this is not a competitive leaderboard. Old model-router links are not game runs.

There is no application database. Render retains the run state, so links can reconnect to a round while it remains available. URLs are bearer links to the pitch and results. Public requests are capped at 700 characters and 12 round starts per minute per observed IP in each web process. This is a small demo limit, not a distributed abuse-prevention system.

## Live interface

The UI polls real task state every 1.2 seconds. Active bars update the elapsed display every 100 ms using Render timestamps. Parallel spans overlap. A fixed scale preserves left-to-right growth; longer runs extend the scrollable canvas. Durations include waits and retries and are not billing estimates. Completed bars do not keep growing.

Each task becomes visible when Render reports it. Character results appear when the child task finishes. A missing result does not become a negative vote. The game announces an outcome only after all three results exist.

## Provider boundary

TypeSafe calls live in `judge.ts` / `judge.py`. OpenRouter calls live in `adapters/openrouter.ts` / `adapters/openrouter.py`, exported by `provider`. An alternative text provider needs an adapter that accepts the existing decision and returns text plus a model ID. Voting and workflow code stay the same. No alternate provider is implemented or tested.

`OPENROUTER_MODEL` optionally changes the dialogue model. The default is `openai/gpt-4.1-mini`. The game no longer chooses among a model catalog; text generation is a supporting step. No secrets belong in frontend environment variables.

## Deploy and verify

The root Blueprint deploys TypeScript. `python/render.yaml` deploys Python. Both run build commands from the repository root and use paid web compute plus usage-billed workflow tasks. Provider keys use `sync: false`; the workflow build checks for blank values.

Render links preserve `github / referral / ojus_demos` UTMs. Both deploy buttons retain the chosen Blueprint path through login. README links request a new tab in HTML; GitHub controls which HTML attributes its renderer retains.

Run `npm run build`, `npm test`, and `python/.venv/bin/python -m unittest discover -s python`. With the local servers running, `node tests/live-smoke.mjs` exercises Python; set `DEMO_API_URL=http://127.0.0.1:3001/api` for TypeScript. It makes real provider calls. `node tests/ui-smoke.mjs` checks the interface with recorded task fixtures and Chrome.

[TypeSafe Choice](https://docs.typesafe.ai/primitives/choice) · [Render tasks](https://render.com/docs/workflows-defining) · [Blueprint reference](https://render.com/docs/blueprint-spec)
