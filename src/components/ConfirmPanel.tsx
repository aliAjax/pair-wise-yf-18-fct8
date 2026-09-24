// 界面层：超阈返工损耗的负责人确认台
import { useState } from "react";
import type { OrderRecord, ReplacementRecord } from "../archive/types";
import { fmtCarat, fmtMoney, fmtDate } from "../domain/format";

export function ConfirmPanel({
  order,
  record,
  onDecide,
}: {
  order: OrderRecord;
  record: ReplacementRecord;
  onDecide: (id: string, decision: "已确认" | "已驳回", manager: string, note: string) => void;
}) {
  const [manager, setManager] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const over = record.lossCarat;
  const act = (decision: "已确认" | "已驳回") => {
    if (!manager.trim()) {
      setError("请填写负责人姓名后再判定");
      return;
    }
    try {
      onDecide(record.id, decision, manager, note);
      setManager("");
      setNote("");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "判定失败");
    }
  };

  return (
    <section className="panel lock-panel">
      <div className="lock-head">
        <div>
          <p className="lock-tag">⛔ 超出订单允许损耗 · 待负责人确认</p>
          <h2>{record.id}</h2>
          <p className="lock-desc">
            本单返工损耗 {fmtCarat(order.allowedLossCarat)} 为上限，本次登记 {fmtCarat(over)}，
            已超阈。确认前整单镶嵌工作暂停；放行后总损耗、补石数、补款金额一并入账。
          </p>
        </div>
      </div>

      <div className="lock-grid">
        <div><small>镶坏石（前）</small><b>{record.oldStoneId}</b></div>
        <div><small>补石（后）</small><b>{record.newStoneId} · {record.newShape}</b></div>
        <div><small>镶嵌位置</small><b>{record.position}</b></div>
        <div><small>损坏原因</small><b>{record.damageReason}</b></div>
        <div><small>前/后克拉</small><b>{fmtCarat(record.beforeCarat)} → {fmtCarat(record.afterCarat)}</b></div>
        <div><small>本次损耗 / 补款</small><b className="danger">{fmtCarat(record.lossCarat)} · {fmtMoney(record.charge)}</b></div>
        <div className="span2"><small>登记时间</small><b>{fmtDate(record.createdAt)}</b></div>
      </div>

      <div className="confirm-form">
        <label className="field">
          <span>负责人姓名</span>
          <input value={manager} onChange={(e) => setManager(e.target.value)} placeholder="如：赵师傅" />
        </label>
        <label className="field">
          <span>确认意见<em>选填</em></span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="如：客户已同意补石，放行" />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="confirm-actions">
        <button className="danger" onClick={() => act("已驳回")}>驳回换石</button>
        <button className="primary" onClick={() => act("已确认")}>负责人放行</button>
      </div>
    </section>
  );
}
