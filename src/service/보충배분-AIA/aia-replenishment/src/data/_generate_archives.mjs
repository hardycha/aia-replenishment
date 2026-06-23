/**
 * 아카이빙 JSON 생성 스크립트 (1회성)
 * mockAdjustmentData.ts 상수를 Colly API 스키마로 변환
 * 실행: node src/data/_generate_archives.mjs
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = (name) => join(__dirname, name);

// ── hashSeed (mockAdjustmentData.ts 와 동일) ──
function hashSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs((h >>> 0) / 0xffffffff);
}

// ── 원본 데이터 (mockAdjustmentData.ts 그대로) ──
const SIZES = ['90', '95', '100', '105', '110'];
const SEASON_OPTIONS = ['26N','26F','26S','25N','25F','25S','24N','24F','24S','23F'];

const COLORS_BASIC = [
  { colorCd: 'BKS', colorNm: '블랙' },
  { colorCd: 'IVS', colorNm: '아이보리' },
  { colorCd: 'NVS', colorNm: '네이비' },
];
const COLORS_WARM = [
  { colorCd: 'BKS', colorNm: '블랙' },
  { colorCd: 'KHS', colorNm: '카키' },
  { colorCd: 'BGS', colorNm: '베이지' },
];
const COLORS_BRIGHT = [
  { colorCd: 'WHS', colorNm: '화이트' },
  { colorCd: 'IVS', colorNm: '아이보리' },
  { colorCd: 'PKS', colorNm: '핑크' },
];
const COLORS_FULL = [
  { colorCd: 'BKS', colorNm: '블랙' },
  { colorCd: 'WHS', colorNm: '화이트' },
  { colorCd: 'IVS', colorNm: '아이보리' },
  { colorCd: 'NVS', colorNm: '네이비' },
  { colorCd: 'KHS', colorNm: '카키' },
];

// category1 → prdtKindCd 매핑
const KIND_MAP = { '아우터': 'OUTR', '상의': 'TOPS', '하의': 'BTTM', '신발': 'SHOE', '용품': 'ACCS' };

const STYLE_CATALOG = [
  { prodCd: '3ADKM0351', prodNm: '클래식 모노그램 그라데이션 자카드 데님 트러커자켓', brandCd: 'X', ssnCd: '25S', category1: '아우터', category2: '자켓', category3: '트러커자켓', colors: COLORS_BASIC },
  { prodCd: 'XJWT7341', prodNm: '경량 바람막이 자켓', brandCd: 'X', ssnCd: '26S', category1: '아우터', category2: '자켓', category3: '블레이저', colors: COLORS_BASIC },
  { prodCd: 'XJOT5230', prodNm: '오버핏 코치 자켓', brandCd: 'X', ssnCd: '26F', category1: '아우터', category2: '자켓', category3: '블레이저', colors: COLORS_WARM },
  { prodCd: '3AJPM0951', prodNm: '다이아 모노그램 저지 JQD 소매TAPE 바시티자켓(홑겹)', brandCd: 'X', ssnCd: '25S', category1: '아우터', category2: '자켓', category3: '바시티자켓', colors: COLORS_BASIC },
  { prodCd: 'DMDJ61046', prodNm: '모노그램 퀼팅 베스트', brandCd: 'X', ssnCd: '25F', category1: '아우터', category2: '패딩', category3: '베스트', colors: COLORS_BASIC },
  { prodCd: 'XJVT6310', prodNm: '경량 다운 베스트', brandCd: 'X', ssnCd: '25F', category1: '아우터', category2: '패딩', category3: '베스트', colors: COLORS_BASIC },
  { prodCd: '3AHDB0851', prodNm: '베이직 스티치 엠보 메가로고 후드티', brandCd: 'X', ssnCd: '25S', category1: '아우터', category2: '후드', category3: '풀오버 후드', colors: COLORS_FULL },
  { prodCd: '3AHDM0351', prodNm: '클래식 모노그램 테이프 후드티', brandCd: 'X', ssnCd: '25S', category1: '아우터', category2: '후드', category3: '풀오버 후드', colors: COLORS_BASIC },
  { prodCd: '3AHDV0551', prodNm: '바시티 빈티지 스몰 그래픽 후드티', brandCd: 'X', ssnCd: '25S', category1: '아우터', category2: '후드', category3: '풀오버 후드', colors: COLORS_WARM },
  { prodCd: 'XJOT5960', prodNm: '플리스 집업 후드', brandCd: 'X', ssnCd: '25F', category1: '아우터', category2: '후드', category3: '집업 후드', colors: COLORS_WARM },
  { prodCd: '3ADRB0151', prodNm: '베이직 그라데이션 쿠퍼스 데님셔츠', brandCd: 'X', ssnCd: '25S', category1: '상의', category2: '셔츠', category3: '캐주얼 셔츠', colors: COLORS_BASIC },
  { prodCd: '3ADRG0351', prodNm: '메가그램 멀티사이즈 데님셔츠', brandCd: 'X', ssnCd: '25S', category1: '상의', category2: '셔츠', category3: '캐주얼 셔츠', colors: COLORS_BASIC },
  { prodCd: '3ADRM0451', prodNm: '클래식 모노그램 컬러 그라데이션 빅럭스 데님셔츠', brandCd: 'X', ssnCd: '25S', category1: '상의', category2: '셔츠', category3: '드레스 셔츠', colors: COLORS_WARM },
  { prodCd: '3ADRM0853', prodNm: '클래식 모노그램 그라데이션 자카드 반팔 데님셔츠', brandCd: 'X', ssnCd: '25S', category1: '상의', category2: '티셔츠', category3: '반팔 티셔츠', colors: COLORS_BASIC },
  { prodCd: 'XMST3120', prodNm: '에센셜 반팔 티셔츠', brandCd: 'X', ssnCd: '26S', category1: '상의', category2: '티셔츠', category3: '반팔 티셔츠', colors: COLORS_FULL },
  { prodCd: 'XMST3250', prodNm: '그래픽 오버핏 반팔 티셔츠', brandCd: 'X', ssnCd: '26S', category1: '상의', category2: '티셔츠', category3: '반팔 티셔츠', colors: COLORS_BRIGHT },
  { prodCd: 'XMST3380', prodNm: '쿨링 메쉬 반팔 티셔츠', brandCd: 'X', ssnCd: '26S', category1: '상의', category2: '티셔츠', category3: '반팔 티셔츠', colors: COLORS_WARM },
  { prodCd: 'XMST3510', prodNm: '빅로고 크롭 티셔츠', brandCd: 'X', ssnCd: '26S', category1: '상의', category2: '티셔츠', category3: '반팔 티셔츠', colors: COLORS_BRIGHT },
  { prodCd: '3AKCM0151', prodNm: '다이아 모노그램 전판 버튼 가디건', brandCd: 'X', ssnCd: '25S', category1: '상의', category2: '니트', category3: '가디건', colors: COLORS_BASIC },
  { prodCd: '3AKCM0251', prodNm: '클래식 모노그램 톤톤 버튼 가디건', brandCd: 'X', ssnCd: '25S', category1: '상의', category2: '니트', category3: '가디건', colors: COLORS_WARM },
  { prodCd: '3AKCV0151', prodNm: '베이직 바시티 버튼 가디건', brandCd: 'X', ssnCd: '25S', category1: '상의', category2: '니트', category3: '가디건', colors: COLORS_BASIC },
  { prodCd: 'XMPT4210', prodNm: '클래식 조거 팬츠', brandCd: 'X', ssnCd: '26S', category1: '하의', category2: '팬츠', category3: '조거', colors: COLORS_BASIC },
  { prodCd: 'XMPT4320', prodNm: '카고 와이드 팬츠', brandCd: 'X', ssnCd: '26S', category1: '하의', category2: '팬츠', category3: '카고', colors: COLORS_WARM },
  { prodCd: 'XMPT4630', prodNm: '트레이닝 쇼트 팬츠', brandCd: 'X', ssnCd: '26S', category1: '하의', category2: '팬츠', category3: '조거', colors: COLORS_BASIC },
  { prodCd: 'XMPT4850', prodNm: '스트레치 슬랙스', brandCd: 'X', ssnCd: '26S', category1: '하의', category2: '팬츠', category3: '슬랙스', colors: COLORS_WARM },
  { prodCd: 'XMPT4780', prodNm: '데님 와이드 진', brandCd: 'X', ssnCd: '26S', category1: '하의', category2: '팬츠', category3: '진', colors: COLORS_BASIC },
  { prodCd: '3ALPS0153', prodNm: '스키퍼 슬라이드', brandCd: 'X', ssnCd: '25S', category1: '신발', category2: '슬리퍼', category3: '슬라이드', colors: COLORS_BASIC },
  { prodCd: 'XAHT2100', prodNm: '버킷햇 로고', brandCd: 'X', ssnCd: '26S', category1: '용품', category2: '모자', category3: '버킷햇', colors: COLORS_BASIC },
  { prodCd: 'XASG2200', prodNm: '크로스백 미니', brandCd: 'X', ssnCd: '26S', category1: '용품', category2: '가방', category3: '크로스백', colors: COLORS_WARM },
];

const SHOPS = [
  { shopCd: '10075', shopNm: '신세계본점', adjRank: 1 },
  { shopCd: '10090', shopNm: '신세계영등포', adjRank: 2 },
  { shopCd: '10124', shopNm: '롯데분당점', adjRank: 3 },
  { shopCd: '10089', shopNm: '신세계강남점', adjRank: 4 },
  { shopCd: '10201', shopNm: '현대판교점', adjRank: 5 },
  { shopCd: '10055', shopNm: '현대본점', adjRank: 6 },
  { shopCd: '10301', shopNm: '롯데잠실점', adjRank: 7 },
  { shopCd: '10402', shopNm: '신세계센텀시티', adjRank: 8 },
  { shopCd: '10503', shopNm: '롯데부산본점', adjRank: 9 },
  { shopCd: '10604', shopNm: '현대더현대서울', adjRank: 10 },
  { shopCd: '10705', shopNm: '갤러리아명품관', adjRank: 11 },
  { shopCd: '10806', shopNm: 'AK수원점', adjRank: 12 },
  { shopCd: '10907', shopNm: '롯데동부산점', adjRank: 13 },
  { shopCd: '11008', shopNm: '스타필드하남', adjRank: 14 },
  { shopCd: '11109', shopNm: '현대천호점', adjRank: 15 },
  { shopCd: '11210', shopNm: '롯데울산점', adjRank: 16 },
  { shopCd: '11311', shopNm: '신세계대전점', adjRank: 17 },
  { shopCd: '11412', shopNm: '갤러리아광교', adjRank: 18 },
  { shopCd: '11513', shopNm: 'AK분당점', adjRank: 19 },
  { shopCd: '11614', shopNm: '롯데광복점', adjRank: 20 },
  { shopCd: '11715', shopNm: '현대울산점', adjRank: 21 },
  { shopCd: '11816', shopNm: '롯데창원점', adjRank: 22 },
  { shopCd: '11917', shopNm: '신세계광주점', adjRank: 23 },
  { shopCd: '12018', shopNm: '현대대구점', adjRank: 24 },
  { shopCd: '12119', shopNm: '롯데포항점', adjRank: 25 },
  { shopCd: '12220', shopNm: 'AK홍대점', adjRank: 26 },
  { shopCd: '12321', shopNm: '롯데중동점', adjRank: 27 },
  { shopCd: '12422', shopNm: '현대신촌점', adjRank: 28 },
  { shopCd: '12523', shopNm: '신세계의정부', adjRank: 29 },
  { shopCd: '12624', shopNm: '롯데일산점', adjRank: 30 },
  { shopCd: '12725', shopNm: '현대김포점', adjRank: 31 },
  { shopCd: '12826', shopNm: '롯데구리점', adjRank: 32 },
];

const FORECAST_START_DATE = '2026-04-20';

// ═══════════════════════════════════════════════════════════
// 1. ssn_archive.json
// ═══════════════════════════════════════════════════════════
const ssn = { items: SEASON_OPTIONS.map((ssnCd) => ({ ssnCd })) };
writeFileSync(out('ssn_archive.json'), JSON.stringify(ssn, null, 2) + '\n');
console.log(`✅ ssn_archive.json — ${ssn.items.length} items`);

// ═══════════════════════════════════════════════════════════
// 2. shop_grp_dropdown_archive.json
// ═══════════════════════════════════════════════════════════
const dropdown = {
  items: [
    { shopGrpNo: 'XSHGR202512100000003546', shopGrpNm: '26S 아우터 전체' },
  ],
};
writeFileSync(out('shop_grp_dropdown_archive.json'), JSON.stringify(dropdown, null, 2) + '\n');
console.log(`✅ shop_grp_dropdown_archive.json — ${dropdown.items.length} items`);

// ═══════════════════════════════════════════════════════════
// 3. sc_archive.json  (스타일 × 컬러 플랫 전개)
// ═══════════════════════════════════════════════════════════
const scItems = [];
for (const s of STYLE_CATALOG) {
  for (const c of s.colors) {
    scItems.push({
      brandCd: s.brandCd,
      ssnCd: s.ssnCd,
      prodCd: s.prodCd,
      colorCd: c.colorCd,
      prodNm: `${s.prodNm} ${c.colorNm}`,
      item: s.category3.toUpperCase().replace(/\s+/g, ''),
      prdtKindCd: KIND_MAP[s.category1] || s.category1,
    });
  }
}
writeFileSync(out('sc_archive.json'), JSON.stringify({ items: scItems }, null, 2) + '\n');
console.log(`✅ sc_archive.json — ${scItems.length} items (${STYLE_CATALOG.length} styles × colors)`);

// ═══════════════════════════════════════════════════════════
// 4. shop_grp_archive.json  (shopGrpNo 키 객체)
// ═══════════════════════════════════════════════════════════
const shopGrpArchive = {
  'XSHGR202512100000003546': {
    shopGrpNo: 'XSHGR202512100000003546',
    shopGrpNm: '26S 아우터 전체',
    shopCnt: 32,
    shops: SHOPS.map((s) => ({ shopCd: s.shopCd, shopNm: s.shopNm, adjRank: s.adjRank })),
  },
};
writeFileSync(out('shop_grp_archive.json'), JSON.stringify(shopGrpArchive, null, 2) + '\n');
console.log(`✅ shop_grp_archive.json — ${Object.keys(shopGrpArchive).length} groups, ${SHOPS.length} shops`);

// ═══════════════════════════════════════════════════════════
// 5. forecast_archive.json  (복합키 객체, hashSeed 기반)
// ═══════════════════════════════════════════════════════════
const forecastArchive = {};
for (const s of STYLE_CATALOG) {
  for (const c of s.colors) {
    const key = `${s.brandCd}_${s.prodCd}_${c.colorCd}_${s.ssnCd}_${FORECAST_START_DATE}`;
    const forecast = [];
    for (const shop of SHOPS) {
      for (const sizCd of SIZES) {
        const qty = Math.floor(hashSeed(`${s.prodCd}-${c.colorCd}-${shop.shopCd}-${sizCd}-fc`) * 18) + 1;
        forecast.push({ shopCd: shop.shopCd, sizCd, qty });
      }
    }
    forecastArchive[key] = { forecastStartDate: FORECAST_START_DATE, forecast };
  }
}
writeFileSync(out('forecast_archive.json'), JSON.stringify(forecastArchive, null, 2) + '\n');
console.log(`✅ forecast_archive.json — ${Object.keys(forecastArchive).length} keys, ${SHOPS.length * SIZES.length} rows each`);

console.log('\n🎉 완료');
