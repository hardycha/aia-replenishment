'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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

type ViewMode = 'shop' | 'style';

// Mock 데이터 - 매장 목록
const shops = ['강남점', '홍대점', '명동점', '잠실점', '판교점'];

// Mock 데이터 - 스타일/컬러/사이즈
const styleColorSizes = [
  { style: 'DXDJ73041', color: 'BKS', size: 'S', styleName: '레저 바람막이 자켓' },
  { style: 'DXDJ73041', color: 'BKS', size: 'M', styleName: '레저 바람막이 자켓' },
  { style: 'DXDJ73041', color: 'BKS', size: 'L', styleName: '레저 바람막이 자켓' },
  { style: 'DXDJ73041', color: 'NVY', size: 'S', styleName: '레저 바람막이 자켓' },
  { style: 'DXDJ73041', color: 'NVY', size: 'M', styleName: '레저 바람막이 자켓' },
  { style: 'DXTS72031', color: 'WHT', size: 'M', styleName: '에센셜 라운드 반팔티' },
  { style: 'DXTS72031', color: 'WHT', size: 'L', styleName: '에센셜 라운드 반팔티' },
  { style: 'DXTS72031', color: 'BLK', size: 'M', styleName: '에센셜 라운드 반팔티' },
];

// Mock 데이터 - 재고/배분 수량 (매장별 보기용)
const shopViewData = shops.map((shop) => ({
  shop,
  items: styleColorSizes.map((scs) => ({
    ...scs,
    stock: Math.floor(Math.random() * 50),
    alloc: Math.floor(Math.random() * 20),
  })),
}));

// Mock 데이터 - 재고/배분 수량 (스타일별 보기용)
const styleViewData = styleColorSizes.map((scs) => ({
  ...scs,
  shops: shops.map((shop) => ({
    shop,
    stock: Math.floor(Math.random() * 50),
    alloc: Math.floor(Math.random() * 20),
  })),
}));

