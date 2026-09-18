import asyncio
import os
import httpx
from render import RenderAsync

render = RenderAsync()
TASKS = {}
WORKFLOW_ID = None
WORKFLOW = os.getenv("RENDER_WORKFLOW_SLUG", "route-lab-python")


async def read_run(run_id: str) -> dict:
    global WORKFLOW_ID
    root = (await render.workflows.get_task_run(run_id)).to_dict()
    # The Python SDK's list helper does not yet expose rootTaskRunId; use the documented REST filter.
    base = os.getenv("RENDER_LOCAL_DEV_URL", "https://api.render.com")
    headers = (
        {"Authorization": f"Bearer {os.environ['RENDER_API_KEY']}"}
        if os.getenv("RENDER_API_KEY")
        else {}
    )
    async with httpx.AsyncClient(timeout=10, headers=headers) as client:
        if root["taskId"] not in TASKS:
            metadata = await client.get(f"{base}/v1/tasks/{root['taskId']}")
            metadata.raise_for_status()
            TASKS[root["taskId"]] = metadata.json()
        task = TASKS[root["taskId"]]
        if task["name"] != "play_round" or root.get("parentTaskRunId"):
            raise LookupError("Run not found.")
        if not os.getenv("RENDER_LOCAL_DEV_URL"):
            if not WORKFLOW_ID:
                matching = await client.get(
                    f"{base}/v1/tasks",
                    params={"taskSlug": f"{WORKFLOW}/play_round", "limit": 1},
                )
                matching.raise_for_status()
                entries = matching.json()
                WORKFLOW_ID = entries[0]["task"].get("workflowId") if entries else None
            # Keep runs from other workflows out of this public endpoint.
            if not WORKFLOW_ID or task.get("workflowId") != WORKFLOW_ID:
                raise LookupError("Run not found.")
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{base}/v1/task-runs",
            params={"rootTaskRunId": run_id, "limit": 100},
            headers=headers,
        )
        response.raise_for_status()
    ids = [
        r["taskRun"]["id"]
        for r in response.json()
        if r["taskRun"]["id"] != run_id and r["taskRun"].get("rootTaskRunId") == run_id
    ]
    children = [
        r.to_dict()
        for r in await asyncio.gather(*(render.workflows.get_task_run(i) for i in ids))
    ]
    async with httpx.AsyncClient(timeout=10, headers=headers) as client:
        for task_id in {r["taskId"] for r in children} - TASKS.keys():
            metadata = await client.get(f"{base}/v1/tasks/{task_id}")
            metadata.raise_for_status()
            TASKS[task_id] = metadata.json()
    steps = []
    for r in sorted(children, key=lambda r: r.get("startedAt") or ""):
        name = TASKS[r["taskId"]]["name"]
        steps.append(
            dict(
                id=r["id"],
                taskName=name,
                status=r["status"],
                retries=r["retries"],
                characterId=r["input"][1] if name == "evaluate_character" else None,
                attempts=[
                    dict(attempt=a["attempt"], status=a["status"])
                    for a in r.get("attempts", [])
                ],
                startedAt=r.get("startedAt"),
                completedAt=r.get("completedAt"),
                result=(r.get("results") or [None])[0],
            )
        )

    final = (root.get("results") or [None])[0]
    data = root["input"][0]
    results = (
        final["results"]
        if final
        else data["carried"] + [s["result"] for s in steps if s["result"]]
    )
    error = (
        "Some characters could not finish. Retry the missing votes; your attempt is saved."
        if (final and final.get("failed")) or root["status"] in ("failed", "canceled")
        else None
    )
    return dict(
        id=run_id,
        startedAt=root.get("startedAt"),
        completedAt=root.get("completedAt"),
        status=root["status"],
        steps=steps,
        input=data,
        results=results,
        outcome=final,
        error=error,
    )
