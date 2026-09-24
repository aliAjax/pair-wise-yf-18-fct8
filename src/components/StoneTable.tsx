// 界面层：订单下的宝石档案表
import type { StoneRecord } from "../archive/types";
import { fmtCarat } from "../domain/format";
import { StatusBadge } from "./ui";

export function StoneTable({ stones }: { stones: StoneRecord[] }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>宝石编号</th>
            <th>形状</th>
            <th>原克拉</th>
            <th>当前克拉</th>
            <th>镶嵌位置</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {stones.map((s) => (
            <tr key={s.id} className={s.status === "镶坏" ? "row-broken" : ""}>
              <td><b>{s.id}</b></td>
              <td>{s.shape}</td>
              <td>{fmtCarat(s.originalCarat)}</td>
              <td>{fmtCarat(s.currentCarat)}</td>
              <td>{s.position}</td>
              <td><StatusBadge status={s.status} /></td>
            </tr>
          ))}
          {stones.length === 0 && (
            <tr><td colSpan={6} className="empty">本单还没有宝石档案</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
