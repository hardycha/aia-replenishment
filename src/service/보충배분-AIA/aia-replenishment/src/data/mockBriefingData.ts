/**
 * Mock 브리핑 데이터 — 화면 0 "AI 재고 브리핑" 개발용
 *
 * 설계 문서: /오프라인_재고운용_자동화_설계.md §4-2, §7-B
 * 실 운영 시: scoring_engine.py가 briefing_archive.json을 생성하여 대체
 *
 * 구조: BriefingData → summary + sc_list[]
 * 각 SC에는 priority_score, signal_type, coverage_weeks, rt_score 등 포함
 */

// ── 타입 정의 ──

export interface BriefingSummary {
  total_sc: number;
  urgent_count: number;
  rt_count: number;
  trend_count: number;
  normal_count: number;
  narrative: string;
}

export interface BriefingSc {
  sc_cd: string;
  prod_cd: string;
  color_cd: string;
  prod_nm: string;
  category: string;
  priority_score: number;
  priority_axes: {
    coverage_urgency: number;
    rt_score: number;
    velocity_signal: number;
  };
  signal_type: 'urgent' | 'rt' | 'trend' | 'normal';
  ap_stock: number;
  weekly_forecast: number;
  coverage_weeks: number;
  broken_shops: number;
  broken_sizes: string[];
  velocity_change_pct: number;
  ai_reason: string;
  /** 보충 시 우선 대상 매장 코드 (상위 N개) */
  top_shops_to_replenish: string[];
}

export interface BriefingData {
  generated_at: string;
  brand_cd: string;
  ssn_cd: string;
  summary: BriefingSummary;
  sc_list: BriefingSc[];
}

// ── Mock 데이터 ──

