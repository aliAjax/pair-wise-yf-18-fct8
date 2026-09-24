// 建档层：浏览器本地档案（localStorage）读写。
// 只负责存取，不含任何业务判断；判断一律走 src/domain。

import type { Order } from "../types";
import { roundCt } from "../domain/loss";

const STORAGE_KEY = "setting-loss-ledger:orders:v1";

/** 读取全部订单档案；档案损坏时回退为空，避免整站白屏 */
export function readArchive(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Order[];
  } catch {
    return [];
  }
}

/** 全量写回 */
export function writeArchive(orders: Order[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export function clearArchive(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** 首次打开时的示范档案，方便直接看到超限冻结与放行台账 */
export function buildSeedOrders(): Order[] {
  const now = new Date();
  const iso = (daysAgo: number, hour = 10) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  // 订单一：累计损耗已超限，处于冻结，等负责人确认
  const frozen: Order = {
    id: "order_seed_1",
    code: "DD-20260912",
    customer: "澜庭珠宝（主石定制）",
    receivedAt: "2026-09-12",
    allowedLossCt: 0.05,
    unitPricePerCt: 8000,
    approvedThresholdCt: 0.05,
    status: "待负责人确认",
    createdAt: iso(12),
    stones: [
      {
        id: "stone_seed_1",
        code: "ST-2048",
        shape: "椭圆 6×4mm",
        originalCt: 0.8,
        currentCt: 0.12,
        position: "主石位",
        status: "损坏",
        damageReason: "镶口过紧导致崩边，残石已收回",
        createdAt: iso(11),
      },
    ],
    events: [
      {
        id: "evt_seed_1",
        at: iso(2, 15),
        fromStoneId: "stone_seed_1",
        fromStoneCode: "ST-2048",
        position: "主石位",
        beforeCt: 0.8,
        remainCt: 0.12,
        replacementCt: 0,
        lossCt: roundCt(0.8 - 0.12),
        reason: "镶口过紧导致崩边，残石已收回",
        operator: "陈师傅",
        cumulativeLossAfter: roundCt(0.8 - 0.12),
      },
    ],
    approvals: [],
  };

  // 订单二：进行中，两次换石均有前后记录，累计损耗在允许范围内
  const active: Order = {
    id: "order_seed_2",
    code: "DD-20260918",
    customer: "周韵（围石戒指）",
    receivedAt: "2026-09-18",
    allowedLossCt: 0.1,
    unitPricePerCt: 15000,
    approvedThresholdCt: 0.1,
    status: "进行中",
    createdAt: iso(6),
    stones: [
      {
        id: "stone_seed_2",
        code: "ST-3099",
        shape: "圆形 2.7mm",
        originalCt: 0.08,
        currentCt: 0,
        position: "围石",
        status: "已换石",
        damageReason: "压爪时受力点错误，整石碎裂",
        createdAt: iso(5),
      },
      {
        id: "stone_seed_3",
        code: "ST-3102",
        shape: "圆形 2.7mm",
        originalCt: 0.08,
        currentCt: 0.08,
        position: "围石",
        status: "在镶",
        createdAt: iso(5),
      },
      {
        id: "stone_seed_4",
        code: "ST-3088",
        shape: "圆形 3.0mm",
        originalCt: 0.1,
        currentCt: 0.07,
        position: "肩石",
        status: "已换石",
        damageReason: "边部缺口，磨小后改作配石",
        createdAt: iso(3),
      },
      {
        id: "stone_seed_5",
        code: "ST-3103",
        shape: "圆形 2.0mm",
        originalCt: 0.025,
        currentCt: 0.025,
        position: "肩石",
        status: "在镶",
        createdAt: iso(3),
      },
    ],
    events: [
      {
        id: "evt_seed_2",
        at: iso(5, 14),
        fromStoneId: "stone_seed_2",
        fromStoneCode: "ST-3099",
        toStoneId: "stone_seed_3",
        toStoneCode: "ST-3102",
        position: "围石",
        beforeCt: 0.08,
        remainCt: 0,
        replacementCt: 0.08,
        lossCt: 0,
        reason: "压爪时受力点错误，整石碎裂",
        operator: "李师傅",
        cumulativeLossAfter: 0,
      },
      {
        id: "evt_seed_3",
        at: iso(3, 16),
        fromStoneId: "stone_seed_4",
        fromStoneCode: "ST-3088",
        toStoneId: "stone_seed_5",
        toStoneCode: "ST-3103",
        position: "肩石",
        beforeCt: 0.1,
        remainCt: 0.07,
        replacementCt: 0.025,
        lossCt: 0.005,
        reason: "边部缺口，磨小后改作配石",
        note: "残石 0.07ct 入碎料袋",
        operator: "李师傅",
        cumulativeLossAfter: 0.005,
      },
    ],
    approvals: [],
  };

  return [frozen, active];
}

/** 首次建档：没有档案时写入示范数据 */
export function ensureSeeded(): Order[] {
  const existing = readArchive();
  if (existing.length > 0) return existing;
  const seed = buildSeedOrders();
  writeArchive(seed);
  return seed;
}
