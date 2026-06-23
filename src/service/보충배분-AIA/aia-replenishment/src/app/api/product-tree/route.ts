import { NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import path from 'path';
import type { CategoryTree, ColorOption, StyleCatalogItem } from '@/lib/types';

// GET /api/product-tree?brandCd=X
// 브랜드별 product_tree_{brandCd}.json 로드 →
// StyleCatalogItem[] + CategoryTree + seasonOptions 변환 반환
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const brandCd = searchParams.get('brandCd');

  if (!brandCd) {
    return NextResponse.json({ detail: 'brandCd required' }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'data', `product_tree_${brandCd}.json`);
  try {
    await access(filePath);
  } catch {
    return NextResponse.json(
      { detail: `브랜드 ${brandCd} 데이터 없음` },
      { status: 404 },
    );
  }

  const raw = JSON.parse(await readFile(filePath, 'utf-8')) as {
    items: {
      brandCd: string; ssnCd: string; prodCd: string; prodNm: string; colorCd: string;
      category1: string; category1Cd: string; category2: string; category2Cd: string;
      category3: string; category3Cd: string;
    }[];
  };

  // ── StyleCatalogItem[] 변환 (prodCd 앞 4자리 브랜드+시즌 제거, 그룹핑, 컬러 집약) ──
  const stripPrefix = (code: string) => code.length > 4 ? code.slice(4) : code;

  const styleMap = new Map<string, StyleCatalogItem>();
  for (const item of raw.items) {
    const styleCd = stripPrefix(item.prodCd);
    const existing = styleMap.get(styleCd);
    const color: ColorOption = { colorCd: item.colorCd, colorNm: item.colorCd };
    if (existing) {
      if (!existing.colors.some((c) => c.colorCd === item.colorCd)) {
        existing.colors.push(color);
      }
    } else {
      styleMap.set(styleCd, {
        prodCd: styleCd,
        prodNm: item.prodNm,
        brandCd: item.brandCd as StyleCatalogItem['brandCd'],
        ssnCd: item.ssnCd,
        category1: item.category1,
        category2: item.category2,
        category3: item.category3,
        colors: [color],
      });
    }
  }
  const styles = Array.from(styleMap.values());

  // ── CategoryTree 변환 ──
  const categoryTree: CategoryTree = {};
  for (const s of styles) {
    if (!categoryTree[s.category1]) categoryTree[s.category1] = {};
    if (!categoryTree[s.category1][s.category2]) categoryTree[s.category1][s.category2] = [];
    if (!categoryTree[s.category1][s.category2].includes(s.category3)) {
      categoryTree[s.category1][s.category2].push(s.category3);
    }
  }

  // ── 시즌 옵션 ──
  const seasonSet = new Set(styles.map((s) => s.ssnCd));
  const seasonOptions = Array.from(seasonSet).sort().reverse();

  return NextResponse.json({ styles, categoryTree, seasonOptions });
}
