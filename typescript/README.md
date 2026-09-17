# Render Workflows + TypeSafe AI: TypeScript

Run parallel model comparisons, make a typed choice, and generate an answer. This example deploys independently.

[![Render Workflows](https://img.shields.io/badge/Render-Workflows-6e40c9?logo=render&logoColor=white)](https://render.com/docs/workflows)
[![TypeSafe AI](https://img.shields.io/badge/TypeSafe_AI-Model_selection-18181b)](https://docs.typesafe.ai/primitives/choice)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-Models-555555?logo=openrouter&logoColor=white)](https://openrouter.ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-SDK-3178C6?logo=typescript&logoColor=white)](https://github.com/render-oss/sdk)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fojusave%2Froute-lab&utm_source=github&utm_medium=referral&utm_campaign=ojus_demos&utm_content=readme_deploy_typescript)

Set **Blueprint Path** to `render.yaml` and leave **Root Directory** empty. Enter `RENDER_API_KEY`, `TYPESAFE_API_KEY`, and `OPENROUTER_API_KEY`. The Blueprint creates a paid web service and Workflow, with the slug wired automatically.

## Local development

From the repository root, with Node.js and Render CLI installed:

```sh
npm ci
cp .env.example .env  # Add TypeSafe and OpenRouter keys
npm run dev:typescript
```

Open **http://127.0.0.1:5173**.

Start with [`src/workflow.ts`](src/workflow.ts). TypeSafe selection lives in `src/routing.ts`. Model-provider calls live in `src/adapters/openrouter.ts`.

[Demo overview](../README.md) · [Technical notes](../docs/development.md)
