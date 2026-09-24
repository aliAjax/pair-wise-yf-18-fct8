// 界面层：镶坏换石登记（留前后记录；锁定时禁用）
import { useMemo, useState } from "react";
import type { Database, OrderRecord, StoneRecord } from "../archive/types";
import { DAMAGE_REASONS, previewReplacement } from "../domain/loss";
import { fmtCarat, fmtMoney } from "../domain/format";
import { Field } from "./ui";
import type { NewReplacementInput } from "../state/useDatabase";

export function ReplacementForm({
  db,
  order,
  locked,
  onRegister,
}: {
  db: Database;
  order: OrderRecord;
  locked: boolean;
  onRegister: (input: NewReplacementInput) => void;
}) {
  const inSettingStones = useMemo(
    () => db.stones.filter((s) => s.orderId === order.id && s.status === "在镶"),
    [db.stones, order.id]
  );

  const [oldId, setOldId] = useState("");
  const [newId, setNewId] = useState("");
  const [newShape, setNewShape] = useState(inSettingStones[0]?.shape ?? "");
  const [afterCarat, setAfterCarat] = useState("");
  const [reason, setReason] = useState(DAMAGE_REASONS[0]);
  const [error, setError] = useState("");

  const oldStone: StoneRecord | undefined = inSettingStones.find((s) => s.id === oldId);
  const duplicateId = newId.trim() !== "" && db.stones.some((s) => s.id === newId.trim());

  const preview = oldStone ? previewReplacement(db, order, oldStone.currentCarat) : null;

  const selectOld = (id: string) => {
    setOldId(id);
    const s = inSettingStones.find((x) => x.id === id);
    if (s) setNewShape(s.shape);
  };

  const submit = () => {
    const after = parseFloat(afterCarat);
    if (!oldStone) {
      setError("请选择镶坏的在镶石");
      return;
    }
    if (!newId.trim()) {
      setError("请填写补石编号");
      return;
    }
    if (duplicateId) {
      setError("补石编号与已有宝石重复");
      return;
    }
    if (!(after > 0)) {
      setError("补石克拉必须大于 0");
      return;
    }
    if (!reason.trim()) {
      setError("请填写损坏原因");
      return;
    }
    try {
      onRegister({ oldStone, newStoneId: newId, newShape, afterCarat: after, damageReason: reason });
      setOldId("");
      setNewId("");
      setAfterCarat("");
      setReason(DAMAGE_REASONS[0]);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "登记失败");
    }
  };

  return (
    <div className="inline-form">
      <h3>镶坏换石登记</h3>
      {locked && (
        <p className="lock-notice">
          ⛔ 本单有返工损耗待负责人确认，确认/驳回前不能继续镶嵌。
        </p>
      )}
      <fieldset disabled={locked} className={locked ? "disabled-set" : ""}>
        <div className="form-row">
          <Field label="镶坏石（前）">
            <select value={oldId} onChange={(e) => selectOld(e.target.value)}>
              <option value="">选择在镶石编号</option>
              {inSettingStones.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} · {s.position} · {fmtCarat(s.currentCarat)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="补石编号（后）">
            <input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="如：ST-3052" />
          </Field>
          <Field label="补石形状">
            <input value={newShape} onChange={(e) => setNewShape(e.target.value)} list="shape-options" placeholder="形状" />
            <datalist id="shape-options">
              {["圆形", "椭圆", "梨形", "祖母绿切", "马眼形", "心形", "方形"].map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="补石克拉">
            <input value={afterCarat} onChange={(e) => setAfterCarat(e.target.value)} inputMode="decimal" placeholder="0.000" />
          </Field>
          <Field label="损坏原因">
            <input value={reason} onChange={(e) => setReason(e.target.value)} list="damage-options" />
            <datalist id="damage-options">
              {DAMAGE_REASONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </Field>
        </div>

        {oldStone && preview && (
          <div className={`preview ${preview.withinAllowance ? "" : "over"}`}>
            <span>位置：<b>{oldStone.position}</b></span>
            <span>前 → 后：<b>{fmtCarat(oldStone.currentCarat)} → {afterCarat || "—"}</b></span>
            <span>本次返工损耗：<b>{fmtCarat(preview.lossCarat)}</b></span>
            <span>补款：<b>{fmtMoney(preview.charge)}</b></span>
            <span>
              累计：{fmtCarat(preview.lossBefore)} → <b>{fmtCarat(preview.lossAfter)}</b>
              {" / 允许 "}<b>{fmtCarat(order.allowedLossCarat)}</b>
            </span>
            {preview.withinAllowance ? (
              <span className="tag-ok">在允许范围内，登记即放行</span>
            ) : (
              <span className="tag-over">超出允许损耗，登记后转负责人确认</span>
            )}
          </div>
        )}
        {duplicateId && <p className="error">补石编号与已有宝石重复</p>}
        {error && <p className="error">{error}</p>}
        <button className="primary" onClick={submit}>
          提交换石记录
        </button>
      </fieldset>
    </div>
  );
}
