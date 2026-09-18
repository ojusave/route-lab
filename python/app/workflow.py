import asyncio
from time import perf_counter
from render import Retry, TaskContext, Workflows
from app.game import CHARACTERS, summarize
from app.judge import judge
from app.provider import react_to_pitch

app = Workflows(
    default_plan="flex",
    default_retry=Retry(max_retries=2, wait_duration_ms=1000, backoff_scaling=2),
    default_timeout=60,
)


@app.task
async def evaluate_character(ctx: TaskContext, data: dict, character_id: str) -> dict:
    started = perf_counter()
    decision = await judge(data, character_id)
    concern = next(
        (
            j
            for j in decision["judgments"]
            if j["choice"] != "met" or j["confidence"] < decision["minimumConfidence"]
        ),
        None,
    )
    fallback = (
        "That addresses both of my concerns. I'm in."
        if decision["vote"] == "yes"
        else f"Tell me more: {concern['label'].lower() if concern else 'how would this help me'}?"
    )
    # A dialogue outage must not discard the decision or invent a new vote.
    try:
        dialogue = await react_to_pitch(decision)
    except (Exception,):
        dialogue = None
    return {
        **decision,
        "reaction": dialogue["text"] if dialogue else fallback,
        "reactionSource": "generated" if dialogue else "authored",
        "dialogueModel": dialogue["model"] if dialogue else None,
        "durationMs": round((perf_counter() - started) * 1000),
    }


# Retry children, not the parent. Recovery reuses completed character results.
@app.task(retry=Retry(max_retries=0, wait_duration_ms=1000), timeout_seconds=240)
async def play_round(ctx: TaskContext, data: dict) -> dict:
    pending = [
        c
        for c in CHARACTERS
        if c["id"] not in {r["characterId"] for r in data["carried"]}
    ]
    settled = await asyncio.gather(
        *(ctx.run(evaluate_character, data, c["id"]) for c in pending),
        return_exceptions=True,
    )
    results, failed = list(data["carried"]), []
    for person, result in zip(pending, settled):
        if isinstance(result, BaseException):
            failed.append(person["id"])
        else:
            results.append(result)
    return summarize(results, failed)


if __name__ == "__main__":
    app.start()
