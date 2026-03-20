'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { shopDetailData } from '@/data/mockData';

const statusConfig = {
  confirmed: { label: '확정', className: 'bg-green-50 text-green-700 border-green-200' },
  pending: { label: '대기', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  md_modified: { label: 'MD수정', className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const gradeConfig = {
  'S+': { className: 'bg-red-50 text-red-700' },
  'A': { className: 'bg-amber-50 text-amber-700' },
  'B': { className: 'bg-sky-50 text-sky-700' },
};

export default function ShopDetailTable() {
  const totals = {
    currentStock: shopDetailData.reduce((sum, s) => sum + s.currentStock, 0),
    forecastT1: shopDetailData.reduce((sum, s) => sum + s.forecastT1, 0),
    forecastT2: shopDetailData.reduce((sum, s) => sum + s.forecastT2, 0),
    aiSuggestion: shopDetailData.reduce((sum, s) => sum + s.aiSuggestion, 0),
    mdModified: shopDetailData.reduce((sum, s) => sum + s.mdModified, 0),
    finalQty: shopDetailData.reduce((sum, s) => sum + s.finalQty, 0),
  };

  return (
    <div className="mt-4">
      <div className="text-sm font-bold text-[#1B3A5C] mb-3 flex items-center gap-2">
        <span className="bg-[#1B3A5C] text-white w-5 h-5 rounded-full flex items-center justify-center text-[11px]">▾</span>
        SC-Shop 상세 배분 제안 (DXDJ73041-BKS)
      </div>

      <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#FAFBFC] flex justify-between items-center">
          <h3 className="text-[13px] font-semibold flex items-center gap-1.5">
            🏪 매장별 AI 보충 수량 제안
            <span className="w-3.5 h-3.5 rounded-full bg-[#E2E8F0] text-[#718096] text-[9px] flex items-center justify-center font-bold cursor-help">?</span>
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-[11px] h-7">
              📥 엑셀 다운로드
            </Button>
            <Button size="sm" className="text-[11px] h-7 bg-gradient-to-r from-[#7C3AED] to-[#9F7AEA] border-none">
              ✦ ILP 재최적화
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
                <TableHead className="w-10"><Checkbox defaultChecked /></TableHead>
                <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">매장코드</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">매장명</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">매장유형</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">매장등급</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">현 재고</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">T+1 예측</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">T+2 예측</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">안전재고</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#7C3AED] whitespace-nowrap text-right">AI 제안량</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">MD 수정량</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">패킹단위</TableHead>
                <TableHead className="text-[11px] font-bold text-[#718096] whitespace-nowrap text-right">최종 보충량</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shopDetailData.map((shop) => {
                const status = statusConfig[shop.status as keyof typeof statusConfig];
                const grade = gradeConfig[shop.grade as keyof typeof gradeConfig];
                const isModified = shop.status === 'md_modified';

                return (
                  <TableRow key={shop.shopCode} className="hover:bg-[#F7F9FC]">
                    <TableCell><Checkbox defaultChecked /></TableCell>
                    <TableCell className="text-xs">{shop.shopCode}</TableCell>
                    <TableCell className="text-xs">{shop.shopName}</TableCell>
                    <TableCell className="text-xs">{shop.shopType}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${grade.className}`}>
                        {shop.grade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{shop.currentStock}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{shop.forecastT1}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{shop.forecastT2}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{shop.safetyStock}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-[#7C3AED] font-semibold">{shop.aiSuggestion}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        defaultValue={shop.mdModified}
                        className={`w-[50px] h-6 text-xs text-right ${isModified ? 'text-[#F5A623] font-semibold border-[#F5A623]' : ''}`}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{shop.packUnit}</TableCell>
                    <TableCell className={`text-xs text-right tabular-nums font-bold ${isModified ? 'text-[#F5A623]' : ''}`}>
                      {shop.finalQty}
                      {shop.diff && <span className="text-[#28A745] text-[11px] ml-1">↑{shop.diff}</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] ${status.className}`}>
                        {status.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* 합계 행 */}
              <TableRow className="bg-[#FAFBFC] font-semibold">
                <TableCell></TableCell>
                <TableCell colSpan={4} className="text-xs">합계 (전체 32 매장)</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{totals.currentStock}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{totals.forecastT1}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{totals.forecastT2}</TableCell>
                <TableCell className="text-xs text-right">-</TableCell>
                <TableCell className="text-xs text-right tabular-nums text-[#7C3AED] font-semibold">{totals.aiSuggestion}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{totals.mdModified}</TableCell>
                <TableCell className="text-xs text-right">-</TableCell>
                <TableCell className="text-xs text-right tabular-nums font-bold">{totals.finalQty}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
