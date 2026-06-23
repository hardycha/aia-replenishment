'use client';

// SCS 배분 현황 시각화 — 상단 Stacked Bar (사이즈별) + 하단 배분 분포 차트 (viewMode별)
import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import type { ShopRow, StockData } from '@/lib/types';

interface ScsSummaryItem {
  sizCd: string;
  apQty: number;
  totalAlloc: number;
  totalForecast: number;
  totalStock: number;
  remaining: number;
}

interface Props {
  scsSummary: ScsSummaryItem[];
  grandTotal: { apQty: number; alloc: number; remaining: number };
  shops: ShopRow[];
  stockData: StockData;
  prodCd: string;
  colorCd: string;
  sizes: string[];
  viewMode: 'shop' | 'style';
}

// 사이즈별 색상 팔레트
const SIZE_COLORS = ['#7C3AED', '#00B4D8', '#F59E0B', '#10B981', '#EF4444', '#6366F1', '#EC4899', '#14B8A6'];
// 매장별 색상 팔레트 (상위 매장용)
const SHOP_COLORS = ['#7C3AED', '#00B4D8', '#F59E0B', '#10B981', '#EF4444', '#6366F1', '#EC4899', '#14B8A6', '#8B5CF6', '#06B6D4'];

export default function ScsAllocationChart({
  scsSummary,
  grandTotal,
  shops,
  stockData,
  prodCd,
  colorCd,
  sizes,
  viewMode,
}: Props) {
  const [showDetail, setShowDetail] = useState(false);

  // ── Stacked Bar 데이터 (상단 사이즈별 현황) ──
  const barData = useMemo(
    () =>
      scsSummary.map((e) => ({
        sizCd: e.sizCd,
        배분: e.totalAlloc,
        잔량: Math.max(0, e.remaining),
        초과: e.remaining < 0 ? Math.abs(e.remaining) : 0,
        apQty: e.apQty,
        pct: e.apQty > 0 ? Math.round((e.totalAlloc / e.apQty) * 100) : 0,
      })),
    [scsSummary],
  );

  // ── 매장별 보기: 매장별 사이즈 배분 분포 (가로 Stacked Bar) ──
  const shopDistData = useMemo(() => {
    if (!showDetail || viewMode !== 'shop') return [];
    return shops
      .map((shop) => {
        const entry: Record<string, string | number> = { name: `${shop.shopNm} (${shop.adjRank})` };
        let total = 0;
        sizes.forEach((sizCd) => {
          const dk = `${shop.shopCd}_${prodCd}_${colorCd}_${sizCd}`;
          const alloc = stockData[dk]?.alloc ?? 0;
          entry[sizCd] = alloc;
          total += alloc;
        });
        entry._total = total;
        return entry;
      })
      .filter((e) => (e._total as number) > 0)
      .sort((a, b) => (b._total as number) - (a._total as number));
  }, [showDetail, viewMode, shops, sizes, stockData, prodCd, colorCd]);

  // ── 사이즈별 보기: 사이즈별 매장 배분 분포 (세로 Stacked Bar) ──
  const sizeDistData = useMemo(() => {
    if (!showDetail || viewMode !== 'style') return [];
    // 배분 있는 매장만 추출 (상위 10개 + 기타)
    const shopTotals = shops.map((shop) => {
      let total = 0;
      sizes.forEach((sizCd) => {
        const dk = `${shop.shopCd}_${prodCd}_${colorCd}_${sizCd}`;
        total += stockData[dk]?.alloc ?? 0;
      });
      return { ...shop, total };
    }).filter((s) => s.total > 0).sort((a, b) => b.total - a.total);

    const topShops = shopTotals.slice(0, 10);
    const otherShops = shopTotals.slice(10);

    return sizes
      .map((sizCd) => {
        const entry: Record<string, string | number> = { sizCd };
        let sizTotal = 0;
        topShops.forEach((shop) => {
          const dk = `${shop.shopCd}_${prodCd}_${colorCd}_${sizCd}`;
          const alloc = stockData[dk]?.alloc ?? 0;
          entry[shop.shopNm] = alloc;
          sizTotal += alloc;
        });
        if (otherShops.length > 0) {
          let otherTotal = 0;
          otherShops.forEach((shop) => {
            const dk = `${shop.shopCd}_${prodCd}_${colorCd}_${sizCd}`;
            otherTotal += stockData[dk]?.alloc ?? 0;
          });
          entry['기타'] = otherTotal;
          sizTotal += otherTotal;
        }
        entry._total = sizTotal;
        return entry;
      })
      .filter((e) => (e._total as number) > 0);
  }, [showDetail, viewMode, shops, sizes, stockData, prodCd, colorCd]);

  const sizeDistKeys = useMemo(() => {
    if (sizeDistData.length === 0) return [];
    const keys = new Set<string>();
    sizeDistData.forEach((d) => {
      Object.keys(d).forEach((k) => { if (k !== 'sizCd' && k !== '_total') keys.add(k); });
    });
    return [...keys];
  }, [sizeDistData]);

  const detailLabel = viewMode === 'shop' ? '매장별 사이즈 배분 분포' : '사이즈별 매장 배분 분포';

  return (
    <div className="bg-white border border-[#D2D8E0] rounded-md p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-semibold text-[#1B3A5C]">SCS 배분 현황</span>
          <span className="text-[11px] text-[#A0AEC0]">{prodCd} · {colorCd}</span>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#7C3AED]" />배분
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#E2E8F0]" />잔량
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#FCA5A5]" />초과
          </span>
        </div>
      </div>

      {/* 합계 요약 */}
      <div className="flex items-center gap-6 mb-4 px-1">
        <div className="text-center">
          <div className="text-[10px] text-[#A0AEC0]">AP 가용재고</div>
          <div className="text-[18px] font-bold tabular-nums text-[#1B3A5C]">{grandTotal.apQty.toLocaleString()}</div>
        </div>
        <div className="text-[#D2D8E0] text-lg">→</div>
        <div className="text-center">
          <div className="text-[10px] text-[#7C3AED]">배분 합계</div>
          <div className="text-[18px] font-bold tabular-nums text-[#7C3AED]">{grandTotal.alloc.toLocaleString()}</div>
        </div>
        <div className="text-[#D2D8E0] text-lg">=</div>
        <div className="text-center">
          <div className="text-[10px] text-[#A0AEC0]">잔량</div>
          <div className={`text-[18px] font-bold tabular-nums ${grandTotal.remaining < 0 ? 'text-[#DC3545]' : 'text-[#1B3A5C]'}`}>
            {grandTotal.remaining.toLocaleString()}
          </div>
        </div>
        <div className="ml-auto text-center">
          <div className="text-[10px] text-[#A0AEC0]">소진율</div>
          <div className="text-[18px] font-bold tabular-nums text-[#1B3A5C]">
            {grandTotal.apQty > 0 ? Math.round((grandTotal.alloc / grandTotal.apQty) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Stacked Bar Chart */}
      <div className="h-[180px] mb-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="sizCd" tick={{ fontSize: 11, fill: '#4A5568', fontWeight: 700 }} axisLine={{ stroke: '#D2D8E0' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#A0AEC0' }} axisLine={false} tickLine={false} width={45} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #D2D8E0' }}
              formatter={(value, name) => [Number(value).toLocaleString(), name]}
              labelFormatter={(label) => `사이즈 ${label}`}
            />
            <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="배분" stackId="a" radius={[0, 0, 0, 0]}>
              {barData.map((_, i) => (
                <Cell key={i} fill="#7C3AED" />
              ))}
            </Bar>
            <Bar dataKey="잔량" stackId="a" radius={[4, 4, 0, 0]}>
              {barData.map((_, i) => (
                <Cell key={i} fill="#E2E8F0" />
              ))}
            </Bar>
            <Bar dataKey="초과" radius={[4, 4, 0, 0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.초과 > 0 ? '#EF4444' : 'transparent'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 사이즈별 소진율 인라인 */}
      <div className="flex gap-2 flex-wrap mb-3">
        {barData.map((e) => (
          <span key={e.sizCd} className={`text-[10px] px-2 py-0.5 rounded-full tabular-nums font-semibold ${
            e.초과 > 0 ? 'bg-[#FEE2E2] text-[#DC3545]' : e.pct >= 80 ? 'bg-[#F3EFFE] text-[#7C3AED]' : 'bg-[#F0F2F6] text-[#4A5568]'
          }`}>
            {e.sizCd}: {e.pct}%
          </span>
        ))}
      </div>

      {/* 배분 분포 토글 */}
      <button
        onClick={() => setShowDetail((p) => !p)}
        className="text-[11px] text-[#00B4D8] hover:underline font-medium mb-2"
      >
        {showDetail ? `▲ ${detailLabel} 접기` : `▼ ${detailLabel} 펼치기`}
      </button>

      {/* 매장별 보기: 매장별 사이즈 배분 분포 (가로 Stacked Bar) */}
      {showDetail && viewMode === 'shop' && shopDistData.length > 0 && (
        <div className="h-[Math.min(shopDistData.length * 28 + 40, 400)]" style={{ height: Math.min(shopDistData.length * 28 + 40, 400) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={shopDistData} layout="vertical" barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#A0AEC0' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#4A5568' }} axisLine={false} tickLine={false} width={120} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #D2D8E0' }}
                formatter={(value, name) => [Number(value).toLocaleString(), `사이즈 ${name}`]}
              />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              {sizes.map((sizCd, i) => (
                <Bar key={sizCd} dataKey={sizCd} stackId="a" fill={SIZE_COLORS[i % SIZE_COLORS.length]} radius={i === sizes.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {showDetail && viewMode === 'shop' && shopDistData.length === 0 && (
        <div className="text-center text-[11px] text-[#A0AEC0] py-4">배분된 매장이 없습니다</div>
      )}

      {/* 사이즈별 보기: 사이즈별 매장 배분 분포 (세로 Stacked Bar) */}
      {showDetail && viewMode === 'style' && sizeDistData.length > 0 && (
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sizeDistData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="sizCd" tick={{ fontSize: 11, fill: '#4A5568', fontWeight: 700 }} axisLine={{ stroke: '#D2D8E0' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#A0AEC0' }} axisLine={false} tickLine={false} width={45} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #D2D8E0' }}
                formatter={(value, name) => [Number(value).toLocaleString(), name]}
                labelFormatter={(label) => `사이즈 ${label}`}
              />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              {sizeDistKeys.map((key, i) => (
                <Bar key={key} dataKey={key} stackId="a" fill={SHOP_COLORS[i % SHOP_COLORS.length]} radius={i === sizeDistKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {showDetail && viewMode === 'style' && sizeDistData.length === 0 && (
        <div className="text-center text-[11px] text-[#A0AEC0] py-4">배분된 사이즈가 없습니다</div>
      )}
    </div>
  );
}
