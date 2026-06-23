import { NextResponse } from 'next/server';
import type { ShopStockResponse } from '@/lib/types';

const SIZES = ['90', '95', '100', '105', '110'];

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs((h >>> 0) / 0xffffffff);
}

// GET /api/shop-stock?brandCd=X&prodCd=...&colorCd=...&ssnCd=...&shopCds=10075,10090
// mock → hashSeed 기반 결정적 생성 / 실 → DRP API Gateway 프록시
export async function GET(req: Request) {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== 'false';
  const { searchParams } = new URL(req.url);

  if (useMock) {
    const prodCd = searchParams.get('prodCd') || '';
    const colorCd = searchParams.get('colorCd') || '';
    const shopCds = (searchParams.get('shopCds') || '').split(',').filter(Boolean);

    const shopStocks = shopCds.flatMap((shopCd) =>
      SIZES.map((sizCd) => ({
        shopCd,
        shopNm: shopCd, // mock에서는 shopCd를 shopNm으로 대체
        sizCd,
        qty: Math.floor(hashSeed(`${prodCd}-${colorCd}-${shopCd}-${sizCd}-stk`) * 10),
      })),
    );

    const result: ShopStockResponse = { shopStocks };
    return NextResponse.json(result);
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
  const url = `${drpBase}/api-gateway/ilp/shop-stk?${searchParams.toString()}`;
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

    // DRP envelope unwrap: { data: { shopStocks: [...] } }
    const data = body.data ?? body;
    return NextResponse.json(data, { status: body.status === 200 ? 200 : res.status });
  } catch (err) {
    return NextResponse.json(
      { detail: `DRP 연결 실패: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }
}
