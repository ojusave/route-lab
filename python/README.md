# Win the room · Python

A Render Workflows demo: pitch an invention, hear three fictional judges, and try to change their votes. Two attempts. Two votes to win.

<a href="https://render.com/docs/workflows?utm_source=github&utm_medium=referral&utm_campaign=ojus_demos&utm_content=readme_badge" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Render-Workflows-6e40c9?logo=render&logoColor=white" alt="Render Workflows" /></a>
<a href="https://docs.typesafe.ai" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/TypeSafe_AI-Decisions-18181b" alt="TypeSafe AI" /></a>
<a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/OpenRouter-Dialogue-555555?logo=openrouter&logoColor=white" alt="OpenRouter" /></a>
<a href="https://github.com/render-oss/sdk" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Python-SDK-3776AB?logo=python&logoColor=white" alt="Python SDK" /></a>

<a href="https://route-lab-python-web.onrender.com" target="_blank" rel="noopener noreferrer">Try the demo</a>

## Deploy

<a href="https://dashboard.render.com/login?utm_source=github&utm_medium=referral&utm_campaign=ojus_demos&utm_content=readme_deploy_python&next=%2Fblueprint%2Fnew%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fojusave%252Froute-lab%26utm_source%3Dgithub%26utm_medium%3Dreferral%26utm_campaign%3Dojus_demos%26utm_content%3Dreadme_deploy_python%26path%3Dpython%252Frender.yaml" target="_blank" rel="noopener noreferrer"><img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render" /></a>

Creates a paid web service and a usage-billed Workflow. During setup, enter:

| Key                  | Purpose                             |
| -------------------- | ----------------------------------- |
| `TYPESAFE_API_KEY`   | Evaluate each judge’s criteria      |
| `OPENROUTER_API_KEY` | Write short reactions               |
| `RENDER_API_KEY`     | Start rounds and read task progress |

Both provider keys are required. The Workflow slug is wired automatically.

## Try it

1. Choose an example and make your pitch.
2. Click a judge to inspect the actual TypeSafe decisions.
3. Address their concerns in your second attempt. Watch the parallel Render tasks below.

![The game](../docs/demo.jpg)

## Run locally

From the repository root, with Node.js 22.12+, Python 3.11+, uv, and Render CLI installed:

```sh
npm ci
uv sync --project python --frozen
cp .env.example .env  # Add TypeSafe and OpenRouter keys
npm run dev:python
```

Open **http://127.0.0.1:5173**.

Start with <a href="app/workflow.py" target="_blank" rel="noopener noreferrer">the workflow</a>. Shared character rules live in `shared/config.json`; text-provider calls are isolated in `app/adapters/openrouter.py`.

<a href="../README.md" target="_blank" rel="noopener noreferrer">Both examples</a> · <a href="../docs/development.md" target="_blank" rel="noopener noreferrer">Technical notes</a>
