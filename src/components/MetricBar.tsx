// 界面层：顶部总览指标
import type { DeskTotals } from "../domain/loss";
import { fmtCarat, fmtMoney } from "../domain/format";

export function MetricBar({ totals }: { totals: DeskTotals }) {
  const items: { label: string; value: string; tone?: string }[] = [
    { label: "在档订单", value: String(totals.orderCount) },
    { label: "待确认换石", value: String(totals.pendingCount), tone: totals.pendingCount ? "warn" : "" },
    { label: "锁定订单", value: String(totals.lockedOrders), tone: totals.lockedOrders ? "warn" : "" },
    { label: "已放行总损耗", value: fmtCarat(totals.totalLoss) },
    { label: "累计补石数", value: `${totals.replacementCount} 颗` },
    { label: "累计补款金额", value: fmtMoney(totals.totalCharge), tone: "money" },
  ];
  return (
    <section className="metrics">
      {items.map((m) => (
        <article key={m.label} className={m.tone ?? ""}>
          <small>{m.label}</small>
          <strong>{m.value}</strong>
        </article>
      ))}
    </section>
  );
}
