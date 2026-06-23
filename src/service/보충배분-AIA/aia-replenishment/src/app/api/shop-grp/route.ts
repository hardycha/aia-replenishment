import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import type { ShopGrp } from '@/lib/types';

// GET /api/shop-grp?shopGrpNo=XSHGR...
// 항상 아카이빙 JSON에서 읽음 (Colly /shop-grp 대체)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const shopGrpNo = searchParams.get('shopGrpNo');

  if (!shopGrpNo) {
    return NextResponse.json({ detail: 'shopGrpNo required' }, { status: 400 });
  }

  const archivePath = path.join(process.cwd(), 'data', 'shop_grp_archive.json');
  let archive: Record<string, unknown>;
  try {
    archive = JSON.parse(await readFile(archivePath, 'utf-8'));
  } catch {
    return NextResponse.json({ detail: 'shop_grp_archive.json 로드 실패' }, { status: 500 });
  }

  const entry = archive[shopGrpNo] as
    | { shopGrpNo: string; shopGrpNm: string; shopCnt: number; shops: { shopCd: string; shopNm: string; adjRank: number }[] }
    | undefined;

  if (!entry) {
    return NextResponse.json(
      { detail: `배분그룹이 없거나 USE_YN='Y' 매장이 0건입니다 (${shopGrpNo})` },
      { status: 404 },
    );
  }

  const result: ShopGrp = {
    shopGrpNo: entry.shopGrpNo,
    shopGrpNm: entry.shopGrpNm,
    brandCd: (searchParams.get('brandCd') as ShopGrp['brandCd']) || 'X',
    ssnCd: searchParams.get('ssnCd') || '',
    shopCnt: entry.shopCnt,
    shops: entry.shops.map((s) => ({
      shopCd: s.shopCd,
      shopNm: s.shopNm,
      adjRank: s.adjRank,
    })),
    archivedAt: new Date().toISOString(),
  };

  return NextResponse.json(result);
}
