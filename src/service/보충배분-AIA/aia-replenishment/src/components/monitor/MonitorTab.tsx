'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AiInsightBox from '@/components/forecast/AiInsightBox';
import { monitorStats, performanceData, aiInsights, brands, apOptions } from '@/data/mockData';

const typeConfig = {
  ai: { label: 'AI보충', className: 'bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE]' },
  manual: { label: '수동보충', className: 'bg-green-50 text-green-700 border-green-200' },
};

export default function MonitorTab() {
  return (
    <div>
      {/* Filter Bar */}
      <div className="bg-white px-5 py-3 flex flex-wrap gap-3 items-end border-b border-[#E2E8F0]">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#718096] font-semibold">
            <span className="text-[#DC3545]">*</span>브랜드
          </label>
          <Select defaultValue="X">
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {brands.map((brand) => (
                <SelectItem key={brand.code} value={brand.code} className="text-xs">
                  {brand.code}: {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#718096] font-semibold">
            <span className="text-[#DC3545]">*</span>AP
          </label>
          <Select defaultValue="offline_normal">
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {apOptions.map((ap) => (
                <SelectItem key={ap.value} value={ap.value} className="text-xs">
                  {ap.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#718096] font-semibold">
            <span className="text-[#DC3545]">*</span>출고 확정일자
          </label>
          <div className="flex items-center gap-2">
            <Input type="date" defaultValue="2026-03-01" className="w-[130px] h-8 text-xs" />
            <span className="text-[#718096]">~</span>
            <Input type="date" defaultValue="2026-03-20" className="w-[130px] h-8 text-xs" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#718096] font-semibold">배분 유형</label>
          <Select defaultValue="전체">
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체" className="text-xs">전체</SelectItem>
              <SelectItem value="AI보충" className="text-xs">AI보충</SelectItem>
              <SelectItem value="수동보충" className="text-xs">수동보충</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button className="h-8 px-4 text-xs bg-[#00A3E0] hover:bg-[#0093CC]">
          🔍 조회하기
        </Button>
      </div>

      <div className="p-4">
        <AiInsightBox
          title={aiInsights.monitor.title}
          content={aiInsights.monitor.content}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3 mb-4 max-lg:grid-cols-2">
          <Card className="p-4 border-[#E2E8F0] shadow-sm border-l-[3px] border-l-[#7C3AED]">
            <div className="text-[11px] text-[#718096] mb-1">AI 보충 판매율</div>
            <div className="text-[22px] font-bold text-[#7C3AED]">{monitorStats.aiSellThrough}%</div>
            <div className="text-[11px] text-[#28A745] mt-1">
              ▲ {monitorStats.aiImprovement}%p vs 수동 보충
            </div>
          </Card>

          <Card className="p-4 border-[#E2E8F0] shadow-sm">
            <div className="text-[11px] text-[#718096] mb-1">수동 보충 판매율</div>
            <div className="text-[22px] font-bold text-[#1B3A5C]">{monitorStats.manualSellThrough}%</div>
            <div className="text-[11px] text-[#718096] mt-1">기존 방식 기준</div>
          </Card>

          <Card className="p-4 border-[#E2E8F0] shadow-sm">
            <div className="text-[11px] text-[#718096] mb-1">품절률 (AI)</div>
            <div className="text-[22px] font-bold text-[#28A745]">{monitorStats.aiStockoutRate}%</div>
            <div className="text-[11px] text-[#28A745] mt-1">
              ▼ {monitorStats.stockoutImprovement}%p 개선
            </div>
          </Card>

          <Card className="p-4 border-[#E2E8F0] shadow-sm">
            <div className="text-[11px] text-[#718096] mb-1">예측 정확도 추이</div>
            <div className="text-[22px] font-bold text-[#1B3A5C]">{monitorStats.forecastAccuracy}%</div>
            <div className="text-[11px] text-[#28A745] mt-1">
              ▲ {monitorStats.accuracyImprovement}%p vs 지난달
            </div>
          </Card>
        </div>

        {/* Performance Table */}
        <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#FAFBFC]">
            <h3 className="text-[13px] font-semibold">📈 보충 성과 상세 (배분 유형별)</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F7F8FA]">
                  <TableHead rowSpan={2} className="text-[11px] font-semibold text-[#718096] align-middle">배분RT</TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-semibold text-[#718096] align-middle">배분유형</TableHead>
                  <TableHead colSpan={3} className="text-[11px] font-semibold text-[#718096] text-center border-b border-[#E2E8F0]">스타일</TableHead>
                  <TableHead colSpan={3} className="text-[11px] font-semibold text-[#718096] text-center border-b border-[#E2E8F0]">기간 판매</TableHead>
                </TableRow>
                <TableRow className="bg-[#F7F8FA]">
                  <TableHead className="text-[11px] font-semibold text-[#718096] text-right">스타일코드</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">컬러</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">사이즈</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096] text-right">출고확정수량</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096] text-right">배분 2주 전</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096] text-right">배분 2주 후</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceData.map((item, idx) => {
                  const type = typeConfig[item.type as keyof typeof typeConfig];
                  const isAi = item.type === 'ai';

                  return (
                    <TableRow key={idx} className="hover:bg-[#F7F9FC]">
                      <TableCell className="text-xs text-[#00A3E0]">{item.rtId}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[11px] ${type.className}`}>
                          {type.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{item.styleCode}</TableCell>
                      <TableCell className="text-xs">{item.color}</TableCell>
                      <TableCell className="text-xs">{item.size}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{item.shippedQty}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{item.sales2WeeksBefore}</TableCell>
                      <TableCell className={`text-xs text-right tabular-nums font-semibold ${isAi ? 'text-[#28A745]' : ''}`}>
                        {item.sales2WeeksAfter} (+{item.changePercent}%)
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
