'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { mdProgressData, shopRequestData, rtListData, brands, apOptions } from '@/data/mockData';

const rtStatusConfig = {
  requested: { label: '출고요청', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  md_checking: { label: 'MD확인중', className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const replenishTypeConfig = {
  ai: { label: 'AI보충', className: 'bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE]' },
  md_modified: { label: 'MD수정', className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export default function ExecutionTab() {
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
            <span className="text-[#DC3545]">*</span>배분 보충 기간
          </label>
          <div className="flex items-center gap-2">
            <Input type="date" defaultValue="2026-03-17" className="w-[130px] h-8 text-xs" />
            <span className="text-[#718096]">~</span>
            <Input type="date" defaultValue="2026-03-23" className="w-[130px] h-8 text-xs" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#718096] font-semibold">보충유형</label>
          <Select defaultValue="전체">
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체" className="text-xs">전체</SelectItem>
              <SelectItem value="판매분보충" className="text-xs">판매분보충</SelectItem>
              <SelectItem value="완주보충" className="text-xs">완주보충</SelectItem>
              <SelectItem value="MD요청" className="text-xs">MD요청</SelectItem>
              <SelectItem value="매장요청" className="text-xs">매장요청</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button className="h-8 px-4 text-xs bg-[#00A3E0] hover:bg-[#0093CC]">
          🔍 조회하기
        </Button>

        <Button variant="outline" className="h-8 px-4 text-xs">
          🔄 선택 초기화
        </Button>
      </div>

      <div className="p-4">
        {/* Progress Summary */}
        <div className="grid grid-cols-2 gap-4 mb-4 max-lg:grid-cols-1">
          {/* MD 대응 진행 현황 */}
          <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#FAFBFC]">
              <h3 className="text-[13px] font-semibold">📋 MD 대응 진행 현황</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F7F8FA]">
                    <TableHead className="text-[11px] font-semibold text-[#718096]">배분RT 유형</TableHead>
                    <TableHead className="text-[11px] font-semibold text-[#718096]">유형 상세</TableHead>
                    <TableHead className="text-[11px] font-semibold text-[#718096] text-right">합계</TableHead>
                    <TableHead className="text-[11px] font-semibold text-[#718096] text-right">RT</TableHead>
                    <TableHead className="text-[11px] font-semibold text-[#718096] text-right">스타일수</TableHead>
                    <TableHead className="text-[11px] font-semibold text-[#718096] text-right">매장수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mdProgressData.map((item, idx) => (
                    <TableRow
                      key={idx}
                      className={item.isAi ? 'bg-[#EDE9FE]/30' : ''}
                    >
                      <TableCell className={`text-xs font-semibold ${item.isAi ? 'text-[#7C3AED]' : ''}`}>
                        {item.isAi && '✦ '}{item.type}
                      </TableCell>
                      <TableCell className="text-xs">{item.subType}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{item.totalQty.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{item.rtQty.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{item.styleCount}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{item.shopCount}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-[#F7F8FA] font-semibold">
                    <TableCell colSpan={2} className="text-xs">합계</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">446,600</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">5,974</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">1,065</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">320</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* 매장 요청 진행 현황 */}
          <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#FAFBFC]">
              <h3 className="text-[13px] font-semibold">🏪 매장 요청 진행 현황</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F7F8FA]">
                    <TableHead className="text-[11px] font-semibold text-[#718096]">배분RT유형</TableHead>
                    <TableHead className="text-[11px] font-semibold text-[#718096] text-right">요청 수량</TableHead>
                    <TableHead className="text-[11px] font-semibold text-[#718096] text-right">RT</TableHead>
                    <TableHead className="text-[11px] font-semibold text-[#718096] text-right">보충률</TableHead>
                    <TableHead className="text-[11px] font-semibold text-[#718096] text-right">배분RT개수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shopRequestData.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs">{item.type}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-[#00A3E0] font-semibold">
                        {item.requestQty.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{item.rtQty.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{item.fulfillRate}%</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{item.rtCount}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-[#F7F8FA] font-semibold">
                    <TableCell className="text-xs">합계</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">508,855</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">9,397</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">48%</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">5,117</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* RT List */}
        <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#FAFBFC] flex justify-between items-center">
            <h3 className="text-[13px] font-semibold">📦 보충 RT 리스트 (확정 대기)</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-[11px] h-7">
                📥 엑셀 다운로드
              </Button>
              <Button size="sm" className="text-[11px] h-7 bg-[#F5A623] hover:bg-[#E09610] border-none text-white">
                🔄 RT 일괄 생성
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
                  <TableHead className="text-[11px] font-semibold text-[#718096]">배분RT ID</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">보충유형</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">매장코드</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">매장명</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">상품시즌</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">스타일코드</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">컬러</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">사이즈</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096] text-right">배분수량</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">배분상태</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">배분 확정자</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">배분 확정일</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#718096]">출고확정일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rtListData.map((item) => {
                  const replenishType = replenishTypeConfig[item.replenishType as keyof typeof replenishTypeConfig];
                  const rtStatus = rtStatusConfig[item.status as keyof typeof rtStatusConfig];

                  return (
                    <TableRow key={item.rtId} className="hover:bg-[#F7F9FC]">
                      <TableCell><Checkbox defaultChecked={item.replenishType === 'ai'} /></TableCell>
                      <TableCell className="text-xs text-[#00A3E0]">{item.rtId}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[11px] ${replenishType.className}`}>
                          {replenishType.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{item.shopCode}</TableCell>
                      <TableCell className="text-xs">{item.shopName}</TableCell>
                      <TableCell className="text-xs">{item.season}</TableCell>
                      <TableCell className="text-xs">{item.styleCode}</TableCell>
                      <TableCell className="text-xs">{item.color}</TableCell>
                      <TableCell className="text-xs">{item.sizes}</TableCell>
                      <TableCell className={`text-xs text-right tabular-nums font-semibold ${item.replenishType === 'md_modified' ? 'text-[#F5A623]' : ''}`}>
                        {item.qty}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[11px] ${rtStatus.className}`}>
                          {rtStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{item.confirmedBy}</TableCell>
                      <TableCell className="text-xs">{item.confirmedDate}</TableCell>
                      <TableCell className="text-xs">{item.shippedDate || '-'}</TableCell>
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
