import json
import os
import httpx
from app.game import CONFIG


async def react_to_pitch(result):
    payload = dict(
        model=os.getenv("OPENROUTER_MODEL", "openai/gpt-4.1-mini"),
        messages=[
            dict(
                role="system",
                content=CONFIG["dialogueInstructions"],
            ),
            dict(
                role="user",
                content=json.dumps(
                    dict(
                        pitch=result["state"]["pitch"],
                        vote=result["vote"],
                        findings=[
                            dict(
                                criterion=j["label"],
                                finding=j["choice"],
                                uncertain=j["confidence"] < result["minimumConfidence"],
                            )
                            for j in result["judgments"]
                        ],
                    )
                ),
            ),
        ],
        max_tokens=100,
    )
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}"},
        )
        response.raise_for_status()
    data = response.json()
    text = data.get("choices", [{}])[0].get("message", {}).get("content")
    if not isinstance(text, str) or not text.strip() or len(text.split()) > 26:
        raise ValueError("No dialogue returned.")
    return dict(text=text.strip().replace("\u2014", ", ")[:240], model=data["model"])
