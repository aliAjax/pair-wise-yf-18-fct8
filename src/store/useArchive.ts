// 建档层与界面层之间的适配：订阅本地档案、组合 domain 动作。
// 业务规则不写在这里，全部委托 src/domain/loss.ts。

import { useCallback, useEffect, useState } from "react";
import type { MountPosition, Order, StoneRecord } from "../types";
import {
  buildApproval,
  buildReplaceEvent,
  cryptoRandomId,
  isFrozen,
  roundCt,
  type ApprovalInput,
  type NewEventInput,
} from "../domain/loss";
import { ensureSeeded, readArchive, writeArchive } from "./archive";

export interface NewOrderInput {
  code: string;
  customer: string;
  receivedAt: string;
  allowedLossCt: number;
  unitPricePerCt: number;
}

export interface NewStoneInput {
  code: string;
  shape: string;
  originalCt: number;
  position: MountPosition;
  damageReason?: string;
}

export function useArchive() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);

  // 首次挂载建档（localStorage 无数据时写入示范档案）
  useEffect(() => {
    setOrders(ensureSeeded());
    setReady(true);
  }, []);

  const commit = useCallback((next: Order[]) => {
    writeArchive(next);
    setOrders(next);
  }, []);

  const createOrder = useCallback(
    (input: NewOrderInput): Order => {
      const all = readArchive();
      if (all.some((o) => o.code.trim() === input.code.trim())) {
        throw new Error("订单编号已存在");
      }
      const order: Order = {
        id: cryptoRandomId("order"),
        code: input.code.trim(),
        customer: input.customer.trim(),
        receivedAt: input.receivedAt,
        allowedLossCt: roundCt(input.allowedLossCt),
        unitPricePerCt: input.unitPricePerCt,
        approvedThresholdCt: roundCt(input.allowedLossCt),
        status: "进行中",
        stones: [],
        events: [],
        approvals: [],
        createdAt: new Date().toISOString(),
      };
      commit([order, ...all]);
      return order;
    },
    [commit]
  );

  /** 登记一颗新宝石（建账时即有原克拉、当前克拉） */
  const addStone = useCallback(
    (orderId: string, input: NewStoneInput) => {
      const all = readArchive();
      const order = all.find((o) => o.id === orderId);
      if (!order) throw new Error("订单不存在");
      if (isFrozen(order)) {
        throw new Error("订单损耗超限，待负责人确认前不能继续镶嵌");
      }
      if (order.stones.some((s) => s.code.trim() === input.code.trim())) {
        throw new Error("该宝石编号已登记在此订单");
      }
      if (!(input.originalCt > 0)) throw new Error("原克拉必须大于 0");

      const stone: StoneRecord = {
        id: cryptoRandomId("stone"),
        code: input.code.trim(),
        shape: input.shape.trim(),
        originalCt: roundCt(input.originalCt),
        currentCt: roundCt(input.originalCt),
        position: input.position,
        status: "在镶",
        createdAt: new Date().toISOString(),
      };
      commit(
        all.map((o) =>
          o.id === orderId ? { ...o, stones: [...o.stones, stone] } : o
        )
      );
    },
    [commit]
  );

  /**
   * 登记换石（损坏返工）：保留前后重量，写入事件。
   * 若同时补入新石，新石自动建档并挂在同一镶嵌位置。
   * 放行闸门由 domain 判断：超限后订单冻结。
   */
  const registerReplace = useCallback(
    (
      orderId: string,
      input: NewEventInput & {
        newStone?: { code: string; shape: string };
      }
    ) => {
      const all = readArchive();
      const order = all.find((o) => o.id === orderId);
      if (!order) throw new Error("订单不存在");
      if (isFrozen(order)) {
        throw new Error("订单损耗超限，待负责人确认前不能继续镶嵌");
      }

      // 先把补入新石建成档案（有新石编号且新石克拉 > 0 时）
      let newStone: StoneRecord | undefined;
      if (input.newStone?.code.trim() && input.replacementCt > 0) {
        if (
          order.stones.some(
            (s) => s.code.trim() === input.newStone!.code.trim()
          )
        ) {
          throw new Error("补入新石的编号已存在");
        }
        const damaged = order.stones.find((s) => s.id === input.fromStoneId);
        newStone = {
          id: cryptoRandomId("stone"),
          code: input.newStone.code.trim(),
          shape: input.newStone.shape.trim() || damaged?.shape || "未注明",
          originalCt: roundCt(input.replacementCt),
          currentCt: roundCt(input.replacementCt),
          position: damaged?.position ?? "其他",
          status: "在镶",
          createdAt: new Date().toISOString(),
        };
      }

      const event = buildReplaceEvent(order, {
        ...input,
        toStoneId: newStone?.id ?? input.toStoneId,
        toStoneCode: newStone?.code ?? input.toStoneCode,
      });

      let updated: Order = {
        ...order,
        stones: [
          ...order.stones.map((s) =>
            s.id === input.fromStoneId
              ? {
                  ...s,
                  status: "已换石" as const,
                  currentCt: roundCt(input.remainCt),
                  damageReason: event.reason,
                }
              : s
          ),
          ...(newStone ? [newStone] : []),
        ],
        events: [...order.events, event],
      };

      // 放行闸门：本次登记后超限即冻结
      if (isFrozen(updated)) {
        updated = { ...updated, status: "待负责人确认" };
      }

      commit(all.map((o) => (o.id === orderId ? updated : o)));
    },
    [commit]
  );

  /** 负责人确认放行：更新允许阈值，订单解冻；汇总随之自动重算 */
  const approve = useCallback(
    (orderId: string, input: ApprovalInput) => {
      const all = readArchive();
      const order = all.find((o) => o.id === orderId);
      if (!order) throw new Error("订单不存在");

      const approval = buildApproval(order, input);
      const updated: Order = {
        ...order,
        status: "进行中",
        approvedThresholdCt: approval.newAllowedCt,
        approvals: [...order.approvals, approval],
      };
      commit(all.map((o) => (o.id === orderId ? updated : o)));
    },
    [commit]
  );

  const removeOrder = useCallback(
    (orderId: string) => {
      commit(readArchive().filter((o) => o.id !== orderId));
    },
    [commit]
  );

  return {
    orders,
    ready,
    createOrder,
    addStone,
    registerReplace,
    approve,
    removeOrder,
    reload: useCallback(() => setOrders(readArchive()), []),
  };
}
