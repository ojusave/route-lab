import test from "node:test";
import assert from "node:assert/strict";
import { deployLink } from "../shared/links";

for (const [language, path] of [
  ["typescript", "render.yaml"],
  ["python", "python/render.yaml"],
] as const) {
  test(`${language} selects its own Blueprint and preserves attribution`, () => {
    const repo = "https://github.com/example/fork";
    const login = new URL(deployLink(language, repo));
    assert.equal(
      login.origin + login.pathname,
      "https://dashboard.render.com/login",
    );
    const url = new URL(login.searchParams.get("next")!, login.origin);
    assert.equal(
      url.origin + url.pathname,
      "https://dashboard.render.com/blueprint/new",
    );
    assert.equal(url.searchParams.get("repo"), repo);
    assert.equal(url.searchParams.get("path"), path);
    assert.equal(url.searchParams.get("utm_source"), "github");
    assert.equal(url.searchParams.get("utm_medium"), "referral");
    assert.equal(url.searchParams.get("utm_campaign"), "ojus_demos");
    assert.equal(
      url.searchParams.get("utm_content"),
      `navbar_deploy_${language}`,
    );
    assert.equal(login.searchParams.get("utm_campaign"), "ojus_demos");
  });
}
