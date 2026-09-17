# Python example

This example runs independently. Its web service serves the frontend and calls its own Render Workflow. It does not need the other example's backend.

From the repository root:

```sh
npm ci
uv sync --project python --frozen
npm run dev:python
```

Open http://127.0.0.1:5173. The launcher starts this example's API, Render local task server, and frontend.

For deployment, use Blueprint Path `python/render.yaml` and leave Root Directory empty. The Blueprint creates a paid web service and a Workflow with usage-billed Flex tasks. Configure the real repository URL first with `npm run configure:repo -- <github-url>`, then validate the Blueprint. The full source stays in one repository so the frontend and selection policy can be reused.

Start reading the backend at `app/workflow.py`. Provider calls, catalog handling, run status, and HTTP routes are separate modules. See the root README for credentials, deployment steps, limits, sources, and live-test evidence.
