import unittest
from unittest.mock import AsyncMock, patch
from app.workflow import play_round, evaluate_character


class WorkflowTests(unittest.IsolatedAsyncioTestCase):
    async def test_recovery_only_runs_missing_characters(self):
        calls = []

        class Context:
            async def run(self, task, data, character_id):
                calls.append(character_id)
                if character_id == "jules":
                    raise ValueError("provider timeout")
                return dict(characterId=character_id, vote="yes")

        data = dict(carried=[], pitch="test", round=1)
        partial = await play_round.func(Context(), data)
        self.assertEqual(partial["failed"], ["jules"])
        self.assertFalse(partial["complete"])
        calls.clear()

        class Recovered:
            async def run(self, task, data, character_id):
                calls.append(character_id)
                return dict(characterId=character_id, vote="yes")

        recovered = await play_round.func(
            Recovered(), {**data, "carried": partial["results"]}
        )
        self.assertEqual(calls, ["jules"])
        self.assertTrue(recovered["complete"])

    async def test_dialogue_failure_keeps_the_actual_vote(self):
        decision = dict(
            characterId="mina", vote="yes", judgments=[], minimumConfidence=0.35
        )
        with (
            patch("app.workflow.judge", new=AsyncMock(return_value=decision)),
            patch(
                "app.workflow.react_to_pitch", new=AsyncMock(side_effect=TimeoutError())
            ),
        ):
            result = await evaluate_character.func(None, {}, "mina")
        self.assertEqual(result["vote"], "yes")
        self.assertEqual(result["reactionSource"], "authored")
        self.assertIsNone(result["dialogueModel"])


if __name__ == "__main__":
    unittest.main()
