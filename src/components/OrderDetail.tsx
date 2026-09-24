// 界面层：订单详情（核算指标 + 建档/换石 + 台账）
import type { Database, OrderRecord } from "../archive/types";
import { fmtCarat, fmtMoney } from "../domain/format";
import type { NewReplacementInput, NewStoneInput } from "../state/useDatabase";
import { ConfirmPanel } from "./ConfirmPanel";
import { ReplacementForm } from "./ReplacementForm";
import { ReplacementHistory } from "./ReplacementHistory";
import { StoneForm } from "./StoneForm";
import { StoneTable } from "./StoneTable";

export interface OrderStats {
  locked: boolean;
  pending: Database["replacements"][number] | undefined;
  loss: number;
  replacementCount: number;
  charge: number;
  remaining: number;
}

export function OrderDetail({
  db,
  order,
  stats,
  onAddStone,
  onRegisterReplacement,
  onDecide,
}: {
  db: Database;
  order: OrderRecord;
  stats: OrderStats;
  onAddStone: (input: NewStoneInput) => void;
  onRegisterReplacement: (input: NewReplacementInput) => void;
  onDecide: (id: string, decision: "已确认" | "已驳回", manager: string, note: string) => void;
}) {
  const stones = db.stones.filter((s) => s.orderId === order.id);
  const replacements = db.replacements.filter((r) => r.orderId === order.id);
  const usedPct = Math.min(100, Math.round((stats.loss / order.allowedLossCarat) * 100));

  return (
    <section className="detail">
      <div className="panel detail-head">
        <div>
          <p>{order.id} · {order.customer}</p>
          <h2>{order.pieceName}</h2>
          <span className="sub">
            允许损耗 {fmtCarat(order.allowedLossCarat)} · 补石单价 {fmtMoney(order.pricePerCarat)}/ct
            {stats.locked && <b className="badge warn"> ⛔ 已锁定</b>}
          </span>
        </div>
        <div className="stat-grid">
          <div><small>已放行总损耗</small><b>{fmtCarat(stats.loss)}</b></div>
          <div><small>剩余额度</small><b>{fmtCarat(stats.remaining)}</b></div>
          <div><small>补石数</small><b>{stats.replacementCount} 颗</b></div>
          <div><small>补款金额</small><b>{fmtMoney(stats.charge)}</b></div>
        </div>
        <div className="allowance-bar" title={`已用 ${usedPct}%`}>
          <i style={{ width: `${usedPct}%` }} className={usedPct >= 100 ? "full" : ""} />
        </div>
      </div>

      {stats.pending && (
        <ConfirmPanel order={order} record={stats.pending} onDecide={onDecide} />
      )}

      <div className="panel">
        <div className="panel-head">
          <div>
            <p>宝石档案</p>
            <h2>本单宝石（{stones.length}）</h2>
          </div>
        </div>
        <StoneTable stones={stones} />
        <StoneForm onAdd={onAddStone} />
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <p>返工换石</p>
            <h2>换石登记与前后记录</h2>
          </div>
        </div>
        <ReplacementForm
          db={db}
          order={order}
          locked={stats.locked}
          onRegister={onRegisterReplacement}
        />
        <ReplacementHistory records={replacements} />
      </div>
    </section>
  );
}
