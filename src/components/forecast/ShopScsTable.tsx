'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// 사이즈 목록
const sizes = ['90', '95', '100', '105', '110'];

// 매장별 SCS 보충 상세 mock 데이터
const shopScsData = [
  { shopCode: '10089', shopName: '신세계 강남점', type: '백화점', grade: 'S+', currentStock: 2, predT1: 9, predT2: 8, prRatio: 0.68, sizeQty: { '90': 2, '95': 3, '100': 4, '105': 3, '110': 2 }, total: 14, mdQty: 14, status: 'ready' },
  { shopCode: '10124', shopName: '롯데 분당점', type: '백화점', grade: 'S+', currentStock: 3, predT1: 8, predT2: 7, prRatio: 0.64, sizeQty: { '90': 2, '95': 3, '100': 3, '105': 2, '110': 2 }, total: 12, mdQty: 12, status: 'ready' },
  { shopCode: '10201', shopName: '현대 판교점', type: '백화점', grade: 'A', currentStock: 5, predT1: 6, predT2: 5, prRatio: 0.55, sizeQty: { '90': 1, '95': 1, '100': 2, '105': 1, '110': 1 }, total: 6, mdQty: 8, status: 'modified' },
  { shopCode: '20045', shopName: '가로수길 직영점', type: '직영', grade: 'A', currentStock: 4, predT1: 7, predT2: 6, prRatio: 0.60, sizeQty: { '90': 1, '95': 2, '100': 2, '105': 2, '110': 1 }, total: 8, mdQty: 8, status: 'ready' },
  { shopCode: '30012', shopName: '온라인 직영몰', type: '온라인', grade: '-', currentStock: 42, predT1: 3, predT2: 2, prRatio: 0.12, sizeQty: { '90': 0, '95': 0, '100': 0, '105': 0, '110': 0 }, total: 0, mdQty: 0, status: 'sufficient' },
];

