from time import perf_counter
from typesafe_sdk import AsyncTypeSafeClient, Choice, RetryPolicy
from app.game import CONFIG, character, vote_for


async def judge(data, character_id):
    person = character(character_id)
    state = dict(pitch=data["pitch"], previousPitch=data["previousPitch"])
    started = perf_counter()
    async with AsyncTypeSafeClient(
        retry=RetryPolicy(max_retries=0, timeout=30)
    ) as client:
        result = await client.system_one(
            state=state,
            questions={
                c["id"]: Choice(
                    instructions=f"{CONFIG['instructions']}\nCriterion: {c['question']}",
                    criteria=CONFIG["options"],
                )
                for c in person["criteria"]
            },
        )
    judgments = []
    for criterion in person["criteria"]:
        answer = result.choices[criterion["id"]]
        if answer.choice not in CONFIG["options"]:
            raise ValueError("Missing TypeSafe criterion result.")
        judgments.append(
            {
                **criterion,
                "choice": answer.choice,
                "confidence": answer.confidence,
                "probabilities": answer.probabilities,
            }
        )
    return dict(
        stage="character",
        characterId=character_id,
        name=person["name"],
        vote=vote_for(judgments),
        previousVote=next(
            (r["vote"] for r in data["previous"] if r["characterId"] == character_id),
            None,
        ),
        judgments=judgments,
        typesafeModel=result.model,
        decisionMs=round((perf_counter() - started) * 1000),
        rulesVersion=CONFIG["rulesVersion"],
        instructions=CONFIG["instructions"],
        options=CONFIG["options"],
        state=state,
        minimumConfidence=CONFIG["minimumConfidence"],
    )
