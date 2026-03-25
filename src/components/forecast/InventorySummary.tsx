'use client';

import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// 사이즈별 물류재고 mock 데이터
const inventoryData = {
  style: 'DXDJ73041',
  color: 'BKS',
  styleName: '트랙자켓',
  sizes: [
    { size: '85', logistics: 120, shopTotal: 45, available: 75 },
    { size: '90', logistics: 180, shopTotal: 62, available: 118 },
    { size: '95', logistics: 250, shopTotal: 88, available: 162 },
    { size: '100', logistics: 200, shopTotal: 71, available: 129 },
    { size: '105', logistics: 150, shopTotal: 53, available: 97 },
    { size: '110', logistics: 80, shopTotal: 28, available: 52 },
  ],
};

export default function InventorySummary() {
  const totals = {
    logistics: inventoryData.sizes.reduce((sum, s) => sum + s.logistics, 0),
    shopTotal: inventoryData.sizes.reduce((sum, s) => sum + s.shopTotal, 0),
    available: inventoryData.sizes.reduce((sum, s) => sum + s.available, 0),
  };

  return (
    <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#FAFBFC]">
        <h3 className="text-[13px] font-semibold flex items-center gap-2">
          재고 현황
          <span className="text-[#718096] font-normal">
            {inventoryData.style}-{inventoryData.color} ({inventoryData.styleName})
          </span>
        </h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F7F8FA]">
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">구분</TableHead>
              {inventoryData.sizes.map((s) => (
                <TableHead key={s.size} className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-center">
                  {s.size}
                </TableHead>
              ))}
              <TableHead className="text-[11px] font-bold text-[#1B3A5C] whitespace-nowrap text-center bg-[#EDF2F7]">
                합계
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-[#F7F9FC]">
              <TableCell className="text-xs font-medium">물류재고</TableCell>
              {inventoryData.sizes.map((s) => (
                <TableCell key={s.size} className="text-xs text-center tabular-nums">
                  {s.logistics}
                </TableCell>
              ))}
              <TableCell className="text-xs text-center tabular-nums font-bold bg-[#EDF2F7]">
                {totals.logistics}
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-[#F7F9FC]">
              <TableCell className="text-xs font-medium">매장재고 합계</TableCell>
              {inventoryData.sizes.map((s) => (
                <TableCell key={s.size} className="text-xs text-center tabular-nums">
                  {s.shopTotal}
                </TableCell>
              ))}
              <TableCell className="text-xs text-center tabular-nums font-bold bg-[#EDF2F7]">
                {totals.shopTotal}
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-[#F7F9FC] bg-blue-50">
              <TableCell className="text-xs font-semibold text-[#00A3E0]">배분가능 수량</TableCell>
              {inventoryData.sizes.map((s) => (
                <TableCell key={s.size} className="text-xs text-center tabular-nums font-semibold text-[#00A3E0]">
                  {s.available}
                </TableCell>
              ))}
              <TableCell className="text-xs text-center tabular-nums font-bold text-[#00A3E0] bg-[#EDF2F7]">
                {totals.available}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
