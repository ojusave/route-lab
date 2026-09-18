# Render Workflows + TypeSafe AI: TypeScript

**[Open the live demo](https://route-lab-typescript-web.onrender.com)**

Render runs model comparisons in parallel. TypeSafe picks a model, and OpenRouter generates the answer.

[![Render Workflows](https://img.shields.io/badge/Render-Workflows-6e40c9?logo=render&logoColor=white)](https://render.com/docs/workflows)
[![TypeSafe AI](https://img.shields.io/badge/TypeSafe_AI-Model_selection-18181b)](https://docs.typesafe.ai/primitives/choice)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-Models-555555?logo=openrouter&logoColor=white)](https://openrouter.ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-SDK-3178C6?logo=typescript&logoColor=white)](https://github.com/render-oss/sdk)

## Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://dashboard.render.com/login?utm_source=github&utm_medium=referral&utm_campaign=ojus_demos&utm_content=readme_deploy_typescript&next=%2Fblueprint%2Fnew%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fojusave%252Froute-lab%26utm_source%3Dgithub%26utm_medium%3Dreferral%26utm_campaign%3Dojus_demos%26utm_content%3Dreadme_deploy_typescript%26path%3Drender.yaml)

The [Blueprint](../render.yaml) creates a paid web service and a separate Workflow. Render prompts for:

| API key | Used by | Purpose |
| --- | --- | --- |
| `TYPESAFE_API_KEY` | Workflow | Compare models and select a winner |
| `OPENROUTER_API_KEY` | Workflow | Generate the answer |
| `RENDER_API_KEY` | Web service | Start runs and read task progress |

Both provider keys use `sync: false`; enter their values during deployment. The Workflow slug is wired automatically.

## Try it

1. Run a prompt and watch parallel tasks on the timeline.
2. Open a TypeSafe comparison group or **Final choice** to inspect probabilities and inputs.
3. In **Code → About this demo**, enable **Try a failed task** to see Render retry the answer task.

![Render task timeline](../docs/demo.jpg)

## Local development

From the repository root, with Node.js 22.12+ and Render CLI installed:

```sh
npm ci
cp .env.example .env  # Add TypeSafe and OpenRouter keys
npm run dev:typescript
```

Open **http://127.0.0.1:5173**.

Start with [`src/workflow.ts`](src/workflow.ts). TypeSafe selection lives in `src/routing.ts`. Model-provider calls live in `src/adapters/openrouter.ts`.

[All examples](../README.md) · [Technical notes](../docs/development.md)
