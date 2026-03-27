'use client';

import { Card } from '@/components/ui/card';

const kpiStats = {
  aiAccuracy: 82.4,
  accuracyChange: 3.2,
  totalSCS: 3842,
  styleCount: 212,
  avgColors: 5.9,
  warehouseStock: 48720,
  lastUpdated: '2026-03-27 09:15',
  shopsNeedReplenishment: 156,
  totalShops: 320,
};

export default function KpiCards() {
  return (
    <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2">
      {/* AI 예측 정확도 */}
      <Card className="p-4 border-[#E2E8F0] shadow-sm border-l-[3px] border-l-[#7C3AED]">
        <div className="text-[11px] text-[#718096] mb-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full" />
          ML 예측 정확도 (WAPE)
        </div>
        <div className="text-[22px] font-bold text-[#7C3AED]">
          {kpiStats.aiAccuracy}%
        </div>
        <div className="text-[11px] text-[#28A745] mt-1">
          ▲ {kpiStats.accuracyChange}%p vs 지난주 배치
        </div>
      </Card>

      {/* 조회 대상 SCS 수 */}
      <Card className="p-4 border-[#E2E8F0] shadow-sm">
        <div className="text-[11px] text-[#718096] mb-1">조회 대상 SCS 수</div>
        <div className="text-[22px] font-bold text-[#1B3A5C]">
          {kpiStats.totalSCS.toLocaleString()}
        </div>
        <div className="text-[11px] text-[#718096] mt-1">
          {kpiStats.styleCount} 스타일 x 평균 {kpiStats.avgColors} 컬러 x 사이즈
        </div>
      </Card>

      {/* 물류 가용재고 */}
      <Card className="p-4 border-[#E2E8F0] shadow-sm">
        <div className="text-[11px] text-[#718096] mb-1">물류 가용재고 (실시간)</div>
        <div className="text-[22px] font-bold text-[#1B3A5C]">
          {kpiStats.warehouseStock.toLocaleString()}
        </div>
        <div className="text-[11px] text-[#718096] mt-1">
          ⏱ {kpiStats.lastUpdated} 기준
        </div>
      </Card>

      {/* 보충 대상 매장 */}
      <Card className="p-4 border-[#E2E8F0] shadow-sm">
        <div className="text-[11px] text-[#718096] mb-1">보충 대상 매장</div>
        <div className="text-[22px] font-bold text-[#DC3545]">
          {kpiStats.shopsNeedReplenishment} / {kpiStats.totalShops}
        </div>
        <div className="text-[11px] text-[#718096] mt-1">
          전매장 예측 → 필터 적용 후
        </div>
      </Card>
    </div>
  );
}
