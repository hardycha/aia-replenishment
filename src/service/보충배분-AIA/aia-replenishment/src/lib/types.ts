// 보충배분-AIA 2차 실 설계 · 공통 타입 정의
// 근거: task.md + 노션 「FE - ILP API 연동 참고 문서」 (Colly, 2026-04-22)
//       스타일 네비게이터 확장 포함

// ══════════════════════════════════════════════════════════
// 도메인 원시 타입
// ══════════════════════════════════════════════════════════
export type BrandCd = 'X' | 'M' | 'V' | 'ST' | 'I';
export type SsnCd = string; // '26S' | '25F' ...
export type ShopCd = string;
export type ProdCd = string;
export type ColorCd = string;
export type SizCd = string;

// ══════════════════════════════════════════════════════════
// Snowflake 아카이빙 (정적 JSON — 프론트 직접 로드)
//  · Colly 서버의 /dropdowns/*, /shop-grp, /forecast 엔드포인트를
//    대신해서 프론트에 정적으로 공급하는 데이터
// ══════════════════════════════════════════════════════════

// ─── 시즌 드롭박스 아카이빙 ─────────────────────────────────
// (Colly API: GET /dropdowns/ssns — 사용 안 함. 아래 JSON 으로 대체)
export interface SsnArchiveItem {
  ssnCd: SsnCd;
}

// ─── 배분그룹 드롭박스 아카이빙 ─────────────────────────────
// (Colly API: GET /dropdowns/shop-grps — 사용 안 함)
export interface ShopGrpDropdownItem {
  shopGrpNo: string;
  shopGrpNm: string;
}

// ─── 스타일×컬러(SC) 드롭박스 아카이빙 ──────────────────────
// (Colly API: GET /dropdowns/sc — 사용 안 함)
// 스타일 네비게이터에서 사용하는 스타일 카탈로그의 소스
export interface ScArchiveItem {
  brandCd: BrandCd;
  ssnCd: SsnCd;
  prodCd: ProdCd;
  colorCd: ColorCd;
  prodNm: string;
  item?: string; // 아이템 코드 (예: 'JKDM')
  prdtKindCd?: string; // 품종 코드 (예: 'OUTR')
}

// ─── 배분그룹 상세 아카이빙 ─────────────────────────────────
// (Colly API: GET /shop-grp?shopGrpNo=... — 사용 안 함)
// Colly 응답은 shopCd + adjRank 만 제공하므로 shopNm 은 SERP 로 채움.
// 아카이빙 JSON 에서는 편의상 shopNm 포함.
export interface ShopInGrp {
  shopCd: ShopCd;
  shopNm: string;
  adjRank: number;
}

export interface ShopGrp {
  shopGrpNo: string;
  shopGrpNm: string;
  brandCd: BrandCd;
  ssnCd: SsnCd;
  shopCnt: number; // P_score 정규화 분모
  shops: ShopInGrp[];
  archivedAt: string; // ISO
}

// ─── 예측치 아카이빙 ────────────────────────────────────────
// (Colly API: GET /forecast — 사용 안 함)
export interface ForecastRow {
  shopCd: ShopCd;
  sizCd: SizCd;
  qty: number;
}

export interface ForecastBundle {
  prodCd: ProdCd;
  colorCd: ColorCd;
  brandCd: BrandCd;
  ssnCd: SsnCd;
  forecastStartDate: string; // W1 monday ISO
  rows: ForecastRow[];
  archivedAt: string;
}

// ══════════════════════════════════════════════════════════
// 스타일 네비게이터 내부 타입 (ScArchiveItem 에 분류 트리 덧붙임)
// ══════════════════════════════════════════════════════════
export interface ColorOption {
  colorCd: ColorCd;
  colorNm: string;
}

export interface StyleCatalogItem {
  prodCd: ProdCd;
  prodNm: string;
  brandCd: BrandCd;
  ssnCd: SsnCd;
  category1: string; // 대분류
  category2: string; // 중분류
  category3: string; // 아이템
  colors: ColorOption[];
}

export type CategoryTree = Record<string, Record<string, string[]>>;

