import asyncio
import os
import httpx
from render import RenderAsync

render = RenderAsync()
TASK_NAMES = {}
WORKFLOW = os.getenv("RENDER_WORKFLOW_SLUG", "route-lab-python")


async def read_run(run_id: str) -> dict:
    root = (await render.workflows.get_task_run(run_id)).to_dict()
    # The Python SDK's list helper does not yet expose rootTaskRunId; use the documented REST filter.
    base = os.getenv("RENDER_LOCAL_DEV_URL", "https://api.render.com")
    headers = (
        {"Authorization": f"Bearer {os.environ['RENDER_API_KEY']}"}
        if os.getenv("RENDER_API_KEY")
        else {}
    )
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
        for task_id in {r["taskId"] for r in children} - TASK_NAMES.keys():
            metadata = await client.get(f"{base}/v1/tasks/{task_id}")
            metadata.raise_for_status()
            TASK_NAMES[task_id] = metadata.json()["name"]
    steps = []
    for r in sorted(children, key=lambda r: r.get("startedAt") or ""):
        name = TASK_NAMES[r["taskId"]]
        steps.append(
            dict(
                id=r["id"],
                taskName=name,
                status=r["status"],
                retries=r["retries"],
                group=r["input"][2] if name == "shortlist_models" else None,
                candidates=len(r["input"][1]) if name == "shortlist_models" else None,
                attempts=[
                    dict(attempt=a["attempt"], status=a["status"])
                    for a in r.get("attempts", [])
                ],
                startedAt=r.get("startedAt"),
                completedAt=r.get("completedAt"),
                result=(r.get("results") or [None])[0],
            )
        )
    final = (root.get("results") or [{}])[0] or {}

    def stage(name):
        return next(
            (
                s["result"]
                for s in steps
                if s["result"] and s["result"].get("stage") == name
            ),
            None,
        )

    args = root["input"]
    error = None
    if root["status"] == "failed":
        error = (
            "Intentional demo failure. Render retried the answer task. Turn off failure mode and run again."
            if args[1]
            else "A provider task failed after its configured attempts. Check the server credentials, provider access, or retry the request."
        )
    return dict(
        id=run_id,
        startedAt=root.get("startedAt"),
        completedAt=root.get("completedAt"),
        status=root["status"],
        steps=steps,
        decision=final.get("decision") or stage("route"),
        answer=final.get("answer") or stage("answer"),
        error=error,
        input=dict(prompt=args[0], simulateFailure=args[1]),
    )
