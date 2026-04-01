'use client';

// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import SerpNav from '@/components/layout/SerpNav';
import PageHeader from '@/components/layout/PageHeader';
// import ForecastTab from '@/components/forecast/ForecastTab';
import ReplenishmentTab from '@/components/replenishment/ReplenishmentTab';
// import MappingTab from '@/components/mapping/MappingTab';
// import ExecutionTab from '@/components/execution/ExecutionTab';
// import MonitorTab from '@/components/monitor/MonitorTab';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[13px]">
      {/* SerpNav 제거됨 */}
      <PageHeader />

      {/* v5: ReplenishmentTab - 목록/등록/상세 통합 뷰 */}
      <ReplenishmentTab />

      {/* Footer */}
      <div className="bg-white border-t border-[#E2E8F0] px-5 py-2.5 flex justify-between items-center sticky bottom-0">
        <div className="text-[11px] text-[#718096]">
          F&F S-ERP (유통ERP) | 보충배분-AIA v0.1 Draft | Menu: ALOC10004 | 2026-03-20
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-[11px] border border-[#E2E8F0] rounded hover:bg-[#F5F7FA]">
            💬 피드백
          </button>
          <button className="px-3 py-1.5 text-[11px] border border-[#E2E8F0] rounded hover:bg-[#F5F7FA]">
            📖 사용 가이드
          </button>
        </div>
      </div>
    </div>
  );
}
