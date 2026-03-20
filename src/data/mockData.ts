// Mock Data for AIA Replenishment System

export const brands = [
  { code: 'X', name: 'Discovery' },
  { code: 'M', name: 'MLB' },
  { code: 'I', name: 'MLB KIDS' },
  { code: 'V', name: 'Duvetica' },
];

export const apOptions = [
  { value: 'offline_normal', label: '오프라인 정상' },
  { value: 'online', label: '온라인' },
  { value: 'department', label: '백화점' },
];

export const seasons = ['26S', '25F', '25S', '24F'];

export const categories = ['전체', '아우터', '상의', '하의', '용품'];

// KPI Stats
export const kpiStats = {
  totalSC: 1247,
  styleCount: 212,
  avgColors: 5.9,
  aiAccuracy: 82.4,
  accuracyChange: 3.2,
  warehouseStock: 48720,
  totalStock: 62340,
  stockRatio: 78.2,
  shopsNeedReplenishment: 156,
  totalShops: 320,
};

// Pipeline Steps
export const pipelineSteps = [
  { id: 1, label: '판매데이터 수집', status: 'done' },
  { id: 2, label: 'AI 수요예측 (LightGBM)', status: 'done', isAi: true },
  { id: 3, label: 'ILP 보충수량 최적화', status: 'active', isAi: true },
  { id: 4, label: 'MD 검토/수정', status: 'pending' },
  { id: 5, label: '보충 확정', status: 'pending' },
  { id: 6, label: 'RT 생성', status: 'pending' },
];

// Forecast Chart Data
export const forecastChartData = [
  { week: 'W8', actual: 1200, forecast: 1100 },
  { week: 'W9', actual: 1500, forecast: 1440 },
  { week: 'W10', actual: 1640, forecast: 1600 },
  { week: 'W11', actual: 1800, forecast: 1840 },
  { week: 'W12', actual: null, forecast: 1960 },
  { week: 'W13', actual: null, forecast: 2100 },
  { week: 'T+1', actual: null, forecast: 2200 },
  { week: 'T+2', actual: null, forecast: 2300 },
];

// Priority SC List
export const prioritySCList = [
  { rank: 1, scCode: 'DXDJ73041-BKS', item: '바람막이', forecastDemand: 342, warehouseStock: 580, shopStock: 89, aiReplenishment: 253, urgency: 'critical' },
  { rank: 2, scCode: 'DXDJ73041-IVS', item: '바람막이', forecastDemand: 285, warehouseStock: 410, shopStock: 72, aiReplenishment: 213, urgency: 'critical' },
  { rank: 3, scCode: 'DXTS72031-NVS', item: '반팔티', forecastDemand: 198, warehouseStock: 320, shopStock: 105, aiReplenishment: 93, urgency: 'high' },
  { rank: 4, scCode: 'DXPN72011-BKS', item: '팬츠', forecastDemand: 176, warehouseStock: 290, shopStock: 88, aiReplenishment: 88, urgency: 'high' },
  { rank: 5, scCode: 'DXDJ73055-KHS', item: '레저자켓', forecastDemand: 154, warehouseStock: 245, shopStock: 76, aiReplenishment: 78, urgency: 'normal' },
  { rank: 6, scCode: 'DXTS72055-WHS', item: '반팔티', forecastDemand: 142, warehouseStock: 200, shopStock: 63, aiReplenishment: 79, urgency: 'normal' },
  { rank: 7, scCode: 'DXCR72010-BKS', item: '캡', forecastDemand: 131, warehouseStock: 185, shopStock: 52, aiReplenishment: 79, urgency: 'normal' },
];