const MOCK_URGENT: BriefingSc[] = [
  {
    sc_cd: 'X_DMTS71063_BKS',
    prod_cd: 'DMTS71063',
    color_cd: 'BKS',
    prod_nm: '에센셜 우븐 트레이닝 세트 BLACK',
    category: '트레이닝셋업',
    priority_score: 0.92,
    priority_axes: { coverage_urgency: 0.95, rt_score: 0.12, velocity_signal: 0.72 },
    signal_type: 'urgent',
    ap_stock: 18,
    weekly_forecast: 42.5,
    coverage_weeks: 0.42,
    broken_shops: 14,
    broken_sizes: ['95', '100', '105'],
    velocity_change_pct: 36,
    ai_reason: '상위 14개 매장 95·100·105 사이즈 소진. AP 18개 기준 0.4주 커버. 판매속도 +36% 상승 중.',
    top_shops_to_replenish: ['10075', '10090', '10089', '30025', '50137'],
  },
  {
    sc_cd: 'X_DMRS73063_BKS',
    prod_cd: 'DMRS73063',
    color_cd: 'BKS',
    prod_nm: '클래식 러닝 쇼츠 BLACK',
    category: '하의',
    priority_score: 0.88,
    priority_axes: { coverage_urgency: 0.90, rt_score: 0.08, velocity_signal: 0.65 },
    signal_type: 'urgent',
    ap_stock: 25,
    weekly_forecast: 38.2,
    coverage_weeks: 0.65,
    broken_shops: 11,
    broken_sizes: ['95', '100'],
    velocity_change_pct: 32,
    ai_reason: '상위 11개 매장 95·100 사이즈 소진. AP 25개 기준 0.7주 커버. 판매속도 +32% 상승 중.',
    top_shops_to_replenish: ['10075', '10090', '30046', '50063'],
  },
  {
    sc_cd: 'X_DXRS75063_BKS',
    prod_cd: 'DXRS75063',
    color_cd: 'BKS',
    prod_nm: '레귤러핏 반팔 래쉬가드 BLACK',
    category: '스윔',
    priority_score: 0.85,
    priority_axes: { coverage_urgency: 0.85, rt_score: 0.05, velocity_signal: 0.80 },
    signal_type: 'urgent',
    ap_stock: 32,
    weekly_forecast: 35.1,
    coverage_weeks: 0.91,
    broken_shops: 8,
    broken_sizes: ['100', '105'],
    velocity_change_pct: 52,
    ai_reason: '상위 8개 매장 100·105 소진. AP 32개 기준 0.9주 커버. 판매속도 +52% 급상승.',
    top_shops_to_replenish: ['10075', '10090', '10089'],
  },
  {
    sc_cd: 'X_DMTP63063_BKS',
    prod_cd: 'DMTP63063',
    color_cd: 'BKS',
    prod_nm: '에센셜 트레이닝 팬츠 BLACK',
    category: '하의',
    priority_score: 0.83,
    priority_axes: { coverage_urgency: 0.82, rt_score: 0.10, velocity_signal: 0.55 },
    signal_type: 'urgent',
    ap_stock: 15,
    weekly_forecast: 28.4,
    coverage_weeks: 0.53,
    broken_shops: 9,
    broken_sizes: ['100'],
    velocity_change_pct: 27,
    ai_reason: '상위 9개 매장 100 사이즈 소진. AP 15개 기준 0.5주 커버.',
    top_shops_to_replenish: ['10075', '30025', '50137'],
  },
  {
    sc_cd: 'X_DMRS63063_WHS',
    prod_cd: 'DMRS63063',
    color_cd: 'WHS',
    prod_nm: '클래식 러닝 쇼츠 WHITE',
    category: '하의',
    priority_score: 0.80,
    priority_axes: { coverage_urgency: 0.78, rt_score: 0.15, velocity_signal: 0.60 },
    signal_type: 'urgent',
    ap_stock: 20,
    weekly_forecast: 24.8,
    coverage_weeks: 0.81,
    broken_shops: 7,
    broken_sizes: ['95', '100', '105'],
    velocity_change_pct: 30,
    ai_reason: '상위 7개 매장 95·100·105 소진. AP 20개 기준 0.8주 커버. 판매속도 +30% 상승.',
    top_shops_to_replenish: ['10075', '10090', '30046'],
  },
  {
    sc_cd: 'X_DWTR97063_BKS',
    prod_cd: 'DWTR97063',
    color_cd: 'BKS',
    prod_nm: '우먼스 트레이닝 세트 BLACK',
    category: '트레이닝셋업',
    priority_score: 0.78,
    priority_axes: { coverage_urgency: 0.80, rt_score: 0.06, velocity_signal: 0.50 },
    signal_type: 'urgent',
    ap_stock: 12,
    weekly_forecast: 18.6,
    coverage_weeks: 0.65,
    broken_shops: 6,
    broken_sizes: ['90', '95'],
    velocity_change_pct: 25,
    ai_reason: '상위 6개 매장 90·95 소진. AP 12개 기준 0.6주 커버.',
    top_shops_to_replenish: ['10075', '10090'],
  },
  {
    sc_cd: 'X_DMTS81063_BGL',
    prod_cd: 'DMTS81063',
    color_cd: 'BGL',
    prod_nm: '프리미엄 쿨링 트레이닝 세트 BEIGE',
    category: '트레이닝셋업',
    priority_score: 0.75,
    priority_axes: { coverage_urgency: 0.75, rt_score: 0.10, velocity_signal: 0.45 },
    signal_type: 'urgent',
    ap_stock: 28,
    weekly_forecast: 22.3,
    coverage_weeks: 1.26,
    broken_shops: 5,
    broken_sizes: ['105'],
    velocity_change_pct: 22,
    ai_reason: '상위 5개 매장 105 사이즈 소진. AP 28개 기준 1.3주 커버.',
    top_shops_to_replenish: ['10075', '30025'],
  },
  {
    sc_cd: 'X_DXTB7A063_BKS',
    prod_cd: 'DXTB7A063',
    color_cd: 'BKS',
    prod_nm: '익스플로러 반팔티 BLACK',
    category: '이너',
    priority_score: 0.72,
    priority_axes: { coverage_urgency: 0.72, rt_score: 0.08, velocity_signal: 0.42 },
    signal_type: 'urgent',
    ap_stock: 35,
    weekly_forecast: 26.1,
    coverage_weeks: 1.34,
    broken_shops: 4,
    broken_sizes: ['100', '105'],
    velocity_change_pct: 21,
    ai_reason: '상위 4개 매장 100·105 소진. AP 35개 기준 1.3주 커버.',
    top_shops_to_replenish: ['10075', '10090'],
  },
];