export default function ReplenishmentTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('shop');
  const [isQueried, setIsQueried] = useState(false);

  const handleQuery = () => {
    setIsQueried(true);
  };

  const handleReset = () => {
    setIsQueried(false);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* 조회 조건 영역 */}
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        {/* 첫째 줄: 브랜드, AP, 상품시즌 */}
        <div className="flex flex-wrap gap-4 items-end mb-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#718096] font-semibold">
              <span className="text-[#DC3545]">*</span>브랜드
            </label>
            <Select defaultValue="X">
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="X" className="text-xs">X: Discovery</SelectItem>
                <SelectItem value="M" className="text-xs">M: MLB</SelectItem>
                <SelectItem value="I" className="text-xs">I: MLB KIDS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#718096] font-semibold">
              <span className="text-[#DC3545]">*</span>AP
            </label>
            <Select defaultValue="offline">
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="offline" className="text-xs">오프라인 정상</SelectItem>
                <SelectItem value="online" className="text-xs">온라인</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#718096] font-semibold">
              <span className="text-[#DC3545]">*</span>상품시즌
            </label>
            <Select defaultValue="26S">
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="26S" className="text-xs">26S</SelectItem>
                <SelectItem value="25F" className="text-xs">25F</SelectItem>
                <SelectItem value="25S" className="text-xs">25S</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 둘째 줄: 매장, 스타일, 컬러 */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#718096] font-semibold">
              매장
            </label>
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">전체 (5개 매장)</SelectItem>
                <SelectItem value="gangnam" className="text-xs">강남점</SelectItem>
                <SelectItem value="hongdae" className="text-xs">홍대점</SelectItem>
                <SelectItem value="myeongdong" className="text-xs">명동점</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#718096] font-semibold">
              스타일
            </label>
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">전체 (2개 스타일)</SelectItem>
                <SelectItem value="DXDJ73041" className="text-xs">DXDJ73041</SelectItem>
                <SelectItem value="DXTS72031" className="text-xs">DXTS72031</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#718096] font-semibold">
              컬러
            </label>
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">전체</SelectItem>
                <SelectItem value="BKS" className="text-xs">BKS</SelectItem>
                <SelectItem value="NVY" className="text-xs">NVY</SelectItem>
                <SelectItem value="WHT" className="text-xs">WHT</SelectItem>
                <SelectItem value="BLK" className="text-xs">BLK</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1" />

          <Button
            className="h-8 px-4 text-xs bg-[#00B4D8] hover:bg-[#0096B4]"
            onClick={handleQuery}
          >
            조회하기
          </Button>
          <Button
            variant="outline"
            className="h-8 px-4 text-xs"
            onClick={handleReset}
          >
            선택 초기화
          </Button>
        </div>
      </div>

      {/* 툴바 영역 */}
      {isQueried && (
        <div className="bg-white border-b border-[#E2E8F0] px-6 py-2 flex items-center gap-4">
          {/* 보기 모드 토글 */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#718096] font-semibold">보기 모드:</span>
            <div className="flex rounded-lg border border-[#E2E8F0] overflow-hidden">
              <button
                className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  viewMode === 'shop'
                    ? 'bg-[#00B4D8] text-white'
                    : 'bg-white text-[#718096] hover:bg-[#F7F8FA]'
                }`}
                onClick={() => setViewMode('shop')}
              >
                매장별 보기
              </button>
              <button
                className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  viewMode === 'style'
                    ? 'bg-[#00B4D8] text-white'
                    : 'bg-white text-[#718096] hover:bg-[#F7F8FA]'
                }`}
                onClick={() => setViewMode('style')}
              >
                스타일별 보기
              </button>
            </div>
          </div>

          <div className="flex-1" />

          <Button
            className="h-7 px-3 text-[11px] bg-gradient-to-r from-[#7C3AED] to-[#9F7AEA] border-none"
          >
            배분 시뮬레이션
          </Button>
          <Button
            variant="outline"
            className="h-7 px-3 text-[11px]"
          >
            엑셀 다운로드
          </Button>
        </div>
      )}

      {/* 테이블 영역 */}
      <div className="flex-1 bg-white overflow-auto">
        {!isQueried ? (
          <div className="flex items-center justify-center h-full text-[#A0AEC0] text-sm">
            조회 조건을 선택하고 조회하기 버튼을 클릭하세요
          </div>
        ) : viewMode === 'shop' ? (
          /* 매장별 보기 */
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F7F8FA]">
                <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap sticky left-0 bg-[#F7F8FA] z-10">
                  매장
                </TableHead>
                {styleColorSizes.map((scs, idx) => (
                  <TableHead
                    key={idx}
                    className="text-[10px] font-semibold text-[#718096] text-center whitespace-nowrap min-w-[80px]"
                  >
                    <div>{scs.style}</div>
                    <div className="text-[9px] text-[#A0AEC0]">{scs.color}-{scs.size}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shopViewData.map((row) => (
                <TableRow key={row.shop} className="hover:bg-[#F7F9FC]">
                  <TableCell className="text-xs font-semibold sticky left-0 bg-white z-10">
                    {row.shop}
                  </TableCell>
                  {row.items.map((item, idx) => (
                    <TableCell key={idx} className="text-center">
                      <div className="text-[10px] text-[#718096]">재고: {item.stock}</div>
                      <div className="text-xs font-semibold text-[#00B4D8]">{item.alloc}</div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          /* 스타일별 보기 */
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F7F8FA]">
                <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap sticky left-0 bg-[#F7F8FA] z-10">
                  스타일
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap bg-[#F7F8FA]">
                  컬러
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap bg-[#F7F8FA]">
                  사이즈
                </TableHead>
                {shops.map((shop) => (
                  <TableHead
                    key={shop}
                    className="text-[11px] font-semibold text-[#718096] text-center whitespace-nowrap min-w-[80px]"
                  >
                    {shop}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {styleViewData.map((row, rowIdx) => (
                <TableRow key={rowIdx} className="hover:bg-[#F7F9FC]">
                  <TableCell className="text-xs font-semibold sticky left-0 bg-white z-10">
                    {row.style}
                  </TableCell>
                  <TableCell className="text-xs">{row.color}</TableCell>
                  <TableCell className="text-xs">{row.size}</TableCell>
                  {row.shops.map((shopData, idx) => (
                    <TableCell key={idx} className="text-center">
                      <div className="text-[10px] text-[#718096]">재고: {shopData.stock}</div>
                      <div className="text-xs font-semibold text-[#00B4D8]">{shopData.alloc}</div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Footer */}
      {isQueried && (
        <div className="bg-white border-t border-[#E2E8F0] px-6 py-2 flex justify-between items-center">
          <span className="text-[11px] text-[#718096]">
            {viewMode === 'shop'
              ? `매장: ${shops.length}개 | 스타일-컬러-사이즈: ${styleColorSizes.length}개`
              : `스타일-컬러-사이즈: ${styleColorSizes.length}개 | 매장: ${shops.length}개`
            }
          </span>
        </div>
      )}
    </div>
  );
}
