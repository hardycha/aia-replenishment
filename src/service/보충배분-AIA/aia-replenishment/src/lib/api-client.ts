import type {
  AllocationResult,
  ForecastBundle,
  OptimizeRequest,
  ShopGrp,
  ShopStockResponse,
  WarehouseStockResponse,
} from '@/lib/types';

// ── 공통 에러 ──
export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(res.status, data.detail ?? `HTTP ${res.status}`);
  }
  return data as T;
}

// ── 1. 배분그룹 조회 (아카이빙) ──
export async function fetchShopGrp(
  shopGrpNo: string,
  opts?: { brandCd?: string; ssnCd?: string },
): Promise<ShopGrp> {
  const params = new URLSearchParams({ shopGrpNo });
  if (opts?.brandCd) params.set('brandCd', opts.brandCd);
  if (opts?.ssnCd) params.set('ssnCd', opts.ssnCd);
  const res = await fetch(`/api/shop-grp?${params}`);
  return handleResponse<ShopGrp>(res);
}

// ── 2. 예측치 조회 (아카이빙) ──
export async function fetchForecast(params: {
  brandCd: string;
  prodCd: string;
  colorCd: string;
  ssnCd: string;
  executionDate: string;
  shopCds?: string[];
}): Promise<ForecastBundle> {
  const sp = new URLSearchParams({
    brandCd: params.brandCd,
    prodCd: params.prodCd,
    colorCd: params.colorCd,
    ssnCd: params.ssnCd,
    executionDate: params.executionDate,
  });
  if (params.shopCds?.length) {
    sp.set('shopCds', params.shopCds.join(','));
  }
  const res = await fetch(`/api/forecast?${sp}`);
  return handleResponse<ForecastBundle>(res);
}

// ── 3. AP 재고 조회 (DRP API Gateway) ──
export async function fetchWarehouseStock(params: {
  brandCd: string;
  prodCd: string;
  colorCd: string;
  apCd: string;
  ssnCd: string;
}): Promise<WarehouseStockResponse> {
  const sp = new URLSearchParams(params);
  const res = await fetch(`/api/warehouse-stock?${sp}`);
  return handleResponse<WarehouseStockResponse>(res);
}

// ── 4. 매장 재고 조회 (DRP API Gateway) ──
export async function fetchShopStock(params: {
  brandCd: string;
  prodCd: string;
  colorCd: string;
  ssnCd: string;
  shopCds: string[];
}): Promise<ShopStockResponse> {
  const sp = new URLSearchParams({
    brandCd: params.brandCd,
    prodCd: params.prodCd,
    colorCd: params.colorCd,
    ssnCd: params.ssnCd,
    shopCds: params.shopCds.join(','),
  });
  const res = await fetch(`/api/shop-stock?${sp}`);
  return handleResponse<ShopStockResponse>(res);
}

// ── 5. ILP 배분 최적화 (Colly POST /optimize) ──
export async function postOptimize(
  req: OptimizeRequest,
): Promise<AllocationResult> {
  const res = await fetch('/api/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return handleResponse<AllocationResult>(res);
}

// ── 6. 브리핑 데이터 조회 (화면 0) ──
export async function fetchBriefing(params: {
  brandCd: string;
  ssnCd: string;
}): Promise<import('@/data/mockBriefingData').BriefingData> {
  const sp = new URLSearchParams(params);
  const res = await fetch(`/api/briefing?${sp}`);
  return handleResponse(res);
}

// ── 7. AP 재고 일괄 갱신 (화면 0 [AP 재고 업데이트] 버튼) ──
export interface RefreshApStockResult {
  stocks: { prodCd: string; colorCd: string; apStock: number; sizes: { sizCd: string; qty: number }[] }[];
  updatedAt: string;
  totalRequested: number;
  totalWithStock: number;
}

export async function refreshApStock(params: {
  brandCd: string;
  ssnCd: string;
  apCd: string;
  scList: { prodCd: string; colorCd: string }[];
}): Promise<RefreshApStockResult> {
  const res = await fetch('/api/refresh-ap-stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return handleResponse<RefreshApStockResult>(res);
}

// ── 8. [테스트용] ILP 배분 최적화 — TargetStock=Forecast+3 버전 ──
// ⚠️ 테스트 전용: 실 배포 시 제거할 것
// TargetStock 도입 테스트 — Colly /optimize-add3 엔드포인트 사용
// 기존 /optimize와 동일한 인풋/아웃풋, ILP 목적함수만 다름
// (TargetStock = ForecastDemand + 3, 여기서 3 = PresentationStock + SafetyStock)
export async function postOptimizeAdd3(
  req: OptimizeRequest,
): Promise<AllocationResult> {
  const res = await fetch('/api/optimize-add3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return handleResponse<AllocationResult>(res);
}
