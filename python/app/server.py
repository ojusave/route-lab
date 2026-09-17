import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app import provider
from app.runs import render, read_run, WORKFLOW

app = FastAPI()


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prompt: str = Field(min_length=1, max_length=6000)
    simulateFailure: bool = False

    @field_validator("prompt", mode="before")
    @classmethod
    def trim(cls, value):
        return value.strip() if isinstance(value, str) else value


@app.get("/api/health")
async def health():
    return dict(
        language="python",
        mode="local" if os.getenv("RENDER_LOCAL_DEV_URL") else "cloud",
        typesafe=bool(os.getenv("TYPESAFE_API_KEY")),
        openrouter=bool(os.getenv("OPENROUTER_API_KEY")),
    )


@app.get("/api/models")
async def models():
    return JSONResponse(await provider.fetch_catalog(), headers={"Cache-Control": "no-store"})


@app.post("/api/runs", status_code=202)
async def start(body: Input):
    configured = (
        os.getenv("TYPESAFE_API_KEY")
        if os.getenv("RENDER_LOCAL_DEV_URL")
        else (os.getenv("RENDER_API_KEY") and os.getenv("RENDER_WORKFLOW_SLUG"))
    )
    if not configured:
        raise HTTPException(
            503,
            "Workflow setup is incomplete. Check the server environment.",
        )
    run = await render.workflows.start_task(
        f"{WORKFLOW}/answer_prompt", [body.prompt, body.simulateFailure]
    )
    return {"id": run.id}


@app.get("/api/runs/{run_id}")
async def get_run(run_id: str):
    if not run_id.replace("-", "").replace("_", "").isalnum() or len(run_id) > 100:
        raise HTTPException(400, "Invalid run ID.")
    try:
        return await read_run(run_id)
    except LookupError:
        raise HTTPException(404, "Run not found.")


@app.exception_handler(Exception)
async def errors(_request, _error):
    return JSONResponse(
        status_code=502,
        content={
            "error": "Cannot reach the workflow run. Check that the task server is running, then reconnect."
        },
    )


static_dir = Path(__file__).resolve().parents[2] / "dist" / "python"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
