import { NextResponse } from 'next/server';
import type {
  AllocationResult,
  OptimizeRequest,
  ShopAllocation,
  AllocationDetail,
} from '@/lib/types';

// POST /api/optimize
// mock → adjRank 역순 + 예측치 비율 분배 / 실 → DRP API Gateway 프록시
// ★ shopGrpNo 는 페이로드에 포함하지 않음 (Colly 스펙에 없음)
export async function POST(req: Request) {
  const body = (await req.json()) as OptimizeRequest;

  if (!body.targetShops || body.targetShops.length === 0) {
    return NextResponse.json(
      { detail: '대상 매장이 없습니다 (targetShops 비어있음)' },
      { status: 422 },
    );
  }

  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== 'false';

  if (useMock) {
    return NextResponse.json(buildMockResult(body));
  }

  // 실 모드: Colly ILP 서버 직접 호출
  const ilpBase = process.env.ILP_API_BASE;
  if (!ilpBase) {
    return NextResponse.json(
      { detail: 'ILP_API_BASE 미설정' },
      { status: 500 },
    );
  }

  const timeout = Number(process.env.DRP_ILP_TIMEOUT_MS) || 120000;
  try {
    const res = await fetch(`${ilpBase}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      return NextResponse.json(
        { detail: `ILP 서버 비-JSON 응답 (${res.status}): ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    console.log('[ILP DEBUG] 요청 요약:', {
      brandCd: body.brandCd,
      prodCd: body.prodCd,
      colorCd: body.colorCd,
      warehouseStock: body.warehouseStock,
      targetShopCount: body.targetShops?.length,
    });
    if (!res.ok) {
      console.log('[ILP DEBUG] 에러 응답:', JSON.stringify(data));
      const detail = data.detail ?? data.message ?? JSON.stringify(data);
      return NextResponse.json({ detail }, { status: res.status });
    }
    console.log('[ILP DEBUG] 응답 요약:', {
      status: data.status,
      httpStatus: res.status,
      shopAllocCount: data.shopAllocations?.length,
      totalAllocated: data.totalAllocatedSCQty,
    });
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { detail: `ILP 서버 연결 실패: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }
}

// ── mock AllocationResult 생성 ──
function buildMockResult(req: OptimizeRequest): AllocationResult {
  const whStockMap = new Map(req.warehouseStock.map((s) => [s.sizCd, s.qty]));
  const remaining = new Map(req.warehouseStock.map((s) => [s.sizCd, s.qty]));

  // adjRank 오름차순 정렬 (낮을수록 우선)
  const sorted = [...req.targetShops].sort((a, b) => a.adjRank - b.adjRank);
  const totalRankInv = sorted.reduce((sum, s) => sum + 1 / s.adjRank, 0);

  const shopAllocations: ShopAllocation[] = sorted.map((shop) => {
    const weight = 1 / shop.adjRank / totalRankInv;
    const currentMap = new Map(shop.currentStock.map((c) => [c.sizCd, c.qty]));
    const forecastMap = new Map((shop.forecast ?? []).map((f) => [f.sizCd, f.qty]));

    const allocations: AllocationDetail[] = req.warehouseStock.map(({ sizCd }) => {
      const total = whStockMap.get(sizCd) || 0;
      const allocQty = Math.min(
        Math.round(total * weight),
        remaining.get(sizCd) || 0,
      );
      remaining.set(sizCd, (remaining.get(sizCd) || 0) - allocQty);

      const curStock = currentMap.get(sizCd) || 0;
      const pred = forecastMap.get(sizCd) || 0;
      const target = allocQty + curStock;
      return {
        sizCd,
        allocQty,
        currentStock: curStock,
        finalStock: curStock + allocQty,
        predScsShopQty: pred,
        effectiveTarget: target,
        deviation: 0,
        absDeviation: 0,
      };
    });

    const totalAlloc = allocations.reduce((s, a) => s + a.allocQty, 0);
    const totalCur = allocations.reduce((s, a) => s + a.currentStock, 0);
    const totalFinal = allocations.reduce((s, a) => s + a.finalStock, 0);
    const totalPred = allocations.reduce((s, a) => s + a.predScsShopQty, 0);

    return {
      shopCd: shop.shopCd,
      shopNm: shop.shopNm,
      adjRank: shop.adjRank,
      adjRankScore: weight,
      allocations,
      totalAllocSCQty: totalAlloc,
      totalCurrentSCStock: totalCur,
      totalFinalSCStock: totalFinal,
      totalPredScShopQty: totalPred,
      totalEffectiveSCTarget: totalPred,
      totalSCError: 0,
      totalSCSError: 0,
    };
  });

  const totalAllocated = shopAllocations.reduce((s, sa) => s + sa.totalAllocSCQty, 0);

  return {
    brandCd: req.brandCd,
    ssnCd: req.ssnCd,
    prodCd: `${req.brandCd}_${req.prodCd}_${req.colorCd}`,
    colorCd: req.colorCd,
    status: 'OPTIMAL',
    objectiveValue: 0.95,
    shopAllocations,
    warehouseRemaining: Array.from(remaining.entries()).map(([sizCd, qty]) => ({ sizCd, qty })),
    totalAllocatedSCQty: totalAllocated,
    totalAllocatedSCError: 0,
    totalAllocatedSCSError: 0,
    totalTargetShops: req.targetShops.length,
    totalAllocatedShops: shopAllocations.filter((s) => s.totalAllocSCQty > 0).length,
    solveTimeMs: 8.5,
    timestamp: new Date().toISOString(),
  };
}
