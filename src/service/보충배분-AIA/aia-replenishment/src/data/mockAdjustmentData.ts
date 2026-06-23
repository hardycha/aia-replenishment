// 매장 조정 화면 + 스타일 네비게이터 목업 데이터
// 근거: /보충배분-AIA/task.md Phase 2

import type {
  BrandCd,
  CategoryTree,
  ColorOption,
  ForecastBundle,
  ShopGrp,
  ShopRow,
  ShopStockResponse,
  StockData,
  StyleCatalogItem,
  WarehouseStockResponse,
} from '@/lib/types';

// 사이즈 고정(임시): 실제 상품마다 다름 — API 연동 후 동적 처리
export const MOCK_SIZES = ['90', '95', '100', '105', '110'] as const;

// ──────────────────────────────────────────────────────────────
// 스타일 네비게이터 · 분류 트리 (Snowflake 아카이빙 대체)
// ──────────────────────────────────────────────────────────────
export const CATEGORY_TREE: CategoryTree = {
  상의: {
    티셔츠: ['반팔 티셔츠', '긴팔 티셔츠'],
    셔츠: ['캐주얼 셔츠', '드레스 셔츠'],
    니트: ['스웨터', '가디건'],
  },
  하의: {
    팬츠: ['진', '슬랙스', '조거', '카고'],
    스커트: ['미니', '미디'],
  },
  아우터: {
    자켓: ['트러커자켓', '블레이저', '바시티자켓'],
    후드: ['집업 후드', '풀오버 후드'],
    패딩: ['롱 패딩', '숏 패딩', '베스트'],
  },
  신발: {
    슈즈: ['스니커즈', '러닝화'],
    슬리퍼: ['슬라이드'],
  },
  용품: {
    모자: ['캡', '버킷햇'],
    가방: ['백팩', '크로스백'],
  },
};

// 공통 컬러 팔레트
const COLORS_BASIC: ColorOption[] = [
  { colorCd: 'BKS', colorNm: '블랙' },
  { colorCd: 'IVS', colorNm: '아이보리' },
  { colorCd: 'NVS', colorNm: '네이비' },
];
const COLORS_WARM: ColorOption[] = [
  { colorCd: 'BKS', colorNm: '블랙' },
  { colorCd: 'KHS', colorNm: '카키' },
  { colorCd: 'BGS', colorNm: '베이지' },
];
const COLORS_BRIGHT: ColorOption[] = [
  { colorCd: 'WHS', colorNm: '화이트' },
  { colorCd: 'IVS', colorNm: '아이보리' },
  { colorCd: 'PKS', colorNm: '핑크' },
];
const COLORS_FULL: ColorOption[] = [
  { colorCd: 'BKS', colorNm: '블랙' },
  { colorCd: 'WHS', colorNm: '화이트' },
  { colorCd: 'IVS', colorNm: '아이보리' },
  { colorCd: 'NVS', colorNm: '네이비' },
  { colorCd: 'KHS', colorNm: '카키' },
];

