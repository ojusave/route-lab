import unittest
from app.catalog import normalize_model
from app.providers import model_groups


def model(i, context=32000):
    return normalize_model(
        dict(
            id=f"vendor/model-{i}",
            name=str(i),
            context_length=context,
            architecture=dict(input_modalities=["text"], output_modalities=["text"]),
            pricing=dict(prompt="0.000001", completion="0.000002"),
        )
    )


class RoutingTest(unittest.TestCase):
    def test_all_models_participate_once(self):
        groups = model_groups({"models": [model(i) for i in range(601)]}, "hello")
        self.assertEqual([len(g) for g in groups], [200, 200, 200, 1])
        self.assertEqual(len({m["id"] for g in groups for m in g}), 601)

    def test_ineligible_models_are_visible_but_not_routed(self):
        image = normalize_model(
            dict(
                id="vendor/image",
                name="Image",
                architecture=dict(
                    input_modalities=["text"], output_modalities=["image"]
                ),
            )
        )
        catalog = {"models": [image, model("tiny", 2000), model("ok")]}
        self.assertEqual(len(catalog["models"]), 3)
        self.assertEqual(
            [m["id"] for g in model_groups(catalog, "hello") for m in g],
            ["vendor/model-ok"],
        )
        self.assertIsNone(image["inputPrice"])
        self.assertEqual(model("ok")["inputPrice"], 1)


if __name__ == "__main__":
    unittest.main()
