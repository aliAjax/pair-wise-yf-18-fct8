// 界面层：通用表单控件
import type { ReactNode } from "react";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {hint ? <em>{hint}</em> : null}
      </span>
      {children}
    </label>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "已确认"
      ? "badge ok"
      : status === "待确认"
        ? "badge warn"
        : status === "在镶"
          ? "badge ok"
          : "badge dead";
  return <span className={cls}>{status}</span>;
}
