import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { githubRepository } from "../shared/links";

const repository = githubRepository(process.argv[2] || "");
if (!repository)
  throw new Error(
    "Pass the GitHub URL for this project: https://github.com/owner/repository",
  );
const root = fileURLToPath(new URL("..", import.meta.url));
for (const language of ["typescript", "python"]) {
  const path =
    language === "typescript"
      ? `${root}/render.yaml`
      : `${root}/python/render.yaml`;
  const blueprint = readFileSync(path, "utf8").replace(/^    repo:.*\n/gm, "");
  writeFileSync(
    path,
    blueprint.replace(/^(    runtime: .+)$/gm, `$1\n    repo: ${repository}`),
  );
}
writeFileSync(`${root}/.env.local`, `VITE_REPOSITORY_URL=${repository}\n`);
console.log(
  "Updated both Blueprints and the public GitHub/Render links. No deployment was started.",
);
