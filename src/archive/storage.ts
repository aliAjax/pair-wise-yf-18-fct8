// 档案层：浏览器本地存取（只负责读写，不做业务判断）

import type { Database } from "./types";
import { seedDatabase } from "./seed";

const STORAGE_KEY = "setting-loss-desk:v1";

/** 首次打开写入样例档案，之后一直读浏览器本地 */
export function loadDatabase(): Database {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedDatabase();
    saveDatabase(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as Database;
    if (!parsed.orders || !parsed.stones || !parsed.replacements) {
      throw new Error("档案结构不完整");
    }
    return parsed;
  } catch {
    // 本地档案损坏时退回初始样例，避免整台不可用
    const seeded = seedDatabase();
    saveDatabase(seeded);
    return seeded;
  }
}

export function saveDatabase(db: Database): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function resetDatabase(): Database {
  const seeded = seedDatabase();
  saveDatabase(seeded);
  return seeded;
}

/** 导出一份 JSON 档案备份 */
export function exportDatabase(db: Database): void {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `镶石损耗档案-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
