#!/usr/bin/env node

/**
 * 일배치: Snowflake → JSON 아카이빙 스크립트
 *
 * Snowflake에서 조회조건 데이터를 뽑아 src/data/ 아래 JSON으로 생성.
 * GitHub Actions 또는 로컬에서 실행.
 *
 * 사용법:
 *   node scripts/sync-snowflake.mjs
 *
 * 환경변수 (Snowflake 접속):
 *   SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, SNOWFLAKE_PASSWORD,
 *   SNOWFLAKE_DATABASE (기본 FNF), SNOWFLAKE_WAREHOUSE
 *
 * 산출 파일 5개:
 *   src/data/brand_archive.json        — 브랜드 목록
 *   src/data/product_tree_archive.json  — 상품 트리 (시즌>대분류>중분류>아이템>스타일>컬러)
 *   src/data/shop_grp_archive.json      — 배분그룹 트리 (배분그룹>매장)
 *   src/data/ssn_archive.json           — 시즌 목록
 *   src/data/category_tree_archive.json — 분류 3계층 트리 (대>중>아이템 한글명)
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'src', 'data');
const out = (name) => join(DATA_DIR, name);

// ═══════════════════════════════════════════════════════════
// Snowflake 접속 (snowflake-sdk 또는 MCP 프록시)
// 이 스크립트는 두 가지 모드로 동작:
//   1. SNOWFLAKE_MODE=sdk  → snowflake-sdk 직접 사용 (CI/GitHub Actions)
//   2. SNOWFLAKE_MODE=mock → 현재 MCP로 뽑은 데이터를 내장 (개발용)
// ═══════════════════════════════════════════════════════════

const MODE = process.env.SNOWFLAKE_MODE || 'mock';

// ── Mock 데이터 (MCP 조회 결과 하드코딩 — 첫 배치용) ────────

async function runQuery(sql) {
  if (MODE === 'sdk') {
    // TODO: snowflake-sdk 연동 (GitHub Actions용)
    throw new Error('SDK 모드 미구현 — SNOWFLAKE_MODE=mock 사용');
  }
  // mock 모드: SQL별 사전 정의 결과 반환
  return MOCK_RESULTS[sql] || [];
}

// 실제 Snowflake MCP로 뽑은 쿼리들을 여기서 실행
const QUERIES = {
  brands: `SELECT BRD_CD, BRD_NM FROM FNF.PRCS.DW_BRD WHERE USE_YN='Y' AND BRD_CD IN ('M','X','V','ST','I') ORDER BY BRD_CD`,

  seasons: `SELECT DISTINCT SESN FROM FNF.PRCS.DW_PRDT WHERE BRD_CD IN ('M','X','V','ST','I') AND SESN IS NOT NULL ORDER BY SESN DESC`,

  categoryTree: `SELECT LVL, ITEM, PARENT_ITEM, ITEM_NM FROM FNF.PRCS.DW_ITEM WHERE USE_YN = true AND LVL IN ('1','2','3') ORDER BY LVL, ITEM`,

  products: `SELECT DISTINCT p.BRD_CD, p.SESN, p.PARENT_PRDT_KIND_CD, p.PRDT_KIND_CD, p.ITEM, p.PRDT_CD, p.PRDT_NM, sc.COLOR_CD
FROM FNF.PRCS.DW_PRDT p
JOIN (SELECT DISTINCT BRD_CD, PRDT_CD, COLOR_CD FROM FNF.PRCS.DW_PRDT_SC) sc
  ON p.BRD_CD = sc.BRD_CD AND p.PRDT_CD = sc.PRDT_CD
WHERE p.BRD_CD IN ('M','X','V','ST','I')
ORDER BY p.BRD_CD, p.SESN DESC, p.PRDT_CD, sc.COLOR_CD`,

  shopGrps: `SELECT g.SHOP_GRP_CD, g.SHOP_GRP_NM, g.BRD_CD
FROM FNF.PRCS.DW_SHOP_GRP g
WHERE g.SHOP_GRP_TYPE = 'ALOC' AND g.BRD_CD IN ('M','X','V','ST','I')
ORDER BY g.BRD_CD, g.SHOP_GRP_NM`,

  shopGrpDetails: `SELECT d.SHOP_GRP_CD, d.BRD_CD, d.SHOP_ID, d.SHOP_RANK, sh.SHOP_NM_SHORT
FROM FNF.PRCS.DW_SHOP_GRP_DTL d
LEFT JOIN FNF.PRCS.DW_SHOP sh ON d.BRD_CD = sh.BRD_CD AND d.SHOP_ID = sh.SHOP_ID
WHERE d.SHOP_GRP_CD IN (
  SELECT SHOP_GRP_CD FROM FNF.PRCS.DW_SHOP_GRP WHERE SHOP_GRP_TYPE = 'ALOC' AND BRD_CD IN ('M','X','V','ST','I')
)
ORDER BY d.SHOP_GRP_CD, d.SHOP_RANK NULLS LAST`,
};

// ═══════════════════════════════════════════════════════════
// JSON 생성 로직
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log(`[sync-snowflake] 모드: ${MODE}`);
  console.log(`[sync-snowflake] 출력: ${DATA_DIR}`);

  // ── 1. brand_archive.json ──
  console.log('\n1/5 브랜드 목록...');
  const brands = await runQuery(QUERIES.brands);
  const brandArchive = {
    items: brands.map(([brdCd, brdNm]) => ({ brandCd: brdCd, brandNm: brdNm })),
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(out('brand_archive.json'), JSON.stringify(brandArchive, null, 2) + '\n');
  console.log(`  ✅ ${brandArchive.items.length}개 브랜드`);

  // ── 2. ssn_archive.json ──
  console.log('\n2/5 시즌 목록...');
  const seasons = await runQuery(QUERIES.seasons);
  const ssnArchive = {
    items: seasons.map(([ssnCd]) => ({ ssnCd })),
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(out('ssn_archive.json'), JSON.stringify(ssnArchive, null, 2) + '\n');
  console.log(`  ✅ ${ssnArchive.items.length}개 시즌`);

  // ── 3. category_tree_archive.json ──
  console.log('\n3/5 분류 트리...');
  const catRows = await runQuery(QUERIES.categoryTree);
  // { 대분류코드: { name, children: { 중분류코드: { name, children: [아이템코드, ...] } } } }
  const catTree = {};
  const itemNameMap = {}; // code → name
  for (const [lvl, item, parentItem, itemNm] of catRows) {
    itemNameMap[item] = itemNm;
    if (lvl === '1') {
      if (!catTree[item]) catTree[item] = { name: itemNm, code: item, children: {} };
    } else if (lvl === '2') {
      if (catTree[parentItem]) {
        catTree[parentItem].children[item] = { name: itemNm, code: item, children: [] };
      }
    } else if (lvl === '3') {
      // 아이템의 parent는 중분류
      for (const cat1 of Object.values(catTree)) {
        if (cat1.children[parentItem]) {
          cat1.children[parentItem].children.push({ code: item, name: itemNm });
        }
      }
    }
  }
  const categoryTreeArchive = { tree: catTree, nameMap: itemNameMap, generatedAt: new Date().toISOString() };
  writeFileSync(out('category_tree_archive.json'), JSON.stringify(categoryTreeArchive, null, 2) + '\n');
  const cat1Count = Object.keys(catTree).length;
  const cat2Count = Object.values(catTree).reduce((s, c) => s + Object.keys(c.children).length, 0);
  console.log(`  ✅ 대분류 ${cat1Count}개, 중분류 ${cat2Count}개`);

  // ── 4. product_tree_archive.json (sc_archive 대체) ──
  console.log('\n4/5 상품 트리...');
  const prodRows = await runQuery(QUERIES.products);
  // 프론트 스키마: { items: [{ brandCd, ssnCd, prodCd, prodNm, colorCd, category1, category2, category3 }] }
  // category1/2/3 = 한글명 (DW_ITEM 매핑)
  const prodItems = prodRows.map(([brdCd, sesn, parentKind, kind, item, prodCd, prodNm, colorCd]) => ({
    brandCd: brdCd,
    ssnCd: sesn,
    prodCd,
    prodNm,
    colorCd,
    category1: itemNameMap[parentKind] || parentKind,
    category1Cd: parentKind,
    category2: itemNameMap[kind] || kind,
    category2Cd: kind,
    category3: itemNameMap[item] || item,
    category3Cd: item,
  }));
  const productTreeArchive = { items: prodItems, generatedAt: new Date().toISOString() };
  writeFileSync(out('product_tree_archive.json'), JSON.stringify(productTreeArchive, null, 2) + '\n');
  const uniqueStyles = new Set(prodItems.map((p) => p.prodCd)).size;
  console.log(`  ✅ ${prodItems.length}행 (${uniqueStyles}개 스타일 x 컬러)`);

  // ── 5. shop_grp_archive.json ──
  console.log('\n5/5 배분그룹 트리...');
  const grpRows = await runQuery(QUERIES.shopGrps);
  const detailRows = await runQuery(QUERIES.shopGrpDetails);

  // 그룹별 매장 매핑
  const detailMap = {};
  for (const [grpCd, , shopId, shopRank, shopNm] of detailRows) {
    if (!detailMap[grpCd]) detailMap[grpCd] = [];
    detailMap[grpCd].push({
      shopCd: shopId,
      shopNm: shopNm || shopId,
      adjRank: shopRank ? Number(shopRank) : 999,
    });
  }

  // shopGrpNo 키 객체 (기존 스키마 유지)
  const shopGrpArchive = {};
  for (const [grpCd, grpNm, brdCd] of grpRows) {
    const shops = detailMap[grpCd] || [];
    shopGrpArchive[grpCd] = {
      shopGrpNo: grpCd,
      shopGrpNm: grpNm,
      brandCd: brdCd,
      shopCnt: shops.length,
      shops: shops.sort((a, b) => a.adjRank - b.adjRank),
    };
  }
  writeFileSync(out('shop_grp_archive.json'), JSON.stringify(shopGrpArchive, null, 2) + '\n');
  console.log(`  ✅ ${Object.keys(shopGrpArchive).length}개 배분그룹, 총 ${detailRows.length}개 매장`);

  console.log('\n🎉 완료');
}

// ═══════════════════════════════════════════════════════════
// Mock 결과 (MCP로 Snowflake 조회한 실데이터 — 첫 배치용)
// 실 SDK 모드에서는 사용되지 않음
// ═══════════════════════════════════════════════════════════
const MOCK_RESULTS = {};

// 이 부분은 실제 Snowflake MCP 호출로 채워야 합니다.
// 지금은 MCP로 직접 JSON을 생성하는 방식으로 진행합니다.

main().catch((e) => {
  console.error('❌ 실패:', e.message);
  process.exit(1);
});
