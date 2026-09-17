import asyncio
from render import Retry, TaskContext, Workflows
from app.catalog import fetch_catalog
from app.providers import model_groups, shortlist, decide, generate

app = Workflows(
    default_plan="flex",
    default_retry=Retry(max_retries=2, wait_duration_ms=1000, backoff_scaling=2),
    default_timeout=120,
)


@app.task(timeout_seconds=30)
async def load_models(ctx: TaskContext) -> dict:
    return await fetch_catalog()


@app.task(timeout_seconds=90)
async def shortlist_models(
    ctx: TaskContext, prompt: str, models: list[dict], group: int
) -> dict:
    return await shortlist(prompt, models, group)


@app.task(timeout_seconds=90)
async def choose_model(
    ctx: TaskContext, prompt: str, rounds: list[dict], fetched_at: str
) -> dict:
    return await decide(prompt, rounds, fetched_at)


@app.task
async def write_answer(
    ctx: TaskContext, prompt: str, decision: dict, simulate_failure: bool
) -> dict:
    return await generate(prompt, decision, simulate_failure)


# Only child tasks retry. A new parent run can repeat previously completed work.
@app.task(retry=Retry(max_retries=0, wait_duration_ms=1000), timeout_seconds=720)
async def answer_prompt(ctx: TaskContext, prompt: str, simulate_failure: bool) -> dict:
    catalog = await ctx.run(load_models)
    rounds = await asyncio.gather(
        *(
            ctx.run(shortlist_models, prompt, models, i + 1)
            for i, models in enumerate(model_groups(catalog, prompt))
        )
    )
    decision = await ctx.run(choose_model, prompt, rounds, catalog["fetchedAt"])
    answer = await ctx.run(write_answer, prompt, decision, simulate_failure)
    return dict(state="completed", decision=decision, answer=answer)


if __name__ == "__main__":
    app.start()
