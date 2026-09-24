import { useState } from "react";
import type { Order, OrderSummary } from "../types";
import { fmtCt, fmtMoney } from "./format";

interface Props {
  order: Order;
  summary: OrderSummary;
  onApprove: (input: {
    approver: string;
    newAllowedCt: number;
    comment?: string;
  }) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

/**
 * 超限闸门横幅：返工累计损耗超过允许克拉后出现。
 * 负责人确认放行前，界面其它操作（登记宝石 / 继续镶嵌）一律禁用。
 */
export function ApprovalBanner({
  order,
  summary,
  onApprove,
  onError,
  onSuccess,
}: Props) {
  const [approver, setApprover] = useState("");
  const [newAllowed, setNewAllowed] = useState(
    (Math.ceil(summary.totalLossCt * 100) / 100 + 0.02).toFixed(3)
  );
  const [comment, setComment] = useState("");

  if (!summary.overLimit) return null;

  const submit = () => {
    const value = parseFloat(newAllowed);
    if (!approver.trim()) return onError("请填写负责人姓名");
    if (!(value >= summary.totalLossCt)) {
      return onError("放行阈值不能低于当前累计损耗");
    }
    onApprove({ approver, newAllowedCt: value, comment });
    setApprover("");
    setComment("");
    onSuccess("负责人已放行，可继续镶嵌");
  };

  return (
    <section className="panel freeze-banner">
      <div className="freeze-title">
        <h2>⛔ 损耗超限，暂停镶嵌</h2>
        <p>
          订单 <b>{order.code}</b> 累计返工损耗 {fmtCt(summary.totalLossCt)}，
          超出允许值 {fmtCt(order.approvedThresholdCt)}（超 {fmtCt(summary.excessCt)}
          ）。请转负责人确认，确认前不能继续镶嵌。
        </p>
      </div>

      <div className="freeze-settlement">
        <div>
          <small>放行后总损耗</small>
          <strong>{fmtCt(summary.totalLossCt)}</strong>
        </div>
        <div>
          <small>补石数</small>
          <strong>{summary.replacementCount} 颗</strong>
        </div>
        <div>
          <small>补款金额（{order.unitPricePerCt.toLocaleString()} 元/ct）</small>
          <strong>{fmtMoney(summary.rechargeAmount)}</strong>
        </div>
      </div>

      <div className="freeze-form">
        <label>
          <span>负责人</span>
          <input
            value={approver}
            placeholder="确认人姓名"
            onChange={(e) => setApprover(e.target.value)}
          />
        </label>
        <label>
          <span>放行后允许累计损耗(ct)</span>
          <input
            type="number"
            step="0.001"
            min={summary.totalLossCt}
            value={newAllowed}
            onChange={(e) => setNewAllowed(e.target.value)}
          />
        </label>
        <label className="wide">
          <span>确认意见</span>
          <input
            value={comment}
            placeholder="如：客户已书面同意补款，放行"
            onChange={(e) => setComment(e.target.value)}
          />
        </label>
        <button type="button" className="danger block" onClick={submit}>
          负责人确认放行
        </button>
      </div>
    </section>
  );
}
