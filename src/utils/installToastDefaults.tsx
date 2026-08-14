import { useState } from "react";
import { toast, type ToastContent, type ToastOptions } from "react-toastify";

let installed = false;

function CopyableErrorToast({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="toast-copyable">
      <div className="toast-copyable__text">{text}</div>
      <button
        type="button"
        className="toast-copyable__copy"
        aria-label="Copy error message"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

/** Longer-lived, selectable error toasts with a Copy action. */
export function installToastDefaults(): void {
  if (installed) return;
  installed = true;

  const originalError = toast.error.bind(toast);
  toast.error = ((content: ToastContent, options?: ToastOptions) => {
    const body =
      typeof content === "string" ? (
        <CopyableErrorToast text={content} />
      ) : (
        content
      );

    return originalError(body, {
      autoClose: 20_000,
      closeOnClick: false,
      draggable: false,
      ...options,
    });
  }) as typeof toast.error;
}
