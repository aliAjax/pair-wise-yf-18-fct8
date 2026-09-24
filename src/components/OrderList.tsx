import { useState } from "react";
import type { Order, OrderSummary } from "../types";
import { fmtCt } from "./format";

interface Props {
  orders: Order[];
  summaries: Map<string, OrderSummary>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (input: {
    code: string;
    customer: string;
    receivedAt: string;
    allowedLossCt: number;
    unitPricePerCt: number;
  }) => void;
  onError: (message: string) => void;
}

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function OrderList({
  orders,
  summaries,
  selectedId,
  onSelect,
  onCreate,
  onError,
}: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [customer, setCustomer] = useState("");
  const [receivedAt, setReceivedAt] = useState(today());
  const [allowedLossCt, setAllowedLossCt] = useState("0.05");
  const [unitPrice, setUnitPrice] = useState("8000");

  const submit = () => {
    const allowed = parseFloat(allowedLossCt);
    const price = parseFloat(unitPrice);
    if (!code.trim()) return onError("请填写订单编号");
    if (!customer.trim()) return onError("请填写客户名称");
    if (!(allowed > 0)) return onError("允许损耗克拉必须大于 0");
    if (!(price >= 0)) return onError("补石单价不能为负");
    onCreate({
      code,
      customer,
      receivedAt,
      allowedLossCt: allowed,
      unitPricePerCt: price,
    });
    setCode("");
    setCustomer("");
    setAllowedLossCt("0.05");
    setUnitPrice("8000");
    setOpen(false);
  };

  return (
    <aside className="panel sidebar">
      <div className="heading">
        <div>
          <p>镶石损耗台账</p>
          <h2>订单</h2>
        </div>
        <button
          type="button"
          className="primary"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "收起" : "新建订单"}
        </button>
      </div>

      {open && (
        <div className="create-form">
          <label>
            <span>订单编号</span>
            <input
              value={code}
              placeholder="如 DD-20260920"
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <label>
            <span>客户</span>
            <input
              value={customer}
              placeholder="客户 / 款式"
              onChange={(e) => setCustomer(e.target.value)}
            />
          </label>
          <label>
            <span>接单日期</span>
            <input
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
            />
          </label>
          <div className="form-row">
            <label>
              <span>允许损耗(ct)</span>
              <input
                type="number"
                step="0.001"
                min="0"
                value={allowedLossCt}
                onChange={(e) => setAllowedLossCt(e.target.value)}
              />
            </label>
            <label>
              <span>补石单价(元/ct)</span>
              <input
                type="number"
                step="100"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </label>
          </div>
          <button type="button" className="primary block" onClick={submit}>
            建档
          </button>
        </div>
      )}

      <div className="order-list">
        {orders.length === 0 && (
          <p className="empty">还没有订单，点「新建订单」开始建档。</p>
        )}
        {orders.map((o) => {
          const s = summaries.get(o.id);
          const frozen = o.status === "待负责人确认";
          return (
            <button
              type="button"
              key={o.id}
              className={`order-card ${selectedId === o.id ? "active" : ""} ${
                frozen ? "frozen" : ""
              }`}
              onClick={() => onSelect(o.id)}
            >
              <div className="order-card-head">
                <b>{o.code}</b>
                <span className={`badge ${frozen ? "badge-danger" : "badge-ok"}`}>
                  {frozen ? "待确认 · 冻结" : "进行中"}
                </span>
              </div>
              <p className="order-customer">{o.customer}</p>
              <p className="order-meta">
                累计损耗 <b>{fmtCt(s?.totalLossCt ?? 0)}</b> / 允许{" "}
                {fmtCt(o.approvedThresholdCt)}
                {s?.overLimit ? (
                  <span className="over"> · 超 {fmtCt(s.excessCt)}</span>
                ) : null}
              </p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
