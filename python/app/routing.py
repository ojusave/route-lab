import json
from pathlib import Path
from time import perf_counter
from typesafe_sdk import AsyncTypeSafeClient, Choice, RetryPolicy

CONFIG = json.loads(
    (Path(__file__).resolve().parents[2] / "shared/config.json").read_text()
)


def model_groups(catalog: dict, prompt: str) -> list[list[dict]]:
    models = sorted(
        (
            m
            for m in catalog["models"]
            if m["eligible"]
            and m["contextLength"] >= len(prompt.encode("utf-8")) + 2000
        ),
        key=lambda m: m["id"],
    )
    return [models[i : i + 200] for i in range(0, len(models), 200)]


async def select(prompt: str, models: list[dict]):
    criteria = {
        m["id"]: dict(
            about=m["description"][:200],
            context=m["contextLength"],
            inputPrice=m["inputPrice"],
            outputPrice=m["outputPrice"],
            reasoning=m["reasoning"],
        )
        for m in models
    }
    async with AsyncTypeSafeClient(
        retry=RetryPolicy(max_retries=0, timeout=60)
    ) as client:
        return await client.system_one(
            state={"prompt": prompt},
            questions={
                "model": Choice(instructions=CONFIG["instructions"], criteria=criteria)
            },
        )


async def shortlist(prompt: str, models: list[dict], group: int) -> dict:
    started = perf_counter()
    result = await select(prompt, models)
    selected = result.choices["model"]
    winner = next((m for m in models if m["id"] == selected.choice), None)
    if winner is None:
        raise ValueError("TypeSafe selected a model outside the supplied group.")
    return dict(
        stage="shortlist",
        group=group,
        candidates=len(models),
        winner=winner,
        confidence=selected.confidence,
        probabilities=selected.probabilities,
        durationMs=round((perf_counter() - started) * 1000),
    )


async def decide(prompt: str, rounds: list[dict], fetched_at: str) -> dict:
    started = perf_counter()
    models = [r["winner"] for r in rounds]
    if not models or len(models) > 255:
        raise ValueError("Catalog size is outside the supported selection range.")
    result = await select(prompt, models)
    selected = result.choices["model"]
    model = next((m for m in models if m["id"] == selected.choice), None)
    if model is None:
        raise ValueError("TypeSafe selected a model outside the finalists.")
    return dict(
        stage="route",
        choice=selected.choice,
        confidence=selected.confidence,
        probabilities=selected.probabilities,
        model=model,
        routerModel=result.model,
        durationMs=round((perf_counter() - started) * 1000),
        candidateCount=sum(r["candidates"] for r in rounds),
        catalogFetchedAt=fetched_at,
        usage=result.raw_http_response.json().get("usage"),
        rounds=rounds,
    )
