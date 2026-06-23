'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// SC별 보충 요약 mock 데이터
const scSummaryData = [
  { sc: 'DXDJ73041-BKS', name: '레저 바람막이 자켓', item: '바람막이', predT1: 342, predT2: 310, logistics: 580, shopStock: 89, prRatio: 0.62, ilpQty: 253, shopCount: 28, urgency: 'urgent' },
  { sc: 'DXDJ73041-IVS', name: '레저 바람막이 자켓', item: '바람막이', predT1: 285, predT2: 260, logistics: 410, shopStock: 72, prRatio: 0.58, ilpQty: 213, shopCount: 25, urgency: 'urgent' },
  { sc: 'DXTS72031-NVS', name: '에센셜 라운드 반팔티', item: '반팔티', predT1: 198, predT2: 185, logistics: 320, shopStock: 105, prRatio: 0.71, ilpQty: 93, shopCount: 18, urgency: 'high' },
  { sc: 'DXPN72011-BKS', name: '에센셜 조거 팬츠', item: '팬츠', predT1: 176, predT2: 162, logistics: 290, shopStock: 88, prRatio: 0.65, ilpQty: 88, shopCount: 15, urgency: 'high' },
];

const urgencyConfig = {
  urgent: { label: '긴급', className: 'bg-red-50 text-red-700 border-red-200' },
  high: { label: '높음', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  normal: { label: '보통', className: 'bg-sky-50 text-sky-700 border-sky-200' },
};

interface ScSummaryTableProps {
  onSelectSc?: (sc: string) => void;
}

export default function ScSummaryTable({ onSelectSc }: ScSummaryTableProps) {
  const totals = {
    predT1: scSummaryData.reduce((sum, s) => sum + s.predT1, 0),
    predT2: scSummaryData.reduce((sum, s) => sum + s.predT2, 0),
    logistics: 48720,
    shopStock: scSummaryData.reduce((sum, s) => sum + s.shopStock, 0),
    ilpQty: scSummaryData.reduce((sum, s) => sum + s.ilpQty, 0),
    shopCount: 156,
  };

  return (
    <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#FAFBFC] flex justify-between items-center">
        <h3 className="text-[13px] font-semibold flex items-center gap-2">
          SC별 보충 제안 요약
          <span className="text-[11px] text-[#718096] font-normal">(예측값 + 보충값 오버레이)</span>
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-[11px] h-7">
            엑셀 다운로드 (매크로)
          </Button>
          <Button variant="outline" size="sm" className="text-[11px] h-7">
            엑셀 업로드
          </Button>
          <Button size="sm" className="text-[11px] h-7 bg-gradient-to-r from-[#7C3AED] to-[#9F7AEA] border-none">
            전체 ILP 재계산
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F7F8FA]">
              <TableHead className="w-10"><Checkbox defaultChecked /></TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">SC (스타일-컬러)</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">스타일명</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">ITEM</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#00A3E0] whitespace-nowrap text-right">
                T+1 예측
                <div className="text-[9px] font-normal">SC-shop합</div>
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-[#00A3E0] whitespace-nowrap text-right">
                T+2 예측
                <div className="text-[9px] font-normal">SC-shop합</div>
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">
                물류재고
                <div className="text-[9px] font-normal">(실시간)</div>
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">
                매장재고합
                <div className="text-[9px] font-normal">(실시간)</div>
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">PR Ratio</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#7C3AED] whitespace-nowrap text-right">
                ILP 보충량
                <div className="text-[9px] font-normal">RT Off</div>
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">보충 매장수</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">긴급도</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">상세</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scSummaryData.map((sc) => {
              const urgency = urgencyConfig[sc.urgency as keyof typeof urgencyConfig];
              return (
                <TableRow key={sc.sc} className="hover:bg-[#F7F9FC]">
                  <TableCell><Checkbox defaultChecked /></TableCell>
                  <TableCell className="text-xs font-semibold">{sc.sc}</TableCell>
                  <TableCell className="text-xs">{sc.name}</TableCell>
                  <TableCell className="text-xs">{sc.item}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-[#00A3E0] italic">{sc.predT1}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-[#00A3E0] italic">{sc.predT2}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{sc.logistics}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{sc.shopStock}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{sc.prRatio.toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-[#7C3AED] font-semibold">{sc.ilpQty}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{sc.shopCount}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${urgency.className}`}>
                      {urgency.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-6 px-2"
                      onClick={() => onSelectSc?.(sc.sc)}
                    >
                      ▾ 매장별
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {/* 합계 행 */}
            <TableRow className="bg-[#FAFBFC] font-semibold">
              <TableCell></TableCell>
              <TableCell colSpan={3} className="text-xs">합계 (전체 SC)</TableCell>
              <TableCell className="text-xs text-right tabular-nums text-[#00A3E0]">{totals.predT1.toLocaleString()}</TableCell>
              <TableCell className="text-xs text-right tabular-nums text-[#00A3E0]">{totals.predT2.toLocaleString()}</TableCell>
              <TableCell className="text-xs text-right tabular-nums">{totals.logistics.toLocaleString()}</TableCell>
              <TableCell className="text-xs text-right tabular-nums">{totals.shopStock.toLocaleString()}</TableCell>
              <TableCell className="text-xs text-right">-</TableCell>
              <TableCell className="text-xs text-right tabular-nums text-[#7C3AED] font-bold">{totals.ilpQty.toLocaleString()}</TableCell>
              <TableCell className="text-xs text-right tabular-nums">{totals.shopCount}</TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
