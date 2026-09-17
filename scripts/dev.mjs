import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, createWriteStream } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
process.chdir(root);
const envFile = resolve(process.env.DEMO_ENV_FILE || ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);
const example = process.argv[2];
if (example && !["typescript", "python"].includes(example))
  throw new Error("Choose typescript or python.");
const processes = [];
mkdirSync(resolve(root, "work"), { recursive: true });
const logs = createWriteStream(resolve(root, "work/dev.log"), { flags: "a" });
function start(name, command, args, env = {}, cwd = root) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [child.stdout, child.stderr])
    createInterface({ input: stream }).on("line", (line) => {
      // The CLI prints task arguments, including large catalogs. Keep terminal output concise.
      const safeLine = `[${name}] ${line.split(" input=")[0].slice(0, 400)}`;
      logs.write(safeLine + "\n");
      // A full terminal pipe must not block the CLI's HTTP server.
      if (/listening on port|API ready|Uvicorn running|Local:/.test(line))
        console.log(safeLine);
    });
  child.on("error", (error) => {
    console.error(`${name}: ${error.message}`);
    stop();
  });
  child.on("exit", (code) => {
    if (code && !stopping) {
      console.error(`${name} exited (${code})`);
      stop();
    }
  });
  processes.push(child);
}
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const p of processes) p.kill("SIGTERM");
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
const tsEnv = {
  RENDER_LOCAL_DEV_URL: "http://127.0.0.1:8120",
  RENDER_WORKFLOW_SLUG: "route-lab-typescript",
};
const pyEnv = {
  RENDER_LOCAL_DEV_URL: "http://127.0.0.1:8121",
  RENDER_WORKFLOW_SLUG: "route-lab-python",
};
const envArgs = existsSync(envFile) ? ["--env-file", envFile] : [];
if (example !== "python")
  start(
    "workflow-ts",
    "render",
    [
      "workflows",
      "dev",
      "--port",
      "8120",
      ...envArgs,
      "--",
      "node_modules/.bin/tsx",
      "typescript/src/workflow.ts",
    ],
    tsEnv,
  );
if (example !== "typescript")
  start(
    "workflow-py",
    "render",
    [
      "workflows",
      "dev",
      "--port",
      "8121",
      ...envArgs,
      "--",
      ".venv/bin/python",
      "-m",
      "app.workflow",
    ],
    pyEnv,
    resolve(root, "python"),
  );
if (example !== "python")
  start("api-ts", "node_modules/.bin/tsx", ["typescript/src/server.ts"], tsEnv);
if (example !== "typescript")
  start(
    "api-py",
    ".venv/bin/python",
    [
      "-m",
      "uvicorn",
      "app.server:app",
      "--host",
      "127.0.0.1",
      "--port",
      "3002",
      "--no-access-log",
    ],
    pyEnv,
    resolve(root, "python"),
  );
async function waitForApi(port) {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
        signal: AbortSignal.timeout(500),
      });
      if (response.ok) return;
    } catch {
      /* The API process is still starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  stop();
  throw new Error(`API on port ${port} did not start. Check work/dev.log.`);
}
await Promise.all(
  (example === "python"
    ? [3002]
    : example === "typescript"
      ? [3001]
      : [3001, 3002]
  ).map(waitForApi),
);
start("web", "node_modules/.bin/vite", [], { VITE_EXAMPLE: example || "" });