export interface StyleColorSelection {
  prodCd: ProdCd;
  prodNm: string;
  ssnCd: SsnCd;
  colorCd: ColorCd | 'ALL';
}

// ══════════════════════════════════════════════════════════
// SERP 실 API 응답 (프론트가 직접 호출 — mock 모드 지원)
// ══════════════════════════════════════════════════════════

// ─── GET <SERP>/warehouse-stock ────────────────────────────
export interface WarehouseStockItem {
  sizCd: SizCd;
  qty: number;
}

export interface WarehouseStockResponse {
  stocks: WarehouseStockItem[];
}

// ─── GET <SERP>/shop-stock ─────────────────────────────────
export interface ShopStockItem {
  shopCd: ShopCd;
  shopNm: string;
  sizCd: SizCd;
  qty: number;
}

export interface ShopStockResponse {
  shopStocks: ShopStockItem[];
}

// ══════════════════════════════════════════════════════════
// ILP 실 API 요청/응답 (Colly `POST /optimize`)
// 노션 스펙과 정확히 일치 — 필드 순서·이름 변경 금지
// ══════════════════════════════════════════════════════════

export interface OptimizeRequest {
  brandCd: BrandCd;
  ssnCd: SsnCd;
  prodCd: ProdCd;
  colorCd: ColorCd;
  executionDate: string; // YYYY-MM-DD (오늘 자동 주입)
  warehouseStock: WarehouseStockItem[];
  targetShops: OptimizeTargetShop[];
}

export interface OptimizeTargetShop {
  shopCd: ShopCd;
  shopNm: string;
  adjRank: number;
  currentStock: { sizCd: SizCd; qty: number }[];
  forecast: { sizCd: SizCd; qty: number }[];
}

// 응답 = AllocationResult
export interface AllocationResult {
  brandCd: BrandCd;
  ssnCd: SsnCd;
  prodCd: ProdCd; // 서버에서 "X_DMDJ61046_BKS" 같은 조합키로 반환될 수 있음
  colorCd: ColorCd;
  status: 'OPTIMAL' | 'INFEASIBLE' | 'UNBOUNDED' | 'ERROR' | string;
  objectiveValue: number;
  shopAllocations: ShopAllocation[];
  warehouseRemaining: WarehouseStockItem[];
  totalAllocatedSCQty: number;
  totalAllocatedSCError: number;
  totalAllocatedSCSError: number;
  totalTargetShops: number;
  totalAllocatedShops: number;
  solveTimeMs: number;
  timestamp: string;
}

export interface ShopAllocation {
  shopCd: ShopCd;
  shopNm: string;
  adjRank: number;
  adjRankScore: number;
  allocations: AllocationDetail[];
  totalAllocSCQty: number;
  totalCurrentSCStock: number;
  totalFinalSCStock: number;
  totalPredScShopQty: number;
  totalEffectiveSCTarget: number;
  totalSCError: number;
  totalSCSError: number;
}

export interface AllocationDetail {
  sizCd: SizCd;
  allocQty: number;
  currentStock: number;
  finalStock: number;
  predScsShopQty: number;
  effectiveTarget: number;
  deviation: number;
  absDeviation: number;
}

// ══════════════════════════════════════════════════════════
// 화면 상태
// ══════════════════════════════════════════════════════════
export type Phase = 'briefing' | 'adjustment' | 'detail';

export interface Filters {
  brandCd: BrandCd;
  apCd: string;
  ssnCd: SsnCd;
  shopGrpNo: string;
  selections: StyleColorSelection[];
  executionDate: string; // 숨김, 자동
}

export interface ShopRow {
  shopCd: ShopCd;
  shopNm: string;
  adjRank: number;
  forecastTotal: number;       // 원본 예측값 (소수점, PRED_SC_SHOP_QTY)
  demandIndex: number;         // 수요지수 (0~100, 배분그룹 내 최대 매장 = 100)
  currentStockTotal: number;
  removed?: boolean;
}

export interface CellData {
  stock: number;
  forecast: number;
  alloc: number;
}

// key = `${shopCd}_${prodCd}_${colorCd}_${sizCd}`
export type StockData = Record<string, CellData>;
