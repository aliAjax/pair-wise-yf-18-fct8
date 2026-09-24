// 界面层：订单侧栏（建档 + 订单切换）
import { useState } from "react";
import type { Database, OrderRecord } from "../archive/types";
import { fmtCarat, fmtMoney } from "../domain/format";
import { Field } from "./ui";
import type { NewOrderInput } from "../state/useDatabase";

const EMPTY = { customer: "", pieceName: "", allowedLossCarat: "0.10", pricePerCarat: "0" };

export function OrderSidebar({
  db,
  selectedId,
  lockedIds,
  onSelect,
  onAdd,
}: {
  db: Database;
  selectedId: string | null;
  lockedIds: Set<string>;
  onSelect: (id: string) => void;
  onAdd: (input: NewOrderInput) => OrderRecord;
}) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  const submit = () => {
    const allowed = parseFloat(form.allowedLossCarat);
    const price = parseFloat(form.pricePerCarat);
    if (!form.customer.trim() || !form.pieceName.trim()) {
      setError("客户和货品名称不能为空");
      return;
    }
    if (!(allowed > 0)) {
      setError("允许损耗必须大于 0");
      return;
    }
    if (!(price >= 0)) {
      setError("补石单价不能为负");
      return;
    }
    const order = onAdd({
      customer: form.customer,
      pieceName: form.pieceName,
      allowedLossCarat: allowed,
      pricePerCarat: price,
    });
    setForm(EMPTY);
    setError("");
    onSelect(order.id);
  };

  return (
    <aside className="panel sidebar">
      <div className="panel-head">
        <div>
          <p>订单建档</p>
          <h2>订单清单</h2>
        </div>
      </div>

      <div className="order-list">
        {db.orders.map((o) => {
          const locked = lockedIds.has(o.id);
          return (
            <button
              key={o.id}
              className={`order-card ${o.id === selectedId ? "active" : ""}`}
              onClick={() => onSelect(o.id)}
            >
              <span className="order-card-top">
                <b>{o.id}</b>
                {locked ? <span className="badge warn">锁定</span> : <span className="badge ok">进行中</span>}
              </span>
              <span className="order-card-name">
                {o.pieceName} · {o.customer}
              </span>
              <span className="order-card-sub">
                允许损耗 {fmtCarat(o.allowedLossCarat)} · {fmtMoney(o.pricePerCarat)}/ct
              </span>
            </button>
          );
        })}
        {db.orders.length === 0 && <p className="empty">还没有订单，先在下方建档</p>}
      </div>

      <div className="sidebar-form">
        <h3>新建订单</h3>
        <div className="form-stack">
          <Field label="客户">
            <input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="如：林小姐" />
          </Field>
          <Field label="货品名称">
            <input value={form.pieceName} onChange={(e) => setForm({ ...form, pieceName: e.target.value })} placeholder="如：18K金群镶钻戒" />
          </Field>
          <div className="form-row">
            <Field label="允许损耗" hint="克拉">
              <input
                value={form.allowedLossCarat}
                onChange={(e) => setForm({ ...form, allowedLossCarat: e.target.value })}
                inputMode="decimal"
              />
            </Field>
            <Field label="补石单价" hint="元/ct">
              <input
                value={form.pricePerCarat}
                onChange={(e) => setForm({ ...form, pricePerCarat: e.target.value })}
                inputMode="decimal"
              />
            </Field>
          </div>
          {error && <p className="error">{error}</p>}
          <button className="primary" onClick={submit}>
            登记订单
          </button>
        </div>
      </div>
    </aside>
  );
}
