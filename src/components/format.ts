// 界面层展示用格式化

export function fmtCt(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(3)} ct`;
}

export function fmtMoney(value: number): string {
  return `¥${value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