// Shop Detail Data
export const shopDetailData = [
  {
    shopCode: '10124',
    shopName: '롯데 분당점',
    shopType: '백화점특정',
    grade: 'S+',
    currentStock: 3,
    forecastT1: 8,
    forecastT2: 7,
    safetyStock: 5,
    aiSuggestion: 12,
    mdModified: 12,
    packUnit: 1,
    finalQty: 12,
    status: 'confirmed'
  },
  {
    shopCode: '10089',
    shopName: '신세계 강남점',
    shopType: '백화점특정',
    grade: 'S+',
    currentStock: 2,
    forecastT1: 9,
    forecastT2: 8,
    safetyStock: 5,
    aiSuggestion: 14,
    mdModified: 14,
    packUnit: 1,
    finalQty: 14,
    status: 'pending'
  },
  {
    shopCode: '10201',
    shopName: '현대 판교점',
    shopType: '백화점특정',
    grade: 'A',
    currentStock: 5,
    forecastT1: 6,
    forecastT2: 5,
    safetyStock: 4,
    aiSuggestion: 6,
    mdModified: 6,
    packUnit: 1,
    finalQty: 6,
    status: 'pending'
  },
  {
    shopCode: '20045',
    shopName: '가로수길 직영점',
    shopType: '직영점',
    grade: 'A',
    currentStock: 4,
    forecastT1: 7,
    forecastT2: 6,
    safetyStock: 3,
    aiSuggestion: 8,
    mdModified: 10,
    packUnit: 2,
    finalQty: 10,
    status: 'md_modified',
    diff: 2
  },
  {
    shopCode: '20078',
    shopName: '스타필드 하남점',
    shopType: '쇼핑몰입점',
    grade: 'B',
    currentStock: 6,
    forecastT1: 5,
    forecastT2: 4,
    safetyStock: 3,
    aiSuggestion: 4,
    mdModified: 4,
    packUnit: 2,
    finalQty: 4,
    status: 'pending'
  },
];

// Mapping Data
export const mappingStats = {
  totalStyles: 212,
  aiMapped: 178,
  userConfirmed: 96,
  unmapped: 34,
};

export const mappingData = [
  {
    status: 'confirmed',
    newStyle: 'DXDJ73041',
    newStyleName: '레저 바람막이 자켓',
    item: '바람막이',
    colorCount: 4,
    mappedStyle: 'DXDJ63041',
    mappedStyleName: '레저 바람막이 자켓',
    similarity: 96,
    lastYearSales: 12450,
    mappingType: 'ai'
  },
  {
    status: 'ai_suggested',
    newStyle: 'DXTS72031',
    newStyleName: '에센셜 라운드 반팔티',
    item: '반팔티',
    colorCount: 6,
    mappedStyle: 'DXTS62031',
    mappedStyleName: '에센셜 라운드 반팔티',
    similarity: 92,
    lastYearSales: 18320,
    mappingType: 'ai'
  },
  {
    status: 'ai_suggested',
    newStyle: 'DXDJ73055',
    newStyleName: '레저 마운틴 자켓',
    item: '레저자켓',
    colorCount: 3,
    mappedStyle: 'DXDJ63062, DXDJ63055',
    mappedStyleName: '레저자켓 (1:2 맵핑)',
    similarity: 78,
    lastYearSales: 8920,
    mappingType: 'ai'
  },
  {
    status: 'unmapped',
    newStyle: 'DXNW73001',
    newStyleName: '어반 클라우드 샌들',
    item: '샌들',
    colorCount: 5,
    mappedStyle: null,
    mappedStyleName: '전년 해당 아이템 판매이력 없음',
    similarity: null,
    lastYearSales: null,
    mappingType: 'manual'
  },
  {
    status: 'unmapped',
    newStyle: 'DXBG73010',
    newStyleName: '메쉬 크로스백',
    item: '크로스백',
    colorCount: 3,
    mappedStyle: null,
    mappedStyleName: '신규 카테고리',
    similarity: null,
    lastYearSales: null,
    mappingType: 'manual'
  },
];

// Execution Data - MD Progress
export const mdProgressData = [
  { type: '초도배분', subType: '초도배분', totalQty: 115640, rtQty: 490, styleCount: 435, shopCount: 320 },
  { type: '초도배분', subType: '오픈배분', totalQty: 1374, rtQty: 1358, styleCount: 2, shopCount: 2 },
  { type: '판매분 보충', subType: '판매분 자동 보충', totalQty: 35, rtQty: 11, styleCount: 7, shopCount: 28, isAi: true },
  { type: '판매분 보충', subType: '판매분 수기 보충', totalQty: 135, rtQty: 72, styleCount: 28, shopCount: 45, isAi: true },
  { type: 'MD요청 보충', subType: 'MD요청/생물', totalQty: 328140, rtQty: 3907, styleCount: 332, shopCount: 156 },
];

// Shop Request Progress
export const shopRequestData = [
  { type: '판매 보충', requestQty: 1923, rtQty: 1892, fulfillRate: 98.5, rtCount: 19 },
  { type: '금액단매', requestQty: 17, rtQty: 6, fulfillRate: 35.3, rtCount: 1 },
  { type: '환불RT', requestQty: 3, rtQty: 3, fulfillRate: 100, rtCount: 0 },
  { type: '소량단매', requestQty: 6867, rtQty: 3677, fulfillRate: 54.1, rtCount: 16 },
  { type: '매장 요청 보충', requestQty: 5501, rtQty: 3677, fulfillRate: 66.7, rtCount: 3 },
  { type: '일반RT', requestQty: 508768, rtQty: 508754, fulfillRate: 0, rtCount: 5057 },
];

