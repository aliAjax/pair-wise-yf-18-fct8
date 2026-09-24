import { useCallback, useMemo, useState } from "react";
import "./styles.css";
import { summarize } from "./domain/loss";
import { useArchive } from "./store/useArchive";
import { OrderList } from "./components/OrderList";
import { OrderDetail } from "./components/OrderDetail";
import { Toast, type ToastState } from "./components/Toast";

function App() {
  const {
    orders,
    ready,
    createOrder,
    addStone,
    registerReplace,
    approve,
    removeOrder,
  } = useArchive();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showError = useCallback(
    (message: string) => setToast({ kind: "error", message }),
    []
  );
  const showSuccess = useCallback(
    (message: string) => setToast({ kind: "success", message }),
    []
  );

  // 汇总全部由判断层从事件流推导，不放任何冗余字段
  const summaries = useMemo(() => {
    const map = new Map(orders.map((o) => [o.id, summarize(o)]));
    return map;
  }, [orders]);

  // 默认选中第一张订单（含新建后自动选中）
  const selected = useMemo(() => {
    if (!ready) return undefined;
    const found = orders.find((o) => o.id === selectedId);
    return found ?? orders[0];
  }, [orders, selectedId, ready]);

  const runAction = useCallback(
    (action: () => void, success?: string) => {
      try {
        action();
        if (success) showSuccess(success);
      } catch (err) {
        showError(err instanceof Error ? err.message : "操作失败");
      }
    },
    [showError, showSuccess]
  );

  return (
    <main className="app">
      <section className="hero">
        <p>镶石损耗核算台 · 本地档案（localStorage）</p>
        <h1>镶坏不再靠口头记</h1>
        <span>
          按订单登记宝石编号、形状、原克拉、当前克拉、镶嵌位置与损坏原因；每次换石保留前后重量。
          返工累计损耗超过订单允许克拉即自动冻结，须负责人确认放行后才能继续镶嵌；放行后总损耗、补石数与补款金额同步更新。
        </span>
      </section>

      <div className="layout">
        <OrderList
          orders={orders}
          summaries={summaries}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          onCreate={(input) =>
            runAction(() => {
              const o = createOrder(input);
              setSelectedId(o.id);
            }, `订单 ${input.code} 已建档`)
          }
          onError={showError}
        />

        {!ready ? (
          <section className="panel loading">正在读取本地档案…</section>
        ) : selected ? (
          <OrderDetail
            key={selected.id}
            order={selected}
            summary={summaries.get(selected.id)!}
            onAddStone={(input) =>
              runAction(() => addStone(selected.id, input))
            }
            onRegisterReplace={(input) =>
              runAction(() => registerReplace(selected.id, input))
            }
            onApprove={(input) =>
              runAction(() => approve(selected.id, input))
            }
            onDelete={() =>
              runAction(() => {
                removeOrder(selected.id);
                setSelectedId(null);
              }, "订单已删除")
            }
            onError={showError}
            onSuccess={showSuccess}
          />
        ) : (
          <section className="panel empty-detail">
            <h2>没有订单</h2>
            <p>从左侧「新建订单」开始建立镶石损耗档案。</p>
          </section>
        )}
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  );
}

export default App;
