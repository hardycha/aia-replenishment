'use client';

import { Card } from '@/components/ui/card';
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

// 사이즈 목록
const sizes = ['85', '90', '95', '100', '105', '110'];

// 매장별 보충 수량 mock 데이터
const replenishmentData = [
  { shopCode: 'S001', shopName: '롯데 잠실점', qty: { '85': 2, '90': 3, '95': 4, '100': 3, '105': 2, '110': 1 } },
  { shopCode: 'S002', shopName: '신세계 강남점', qty: { '85': 1, '90': 2, '95': 3, '100': 2, '105': 1, '110': 0 } },
  { shopCode: 'S003', shopName: '현대 판교점', qty: { '85': 2, '90': 2, '95': 2, '100': 2, '105': 1, '110': 1 } },
  { shopCode: 'S004', shopName: '갤러리아 압구정점', qty: { '85': 1, '90': 1, '95': 2, '100': 2, '105': 1, '110': 0 } },
  { shopCode: 'S005', shopName: 'AK 수원점', qty: { '85': 0, '90': 1, '95': 2, '100': 1, '105': 1, '110': 0 } },
  { shopCode: 'S006', shopName: '롯데 부산본점', qty: { '85': 1, '90': 2, '95': 3, '100': 2, '105': 1, '110': 1 } },
  { shopCode: 'S007', shopName: '신세계 센텀시티', qty: { '85': 1, '90': 1, '95': 2, '100': 1, '105': 1, '110': 0 } },
  { shopCode: 'S008', shopName: '현대 대구점', qty: { '85': 0, '90': 1, '95': 1, '100': 1, '105': 0, '110': 0 } },
];

export default function ReplenishmentTable() {
  // 사이즈별 합계 계산
  const sizeTotals = sizes.reduce((acc, size) => {
    acc[size] = replenishmentData.reduce((sum, shop) => sum + (shop.qty[size as keyof typeof shop.qty] || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const grandTotal = Object.values(sizeTotals).reduce((sum, val) => sum + val, 0);

  return (
    <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#FAFBFC] flex justify-between items-center">
        <h3 className="text-[13px] font-semibold">
          매장별 보충 수량
          <span className="text-[#718096] font-normal ml-2">
            (기입고 매장 {replenishmentData.length}개)
          </span>
        </h3>
        <Button variant="outline" size="sm" className="text-[11px] h-7">
          엑셀 다운로드
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F7F8FA]">
              <TableHead className="w-10"><Checkbox /></TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">매장코드</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">매장명</TableHead>
              {sizes.map((size) => (
                <TableHead key={size} className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-center w-16">
                  {size}
                </TableHead>
              ))}
              <TableHead className="text-[11px] font-bold text-[#1B3A5C] whitespace-nowrap text-center bg-[#EDF2F7]">
                합계
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {replenishmentData.map((shop) => {
              const shopTotal = sizes.reduce((sum, size) => sum + (shop.qty[size as keyof typeof shop.qty] || 0), 0);
              return (
                <TableRow key={shop.shopCode} className="hover:bg-[#F7F9FC]">
                  <TableCell><Checkbox /></TableCell>
                  <TableCell className="text-xs">{shop.shopCode}</TableCell>
                  <TableCell className="text-xs">{shop.shopName}</TableCell>
                  {sizes.map((size) => (
                    <TableCell key={size} className="p-1">
                      <Input
                        type="number"
                        defaultValue={shop.qty[size as keyof typeof shop.qty] || 0}
                        className="w-12 h-7 text-xs text-center p-1"
                        min={0}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-xs text-center tabular-nums font-semibold bg-[#EDF2F7]">
                    {shopTotal}
                  </TableCell>
                </TableRow>
              );
            })}
            {/* 합계 행 */}
            <TableRow className="bg-[#FAFBFC] font-semibold">
              <TableCell></TableCell>
              <TableCell colSpan={2} className="text-xs">합계</TableCell>
              {sizes.map((size) => (
                <TableCell key={size} className="text-xs text-center tabular-nums font-bold text-[#00A3E0]">
                  {sizeTotals[size]}
                </TableCell>
              ))}
              <TableCell className="text-xs text-center tabular-nums font-bold text-[#00A3E0] bg-[#EDF2F7]">
                {grandTotal}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
