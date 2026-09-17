import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export default function Panel({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="detail-panel"
      aria-label={title}
      onClose={close}
    >
      <div className="panel-header">
        <span>{title}</span>
        <button
          className="icon-button"
          aria-label={`Close ${title}`}
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      <div className="panel-body">{children}</div>
    </dialog>
  );
}
