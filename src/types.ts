// 档案数据模型 —— 建档层与判断层共用的类型定义

/** 镶嵌位置 */
export type MountPosition =
  | "主石位"
  | "围石"
  | "肩石"
  | "边石"
  | "底石"
  | "其他";

export const MOUNT_POSITIONS: MountPosition[] = [
  "主石位",
  "围石",
  "肩石",
  "边石",
  "底石",
  "其他",
];

/** 宝石常见形状 */
export const STONE_SHAPES = [
  "圆形",
  "椭圆",
  "梨形",
  "心形",
  "祖母绿切",
  "公主方",
  "马眼形",
  "其他",
];

/** 宝石在订单中的状态 */
export type StoneStatus = "在镶" | "损坏" | "已换石";

/** 一颗登记在册的宝石（同一镶嵌位置换石后会新增一条记录） */
export interface StoneRecord {
  /** 档案内唯一 ID */
  id: string;
  /** 宝石编号，如 ST-2048 */
  code: string;
  /** 形状，如 椭圆 6×4mm */
  shape: string;
  /** 原克拉（上秤时的重量） */
  originalCt: number;
  /** 当前克拉（损坏后为残重，换石后为新石重量） */
  currentCt: number;
  position: MountPosition;
  status: StoneStatus;
  /** 损坏原因（在镶期间无损坏则留空） */
  damageReason?: string;
  createdAt: string;
}

/** 一次换石 / 损坏返工记录，保留前后重量 */
export interface ReplaceEvent {
  id: string;
  /** ISO 时间 */
  at: string;
  /** 被换下（损坏）的宝石档案 ID */
  fromStoneId: string;
  fromStoneCode: string;
  /** 换上的新石档案 ID；仅登记损坏、尚未补石时为空 */
  toStoneId?: string;
  toStoneCode?: string;
  position: MountPosition;
  /** 换石前克拉（损坏石原重） */
  beforeCt: number;
  /** 损坏石残重；整石报废填 0 */
  remainCt: number;
  /** 补入新石的克拉；未补石填 0 */
  replacementCt: number;
  /** 本次损耗 = beforeCt - remainCt - replacementCt */
  lossCt: number;
  /** 损坏原因 */
  reason: string;
  note?: string;
  operator: string;
  /** 本次记录后订单累计返工损耗（快照，便于台账核对） */
  cumulativeLossAfter: number;
}

/** 负责人确认（放行）记录 */
export interface Approval {
  id: string;
  at: string;
  approver: string;
  /** 确认时的累计损耗 */
  lossAtApproval: number;
  /** 确认时已补石数 */
  replacementsAtApproval: number;
  /** 放行后允许的损耗上限（可调高） */
  newAllowedCt: number;
  comment?: string;
}

/** 订单状态：正常镶嵌中 / 超限待确认（冻结，不能继续镶嵌） */
export type OrderStatus = "进行中" | "待负责人确认";

export interface Order {
  id: string;
  /** 订单编号 */
  code: string;
  customer: string;
  /** 接单日期 YYYY-MM-DD */
  receivedAt: string;
  /** 订单允许损耗（克拉），累计返工损耗超过它即冻结 */
  allowedLossCt: number;
  /** 补石单价（元/克拉），放行时据此算补款 */
  unitPricePerCt: number;
  /** 当前放行阈值：建单时等于 allowedLossCt，负责人每次确认后更新 */
  approvedThresholdCt: number;
  status: OrderStatus;
  stones: StoneRecord[];
  events: ReplaceEvent[];
  approvals: Approval[];
  createdAt: string;
}

/** 订单汇总（全部由事件推导，不持久化） */
export interface OrderSummary {
  totalLossCt: number;
  replacementCount: number;
  replacementCt: number;
  damagedCount: number;
  /** 补款金额 = 累计损耗 × 补石单价 */
  rechargeAmount: number;
  overLimit: boolean;
  /** 超出当前放行阈值的克拉数 */
  excessCt: number;
  mountedCount: number;
}
