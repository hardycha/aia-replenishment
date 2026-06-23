import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import brandArchive from '@/data/brand_archive.json';
import ssnArchive from '@/data/ssn_archive.json';

// GET /api/dropdowns?brandCd=X (brandCd 선택)
// 필터바용 드롭다운 데이터 통합 반환
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const brandCd = searchParams.get('brandCd');

  const brands = (brandArchive as { items: { brandCd: string; brandNm: string }[] }).items;
  const seasons = (ssnArchive as { items: { ssnCd: string }[] }).items;

  // 배분그룹: data/shop_grp_archive.json에서 동적 로드 (3.1MB — static import 제거)
  const archivePath = path.join(process.cwd(), 'data', 'shop_grp_archive.json');
  let allGrps: { shopGrpNo: string; shopGrpNm: string; brandCd: string; shopCnt: number }[] = [];
  try {
    const raw = JSON.parse(await readFile(archivePath, 'utf-8')) as Record<
      string,
      { shopGrpNo: string; shopGrpNm: string; brandCd: string; shopCnt: number }
    >;
    allGrps = Object.values(raw);
  } catch {
    // 파일 로드 실패 시 빈 배열
  }

  const shopGrps = brandCd
    ? allGrps.filter((g) => g.brandCd === brandCd)
    : allGrps;

  return NextResponse.json({
    brands: brands.map((b) => ({ value: b.brandCd, label: `${b.brandCd}: ${b.brandNm}` })),
    seasons: seasons.map((s) => ({ value: s.ssnCd, label: s.ssnCd })),
    shopGrps: shopGrps.map((g) => ({
      value: g.shopGrpNo,
      label: `${g.shopGrpNm} (${g.shopCnt}개 매장)`,
    })),
  });
}
