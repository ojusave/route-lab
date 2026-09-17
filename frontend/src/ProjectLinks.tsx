import { useState } from "react";
import { ArrowUpRight, Code, Rocket } from "lucide-react";
import { githubRepository, renderLink } from "../../shared/links";
import type { Language } from "./api";
import Panel from "./Panel";

const repository = githubRepository(
  import.meta.env.VITE_REPOSITORY_URL || "https://github.com/ojusave/route-lab",
);
const external = { target: "_blank", rel: "noopener noreferrer" } as const;

export function ProjectLinks({ language }: { language: Language }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="project-links">
        {repository ? (
          <a href={repository} {...external}>
            <Code size={16} />
            GitHub
          </a>
        ) : (
          <span
            className="pending-link"
            title="This local example does not have a published GitHub repository yet."
          >
            <Code size={16} />
            GitHub <small>unpublished</small>
          </span>
        )}
        <button className="deploy-button" onClick={() => setOpen(true)}>
          <Rocket size={15} />
          Deploy to Render
        </button>
      </div>
      {open && (
        <Panel title="Deploy this example" close={() => setOpen(false)}>
          <div className="deploy-panel">
            <h2>{language === "python" ? "Python" : "TypeScript"} example</h2>
            <p>
              One paid web service and one workflow. The other example runs
              separately.
            </p>
            <p>
              In Render, set <strong>Blueprint Path</strong> to{" "}
              <code>
                {language === "python" ? "python/render.yaml" : "render.yaml"}
              </code>
              .
            </p>
            {repository ? (
              <a
                className="secondary"
                href={renderLink(
                  "https://render.com/deploy",
                  `navbar_deploy_${language}`,
                  repository,
                )}
                {...external}
              >
                Continue to Render <ArrowUpRight size={15} />
              </a>
            ) : (
              <p className="fineprint">
                The source is local. Deployment needs a published GitHub
                repository.
              </p>
            )}
            <SignupLink />
          </div>
        </Panel>
      )}
    </>
  );
}

export function SignupLink() {
  return (
    <a
      className="signup-link"
      href={renderLink("https://dashboard.render.com/register", "footer_link")}
      {...external}
    >
      Sign up on Render <ArrowUpRight size={14} />
    </a>
  );
}
