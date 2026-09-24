// 判断层：镶石损耗的业务规则（纯函数，不碰 React 和本地存储）

import type { Database, OrderRecord, ReplacementRecord, ReplacementStatus } from "../archive/types";

/** 克拉统一保留三位小数（0.001ct） */
export function roundCarat(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

/** 金额保留两位小数 */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * 返工损耗口径：镶坏石当前克拉即本次损耗
 * （石头已镶坏报废，补石另算新石）
 */
export function calcLoss(beforeCarat: number): number {
  return roundCarat(Math.max(0, beforeCarat));
}

/** 本次补款 = 返工损耗 × 订单补石单价 */
export function calcCharge(lossCarat: number, pricePerCarat: number): number {
  return roundMoney(lossCarat * pricePerCarat);
}

/** 已确认换石单 */
export function approvedReplacements(db: Database, orderId: string): ReplacementRecord[] {
  return db.replacements.filter((r) => r.orderId === orderId && r.status === "已确认");
}

/** 待确认换石单（一单最多一张） */
export function pendingReplacement(db: Database, orderId: string): ReplacementRecord | undefined {
  return db.replacements.find((r) => r.orderId === orderId && r.status === "待确认");
}

/** 已放行累计返工损耗（克拉） */
export function approvedLoss(db: Database, orderId: string): number {
  return roundCarat(approvedReplacements(db, orderId).reduce((sum, r) => sum + r.lossCarat, 0));
}

/** 已放行补石数 */
export function approvedReplacementCount(db: Database, orderId: string): number {
  return approvedReplacements(db, orderId).length;
}

/** 已放行补款总额（元） */
export function approvedCharge(db: Database, orderId: string): number {
  return roundMoney(approvedReplacements(db, orderId).reduce((sum, r) => sum + r.charge, 0));
}

/** 剩余可用损耗额度（克拉） */
export function remainingAllowance(db: Database, order: OrderRecord): number {
  return roundCarat(Math.max(0, order.allowedLossCarat - approvedLoss(db, order.id)));
}

export interface ReplacementPreview {
  lossCarat: number;
  charge: number;
  lossBefore: number; // 登记前累计损耗
  lossAfter: number; // 本次计入后累计损耗
  withinAllowance: boolean; // 累计是否在订单允许范围内
}

/**
 * 登记换石前的预判：
 * 累计返工损耗超过订单允许克拉 → 先转负责人确认，不能直接放行
 */
export function previewReplacement(
  db: Database,
  order: OrderRecord,
  beforeCarat: number
): ReplacementPreview {
  const lossCarat = calcLoss(beforeCarat);
  const lossBefore = approvedLoss(db, order.id);
  const lossAfter = roundCarat(lossBefore + lossCarat);
  return {
    lossCarat,
    charge: calcCharge(lossCarat, order.pricePerCarat),
    lossBefore,
    lossAfter,
    withinAllowance: lossAfter <= roundCarat(order.allowedLossCarat),
  };
}

/** 有未放行的换石单 → 整单锁住，确认前不能继续镶嵌 */
export function isOrderLocked(db: Database, orderId: string): boolean {
  return pendingReplacement(db, orderId) !== undefined;
}

export type Decision = Extract<ReplacementStatus, "已确认" | "已驳回">;

/** 全台汇总（顶部指标） */
export interface DeskTotals {
  orderCount: number;
  lockedOrders: number;
  pendingCount: number;
  totalLoss: number;
  replacementCount: number;
  totalCharge: number;
}

export function deskTotals(db: Database): DeskTotals {
  const confirmed = db.replacements.filter((r) => r.status === "已确认");
  return {
    orderCount: db.orders.length,
    lockedOrders: db.orders.filter((o) => isOrderLocked(db, o.id)).length,
    pendingCount: db.replacements.filter((r) => r.status === "待确认").length,
    totalLoss: roundCarat(confirmed.reduce((s, r) => s + r.lossCarat, 0)),
    replacementCount: confirmed.length,
    totalCharge: roundMoney(confirmed.reduce((s, r) => s + r.charge, 0)),
  };
}

/** 形状与损坏原因候选 */
export const SHAPES = ["圆形", "椭圆", "梨形", "祖母绿切", "马眼形", "心形", "方形"];

export const DAMAGE_REASONS = [
  "镶口过紧压裂腰棱",
  "执模时钳口崩角",
  "锤爪用力过猛碎裂",
  "底托不平受力崩边",
  "超声波清洗崩裂",
  "原有内含物扩展",
];