// RT List Data
export const rtListData = [
  {
    rtId: 'MDIST2603200017990',
    replenishType: 'ai',
    shopCode: '10124',
    shopName: '롯데 분당점',
    season: '26S',
    styleCode: 'DXDJ73041',
    color: 'BKS',
    sizes: '95, 100, 105',
    qty: 12,
    status: 'requested',
    confirmedBy: 'SYSTEM',
    confirmedDate: '2026-03-20',
    shippedDate: null
  },
  {
    rtId: 'MDIST2603200018001',
    replenishType: 'ai',
    shopCode: '10089',
    shopName: '신세계 강남점',
    season: '26S',
    styleCode: 'DXDJ73041',
    color: 'BKS',
    sizes: '90, 95, 100, 105',
    qty: 14,
    status: 'requested',
    confirmedBy: 'SYSTEM',
    confirmedDate: '2026-03-20',
    shippedDate: null
  },
  {
    rtId: 'MDIST2603200018015',
    replenishType: 'md_modified',
    shopCode: '20045',
    shopName: '가로수길 직영점',
    season: '26S',
    styleCode: 'DXDJ73041',
    color: 'BKS',
    sizes: '95, 100',
    qty: 10,
    status: 'md_checking',
    confirmedBy: 'macaroon85',
    confirmedDate: '2026-03-20',
    shippedDate: null
  },
];

// Monitor Stats
export const monitorStats = {
  aiSellThrough: 68.4,
  aiImprovement: 8.2,
  manualSellThrough: 60.2,
  aiStockoutRate: 7.8,
  stockoutImprovement: 4.6,
  forecastAccuracy: 82.4,
  accuracyImprovement: 3.2,
};

// Performance Data
export const performanceData = [
  {
    rtId: 'MDIST260320...',
    type: 'ai',
    styleCode: 'DXDJ73041',
    color: 'BKS',
    size: '95',
    shippedQty: 12,
    sales2WeeksBefore: 8,
    sales2WeeksAfter: 11,
    changePercent: 37.5
  },
  {
    rtId: 'MDIST260318...',
    type: 'manual',
    styleCode: 'DXTS72031',
    color: 'NVS',
    size: '100',
    shippedQty: 8,
    sales2WeeksBefore: 6,
    sales2WeeksAfter: 7,
    changePercent: 16.7
  },
];

// AI Insight Messages
export const aiInsights = {
  forecast: {
    title: 'AI 분석 요약 (2026-03-20 09:00 기준)',
    content: `Discovery 오프라인 정상 AP 26S 기준, <strong>1,247개 SC</strong>에 대한 T+1~T+2 주간 수요예측이 완료되었습니다.
금주 대비 <strong>아우터 카테고리 +12.3%</strong> 수요 증가가 예상되며, 특히 <strong>DXDJ73041(레저 바람막이)</strong> 스타일의
매장 보충이 시급합니다. 물류 가용재고 대비 <strong>87개 SC</strong>에서 부족 예상 → ILP 최적화를 통해 보충 우선순위를 제안드립니다.`,
  },
  mapping: {
    title: 'AI 자동 맵핑 결과 (2026-03-19 실행)',
    content: `Discovery 26S 시즌 <strong>212개 스타일</strong> 중 <strong>178개(84%)</strong>에 대해 전년 유사 스타일 자동 맵핑을 완료했습니다.
같은 ITEM군 + 상품속성 유사도 기반으로 1:N 맵핑을 수행했으며, <strong>평균 신뢰도 87.3%</strong>입니다.
미맵핑 34개 스타일은 신규 카테고리 또는 판매이력 부재로 자동 맵핑이 불가합니다.`,
  },
  monitor: {
    title: '보충 성과 요약 (2026-03 기준)',
    content: `AI 보충 제안을 적용한 매장에서 <strong>평균 판매율 +8.2%p</strong> 향상이 관찰되었습니다.
특히 아우터 카테고리에서 <strong>재고 회전율이 1.4배</strong> 개선되었으며,
품절률은 <strong>기존 12.4% → 7.8%</strong>로 감소했습니다.`,
  },
};
