'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { prioritySCList } from '@/data/mockData';

const urgencyConfig = {
  critical: { label: '긴급', className: 'bg-red-50 text-red-700 border-red-200' },
  high: { label: '높음', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  normal: { label: '보통', className: 'bg-sky-50 text-sky-700 border-sky-200' },
};

export default function PriorityTable() {
  return (
    <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#FAFBFC] flex justify-between items-center">
        <h3 className="text-[13px] font-semibold flex items-center gap-1.5">
          🏷️ 보충 우선순위 TOP 10 (SC 기준)
        </h3>
        <Button variant="outline" size="sm" className="text-[11px] h-7">
          전체보기
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F7F8FA]">
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">순위</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">SC (스타일-컬러)</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">ITEM</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">예측수요</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">물류재고</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">매장재고</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#7C3AED] whitespace-nowrap text-right">AI 보충량</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">긴급도</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prioritySCList.map((item) => {
              const urgency = urgencyConfig[item.urgency as keyof typeof urgencyConfig];
              return (
                <TableRow key={item.rank} className="hover:bg-[#F7F9FC]">
                  <TableCell className="text-xs">{item.rank}</TableCell>
                  <TableCell className="text-xs font-medium">{item.scCode}</TableCell>
                  <TableCell className="text-xs">{item.item}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{item.forecastDemand}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{item.warehouseStock}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{item.shopStock}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-[#7C3AED] font-semibold">{item.aiReplenishment}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[11px] ${urgency.className}`}>
                      {urgency.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
