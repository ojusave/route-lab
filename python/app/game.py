import json
from pathlib import Path

CONFIG = json.loads(
    (Path(__file__).resolve().parents[2] / "shared/config.json").read_text()
)
CHARACTERS = CONFIG["characters"]


def character(character_id):
    return next(c for c in CHARACTERS if c["id"] == character_id)


def vote_for(judgments):
    if any(
        j["choice"] == "unmet" and j["confidence"] >= CONFIG["minimumConfidence"]
        for j in judgments
    ):
        return "no"
    if judgments and all(
        j["choice"] == "met" and j["confidence"] >= CONFIG["minimumConfidence"]
        for j in judgments
    ):
        return "yes"
    return "undecided"


def summarize(results, failed):
    votes = sum(r["vote"] == "yes" for r in results)
    complete = not failed and len({r["characterId"] for r in results}) == len(
        CHARACTERS
    )
    return dict(
        results=results,
        failed=failed,
        votes=votes,
        complete=complete,
        won=complete and votes >= 2,
    )


class InvalidRound(ValueError):
    pass


async def prepare_round(body, read):
    if body.get("retryRunId"):
        old = await read(body["retryRunId"])
        if old["status"] not in ("completed", "succeeded", "failed", "canceled") or (
            old.get("outcome") or {}
        ).get("complete"):
            raise InvalidRound("This round does not need a retry.")
        return {**old["input"], "carried": old["results"], "recoveryOf": old["id"]}
    pitch = (body.get("pitch") or "").strip()
    if not pitch:
        raise InvalidRound("Write your pitch first.")
    result = dict(
        pitch=pitch,
        round=1,
        previousRunId=None,
        previousPitch=None,
        previous=[],
        carried=[],
        recoveryOf=None,
    )
    if body.get("previousRunId"):
        previous = await read(body["previousRunId"])
        if not (previous.get("outcome") or {}).get("complete") or previous[
            "status"
        ] not in ("completed", "succeeded"):
            raise InvalidRound("Finish the current round before revising your pitch.")
        if previous["input"]["round"] >= CONFIG["maxRounds"]:
            raise InvalidRound("Both attempts are used. Start a new game.")
        if pitch == previous["input"]["pitch"]:
            raise InvalidRound("Change your pitch before trying again.")
        result.update(
            round=previous["input"]["round"] + 1,
            previousRunId=previous["id"],
            previousPitch=previous["input"]["pitch"],
            previous=previous["results"],
        )
    return result
