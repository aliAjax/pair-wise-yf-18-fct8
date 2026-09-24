import { useEffect } from "react";

/** 轻量提示条：成功绿、错误红，3 秒自动消失 */
export interface ToastState {
  kind: "success" | "error";
  message: string;
}

export function Toast({
  toast,
  onClose,
}: {
  toast: ToastState | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.kind}`} role="alert">
      <span>{toast.kind === "error" ? "⚠ " : "✓ "}{toast.message}</span>
      <button type="button" className="toast-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
}
