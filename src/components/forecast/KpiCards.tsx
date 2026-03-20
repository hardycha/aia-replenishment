'use client';

import { Card } from '@/components/ui/card';
import { kpiStats } from '@/data/mockData';

export default function KpiCards() {
  return (
    <div className="grid grid-cols-4 gap-3 mb-4 max-lg:grid-cols-2">
      {/* 예측 대상 SC 수 */}
      <Card className="p-4 border-[#E2E8F0] shadow-sm">
        <div className="text-[11px] text-[#718096] mb-1">예측 대상 SC 수</div>
        <div className="text-[22px] font-bold text-[#1B3A5C]">
          {kpiStats.totalSC.toLocaleString()}
        </div>
        <div className="text-[11px] text-[#718096] mt-1">
          {kpiStats.styleCount} 스타일 × 평균 {kpiStats.avgColors} 컬러
        </div>
      </Card>

      {/* AI 예측 정확도 */}
      <Card className="p-4 border-[#E2E8F0] shadow-sm border-l-[3px] border-l-[#7C3AED]">
        <div className="text-[11px] text-[#718096] mb-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full" />
          AI 예측 정확도 (WAPE)
        </div>
        <div className="text-[22px] font-bold text-[#7C3AED]">
          {kpiStats.aiAccuracy}%
        </div>
        <div className="text-[11px] text-[#28A745] mt-1">
          ▲ {kpiStats.accuracyChange}%p vs 지난주
        </div>
      </Card>

      {/* 물류 가용재고 */}
      <Card className="p-4 border-[#E2E8F0] shadow-sm">
        <div className="text-[11px] text-[#718096] mb-1">물류 가용재고</div>
        <div className="text-[22px] font-bold text-[#1B3A5C]">
          {kpiStats.warehouseStock.toLocaleString()}
        </div>
        <div className="text-[11px] text-[#718096] mt-1">
          전체 재고 {kpiStats.totalStock.toLocaleString()} 중 {kpiStats.stockRatio}%
        </div>
      </Card>

      {/* 보충 필요 매장 */}
      <Card className="p-4 border-[#E2E8F0] shadow-sm">
        <div className="text-[11px] text-[#718096] mb-1">보충 필요 매장</div>
        <div className="text-[22px] font-bold text-[#DC3545]">
          {kpiStats.shopsNeedReplenishment}
        </div>
        <div className="text-[11px] text-[#718096] mt-1">
          전체 배분 대상 {kpiStats.totalShops}매장 중
        </div>
      </Card>
    </div>
  );
}
