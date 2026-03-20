'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { mappingStats, mappingData, aiInsights, brands, categories } from '@/data/mockData';

const statusConfig = {
  confirmed: { label: '확정', className: 'bg-green-50 text-green-700 border-green-200' },
  ai_suggested: { label: 'AI제안', className: 'bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE]' },
  unmapped: { label: '미맵핑', className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export default function MappingTab() {
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
            <span className="text-[#DC3545]">*</span>운영시즌 (신상)
          </label>
          <Select defaultValue="26S">
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="26S" className="text-xs">26S</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#718096] font-semibold">참조시즌 (전년)</label>
          <Select defaultValue="25S">
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25S" className="text-xs">25S</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#718096] font-semibold">중분류</label>
          <Select defaultValue="전체">
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#718096] font-semibold">맵핑 상태</label>
          <Select defaultValue="전체">
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체" className="text-xs">전체</SelectItem>
              <SelectItem value="미맵핑" className="text-xs">미맵핑</SelectItem>
              <SelectItem value="AI 자동맵핑" className="text-xs">AI 자동맵핑</SelectItem>
              <SelectItem value="사용자 확정" className="text-xs">사용자 확정</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button className="h-8 px-4 text-xs bg-[#00A3E0] hover:bg-[#0093CC]">
          🔍 조회하기
        </Button>

        <Button className="h-8 px-4 text-xs bg-gradient-to-r from-[#7C3AED] to-[#9F7AEA] border-none hover:opacity-90">
          ✦ AI 자동 맵핑 실행
        </Button>
      </div>

      <div className="p-4">
        <AiInsightBox
          title={aiInsights.mapping.title}
          content={aiInsights.mapping.content}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3 mb-4 max-lg:grid-cols-2">
          <Card className="p-4 border-[#E2E8F0] shadow-sm">
            <div className="text-[11px] text-[#718096] mb-1">전체 스타일</div>
            <div className="text-[22px] font-bold text-[#1B3A5C]">{mappingStats.totalStyles}</div>
          </Card>

          <Card className="p-4 border-[#E2E8F0] shadow-sm border-l-[3px] border-l-[#7C3AED]">
            <div className="text-[11px] text-[#718096] mb-1">AI 자동 맵핑</div>
            <div className="text-[22px] font-bold text-[#7C3AED]">{mappingStats.aiMapped}</div>
            <div className="mt-1">
              <div className="h-1.5 bg-[#F5F7FA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#7C3AED] rounded-full"
                  style={{ width: `${(mappingStats.aiMapped / mappingStats.totalStyles) * 100}%` }}
                />
              </div>
            </div>
          </Card>

          <Card className="p-4 border-[#E2E8F0] shadow-sm">
            <div className="text-[11px] text-[#718096] mb-1">사용자 확정</div>
            <div className="text-[22px] font-bold text-[#28A745]">{mappingStats.userConfirmed}</div>
          </Card>

          <Card className="p-4 border-[#E2E8F0] shadow-sm">
            <div className="text-[11px] text-[#718096] mb-1">미맵핑 (수동필요)</div>
            <div className="text-[22px] font-bold text-[#F5A623]">{mappingStats.unmapped}</div>
          </Card>
        </div>

        {/* Mapping Table */}
        <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#FAFBFC] flex justify-between items-center">
            <h3 className="text-[13px] font-semibold flex items-center gap-1.5">
              🔗 스타일 맵핑 관리
              <span className="text-[11px] text-[#718096] font-normal">(신상 → 전년 유사 스타일)</span>
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-[11px] h-7">
                📥 엑셀 업로드
              </Button>
              <Button variant="outline" size="sm" className="text-[11px] h-7">
                📤 엑셀 다운로드
              </Button>
              <Button size="sm" className="text-[11px] h-7 bg-[#28A745] hover:bg-[#218838] border-none">
                ✓ 선택 확정
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F7F8FA]">
                  <TableHead className="w-10"><Checkbox /></TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">상태</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">26S 스타일코드</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">스타일명</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">ITEM</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">컬러수</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">→</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">25S 맵핑 스타일</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">맵핑 스타일명</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">유사도</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096] text-right">전년 판매량</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">맵핑 방식</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappingData.map((item) => {
                  const status = statusConfig[item.status as keyof typeof statusConfig];
                  const isUnmapped = item.status === 'unmapped';

                  return (
                    <TableRow
                      key={item.newStyle}
                      className={`hover:bg-[#F7F9FC] ${isUnmapped ? 'bg-amber-50/50' : ''}`}
                    >
                      <TableCell><Checkbox /></TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[11px] ${status.className}`}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{item.newStyle}</TableCell>
                      <TableCell className="text-xs">{item.newStyleName}</TableCell>
                      <TableCell className="text-xs">{item.item}</TableCell>
                      <TableCell className="text-xs">{item.colorCount}</TableCell>
                      <TableCell className="text-[#718096]">→</TableCell>
                      <TableCell className={`text-xs ${item.mappedStyle ? 'text-[#7C3AED] font-medium' : 'text-[#718096]'}`}>
                        {item.mappedStyle || '-'}
                      </TableCell>
                      <TableCell className={`text-xs ${isUnmapped ? 'text-[#718096]' : ''}`}>
                        {item.mappedStyleName}
                      </TableCell>
                      <TableCell>
                        {item.similarity ? (
                          <span className="text-[11px] text-[#7C3AED] font-semibold">{item.similarity}%</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {item.lastYearSales?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[11px] ${item.mappingType === 'ai' ? 'bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE]' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {item.mappingType === 'ai' ? 'AI 자동' : '수동필요'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={isUnmapped ? 'default' : 'outline'}
                          size="sm"
                          className={`text-[10px] h-6 px-2 ${isUnmapped ? 'bg-[#00A3E0] hover:bg-[#0093CC]' : ''}`}
                        >
                          {isUnmapped ? '맵핑' : '변경'}
                        </Button>
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
