import { useState } from "react";
import type { MountPosition, Order, OrderSummary } from "../types";
import { ApprovalBanner } from "./ApprovalBanner";
import { Ledger } from "./Ledger";
import { StonesPanel, type RegisterReplacePayload } from "./StonesPanel";
import { fmtCt, fmtMoney } from "./format";

interface Props {
  order: Order;
  summary: OrderSummary;
  onAddStone: (input: {
    code: string;
    shape: string;
    originalCt: number;
    position: MountPosition;
  }) => void;
  onRegisterReplace: (input: RegisterReplacePayload) => void;
  onApprove: (input: {
    approver: string;
    newAllowedCt: number;
    comment?: string;
  }) => void;
  onDelete: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

type View = "work" | "ledger";

export function OrderDetail({
  order,
  summary,
  onAddStone,
  onRegisterReplace,
  onApprove,
  onDelete,
  onError,
  onSuccess,
}: Props) {
  const [view, setView] = useState<View>("work");
  const frozen = summary.overLimit;

  return (
    <section className="detail">
      <header className="panel detail-head">
        <div>
          <p className="detail-code">
            {order.code} · 接单 {order.receivedAt}
          </p>
          <h1>{order.customer}</h1>
          <p className="detail-rule">
            允许返工损耗 {fmtCt(order.allowedLossCt)}
            {order.approvedThresholdCt !== order.allowedLossCt && (
              <>，负责人放行后阈值 {fmtCt(order.approvedThresholdCt)}</>
            )}{" "}
            · 补石 {order.unitPricePerCt.toLocaleString()} 元/ct
          </p>
        </div>
        <div className="detail-head-right">
          <div className={`head-status ${frozen ? "danger" : "ok"}`}>
            {frozen ? "⛔ 待负责人确认" : "● 镶嵌中"}
          </div>
          <button
            type="button"
            className="link-danger"
            onClick={() => {
              if (
                window.confirm(
                  `确定删除订单 ${order.code}？其全部宝石与换石记录将从本地档案移除。`
                )
              ) {
                onDelete();
              }
            }}
          >
            删除订单
          </button>
        </div>
      </header>

      {frozen && (
        <ApprovalBanner
          order={order}
          summary={summary}
          onApprove={onApprove}
          onError={onError}
          onSuccess={onSuccess}
        />
      )}

      <div className="quick-totals">
        <div>
          <small>当前累计损耗</small>
          <b className={frozen ? "text-danger" : ""}>
            {fmtCt(summary.totalLossCt)}
          </b>
        </div>
        <div>
          <small>补石数</small>
          <b>{summary.replacementCount} 颗</b>
        </div>
        <div>
          <small>补款金额</small>
          <b>{fmtMoney(summary.rechargeAmount)}</b>
        </div>
      </div>

      <nav className="view-switch">
        <button
          type="button"
          className={view === "work" ? "active" : ""}
          onClick={() => setView("work")}
        >
          镶嵌作业
        </button>
        <button
          type="button"
          className={view === "ledger" ? "active" : ""}
          onClick={() => setView("ledger")}
        >
          损耗台账与放行记录
        </button>
      </nav>

      {view === "work" ? (
        <div className="panel">
          <StonesPanel
            order={order}
            frozen={frozen}
            onAddStone={onAddStone}
            onRegisterReplace={onRegisterReplace}
            onError={onError}
            onSuccess={onSuccess}
          />
        </div>
      ) : (
        <Ledger order={order} summary={summary} />
      )}
    </section>
  );
}
