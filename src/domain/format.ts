// 判断层：界面通用的数值/时间格式

import { roundCarat, roundMoney } from "./loss";

export function fmtCarat(value: number): string {
  return `${roundCarat(value).toFixed(3)}ct`;
}

export function fmtMoney(value: number): string {
  return `¥${roundMoney(value).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtDate(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes()
  )}`;
}
