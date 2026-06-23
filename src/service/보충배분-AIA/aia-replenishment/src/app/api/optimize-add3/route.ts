/**
 * ⚠️ 테스트 전용 API Route — 실 배포 시 제거할 것
 *
 * POST /api/optimize-add3
 * Colly ILP 서버의 /optimize-add3 엔드포인트를 프록시.
 * TargetStock = ForecastDemand + 3 (PresentationStock + SafetyStock) 버전.
 * 기존 /api/optimize와 동일한 인풋/아웃풋, ILP 목적함수만 다름.
 */
import { NextResponse } from 'next/server';
import type { OptimizeRequest } from '@/lib/types';

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
    // Mock 모드에서는 기존 /optimize와 동일하게 동작 (테스트 의미 없음)
    return NextResponse.json(
      { detail: 'optimize-add3는 Mock 모드에서 지원하지 않습니다. USE_MOCK_API=false로 설정하세요.' },
      { status: 501 },
    );
  }

  // 실 모드: Colly ILP 서버 /optimize-add3 호출
  const ilpBase = process.env.ILP_API_BASE;
  if (!ilpBase) {
    return NextResponse.json(
      { detail: 'ILP_API_BASE 미설정' },
      { status: 500 },
    );
  }

  const timeout = Number(process.env.DRP_ILP_TIMEOUT_MS) || 120000;
  try {
    const res = await fetch(`${ilpBase}/optimize-add3`, {
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
    console.log('[ILP-ADD3 DEBUG] 요청 요약:', {
      brandCd: body.brandCd,
      prodCd: body.prodCd,
      colorCd: body.colorCd,
      targetShopCount: body.targetShops?.length,
    });
    if (!res.ok) {
      console.log('[ILP-ADD3 DEBUG] 에러 응답:', JSON.stringify(data));
      const detail = data.detail ?? data.message ?? JSON.stringify(data);
      return NextResponse.json({ detail }, { status: res.status });
    }
    console.log('[ILP-ADD3 DEBUG] 응답 요약:', {
      status: data.status,
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
