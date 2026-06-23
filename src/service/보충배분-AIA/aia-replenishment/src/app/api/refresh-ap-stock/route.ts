import { NextResponse } from 'next/server';

/**
 * POST /api/refresh-ap-stock
 *
 * 화면 0의 [AP 재고 업데이트] 버튼에서 호출.
 * action SC(urgent/rt/trend)만 DRP API로 최신 AP 재고를 일괄 조회.
 *
 * body: { brandCd, ssnCd, apCd, scList: [{prodCd, colorCd}] }
 * response: { stocks: [{prodCd, colorCd, apStock, sizes: [{sizCd, qty}]}], updatedAt }
 */

interface SCItem {
  prodCd: string;
  colorCd: string;
}

interface RequestBody {
  brandCd: string;
  ssnCd: string;
  apCd: string;
  scList: SCItem[];
}

interface StockResult {
  prodCd: string;
  colorCd: string;
  apStock: number;
  sizes: { sizCd: string; qty: number }[];
}

async function fetchOneApStock(
  drpBase: string,
  drpKey: string,
  brandCd: string,
  ssnCd: string,
  apCd: string,
  prodCd: string,
  colorCd: string,
  timeout: number,
): Promise<StockResult> {
  const params = new URLSearchParams({ brandCd, prodCd, colorCd, apCd, ssnCd });
  const url = `${drpBase}/api-gateway/ilp/ap-stk?${params}`;
  const headers: Record<string, string> = {};
  if (drpKey) headers['x-api-key'] = drpKey;

  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) {
      return { prodCd, colorCd, apStock: 0, sizes: [] };
    }
    const body = await res.json();
    const data = body.data ?? body;
    const sizes: { sizCd: string; qty: number }[] = data.stocks ?? [];
    const apStock = sizes.reduce((sum: number, s: { qty: number }) => sum + (s.qty || 0), 0);
    return { prodCd, colorCd, apStock, sizes };
  } catch {
    return { prodCd, colorCd, apStock: 0, sizes: [] };
  }
}

export async function POST(req: Request) {
  const drpBase = process.env.DRP_API_BASE;
  if (!drpBase) {
    return NextResponse.json(
      { detail: 'DRP_API_BASE 미설정' },
      { status: 500 },
    );
  }

  const drpKey = process.env.DRP_API_KEY ?? '';
  const timeout = Number(process.env.DRP_STOCK_TIMEOUT_MS) || 15000;

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const { brandCd, ssnCd, apCd, scList } = body;
  if (!brandCd || !ssnCd || !apCd || !scList?.length) {
    return NextResponse.json(
      { detail: 'brandCd, ssnCd, apCd, scList 필수' },
      { status: 400 },
    );
  }

  // 병렬 호출 (최대 20개씩 배치)
  const BATCH_SIZE = 20;
  const results: StockResult[] = [];

  for (let i = 0; i < scList.length; i += BATCH_SIZE) {
    const batch = scList.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((sc) =>
        fetchOneApStock(drpBase, drpKey, brandCd, ssnCd, apCd, sc.prodCd, sc.colorCd, timeout),
      ),
    );
    results.push(...batchResults);
  }

  return NextResponse.json({
    stocks: results,
    updatedAt: new Date().toISOString(),
    totalRequested: scList.length,
    totalWithStock: results.filter((r) => r.apStock > 0).length,
  });
}
