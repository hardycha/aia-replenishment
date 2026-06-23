import { NextResponse } from 'next/server';
import type { WarehouseStockResponse } from '@/lib/types';

const MOCK_RESPONSE: WarehouseStockResponse = {
  stocks: [
    { sizCd: '90', qty: 85 },
    { sizCd: '95', qty: 240 },
    { sizCd: '100', qty: 310 },
    { sizCd: '105', qty: 180 },
    { sizCd: '110', qty: 60 },
  ],
};

// GET /api/warehouse-stock?brandCd=X&prodCd=...&colorCd=...&apCd=...&ssnCd=...
// mock → 고정 응답 / 실 → DRP API Gateway 프록시
export async function GET(req: Request) {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== 'false';

  if (useMock) {
    return NextResponse.json(MOCK_RESPONSE);
  }

  // 실 모드: DRP API Gateway 프록시
  const drpBase = process.env.DRP_API_BASE;
  if (!drpBase) {
    return NextResponse.json(
      { detail: 'DRP_API_BASE 미설정' },
      { status: 500 },
    );
  }

  const drpKey = process.env.DRP_API_KEY;
  const { searchParams } = new URL(req.url);
  const url = `${drpBase}/api-gateway/ilp/ap-stk?${searchParams.toString()}`;
  const timeout = Number(process.env.DRP_STOCK_TIMEOUT_MS) || 15000;
  const headers: Record<string, string> = {};
  if (drpKey) headers['x-api-key'] = drpKey;

  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(timeout),
    });
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { detail: `DRP 비-JSON 응답 (${res.status})` },
        { status: 502 },
      );
    }
    const body = await res.json();

    // DRP envelope unwrap: { data: { stocks: [...] } }
    const data = body.data ?? body;
    return NextResponse.json(data, { status: body.status === 200 ? 200 : res.status });
  } catch (err) {
    return NextResponse.json(
      { detail: `DRP 연결 실패: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }
}
