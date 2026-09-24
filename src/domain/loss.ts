// 判断层：损耗核算、超限判定、审批闸门
// 全部为纯函数，不碰 localStorage、不碰 React，便于单独维护与测试。

import type {
  Approval,
  Order,
  OrderSummary,
  ReplaceEvent,
} from "../types";

/** 浮点安全比较（克拉保留三位小数即可消除 0.1+0.2 类误差） */
export function roundCt(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * 单次换石损耗 = 原克拉 − 残重 − 补入新石克拉。
 * 整石报废（残重 0）且未补石时，损耗即原克拉。
 * 新石重于残重等情况下下限为 0，不允许负损耗。
 */
export function calcEventLoss(input: {
  beforeCt: number;
  remainCt: number;
  replacementCt: number;
}): number {
  const loss = input.beforeCt - input.remainCt - input.replacementCt;
  return roundCt(Math.max(0, loss));
}

/** 从事件流推导订单汇总。台账只信事件，不信任散落的字段。 */
export function summarize(order: Order): OrderSummary {
  const totalLossCt = roundCt(
    order.events.reduce((sum, e) => sum + e.lossCt, 0)
  );
  const replacementCount = order.events.filter((e) => e.replacementCt > 0).length;
  const replacementCt = roundCt(
    order.events.reduce((sum, e) => sum + e.replacementCt, 0)
  );
  const damagedCount = order.events.length;
  const rechargeAmount = roundMoney(totalLossCt * order.unitPricePerCt);
  const excessCt = roundCt(
    Math.max(0, totalLossCt - order.approvedThresholdCt)
  );
  const overLimit = totalLossCt > order.approvedThresholdCt;
  const mountedCount = order.stones.filter((s) => s.status !== "损坏").length;

  return {
    totalLossCt,
    replacementCount,
    replacementCt,
    damagedCount,
    rechargeAmount,
    overLimit,
    excessCt,
    mountedCount,
  };
}

/**
 * 闸门：返工累计损耗是否超过订单允许（放行）克拉。
 * 超过则必须先转负责人确认，确认前不能继续镶嵌。
 */
export function isFrozen(order: Order): boolean {
  return summarize(order).overLimit;
}

/** 是否允许继续镶嵌（登记新石 / 提交换石） */
export function canContinueSetting(order: Order): boolean {
  return !isFrozen(order);
}

export interface NewEventInput {
  fromStoneId: string;
  remainCt: number;
  replacementCt: number;
  reason: string;
  note?: string;
  operator: string;
  toStoneId?: string;
  toStoneCode?: string;
}

/**
 * 校验并构造一条换石事件（不落库）。
 * 抛出错误信息供界面直接展示。
 */
export function buildReplaceEvent(
  order: Order,
  input: NewEventInput
): ReplaceEvent {
  const stone = order.stones.find((s) => s.id === input.fromStoneId);
  if (!stone) {
    throw new Error("找不到被换下的宝石档案");
  }
  if (stone.status !== "在镶") {
    throw new Error("该宝石已损坏或已换石，不能重复登记返工");
  }
  if (input.remainCt < 0 || input.remainCt > stone.originalCt) {
    throw new Error("残重必须在 0 与原克拉之间");
  }
  if (input.replacementCt < 0) {
    throw new Error("补入新石克拉不能为负");
  }
  if (!input.reason.trim()) {
    throw new Error("必须填写损坏原因");
  }
  if (!input.operator.trim()) {
    throw new Error("必须登记经办人");
  }

  const beforeCt = stone.originalCt;
  const lossCt = calcEventLoss({
    beforeCt,
    remainCt: input.remainCt,
    replacementCt: input.replacementCt,
  });
  const priorLoss = summarize(order).totalLossCt;

  return {
    id: cryptoRandomId("evt"),
    at: new Date().toISOString(),
    fromStoneId: stone.id,
    fromStoneCode: stone.code,
    toStoneId: input.toStoneId,
    toStoneCode: input.toStoneCode,
    position: stone.position,
    beforeCt,
    remainCt: roundCt(input.remainCt),
    replacementCt: roundCt(input.replacementCt),
    lossCt,
    reason: input.reason.trim(),
    note: input.note?.trim() || undefined,
    operator: input.operator.trim(),
    cumulativeLossAfter: roundCt(priorLoss + lossCt),
  };
}

export interface ApprovalInput {
  approver: string;
  newAllowedCt: number;
  comment?: string;
}

/**
 * 负责人放行：只有超限订单需要确认。
 * 放行后阈值更新，订单解冻；损耗、补石数、补款由 summarize 实时重算。
 */
export function buildApproval(
  order: Order,
  input: ApprovalInput
): Approval {
  const summary = summarize(order);
  if (!summary.overLimit) {
    throw new Error("损耗未超限，无需负责人确认");
  }
  if (!input.approver.trim()) {
    throw new Error("必须填写负责人姓名");
  }
  if (!(input.newAllowedCt >= summary.totalLossCt)) {
    throw new Error("放行阈值不能低于当前累计损耗");
  }
  return {
    id: cryptoRandomId("apr"),
    at: new Date().toISOString(),
    approver: input.approver.trim(),
    lossAtApproval: summary.totalLossCt,
    replacementsAtApproval: summary.replacementCount,
    newAllowedCt: roundCt(input.newAllowedCt),
    comment: input.comment?.trim() || undefined,
  };
}

/** 事件时间格式化 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** 简单的本地 ID（不引依赖） */
export function cryptoRandomId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}
