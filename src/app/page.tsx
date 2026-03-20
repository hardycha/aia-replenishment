'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SerpNav from '@/components/layout/SerpNav';
import PageHeader from '@/components/layout/PageHeader';
import ForecastTab from '@/components/forecast/ForecastTab';
import MappingTab from '@/components/mapping/MappingTab';
import ExecutionTab from '@/components/execution/ExecutionTab';
import MonitorTab from '@/components/monitor/MonitorTab';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[13px]">
      <SerpNav />
      <PageHeader />

      <Tabs defaultValue="forecast" className="w-full">
        <div className="bg-white border-b-2 border-[#E2E8F0] px-5">
          <TabsList className="h-auto p-0 bg-transparent gap-0 rounded-none">
            <TabsTrigger
              value="forecast"
              className="px-5 py-2.5 text-[13px] text-[#718096] data-[state=active]:text-[#00A3E0] data-[state=active]:font-semibold data-[state=active]:border-b-2 data-[state=active]:border-[#00A3E0] rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none -mb-[2px] flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full" />
              AI 수요예측 & 보충제안
            </TabsTrigger>
            <TabsTrigger
              value="mapping"
              className="px-5 py-2.5 text-[13px] text-[#718096] data-[state=active]:text-[#00A3E0] data-[state=active]:font-semibold data-[state=active]:border-b-2 data-[state=active]:border-[#00A3E0] rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none -mb-[2px] flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full" />
              스타일 맵핑
            </TabsTrigger>
            <TabsTrigger
              value="execution"
              className="px-5 py-2.5 text-[13px] text-[#718096] data-[state=active]:text-[#00A3E0] data-[state=active]:font-semibold data-[state=active]:border-b-2 data-[state=active]:border-[#00A3E0] rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none -mb-[2px]"
            >
              보충 실행 관리
            </TabsTrigger>
            <TabsTrigger
              value="monitor"
              className="px-5 py-2.5 text-[13px] text-[#718096] data-[state=active]:text-[#00A3E0] data-[state=active]:font-semibold data-[state=active]:border-b-2 data-[state=active]:border-[#00A3E0] rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none -mb-[2px]"
            >
              성과 모니터링
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="forecast" className="m-0">
          <ForecastTab />
        </TabsContent>
        <TabsContent value="mapping" className="m-0">
          <MappingTab />
        </TabsContent>
        <TabsContent value="execution" className="m-0">
          <ExecutionTab />
        </TabsContent>
        <TabsContent value="monitor" className="m-0">
          <MonitorTab />
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="bg-white border-t border-[#E2E8F0] px-5 py-2.5 flex justify-between items-center sticky bottom-0">
        <div className="text-[11px] text-[#718096]">
          F&F S-ERP (유통ERP) | 배분보충-AIA v0.1 Draft | Menu: ALOC10004 | 2026-03-20
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