const MOCK_RT: BriefingSc[] = [
  {
    sc_cd: 'X_DMWJ7G063_BKS',
    prod_cd: 'DMWJ7G063',
    color_cd: 'BKS',
    prod_nm: '모노그램 윈드자켓 BLACK',
    category: '아우터',
    priority_score: 0.68,
    priority_axes: { coverage_urgency: 0.20, rt_score: 0.72, velocity_signal: 0.30 },
    signal_type: 'rt',
    ap_stock: 5,
    weekly_forecast: 15.2,
    coverage_weeks: 0.33,
    broken_shops: 8,
    broken_sizes: ['100', '105'],
    velocity_change_pct: 15,
    ai_reason: 'AP 거의 고갈(5개). 하위 매장 과잉 재고 — 상위 8개 매장으로 RT 권장.',
    top_shops_to_replenish: ['10075', '10090', '30025'],
  },
  {
    sc_cd: 'X_DMWJ7K063_BKS',
    prod_cd: 'DMWJ7K063',
    color_cd: 'BKS',
    prod_nm: '클래식 윈드자켓 BLACK',
    category: '아우터',
    priority_score: 0.64,
    priority_axes: { coverage_urgency: 0.15, rt_score: 0.68, velocity_signal: 0.25 },
    signal_type: 'rt',
    ap_stock: 3,
    weekly_forecast: 12.8,
    coverage_weeks: 0.23,
    broken_shops: 6,
    broken_sizes: ['95', '100'],
    velocity_change_pct: 12,
    ai_reason: 'AP 고갈(3개). 하위 매장 과잉 재고 — 상위 6개 매장으로 RT 권장.',
    top_shops_to_replenish: ['10075', '10090'],
  },
  {
    sc_cd: 'X_DWPT74063_BKS',
    prod_cd: 'DWPT74063',
    color_cd: 'BKS',
    prod_nm: '우먼스 와이드 팬츠 BLACK',
    category: '하의',
    priority_score: 0.61,
    priority_axes: { coverage_urgency: 0.10, rt_score: 0.65, velocity_signal: 0.20 },
    signal_type: 'rt',
    ap_stock: 8,
    weekly_forecast: 11.5,
    coverage_weeks: 0.70,
    broken_shops: 5,
    broken_sizes: ['90'],
    velocity_change_pct: 10,
    ai_reason: 'AP 부족(8개). 하위 매장 과잉 — 상위 5개 매장으로 RT 권장.',
    top_shops_to_replenish: ['10075'],
  },
  {
    sc_cd: 'X_DXTR7A063_GRD',
    prod_cd: 'DXTR7A063',
    color_cd: 'GRD',
    prod_nm: '익스플로러 트레이닝 세트 GREEN',
    category: '트레이닝셋업',
    priority_score: 0.58,
    priority_axes: { coverage_urgency: 0.08, rt_score: 0.62, velocity_signal: 0.18 },
    signal_type: 'rt',
    ap_stock: 2,
    weekly_forecast: 9.8,
    coverage_weeks: 0.20,
    broken_shops: 4,
    broken_sizes: ['100', '105'],
    velocity_change_pct: 9,
    ai_reason: 'AP 거의 고갈(2개). 매장 간 재고 쏠림. 상위 4개 매장으로 RT 권장.',
    top_shops_to_replenish: ['30025', '50063'],
  },
  {
    sc_cd: 'X_DMSLR1063_BKS',
    prod_cd: 'DMSLR1063',
    color_cd: 'BKS',
    prod_nm: '슬리브리스 BLACK',
    category: '이너',
    priority_score: 0.55,
    priority_axes: { coverage_urgency: 0.05, rt_score: 0.58, velocity_signal: 0.15 },
    signal_type: 'rt',
    ap_stock: 4,
    weekly_forecast: 8.3,
    coverage_weeks: 0.48,
    broken_shops: 3,
    broken_sizes: ['100'],
    velocity_change_pct: 7,
    ai_reason: 'AP 부족(4개). 하위 매장 과잉 — 상위 3개 매장으로 RT 권장.',
    top_shops_to_replenish: ['10075'],
  },
];

