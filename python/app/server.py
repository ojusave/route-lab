import os
import time
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.game import prepare_round, InvalidRound
from app.runs import render, read_run, WORKFLOW

app = FastAPI()
requests = {}


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pitch: str | None = Field(default=None, min_length=1, max_length=700)
    previousRunId: str | None = Field(default=None, pattern=r"^[a-zA-Z0-9_-]{1,100}$")
    retryRunId: str | None = Field(default=None, pattern=r"^[a-zA-Z0-9_-]{1,100}$")

    @field_validator("pitch", mode="before")
    @classmethod
    def trim(cls, value):
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def valid_combination(self):
        if (self.retryRunId and (self.pitch or self.previousRunId)) or (
            not self.retryRunId and not self.pitch
        ):
            raise ValueError("Provide a pitch or a retry run ID.")
        return self


@app.middleware("http")
async def no_cache(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/health")
async def health():
    return dict(
        language="python",
        game="win-the-room",
        mode="local" if os.getenv("RENDER_LOCAL_DEV_URL") else "cloud",
    )


@app.post("/api/runs", status_code=202)
async def start(body: Input, request: Request):
    now = time.monotonic()
    for key in list(requests):
        if requests[key][-1] < now - 60:
            del requests[key]
    key = request.client.host if request.client else "local"
    recent = [t for t in requests.get(key, []) if now - t < 60]
    if len(recent) >= 12:
        raise HTTPException(429, "Too many rounds at once. Try again in a minute.")
    requests[key] = recent + [now]
    try:
        data = await prepare_round(body.model_dump(exclude_none=True), read_run)
    except InvalidRound as error:
        raise HTTPException(409, str(error))
    run = await render.workflows.start_task(f"{WORKFLOW}/play_round", [data])
    return {"id": run.id}


@app.get("/api/runs/{run_id}")
async def get_run(run_id: str):
    if not run_id.replace("-", "").replace("_", "").isalnum() or len(run_id) > 100:
        raise HTTPException(400, "Invalid run ID.")
    return await read_run(run_id)


@app.exception_handler(LookupError)
async def missing(_request, _error):
    return JSONResponse(
        status_code=404,
        content={"error": "This link is not a game round. Start a new game."},
    )


@app.exception_handler(Exception)
async def errors(_request, _error):
    return JSONResponse(
        status_code=502,
        content={
            "error": "Cannot reach Render. Your pitch is still here. Try reconnecting."
        },
    )


static_dir = Path(__file__).resolve().parents[2] / "dist" / "python"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
