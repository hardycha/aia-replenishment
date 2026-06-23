import { NextResponse } from 'next/server';
import { startOfWeek, parseISO, format } from 'date-fns';
import { readFile, access } from 'fs/promises';
import path from 'path';
import type { ForecastBundle, ForecastRow } from '@/lib/types';

// GET /api/forecast?brandCd=X&prodCd=...&colorCd=...&ssnCd=...&executionDate=2026-04-22
// 항상 아카이빙 JSON에서 읽음 (Colly /forecast 대체)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const brandCd = searchParams.get('brandCd');
  const prodCd = searchParams.get('prodCd');
  const colorCd = searchParams.get('colorCd');
  const ssnCd = searchParams.get('ssnCd');
  const executionDate = searchParams.get('executionDate');

  if (!brandCd || !prodCd || !colorCd || !ssnCd || !executionDate) {
    return NextResponse.json(
      { detail: 'brandCd, prodCd, colorCd, ssnCd, executionDate 모두 필수' },
      { status: 400 },
    );
  }

  // executionDate → W1 (주 월요일)
  const forecastStartDate = format(
    startOfWeek(parseISO(executionDate), { weekStartsOn: 1 }),
    'yyyy-MM-dd',
  );

  // forecast_archive.json 동적 로드 (sync_forecast.py로 갱신 시 반영)
  const archivePath = path.join(process.cwd(), 'data', 'forecast_archive.json');
  let archive: Record<string, unknown>;
  try {
    await access(archivePath);
    archive = JSON.parse(await readFile(archivePath, 'utf-8'));
  } catch {
    return NextResponse.json({ detail: 'forecast_archive.json 없음' }, { status: 500 });
  }

  const key = `${brandCd}_${prodCd}_${colorCd}_${ssnCd}_${forecastStartDate}`;
  const entry = archive[key] as
    | { forecastStartDate: string; forecast: ForecastRow[] }
    | undefined;

  if (!entry) {
    return NextResponse.json(
      { detail: `예측치 없음: ${key}` },
      { status: 404 },
    );
  }

  // shopCds 필터 (선택)
  const shopCdsParam = searchParams.get('shopCds');
  let rows = entry.forecast;
  if (shopCdsParam) {
    const shopSet = new Set(shopCdsParam.split(','));
    rows = rows.filter((r) => shopSet.has(r.shopCd));
  }

  const result: ForecastBundle = {
    prodCd,
    colorCd,
    brandCd: brandCd as ForecastBundle['brandCd'],
    ssnCd,
    forecastStartDate: entry.forecastStartDate,
    rows,
    archivedAt: new Date().toISOString(),
  };

  return NextResponse.json(result);
}
