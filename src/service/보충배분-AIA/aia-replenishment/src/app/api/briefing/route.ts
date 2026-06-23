/**
 * GET /api/briefing?brandCd=X&ssnCd=26S
 *
 * 화면 0 "AI 재고 브리핑" 데이터 서빙.
 * - Mock 모드: mockBriefingData.ts에서 반환
 * - 실 모드: briefing_archive.json에서 반환 (scoring_engine.py가 생성)
 *
 * 설계 문서: /오프라인_재고운용_자동화_설계.md §7-B
 */
import { NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import path from 'path';
import { MOCK_BRIEFING_DATA } from '@/data/mockBriefingData';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const brandCd = searchParams.get('brandCd');
  const ssnCd = searchParams.get('ssnCd');

  if (!brandCd || !ssnCd) {
    return NextResponse.json(
      { detail: 'brandCd, ssnCd 필수' },
      { status: 400 },
    );
  }

  const key = `${brandCd}_${ssnCd}`;

  // 실 데이터: briefing_archive.json이 존재하면 우선 사용
  const archivePath = path.join(process.cwd(), 'data', 'briefing_archive.json');
  try {
    await access(archivePath);
    const archive = JSON.parse(await readFile(archivePath, 'utf-8'));
    if (archive[key]) {
      return NextResponse.json(archive[key]);
    }
  } catch {
    // 파일 없거나 파싱 실패 시 Mock으로 fallback
  }

  // Fallback: Mock 데이터
  const data = MOCK_BRIEFING_DATA[key];
  if (!data) {
    return NextResponse.json(
      { detail: `브리핑 데이터 없음: ${key}` },
      { status: 404 },
    );
  }

  return NextResponse.json(data);
}
