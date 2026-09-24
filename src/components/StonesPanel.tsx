import { useMemo, useState } from "react";
import type { MountPosition, Order, StoneRecord } from "../types";
import { MOUNT_POSITIONS, STONE_SHAPES } from "../types";
import { calcEventLoss, roundCt, summarize } from "../domain/loss";
import { fmtCt } from "./format";

const DAMAGE_PRESETS = [
  "镶口过紧导致崩边",
  "压爪受力点错误碎裂",
  "镶石过程中崩尖",
  "边部缺口，磨小改配石",
  "整石碎裂报废",
  "刮花需重新打磨",
];

const STATUS_CLASS: Record<StoneRecord["status"], string> = {
  在镶: "badge-ok",
  损坏: "badge-danger",
  已换石: "badge-warn",
};

export interface RegisterReplacePayload {
  fromStoneId: string;
  remainCt: number;
  replacementCt: number;
  reason: string;
  note?: string;
  operator: string;
  newStone?: { code: string; shape: string };
}

interface PanelProps {
  order: Order;
  frozen: boolean;
  onAddStone: (input: {
    code: string;
    shape: string;
    originalCt: number;
    position: MountPosition;
  }) => void;
  onRegisterReplace: (input: RegisterReplacePayload) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export function StonesPanel({
  order,
  frozen,
  onAddStone,
  onRegisterReplace,
  onError,
  onSuccess,
}: PanelProps) {
  const [tab, setTab] = useState<"stones" | "add" | "replace">(
    frozen ? "stones" : "add"
  );

  return (
    <div>
      <div className="tabs">
        <button
          type="button"
          className={tab === "stones" ? "active" : ""}
          onClick={() => setTab("stones")}
        >
          宝石清单（{order.stones.length}）
        </button>
        <button
          type="button"
          className={tab === "add" ? "active" : ""}
          disabled={frozen}
          title={frozen ? "超限冻结中，不能继续镶嵌" : ""}
          onClick={() => setTab("add")}
        >
          登记宝石
        </button>
        <button
          type="button"
          className={tab === "replace" ? "active" : ""}
          disabled={frozen}
          title={frozen ? "超限冻结中，不能继续镶嵌" : ""}
          onClick={() => setTab("replace")}
        >
          换石 / 损坏返工
        </button>
      </div>

      {frozen && (
        <p className="frozen-note">
          当前订单已冻结：负责人在上方确认放行后，才能登记新石或继续镶嵌。
        </p>
      )}

      {tab === "stones" && <StonesTable order={order} />}
      {tab === "add" && !frozen && (
        <AddStoneForm
          onSubmit={(input) => {
            onAddStone(input);
            onSuccess(`宝石 ${input.code} 已登记`);
          }}
          onError={onError}
        />
      )}
      {tab === "replace" && !frozen && (
        <ReplaceForm
          order={order}
          onSubmit={(input) => {
            onRegisterReplace(input);
            onSuccess(`换石记录已入账（损耗 ${fmtCt(calcEventLoss({
              beforeCt:
                order.stones.find((s) => s.id === input.fromStoneId)
                  ?.originalCt ?? 0,
              remainCt: input.remainCt,
              replacementCt: input.replacementCt,
            }))}）`);
          }}
          onError={onError}
        />
      )}
    </div>
  );
}

function StonesTable({ order }: { order: Order }) {
  if (order.stones.length === 0) {
    return <p className="empty">还没有登记宝石，切到「登记宝石」开始上账。</p>;
  }
  return (
    <div className="table-wrap">
      <table className="stone-table">
        <thead>
          <tr>
            <th>宝石编号</th>
            <th>形状</th>
            <th>镶嵌位置</th>
            <th className="num">原克拉</th>
            <th className="num">当前克拉</th>
            <th>状态</th>
            <th>损坏原因</th>
          </tr>
        </thead>
        <tbody>
          {order.stones.map((s) => (
            <tr key={s.id}>
              <td className="mono">{s.code}</td>
              <td>{s.shape}</td>
              <td>{s.position}</td>
              <td className="num">{s.originalCt.toFixed(3)}</td>
              <td className="num">{s.currentCt.toFixed(3)}</td>
              <td>
                <span className={`badge ${STATUS_CLASS[s.status]}`}>
                  {s.status}
                </span>
              </td>
              <td className="reason">{s.damageReason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddStoneForm({
  onSubmit,
  onError,
}: {
  onSubmit: PanelProps["onAddStone"];
  onError: PanelProps["onError"];
}) {
  const [code, setCode] = useState("");
  const [shape, setShape] = useState("");
  const [position, setPosition] = useState<MountPosition>("主石位");
  const [originalCt, setOriginalCt] = useState("");

  const submit = () => {
    const ct = parseFloat(originalCt);
    if (!code.trim()) return onError("请填写宝石编号");
    if (!shape.trim()) return onError("请填写形状 / 尺寸");
    if (!(ct > 0)) return onError("原克拉必须大于 0");
    onSubmit({ code, shape, position, originalCt: ct });
    setCode("");
    setShape("");
    setOriginalCt("");
  };

  return (
    <div className="panel inner">
      <h3>登记宝石上账</h3>
      <div className="field-grid">
        <label>
          <span>宝石编号 *</span>
          <input
            value={code}
            placeholder="如 ST-2101"
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <label>
          <span>形状 / 尺寸 *</span>
          <input
            value={shape}
            list="shape-list"
            placeholder="如 椭圆 6×4mm"
            onChange={(e) => setShape(e.target.value)}
          />
          <datalist id="shape-list">
            {STONE_SHAPES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label>
          <span>镶嵌位置 *</span>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as MountPosition)}
          >
            {MOUNT_POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>原克拉（上秤重量）*</span>
          <input
            type="number"
            step="0.001"
            min="0"
            value={originalCt}
            placeholder="0.000"
            onChange={(e) => setOriginalCt(e.target.value)}
          />
        </label>
      </div>
      <button type="button" className="primary" onClick={submit}>
        上账
      </button>
    </div>
  );
}

function ReplaceForm({
  order,
  onSubmit,
  onError,
}: {
  order: Order;
  onSubmit: PanelProps["onRegisterReplace"];
  onError: PanelProps["onError"];
}) {
  const mountedStones = useMemo(
    () => order.stones.filter((s) => s.status === "在镶"),
    [order.stones]
  );
  const [fromStoneId, setFromStoneId] = useState("");
  const [remainCt, setRemainCt] = useState("0");
  const [reason, setReason] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newShape, setNewShape] = useState("");
  const [replacementCt, setReplacementCt] = useState("0");
  const [operator, setOperator] = useState("");
  const [note, setNote] = useState("");

  const stone = mountedStones.find((s) => s.id === fromStoneId);
  const remain = parseFloat(remainCt) || 0;
  const replace = parseFloat(replacementCt) || 0;

  const previewLoss = stone
    ? calcEventLoss({
        beforeCt: stone.originalCt,
        remainCt: remain,
        replacementCt: replace,
      })
    : 0;
  const priorLoss = summarize(order).totalLossCt;
  const cumulative = roundCt(priorLoss + previewLoss);
  const willFreeze = cumulative > order.approvedThresholdCt;

  if (mountedStones.length === 0) {
    return (
      <div className="panel inner">
        <p className="empty">
          没有「在镶」状态的宝石可登记返工。请先在「登记宝石」上账。
        </p>
      </div>
    );
  }

  const submit = () => {
    if (!fromStoneId) return onError("请选择被损坏 / 换下的宝石");
    if (remain < 0 || (stone && remain > stone.originalCt)) {
      return onError("残重必须在 0 与原克拉之间");
    }
    if (!reason.trim()) return onError("请填写损坏原因");
    if (!operator.trim()) return onError("请填写经办人");
    if (newCode.trim() && !(replace > 0)) {
      return onError("已填新石编号，请填写补入新石克拉");
    }
    if (replace > 0 && !newCode.trim()) {
      return onError("补入新石克拉大于 0 时，必须填写新石编号");
    }
    onSubmit({
      fromStoneId,
      remainCt: remain,
      replacementCt: replace,
      reason,
      note,
      operator,
      newStone: newCode.trim()
        ? { code: newCode.trim(), shape: newShape.trim() }
        : undefined,
    });
    setFromStoneId("");
    setRemainCt("0");
    setReason("");
    setNewCode("");
    setNewShape("");
    setReplacementCt("0");
    setOperator("");
    setNote("");
  };

  return (
    <div className="panel inner">
      <h3>换石 / 损坏返工登记</h3>
      <p className="hint">每次换石都保留前后重量：原克拉 → 残重 + 补入新石，差额即本次损耗。</p>

      <div className="field-grid">
        <label className="wide">
          <span>换下（损坏）宝石 *</span>
          <select
            value={fromStoneId}
            onChange={(e) => {
              setFromStoneId(e.target.value);
              const s = mountedStones.find((x) => x.id === e.target.value);
              setNewShape(s?.shape ?? "");
            }}
          >
            <option value="">请选择在镶中的宝石…</option>
            {mountedStones.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} · {s.shape} · {s.position} · {s.originalCt.toFixed(3)}ct
              </option>
            ))}
          </select>
        </label>

        {stone && (
          <div className="before-card wide">
            <span>换石前：{stone.code}（{stone.position}）</span>
            <b>{fmtCt(stone.originalCt)}</b>
          </div>
        )}

        <label>
          <span>损坏后残重(ct)，整石报废填 0 *</span>
          <input
            type="number"
            step="0.001"
            min="0"
            max={stone?.originalCt ?? undefined}
            value={remainCt}
            onChange={(e) => setRemainCt(e.target.value)}
          />
        </label>
        <label>
          <span>损坏原因 *</span>
          <input
            value={reason}
            list="damage-list"
            placeholder="选择或填写"
            onChange={(e) => setReason(e.target.value)}
          />
          <datalist id="damage-list">
            {DAMAGE_PRESETS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>
        <label>
          <span>补入新石编号（无补石留空）</span>
          <input
            value={newCode}
            placeholder="如 ST-2108"
            onChange={(e) => setNewCode(e.target.value)}
          />
        </label>
        <label>
          <span>补入新石克拉（无补石填 0）</span>
          <input
            type="number"
            step="0.001"
            min="0"
            value={replacementCt}
            onChange={(e) => setReplacementCt(e.target.value)}
          />
        </label>
        <label>
          <span>新石形状 / 尺寸</span>
          <input
            value={newShape}
            placeholder="默认同坏石形状"
            onChange={(e) => setNewShape(e.target.value)}
          />
        </label>
        <label>
          <span>经办人 *</span>
          <input
            value={operator}
            placeholder="操作师傅姓名"
            onChange={(e) => setOperator(e.target.value)}
          />
        </label>
        <label className="wide">
          <span>备注</span>
          <input
            value={note}
            placeholder="如 残石入碎料袋 / 客户已拍照确认"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>

      <div className={`loss-preview ${willFreeze ? "will-freeze" : ""}`}>
        <div>
          <small>本次损耗</small>
          <strong>{fmtCt(previewLoss)}</strong>
        </div>
        <div>
          <small>登记后订单累计损耗</small>
          <strong>{fmtCt(cumulative)}</strong>
        </div>
        <div>
          <small>允许（当前放行阈值）</small>
          <strong>{fmtCt(order.approvedThresholdCt)}</strong>
        </div>
        {willFreeze && (
          <p className="freeze-warn">
            ⛔ 本次登记后将超过允许克拉，订单立即冻结，需负责人确认后才能继续。
          </p>
        )}
      </div>

      <button type="button" className="primary" onClick={submit}>
        入账并记录前后重量
      </button>
    </div>
  );
}
