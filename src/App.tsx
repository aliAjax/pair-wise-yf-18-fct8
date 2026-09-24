// 界面层：镶石损耗核算台入口
import { useMemo, useState } from "react";
import { useDatabase } from "./state/useDatabase";
import { MetricBar } from "./components/MetricBar";
import { OrderSidebar } from "./components/OrderSidebar";
import { OrderDetail } from "./components/OrderDetail";
import "./styles.css";

function App() {
  const {
    db,
    totals,
    orderStats,
    addOrder,
    addStone,
    registerReplacement,
    decideReplacement,
    reset,
    download,
  } = useDatabase();

  const [selectedId, setSelectedId] = useState<string | null>(db.orders[0]?.id ?? null);

  const order = db.orders.find((o) => o.id === selectedId) ?? db.orders[0] ?? null;
  const lockedIds = useMemo(
    () => new Set(db.orders.filter((o) => orderStats(o.id).locked).map((o) => o.id)),
    [db.orders, orderStats]
  );

  return (
    <main className="app">
      <header className="hero">
        <div className="hero-top">
          <div>
            <p>镶石损耗核算台</p>
            <h1>换石留痕 · 超阈必审</h1>
            <span>
              登记订单与宝石档案，镶坏换石自动留前后记录；返工损耗累计超过订单允许克拉时，
              先转负责人确认，确认前整单不能继续镶嵌；放行后总损耗、补石数、补款金额一起更新。
              档案保存在浏览器本地。
            </span>
          </div>
          <div className="hero-actions">
            <button onClick={download}>导出档案 JSON</button>
            <button
              className="ghost"
              onClick={() => {
                if (window.confirm("确定清空本地档案并恢复样例数据？")) reset();
              }}
            >
              恢复样例数据
            </button>
          </div>
        </div>
      </header>

      <MetricBar totals={totals} />

      <div className="layout">
        <OrderSidebar
          db={db}
          selectedId={order?.id ?? null}
          lockedIds={lockedIds}
          onSelect={setSelectedId}
          onAdd={addOrder}
        />
        {order ? (
          <OrderDetail
            key={order.id}
            db={db}
            order={order}
            stats={orderStats(order.id)}
            onAddStone={(input) => addStone(order.id, input)}
            onRegisterReplacement={(input) => registerReplacement(order, input)}
            onDecide={decideReplacement}
          />
        ) : (
          <section className="panel empty-detail">请先在左侧建档一个订单</section>
        )}
      </div>
    </main>
  );
}

export default App;
