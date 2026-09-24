// 状态层：把本地档案（archive）与损耗判断（domain）串起来供界面使用

import { useCallback, useMemo, useState } from "react";
import type { Database, OrderRecord, ReplacementRecord, StoneRecord } from "../archive/types";
import { createId, nextOrderId, nextReplacementId } from "../archive/ids";
import { exportDatabase, loadDatabase, resetDatabase, saveDatabase } from "../archive/storage";
import {
  approvedCharge,
  approvedLoss,
  approvedReplacementCount,
  calcCharge,
  calcLoss,
  deskTotals,
  isOrderLocked,
  pendingReplacement,
  previewReplacement,
  remainingAllowance,
  type Decision,
} from "../domain/loss";

export interface NewOrderInput {
  customer: string;
  pieceName: string;
  allowedLossCarat: number;
  pricePerCarat: number;
}

export interface NewStoneInput {
  shape: string;
  originalCarat: number;
  currentCarat: number;
  position: string;
}

export interface NewReplacementInput {
  oldStone: StoneRecord;
  newStoneId: string;
  newShape: string;
  afterCarat: number;
  damageReason: string;
}

function commit(db: Database): Database {
  saveDatabase(db);
  return { ...db };
}

export function useDatabase() {
  const [db, setDb] = useState<Database>(() => loadDatabase());

  const addOrder = useCallback((input: NewOrderInput): OrderRecord => {
    const order: OrderRecord = {
      id: nextOrderId(db.orders),
      customer: input.customer.trim(),
      pieceName: input.pieceName.trim(),
      allowedLossCarat: input.allowedLossCarat,
      pricePerCarat: input.pricePerCarat,
      createdAt: Date.now(),
    };
    setDb((prev) => commit({ ...prev, orders: [...prev.orders, order] }));
    return order;
  }, [db.orders]);

  const addStone = useCallback(
    (orderId: string, input: NewStoneInput): void => {
      if (input.originalCarat <= 0 || input.currentCarat <= 0) {
        throw new Error("克拉数必须大于 0");
      }
      if (input.currentCarat > input.originalCarat) {
        throw new Error("当前克拉不能大于原克拉");
      }
      const stone: StoneRecord = {
        id: createId("ST"),
        orderId,
        shape: input.shape.trim(),
        originalCarat: input.originalCarat,
        currentCarat: input.currentCarat,
        position: input.position.trim(),
        status: "在镶",
        createdAt: Date.now(),
      };
      setDb((prev) => commit({ ...prev, stones: [...prev.stones, stone] }));
    },
    []
  );

  /**
   * 登记换石：
   * - 累计损耗不超订单允许 → 直接已确认，总损耗/补石数/补款随之更新
   * - 超过 → 待确认并锁住整单，负责人放行前不能继续镶嵌
   */
  const registerReplacement = useCallback(
    (order: OrderRecord, input: NewReplacementInput): ReplacementRecord => {
      if (isOrderLocked(db, order.id)) {
        throw new Error("该订单有待确认的返工损耗，负责人确认前不能继续镶嵌");
      }
      if (input.oldStone.status !== "在镶") {
        throw new Error("只能对在镶状态的石头登记换石");
      }
      if (db.stones.some((s) => s.id === input.newStoneId.trim())) {
        throw new Error("补石编号与已有宝石重复");
      }
      if (input.afterCarat <= 0) {
        throw new Error("补石克拉必须大于 0");
      }

      const preview = previewReplacement(db, order, input.oldStone.currentCarat);
      const status: ReplacementRecord["status"] = preview.withinAllowance
        ? "已确认"
        : "待确认";

      const record: ReplacementRecord = {
        id: nextReplacementId(db.replacements),
        orderId: order.id,
        oldStoneId: input.oldStone.id,
        newStoneId: input.newStoneId.trim(),
        newShape: input.newShape.trim(),
        position: input.oldStone.position,
        beforeCarat: input.oldStone.currentCarat,
        afterCarat: input.afterCarat,
        lossCarat: preview.lossCarat,
        charge: preview.charge,
        damageReason: input.damageReason.trim(),
        status,
        createdAt: Date.now(),
        ...(status === "已确认"
          ? {
              decidedAt: Date.now(),
              decisionNote: "累计损耗在订单允许范围内，自动放行",
            }
          : {}),
      };

      const newStone: StoneRecord = {
        id: input.newStoneId.trim(),
        orderId: order.id,
        shape: input.newShape.trim(),
        originalCarat: input.afterCarat,
        currentCarat: input.afterCarat,
        position: input.oldStone.position,
        status: "在镶",
        createdAt: Date.now(),
      };

      setDb((prev) =>
        commit({
          ...prev,
          replacements: [...prev.replacements, record],
          stones: [
            ...prev.stones.map((s) =>
              s.id === input.oldStone.id ? { ...s, status: "镶坏" as const } : s
            ),
            newStone,
          ],
        })
      );
      return record;
    },
    [db]
  );

  /** 负责人判定：放行则总损耗/补石数/补款随确认动作一起更新；驳回则解锁 */
  const decideReplacement = useCallback(
    (recordId: string, decision: Decision, manager: string, note: string): void => {
      const record = db.replacements.find((r) => r.id === recordId);
      if (!record || record.status !== "待确认") return;
      const name = manager.trim();
      if (!name) throw new Error("请填写负责人姓名");

      setDb((prev) => {
        const target = prev.replacements.find((r) => r.id === recordId)!;
        const order = prev.orders.find((o) => o.id === target.orderId);
        if (decision === "已确认") {
          target.lossCarat = calcLoss(target.beforeCarat);
          target.charge = order
            ? calcCharge(target.lossCarat, order.pricePerCarat)
            : target.charge;
        }
        const updated: ReplacementRecord = {
          ...target,
          status: decision,
          decidedBy: name,
          decidedAt: Date.now(),
          decisionNote: note.trim() || (decision === "已确认" ? "负责人确认放行" : "负责人驳回"),
        };
        return commit({
          ...prev,
          replacements: prev.replacements.map((r) => (r.id === recordId ? updated : r)),
        });
      });
    },
    [db]
  );

  const reset = useCallback((): void => setDb(resetDatabase()), []);
  const download = useCallback((): void => exportDatabase(db), [db]);

  const totals = useMemo(() => deskTotals(db), [db]);

  /** 单订单核算结果（全部由换石记录派生，放行时自动一起更新） */
  const orderStats = useCallback(
    (orderId: string) => ({
      locked: isOrderLocked(db, orderId),
      pending: pendingReplacement(db, orderId),
      loss: approvedLoss(db, orderId),
      replacementCount: approvedReplacementCount(db, orderId),
      charge: approvedCharge(db, orderId),
      remaining: remainingAllowance(
        db,
        db.orders.find((o) => o.id === orderId) ?? {
          id: orderId,
          customer: "",
          pieceName: "",
          allowedLossCarat: 0,
          pricePerCarat: 0,
          createdAt: 0,
        }
      ),
    }),
    [db]
  );

  return {
    db,
    totals,
    orderStats,
    addOrder,
    addStone,
    registerReplacement,
    decideReplacement,
    reset,
    download,
  };
}
