import os
from datetime import datetime, timezone
from time import perf_counter
import math
import httpx


def normalize_model(raw: dict) -> dict:
    architecture = raw.get("architecture", {})
    inputs, outputs = (
        architecture.get("input_modalities", []),
        architecture.get("output_modalities", []),
    )
    exclusion = (
        "Not a text-in, text-out model."
        if "text" not in inputs or "text" not in outputs
        else "A routing alias; this demo selects the underlying model itself."
        if raw["id"].startswith("openrouter/")
        else None
    )

    def price(key):
        value = raw.get("pricing", {}).get(key)
        return (
            float(value) * 1_000_000
            if value is not None and math.isfinite(float(value)) and float(value) >= 0
            else None
        )

    return dict(
        id=raw["id"],
        name=raw["name"],
        description=raw.get("description", "")[:500],
        contextLength=raw.get("context_length", 0),
        inputPrice=price("prompt"),
        outputPrice=price("completion"),
        inputModalities=inputs,
        outputModalities=outputs,
        eligible=not exclusion,
        exclusion=exclusion,
        reasoning="reasoning" in raw.get("supported_parameters", []),
    )


async def fetch_catalog() -> dict:
    started = perf_counter()
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get("https://openrouter.ai/api/v1/models")
        response.raise_for_status()
    models = response.json()["data"]
    if not models:
        raise ValueError("OpenRouter returned an empty catalog.")
    return dict(
        stage="catalog",
        models=[normalize_model(m) for m in models],
        fetchedAt=datetime.now(timezone.utc).isoformat(),
        durationMs=round((perf_counter() - started) * 1000),
    )


async def generate(prompt: str, model: dict) -> dict:
    started = perf_counter()
    payload = dict(
        model=model["id"],
        messages=[
            dict(
                role="system",
                content="Give a useful, concise answer. Use Markdown when helpful. Keep the answer under 250 words.",
            ),
            dict(role="user", content=prompt),
        ],
        max_tokens=1600,
    )
    if model["reasoning"]:
        payload["reasoning"] = {"effort": "low"}
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}"},
        )
    if response.status_code != 200:
        raise ValueError(
            f"OpenRouter request failed (HTTP {response.status_code}). Check the API key, credits, and model access."
        )
    data = response.json()
    message = data.get("choices", [{}])[0]
    text = message.get("message", {}).get("content")
    if not text:
        raise ValueError(
            "OpenRouter returned no answer text. Try again or use a shorter prompt."
        )
    return dict(
        stage="answer",
        text=text,
        model=data["model"],
        durationMs=round((perf_counter() - started) * 1000),
        usage=data.get("usage"),
        finishReason=message.get("finish_reason"),
    )
