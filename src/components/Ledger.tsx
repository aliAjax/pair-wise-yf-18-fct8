import type { Order, OrderSummary } from "../types";
import { formatDateTime } from "../domain/loss";
import { fmtCt, fmtMoney } from "./format";

/** 放行后（或实时）台账：总损耗、补石数、补款金额一起更新 */
export function Ledger({
  order,
  summary,
}: {
  order: Order;
  summary: OrderSummary;
}) {
  return (
    <div className="ledger">
      <div className="metrics metrics-inner">
        <article>
          <small>总损耗（累计）</small>
          <strong>{summary.totalLossCt.toFixed(3)}</strong>
          <em>ct / 允许 {order.approvedThresholdCt.toFixed(3)}</em>
        </article>
        <article>
          <small>补石数</small>
          <strong>{summary.replacementCount}</strong>
          <em>颗 · 共 {summary.replacementCt.toFixed(3)} ct</em>
        </article>
        <article>
          <small>补款金额</small>
          <strong className="money">{fmtMoney(summary.rechargeAmount)}</strong>
          <em>{order.unitPricePerCt.toLocaleString()} 元/ct</em>
        </article>
        <article>
          <small>损坏返工次数</small>
          <strong>{summary.damagedCount}</strong>
          <em>在镶 {summary.mountedCount} 颗</em>
        </article>
      </div>

      <div className="panel inner">
        <h3>换石前后记录</h3>
        {order.events.length === 0 && (
          <p className="empty">尚无返工记录。</p>
        )}
        <ol className="timeline">
          {order.events.map((e, i) => (
            <li key={e.id} className="timeline-item">
              <div className="timeline-dot">{i + 1}</div>
              <div className="timeline-body">
                <div className="timeline-head">
                  <b>
                    {e.fromStoneCode}
                    {e.toStoneCode ? ` → ${e.toStoneCode}` : "（未补石）"}
                  </b>
                  <span className="timeline-at">{formatDateTime(e.at)}</span>
                </div>
                <p className="timeline-pos">
                  {e.position} · 经办人 {e.operator}
                </p>
                <div className="weight-flow">
                  <span>
                    前 <b>{fmtCt(e.beforeCt)}</b>
                  </span>
                  <span className="arrow">→</span>
                  <span>
                    残重 <b>{fmtCt(e.remainCt)}</b>
                  </span>
                  <span className="plus">+</span>
                  <span>
                    补入 <b>{fmtCt(e.replacementCt)}</b>
                  </span>
                  <span className={`loss-tag ${e.lossCt > 0 ? "hot" : "zero"}`}>
                    本次损耗 {fmtCt(e.lossCt)}
                  </span>
                </div>
                <p className="timeline-reason">原因：{e.reason}</p>
                {e.note && <p className="timeline-note">备注：{e.note}</p>}
                <p className="timeline-snapshot">
                  记录后累计损耗 {fmtCt(e.cumulativeLossAfter)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="panel inner">
        <h3>负责人确认记录</h3>
        {order.approvals.length === 0 ? (
          <p className="empty">尚无放行记录（建单允许损耗 {fmtCt(order.allowedLossCt)}）。</p>
        ) : (
          <ol className="timeline">
            {order.approvals.map((a, i) => (
              <li key={a.id} className="timeline-item approval-item">
                <div className="timeline-dot approve">{i + 1}</div>
                <div className="timeline-body">
                  <div className="timeline-head">
                    <b>✓ {a.approver} 确认放行</b>
                    <span className="timeline-at">{formatDateTime(a.at)}</span>
                  </div>
                  <p>
                    确认时累计损耗 {fmtCt(a.lossAtApproval)} · 已补石{" "}
                    {a.replacementsAtApproval} 颗 · 放行阈值调整为{" "}
                    {fmtCt(a.newAllowedCt)}
                  </p>
                  {a.comment && <p className="timeline-note">意见：{a.comment}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
