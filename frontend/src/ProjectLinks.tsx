import { useEffect, useRef, useState } from "react";
import { Code } from "lucide-react";
import { deployLink, githubRepository, renderLink } from "../../shared/links";

const repository = githubRepository(
  import.meta.env.VITE_REPOSITORY_URL || "https://github.com/ojusave/route-lab",
);
const external = { target: "_blank", rel: "noopener noreferrer" } as const;

export function ProjectLinks() {
  const [open, setOpen] = useState(false);
  const control = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (!control.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);
  return (
    <div className="project-links">
      <a href={repository} {...external}>
        <Code size={16} />
        GitHub
      </a>
      <div
        className="deploy-control"
        ref={control}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            button.current?.focus();
          }
        }}
      >
        <button
          ref={button}
          className="deploy-button"
          aria-expanded={open}
          aria-controls="deploy-options"
          onClick={() => setOpen(!open)}
        >
          <img
            src="https://render.com/images/deploy-to-render-button.svg"
            alt="Deploy to Render"
            width="153"
            height="40"
          />
        </button>
        {open && (
          <div
            id="deploy-options"
            className="deploy-options"
            role="group"
            aria-label="Deployment language"
          >
            {(["typescript", "python"] as const).map((language) => (
              <a
                key={language}
                href={deployLink(language, repository)}
                {...external}
                onClick={() => setOpen(false)}
              >
                {language === "typescript" ? "TypeScript" : "Python"}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PoweredByRender() {
  return (
    <a
      href={renderLink(
        "https://render.com/docs/workflows",
        "footer_powered_by",
      )}
      {...external}
    >
      <img src="/render-mark.svg" alt="" width="13" height="13" />
      Powered by Render Workflows
    </a>
  );
}