// 스타일 카탈로그 (브랜드 X 기준, 다양한 시즌/카테고리)
export const MOCK_STYLE_CATALOG: StyleCatalogItem[] = [
  // 아우터
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

  // 상의
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

  // 하의
  { prodCd: 'XMPT4210', prodNm: '클래식 조거 팬츠', brandCd: 'X', ssnCd: '26S', category1: '하의', category2: '팬츠', category3: '조거', colors: COLORS_BASIC },
  { prodCd: 'XMPT4320', prodNm: '카고 와이드 팬츠', brandCd: 'X', ssnCd: '26S', category1: '하의', category2: '팬츠', category3: '카고', colors: COLORS_WARM },
  { prodCd: 'XMPT4630', prodNm: '트레이닝 쇼트 팬츠', brandCd: 'X', ssnCd: '26S', category1: '하의', category2: '팬츠', category3: '조거', colors: COLORS_BASIC },
  { prodCd: 'XMPT4850', prodNm: '스트레치 슬랙스', brandCd: 'X', ssnCd: '26S', category1: '하의', category2: '팬츠', category3: '슬랙스', colors: COLORS_WARM },
  { prodCd: 'XMPT4780', prodNm: '데님 와이드 진', brandCd: 'X', ssnCd: '26S', category1: '하의', category2: '팬츠', category3: '진', colors: COLORS_BASIC },

  // 신발 / 용품
  { prodCd: '3ALPS0153', prodNm: '스키퍼 슬라이드', brandCd: 'X', ssnCd: '25S', category1: '신발', category2: '슬리퍼', category3: '슬라이드', colors: COLORS_BASIC },
  { prodCd: 'XAHT2100', prodNm: '버킷햇 로고', brandCd: 'X', ssnCd: '26S', category1: '용품', category2: '모자', category3: '버킷햇', colors: COLORS_BASIC },
  { prodCd: 'XASG2200', prodNm: '크로스백 미니', brandCd: 'X', ssnCd: '26S', category1: '용품', category2: '가방', category3: '크로스백', colors: COLORS_WARM },
];

// 시즌 옵션 (체크박스) — 최신순
export const MOCK_SEASON_OPTIONS: string[] = [
  '26N',
  '26F',
  '26S',
  '25N',
  '25F',
  '25S',
  '24N',
  '24F',
  '24S',
  '23F',
];

// ──────────────────────────────────────────────────────────────
// 매장 조정 (배분그룹·재고·예측)
// ──────────────────────────────────────────────────────────────
export const MOCK_SHOP_GRPS: ShopGrp[] = [
  {
    shopGrpNo: 'XSHGR202512100000003546',
    shopGrpNm: '26S 아우터 전체',
    brandCd: 'X',
    ssnCd: '26S',
    shopCnt: 32,
    shops: [
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
    ],
    archivedAt: '2026-04-22T00:00:00Z',
  },
];

export const MOCK_BRAND_SHOP_POOL: Array<{
  shopCd: string;
  shopNm: string;
  brandCd: BrandCd;
  region: string;
}> = [
  { shopCd: '13001', shopNm: '롯데평촌점', brandCd: 'X', region: '경기' },
  { shopCd: '13002', shopNm: '현대중동점', brandCd: 'X', region: '경기' },
  { shopCd: '13003', shopNm: '신세계천안점', brandCd: 'X', region: '충남' },
  { shopCd: '13004', shopNm: '롯데전주점', brandCd: 'X', region: '전북' },
  { shopCd: '13005', shopNm: '현대킨텍스점', brandCd: 'X', region: '경기' },
  { shopCd: '13006', shopNm: '신세계마산점', brandCd: 'X', region: '경남' },
  { shopCd: '13007', shopNm: '롯데상인점', brandCd: 'X', region: '대구' },
  { shopCd: '13008', shopNm: '갤러리아타임월드', brandCd: 'X', region: '대전' },
  { shopCd: '13009', shopNm: 'AK원주점', brandCd: 'X', region: '강원' },
  { shopCd: '13010', shopNm: '롯데청량리', brandCd: 'X', region: '서울' },
  { shopCd: '13011', shopNm: '현대미아점', brandCd: 'X', region: '서울' },
  { shopCd: '13012', shopNm: '신세계김해점', brandCd: 'X', region: '경남' },
];

export const MOCK_WAREHOUSE_STOCK: WarehouseStockResponse = {
  stocks: [
    { sizCd: '90', qty: 85 },
    { sizCd: '95', qty: 240 },
    { sizCd: '100', qty: 310 },
    { sizCd: '105', qty: 180 },
    { sizCd: '110', qty: 60 },
  ],
};

// 결정적 랜덤 (prodCd+colorCd+shopCd+sizCd 시드 기반) → 조합마다 서로 다르지만 재현 가능
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 0~1 float
  return Math.abs((h >>> 0) / 0xffffffff);
}

