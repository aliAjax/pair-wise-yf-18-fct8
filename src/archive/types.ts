// 档案层：镶石损耗核算台的数据模型（只定义结构，不含任何业务判断）

/** 订单：约定本单允许的返工损耗与补石单价 */
export interface OrderRecord {
  id: string; // 订单号
  customer: string; // 客户
  pieceName: string; // 货品名称
  allowedLossCarat: number; // 订单允许损耗（克拉）
  pricePerCarat: number; // 补石单价（元/克拉）
  createdAt: number;
}

/** 宝石档案：一克拉精度（0.001ct） */
export interface StoneRecord {
  id: string; // 宝石编号
  orderId: string; // 所属订单
  shape: string; // 形状
  originalCarat: number; // 原克拉（到厂/初镶重量）
  currentCarat: number; // 当前克拉（本次镶上时的重量）
  position: string; // 镶嵌位置
  status: "在镶" | "镶坏"; // 当前状态
  createdAt: number;
}

/** 换石单状态：超阈为待确认，负责人放行后才计入核算 */
export type ReplacementStatus = "待确认" | "已确认" | "已驳回";

/** 换石记录：每次换石都留前后档，不可修改 */
export interface ReplacementRecord {
  id: string; // 换石单号
  orderId: string;
  oldStoneId: string; // 镶坏石编号（前）
  newStoneId: string; // 补石编号（后）
  newShape: string; // 补石形状
  position: string; // 镶嵌位置
  beforeCarat: number; // 镶坏前克拉
  afterCarat: number; // 补石后克拉
  lossCarat: number; // 本次返工损耗
  charge: number; // 本次补款金额
  damageReason: string; // 损坏原因
  status: ReplacementStatus;
  createdAt: number;
  decidedBy?: string; // 确认/驳回的负责人
  decidedAt?: number;
  decisionNote?: string;
}

/** 浏览器本地档案库 */
export interface Database {
  version: 1;
  orders: OrderRecord[];
  stones: StoneRecord[];
  replacements: ReplacementRecord[];
}
