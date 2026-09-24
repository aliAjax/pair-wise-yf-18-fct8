// 档案层：编号生成规则

import type { OrderRecord, ReplacementRecord } from "./types";

/** 通用短编号：RP-XXXXXX */
export function createId(prefix: string): string {
  const tail = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${tail}`;
}

/** 订单号：DD-YYMM-序号，跳过已存在编号 */
export function nextOrderId(orders: OrderRecord[]): string {
  const d = new Date();
  const ym = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}`;
  let seq = orders.filter((o) => o.id.startsWith(`DD-${ym}-`)).length + 1;
  let id = `DD-${ym}-${String(seq).padStart(2, "0")}`;
  while (orders.some((o) => o.id === id)) {
    seq += 1;
    id = `DD-${ym}-${String(seq).padStart(2, "0")}`;
  }
  return id;
}

/** 换石单号：RP-YYMMDD-序号 */
export function nextReplacementId(records: ReplacementRecord[]): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const prefix = `RP-${ymd}-`;
  let seq = records.filter((r) => r.id.startsWith(prefix)).length + 1;
  let id = `${prefix}${String(seq).padStart(2, "0")}`;
  const taken = new Set(records.map((r) => r.id));
  while (taken.has(id)) {
    seq += 1;
    id = `${prefix}${String(seq).padStart(2, "0")}`;
  }
  return id;
}
