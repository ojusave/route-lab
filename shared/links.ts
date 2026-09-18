// Match the attribution used in Ojus's existing sample apps.
export function renderLink(base: string, content: string, repo?: string) {
  const url = new URL(base);
  if (repo) url.searchParams.set("repo", repo);
  url.searchParams.set("utm_source", "github");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", "ojus_demos");
  url.searchParams.set("utm_content", content);
  return url.toString();
}

export function deployLink(
  language: "typescript" | "python",
  repository: string,
  placement = "navbar",
) {
  const url = new URL(
    renderLink(
      "https://dashboard.render.com/blueprint/new",
      `${placement}_deploy_${language}`,
      repository,
    ),
  );
  url.searchParams.set(
    "path",
    language === "python" ? "python/render.yaml" : "render.yaml",
  );
  // Preserve the Blueprint path through sign-in. The generic deploy redirect drops it.
  const login = new URL(
    renderLink(
      "https://dashboard.render.com/login",
      `${placement}_deploy_${language}`,
    ),
  );
  login.searchParams.set("next", url.pathname + url.search);
  return login.toString();
}

export function githubRepository(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      !/^\/[\w.-]+\/[\w.-]+\/?$/.test(url.pathname)
    )
      return "";
    return `https://github.com${url.pathname.replace(/\/$/, "").replace(/\.git$/, "")}`;
  } catch {
    return "";
  }
}