export function mockShopStock(
  shopCds: string[],
  shops: ShopGrp['shops'],
  prodCd = 'DMDJ61046',
  colorCd = 'BKS',
): ShopStockResponse {
  const nameMap = new Map(shops.map((s) => [s.shopCd, s.shopNm]));
  const poolNameMap = new Map(
    MOCK_BRAND_SHOP_POOL.map((s) => [s.shopCd, s.shopNm]),
  );
  const shopStocks = shopCds.flatMap((shopCd) =>
    MOCK_SIZES.map((sizCd) => ({
      shopCd,
      shopNm: nameMap.get(shopCd) ?? poolNameMap.get(shopCd) ?? shopCd,
      sizCd,
      qty: Math.floor(hashSeed(`${prodCd}-${colorCd}-${shopCd}-${sizCd}-stk`) * 10),
    })),
  );
  return { shopStocks };
}

export function mockForecast(
  shopCds: string[],
  prodCd = 'DMDJ61046',
  colorCd = 'BKS',
  ssnCd = '26S',
  forecastStartDate = '2026-04-20',
): ForecastBundle {
  const rows = shopCds.flatMap((shopCd) =>
    MOCK_SIZES.map((sizCd) => ({
      shopCd,
      sizCd,
      qty:
        Math.floor(hashSeed(`${prodCd}-${colorCd}-${shopCd}-${sizCd}-fc`) * 18) +
        1,
    })),
  );
  return {
    prodCd,
    colorCd,
    brandCd: 'X',
    ssnCd,
    forecastStartDate,
    rows,
    archivedAt: '2026-04-22T00:00:00Z',
  };
}

/**
 * 특정 스타일+컬러 조합에 대해 매장 조정용 데이터(ShopRow[], StockData) 생성
 * 여러 조합 각각 호출하여 탭별 데이터 세트를 만든다.
 */
export function buildMockAdjustmentData(
  shopGrpNo: string,
  prodCd: string,
  colorCd: string,
  ssnCd = '26S',
): {
  shopGrp: ShopGrp;
  shops: ShopRow[];
  stockData: StockData;
  prodCd: string;
  colorCd: string;
} {
  const shopGrp =
    MOCK_SHOP_GRPS.find((g) => g.shopGrpNo === shopGrpNo) ?? MOCK_SHOP_GRPS[0];
  const shopCds = shopGrp.shops.map((s) => s.shopCd);
  const stockRes = mockShopStock(shopCds, shopGrp.shops, prodCd, colorCd);
  const forecast = mockForecast(shopCds, prodCd, colorCd, ssnCd);

  const stockData: StockData = {};
  for (const item of stockRes.shopStocks) {
    const key = `${item.shopCd}_${prodCd}_${colorCd}_${item.sizCd}`;
    stockData[key] = { stock: item.qty, forecast: 0, alloc: 0 };
  }
  for (const f of forecast.rows) {
    const key = `${f.shopCd}_${prodCd}_${colorCd}_${f.sizCd}`;
    if (!stockData[key]) stockData[key] = { stock: 0, forecast: 0, alloc: 0 };
    stockData[key].forecast = f.qty;
  }

  const shops: ShopRow[] = shopGrp.shops.map((s) => {
    let fcTot = 0;
    let stTot = 0;
    for (const sz of MOCK_SIZES) {
      const k = `${s.shopCd}_${prodCd}_${colorCd}_${sz}`;
      fcTot += stockData[k]?.forecast ?? 0;
      stTot += stockData[k]?.stock ?? 0;
    }
    return {
      shopCd: s.shopCd,
      shopNm: s.shopNm,
      adjRank: s.adjRank,
      forecastTotal: fcTot,
      demandIndex: 0,
      currentStockTotal: stTot,
      removed: false,
    };
  });

  return { shopGrp, shops, stockData, prodCd, colorCd };
}