const MOCK_TREND: BriefingSc[] = [
  {
    sc_cd: 'X_DWRS94063_IVD',
    prod_cd: 'DWRS94063',
    color_cd: 'IVD',
    prod_nm: '우먼스 러닝 쇼츠 IVORY',
    category: '하의',
    priority_score: 0.52,
    priority_axes: { coverage_urgency: 0.30, rt_score: 0.05, velocity_signal: 0.85 },
    signal_type: 'trend',
    ap_stock: 85,
    weekly_forecast: 18.5,
    coverage_weeks: 4.59,
    broken_shops: 2,
    broken_sizes: [],
    velocity_change_pct: 42,
    ai_reason: '판매속도 전주比 +42% 가속. 선제 배분으로 결품 예방.',
    top_shops_to_replenish: ['10075', '10090'],
  },
  {
    sc_cd: 'X_DWTS72063_BKS',
    prod_cd: 'DWTS72063',
    color_cd: 'BKS',
    prod_nm: '우먼스 트레이닝 세트 BLACK',
    category: '트레이닝셋업',
    priority_score: 0.48,
    priority_axes: { coverage_urgency: 0.25, rt_score: 0.03, velocity_signal: 0.78 },
    signal_type: 'trend',
    ap_stock: 120,
    weekly_forecast: 22.1,
    coverage_weeks: 5.43,
    broken_shops: 1,
    broken_sizes: [],
    velocity_change_pct: 39,
    ai_reason: '판매속도 전주比 +39% 가속. 커버리지 5.4주로 여유 있으나 선제 모니터링.',
    top_shops_to_replenish: [],
  },
  {
    sc_cd: 'X_DXRS7R063_WHS',
    prod_cd: 'DXRS7R063',
    color_cd: 'WHS',
    prod_nm: '레귤러핏 래쉬가드 WHITE',
    category: '스윔',
    priority_score: 0.45,
    priority_axes: { coverage_urgency: 0.20, rt_score: 0.02, velocity_signal: 0.72 },
    signal_type: 'trend',
    ap_stock: 95,
    weekly_forecast: 16.8,
    coverage_weeks: 5.65,
    broken_shops: 0,
    broken_sizes: [],
    velocity_change_pct: 36,
    ai_reason: '판매속도 전주比 +36% 가속. 스윔 시즌 본격 진입 신호.',
    top_shops_to_replenish: [],
  },
  {
    sc_cd: 'X_DMSP71063_BES',
    prod_cd: 'DMSP71063',
    color_cd: 'BES',
    prod_nm: '에센셜 쇼트 팬츠 BEIGE',
    category: '하의',
    priority_score: 0.42,
    priority_axes: { coverage_urgency: 0.18, rt_score: 0.01, velocity_signal: 0.65 },
    signal_type: 'trend',
    ap_stock: 110,
    weekly_forecast: 14.2,
    coverage_weeks: 7.75,
    broken_shops: 0,
    broken_sizes: [],
    velocity_change_pct: 32,
    ai_reason: '판매속도 전주比 +32% 가속. 커버리지 충분하나 추세 지속 시 2주 내 보충 필요.',
    top_shops_to_replenish: [],
  },
];

// ── 조립 ──

const sc_list: BriefingSc[] = [...MOCK_URGENT, ...MOCK_RT, ...MOCK_TREND];
sc_list.sort((a, b) => b.priority_score - a.priority_score);

export const MOCK_BRIEFING_DATA: Record<string, BriefingData> = {
  X_26S: {
    generated_at: new Date().toISOString(),
    brand_cd: 'X',
    ssn_cd: '26S',
    summary: {
      total_sc: 213,
      urgent_count: MOCK_URGENT.length,
      rt_count: MOCK_RT.length,
      trend_count: MOCK_TREND.length,
      normal_count: 213 - MOCK_URGENT.length - MOCK_RT.length - MOCK_TREND.length,
      narrative: `Discovery 26S · 213개 SC 분석 완료. ${MOCK_URGENT.length + MOCK_RT.length + MOCK_TREND.length}개 SC에서 즉각 조치 필요 신호 감지.`,
    },
    sc_list,
  },
};
