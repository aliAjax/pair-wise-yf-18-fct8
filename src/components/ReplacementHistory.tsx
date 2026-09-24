// 界面层：每次换石的前后记录（不可修改的台账）
import type { ReplacementRecord } from "../archive/types";
import { fmtCarat, fmtMoney, fmtDate } from "../domain/format";
import { StatusBadge } from "./ui";

export function ReplacementHistory({ records }: { records: ReplacementRecord[] }) {
  const sorted = [...records].sort((a, b) => b.createdAt - a.createdAt);
  return (
    <div className="history">
      {sorted.map((r) => (
        <article key={r.id} className={`history-card status-${r.status}`}>
          <div className="history-head">
            <div>
              <b>{r.id}</b>
              <span className="history-time">{fmtDate(r.createdAt)}</span>
            </div>
            <StatusBadge status={r.status} />
          </div>
          <div className="history-flow">
            <div className="stone-box">
              <small>镶坏前</small>
              <b>{r.oldStoneId}</b>
              <span>{fmtCarat(r.beforeCarat)} · {r.position}</span>
            </div>
            <span className="arrow">→</span>
            <div className="stone-box">
              <small>补石后</small>
              <b>{r.newStoneId}</b>
              <span>{fmtCarat(r.afterCarat)} · {r.newShape}</span>
            </div>
            <div className="stone-box calc">
              <small>返工损耗</small>
              <b>{fmtCarat(r.lossCarat)}</b>
              <span>补款 {fmtMoney(r.charge)}</span>
            </div>
          </div>
          <p className="reason">损坏原因：{r.damageReason}</p>
          {r.decidedBy && (
            <p className="decision">
              {r.status === "已驳回" ? "驳回" : "放行"}人：{r.decidedBy}
              {r.decidedAt ? ` · ${fmtDate(r.decidedAt)}` : ""}
              {r.decisionNote ? `｜${r.decisionNote}` : ""}
            </p>
          )}
        </article>
      ))}
      {sorted.length === 0 && <p className="empty">本单暂无换石记录</p>}
    </div>
  );
}
