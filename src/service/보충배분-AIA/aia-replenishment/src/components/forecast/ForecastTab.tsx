'use client';

import { useState } from 'react';
import FilterBar from './FilterBar';
import AiInsightBox from './AiInsightBox';
import Pipeline from './Pipeline';
import KpiCards from './KpiCards';
import ShopGroupChips from './ShopGroupChips';
import ScSummaryTable from './ScSummaryTable';
import ShopScsTable from './ShopScsTable';

export default function ForecastTab() {
  const [selectedSc, setSelectedSc] = useState<string | null>(null);

  return (
    <div>
      <FilterBar />

      <div className="p-4 space-y-4">
        {/* 실시간 계산 모드 안내 */}
        <AiInsightBox variant="realtime" />

        {/* 파이프라인 진행 상태 */}
        <Pipeline />

        {/* KPI 카드 */}
        <KpiCards />

        {/* 매장그룹 필터 칩 */}
        <ShopGroupChips />

        {/* SC별 보충 제안 요약 테이블 */}
        <ScSummaryTable onSelectSc={(sc) => setSelectedSc(sc)} />

        {/* 매장별 SCS 보충 상세 테이블 */}
        <ShopScsTable selectedSc={selectedSc || 'DXDJ73041-BKS'} />
      </div>
    </div>
  );
}