const gradeConfig = {
  'S+': { className: 'bg-red-50 text-red-700 border-red-200' },
  'A': { className: 'bg-amber-50 text-amber-700 border-amber-200' },
  'B': { className: 'bg-sky-50 text-sky-700 border-sky-200' },
  '-': { className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const statusConfig = {
  ready: { label: '대기', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  modified: { label: 'MD수정', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { label: '확정', className: 'bg-green-50 text-green-700 border-green-200' },
  sufficient: { label: '재고충분', className: 'bg-gray-100 text-gray-400 border-gray-200' },
};

interface ShopScsTableProps {
  selectedSc?: string;
}

export default function ShopScsTable({ selectedSc = 'DXDJ73041-BKS' }: ShopScsTableProps) {
  const totals = {
    currentStock: shopScsData.reduce((sum, s) => sum + s.currentStock, 0),
    predT1: shopScsData.reduce((sum, s) => sum + s.predT1, 0),
    predT2: shopScsData.reduce((sum, s) => sum + s.predT2, 0),
    sizeQty: sizes.reduce((acc, size) => {
      acc[size] = shopScsData.reduce((sum, s) => sum + (s.sizeQty[size as keyof typeof s.sizeQty] || 0), 0);
      return acc;
    }, {} as Record<string, number>),
    total: shopScsData.reduce((sum, s) => sum + s.total, 0),
    mdQty: shopScsData.reduce((sum, s) => sum + s.mdQty, 0),
  };

  const replenishShopCount = shopScsData.filter(s => s.total > 0).length;

  return (
    <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#FAFBFC] flex justify-between items-center">
        <h3 className="text-[13px] font-semibold flex items-center gap-2">
          매장별 SCS 보충 상세 —
          <span className="text-[#7C3AED]">{selectedSc}</span>
          <span className="text-[11px] text-[#718096] font-normal">레저 바람막이 자켓 / 블랙</span>
        </h3>
        <div className="flex gap-2 items-center">
          <div className="flex border border-[#E2E8F0] rounded overflow-hidden h-7">
            <button className="px-2 text-[11px] bg-[#1B3A5C] text-white font-medium">RT Off</button>
            <button className="px-2 text-[11px] bg-white text-[#718096] hover:bg-[#F5F7FA]">RT On</button>
          </div>
          <Button variant="outline" size="sm" className="text-[11px] h-7">
            엑셀 (매크로)
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
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">유형</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">등급</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">
                현 재고
                <div className="text-[9px] font-normal">(실시간)</div>
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-[#00A3E0] whitespace-nowrap text-right">
                T+1 예측
                <div className="text-[9px] font-normal">SCS-shop</div>
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-[#00A3E0] whitespace-nowrap text-right">
                T+2 예측
                <div className="text-[9px] font-normal">SCS-shop</div>
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">PR Ratio</TableHead>
              {sizes.map((size) => (
                <TableHead key={size} className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-center bg-[#F0F7FF] w-12">
                  {size}
                </TableHead>
              ))}
              <TableHead className="text-[11px] font-semibold text-[#7C3AED] whitespace-nowrap text-right">보충합계</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">MD 수정</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shopScsData.map((shop) => {
              const grade = gradeConfig[shop.grade as keyof typeof gradeConfig];
              const status = statusConfig[shop.status as keyof typeof statusConfig];
              const isModified = shop.status === 'modified';
              const isSufficient = shop.status === 'sufficient';

              return (
                <TableRow key={shop.shopCode} className={`hover:bg-[#F7F9FC] ${isSufficient ? 'opacity-60' : ''}`}>
                  <TableCell><Checkbox defaultChecked={!isSufficient} /></TableCell>
                  <TableCell className="text-xs">{shop.shopCode}</TableCell>
                  <TableCell className={`text-xs ${isSufficient ? 'text-[#718096]' : 'font-medium'}`}>{shop.shopName}</TableCell>
                  <TableCell className="text-xs">{shop.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${grade.className}`}>
                      {shop.grade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{shop.currentStock}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-[#00A3E0] italic">{shop.predT1}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-[#00A3E0] italic">{shop.predT2}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{shop.prRatio.toFixed(2)}</TableCell>
                  {sizes.map((size) => {
                    const qty = shop.sizeQty[size as keyof typeof shop.sizeQty] || 0;
                    return (
                      <TableCell
                        key={size}
                        className={`text-xs text-center tabular-nums ${qty > 0 ? 'bg-[#F0FFF4] font-medium text-[#2E7D32]' : 'text-[#CBD5E0]'}`}
                      >
                        {qty}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-xs text-right tabular-nums text-[#7C3AED] font-semibold">{shop.total}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      defaultValue={shop.mdQty}
                      className={`w-12 h-6 text-xs text-right p-1 ${isModified ? 'border-[#F5A623] text-[#F5A623] font-semibold' : ''}`}
                      min={0}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${status.className}`}>
                      {status.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {/* 합계 행 */}
            <TableRow className="bg-[#FAFBFC] font-semibold">
              <TableCell></TableCell>
              <TableCell colSpan={4} className="text-xs">합계 ({replenishShopCount}개 보충 매장)</TableCell>
              <TableCell className="text-xs text-right tabular-nums">{totals.currentStock}</TableCell>
              <TableCell className="text-xs text-right tabular-nums text-[#00A3E0]">{totals.predT1}</TableCell>
              <TableCell className="text-xs text-right tabular-nums text-[#00A3E0]">{totals.predT2}</TableCell>
              <TableCell className="text-xs text-right">-</TableCell>
              {sizes.map((size) => (
                <TableCell key={size} className="text-xs text-center tabular-nums font-bold">
                  {totals.sizeQty[size]}
                </TableCell>
              ))}
              <TableCell className="text-xs text-right tabular-nums text-[#7C3AED] font-bold">{totals.total}</TableCell>
              <TableCell className="text-xs text-right tabular-nums">{totals.mdQty}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
