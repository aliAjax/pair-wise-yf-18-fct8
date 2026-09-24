// 界面层：宝石建档（登记编号、形状、原克拉、当前克拉、镶嵌位置）
import { useState } from "react";
import { SHAPES } from "../domain/loss";
import { Field } from "./ui";
import type { NewStoneInput } from "../state/useDatabase";

export function StoneForm({
  onAdd,
}: {
  onAdd: (input: NewStoneInput) => void;
}) {
  const [form, setForm] = useState({
    shape: SHAPES[0],
    originalCarat: "",
    currentCarat: "",
    position: "",
  });
  const [error, setError] = useState("");

  const submit = () => {
    const original = parseFloat(form.originalCarat);
    const current = parseFloat(form.currentCarat);
    if (!form.position.trim()) {
      setError("请填写镶嵌位置");
      return;
    }
    if (!(original > 0) || !(current > 0)) {
      setError("原克拉和当前克拉必须大于 0");
      return;
    }
    if (current > original) {
      setError("当前克拉不能大于原克拉");
      return;
    }
    try {
      onAdd({ shape: form.shape, originalCarat: original, currentCarat: current, position: form.position });
      setForm({ shape: form.shape, originalCarat: "", currentCarat: "", position: "" });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "登记失败");
    }
  };

  return (
    <div className="inline-form">
      <h3>宝石建档</h3>
      <div className="form-row">
        <Field label="形状">
          <select value={form.shape} onChange={(e) => setForm({ ...form, shape: e.target.value })}>
            {SHAPES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="原克拉">
          <input value={form.originalCarat} onChange={(e) => setForm({ ...form, originalCarat: e.target.value })} inputMode="decimal" placeholder="0.000" />
        </Field>
        <Field label="当前克拉">
          <input value={form.currentCarat} onChange={(e) => setForm({ ...form, currentCarat: e.target.value })} inputMode="decimal" placeholder="0.000" />
        </Field>
        <Field label="镶嵌位置">
          <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="如：主石位 / 围石A组" />
        </Field>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="primary" onClick={submit}>
        存入宝石档案
      </button>
    </div>
  );
}
