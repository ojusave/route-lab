import unittest
from app.game import vote_for, summarize, prepare_round, InvalidRound


def judgment(choice, confidence=0.9):
    return dict(choice=choice, confidence=confidence)


def result(person, vote="yes"):
    return dict(characterId=person, vote=vote)


def run(**overrides):
    return dict(
        id="r1",
        status="completed",
        input=dict(
            pitch="old",
            round=1,
            previousRunId=None,
            previousPitch=None,
            previous=[],
            carried=[],
            recoveryOf=None,
        ),
        results=[result("mina")],
        outcome=dict(complete=True),
        **overrides,
    )


class GameTests(unittest.IsolatedAsyncioTestCase):
    def test_vote_rules(self):
        for answers, expected in [
            ([judgment("met"), judgment("met")], "yes"),
            ([judgment("met"), judgment("met", 0.2)], "undecided"),
            ([judgment("met"), judgment("unmet")], "no"),
            ([judgment("met"), judgment("unmet", 0.2)], "undecided"),
            ([], "undecided"),
        ]:
            self.assertEqual(vote_for(answers), expected)

    def test_partial_results(self):
        partial = summarize([result("mina"), result("ravi")], ["jules"])
        self.assertFalse(partial["complete"])
        self.assertFalse(partial["won"])
        self.assertEqual(partial["votes"], 2)

    async def test_round_limit_and_saved_history(self):
        previous = run()

        async def read(_id):
            return previous

        revised = await prepare_round(dict(pitch="new", previousRunId="r1"), read)
        self.assertEqual(revised["round"], 2)
        self.assertEqual(revised["previousPitch"], "old")
        previous["input"]["round"] = 2
        with self.assertRaises(InvalidRound):
            await prepare_round(dict(pitch="third", previousRunId="r2"), read)

    async def test_recovery_and_unchanged_pitch(self):
        previous = run()

        async def read(_id):
            return previous

        with self.assertRaises(InvalidRound):
            await prepare_round(dict(pitch="old", previousRunId="r1"), read)
        with self.assertRaises(InvalidRound):
            await prepare_round(dict(retryRunId="r1"), read)
        previous.update(status="failed", outcome=None)
        recovered = await prepare_round(dict(retryRunId="r1"), read)
        self.assertEqual(recovered["round"], 1)
        self.assertEqual(len(recovered["carried"]), 1)
        self.assertEqual(recovered["recoveryOf"], "r1")


if __name__ == "__main__":
    unittest.main()
