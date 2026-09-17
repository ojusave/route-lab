<div align="center">

# Route Lab

**A live model-routing demo built with Render Workflows and TypeSafe AI.**

Watch Render run parallel comparisons, join the results, and retry a failed task.
TypeSafe returns a typed model choice. OpenRouter generates the answer.

[![Render Workflows](https://img.shields.io/badge/Render-Workflows-6e40c9?logo=render&logoColor=white)](https://render.com/docs/workflows)
[![TypeSafe AI](https://img.shields.io/badge/TypeSafe_AI-Model_selection-18181b)](https://docs.typesafe.ai/primitives/choice)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-Models-555555?logo=openrouter&logoColor=white)](https://openrouter.ai)

[Try TypeScript](https://route-lab-typescript-web.onrender.com) · [Try Python](https://route-lab-python-web.onrender.com) · [Source setup](#deploy-an-example)

</div>

## Deploy an example

Each example creates its own **paid web service and Workflow**.

| [TypeScript](typescript/README.md) | [Python](python/README.md) |
| --- | --- |
| [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fojusave%2Froute-lab&utm_source=github&utm_medium=referral&utm_campaign=ojus_demos&utm_content=readme_deploy_typescript) | [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fojusave%2Froute-lab&utm_source=github&utm_medium=referral&utm_campaign=ojus_demos&utm_content=readme_deploy_python) |
| Blueprint Path: `render.yaml` | Blueprint Path: `python/render.yaml` |

Set the indicated **Blueprint Path**, leave **Root Directory** empty, and enter:

- `RENDER_API_KEY`: starts tasks and reads progress from the web service.
- `TYPESAFE_API_KEY` and `OPENROUTER_API_KEY`: used only by the Workflow.

The Blueprint wires the Workflow slug automatically. Web services use `0.5c-512mb`; tasks use usage-billed `flex`.

## What to try

1. Run an example prompt. Follow the live task states.
2. Open **Selection details** for TypeSafe’s probabilities and group winners.
3. In **About this demo**, enable **Try a failed task**. Run again and expand **Run details** to see three answer attempts while earlier results remain available.

**Models** opens the full, freshly fetched catalog. **Code** shows the actual Workflow definitions.

## Run locally

Requires Node.js 22.12+, Render CLI, and provider keys. Python also needs Python 3.11+ and uv.

```sh
git clone https://github.com/ojusave/route-lab.git
cd route-lab
npm ci
cp .env.example .env  # Add TypeSafe and OpenRouter keys
npm run dev:typescript
```

For Python: `uv sync --project python --frozen`, then `npm run dev:python`.
Open **http://127.0.0.1:5173**.

## Read or change the backend

| Module in each example | Responsibility |
| --- | --- |
| `workflow` | Render tasks, parallel execution, retries |
| `routing` | TypeSafe selection and model grouping |
| `adapters/openrouter` | Catalog normalization and answer generation |
| `provider` | Selects the adapter |
| `runs` / `server` | Run status / HTTP routes |

To use another model provider, implement `fetchCatalog` and `generate` (Python: `fetch_catalog` and `generate`) in one adapter, then select it in `provider`. Update credentials and `shared/config.json` labels. Render tasks and TypeSafe routing stay unchanged. This is an adapter change, not necessarily a URL swap: catalogs, model IDs, prices, and capabilities differ.

Models are compared in groups of 200 to stay below TypeSafe’s 255-choice limit. Grouping can affect the winner. Probabilities do not establish answer quality, and shown costs cover generation only.

[Technical notes and checks](docs/development.md) · [Render Workflows docs](https://render.com/docs/workflows) · [Create a Render account](https://dashboard.render.com/register?utm_source=github&utm_medium=referral&utm_campaign=ojus_demos&utm_content=readme_link)
