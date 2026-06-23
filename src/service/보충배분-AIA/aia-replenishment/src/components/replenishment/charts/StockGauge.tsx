'use client';

// AP재고 vs 예측총수요 게이지 (시각화 ④)
// 근거: /보충배분-AIA/task.md T4.4

import type { ShopRow, WarehouseStockItem } from '@/lib/types';

interface Props {
  warehouseStock: WarehouseStockItem[];
  shops: ShopRow[];
}

export default function StockGauge({ warehouseStock, shops }: Props) {
  const apTotal = warehouseStock.reduce((a, b) => a + b.qty, 0);
  const demandTotal = shops
    .filter((s) => !s.removed)
    .reduce((a, b) => a + b.forecastTotal, 0);
  const remain = apTotal - demandTotal;
  const isShort = remain < 0;

  // 진행률: 수요 대비 AP재고가 몇 %를 커버하는가
  const coverage = demandTotal === 0 ? 100 : Math.min(200, (apTotal / demandTotal) * 100);
  const capped = Math.min(100, coverage);

  return (
    <div className="bg-white border border-[#D2D8E0] rounded-md p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[13px] font-semibold text-[#1B3A5C]">AP재고 vs 예측수요</div>
          <div className="text-[10px] text-[#A0AEC0]">물류 여유도</div>
        </div>
      </div>

      {/* 메인 수치 */}
      <div className="flex items-end justify-between mt-1">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#A0AEC0]">AP 가용재고</span>
          <span className="text-[18px] font-bold tabular-nums text-[#1B3A5C] leading-tight">
            {apTotal.toLocaleString()}
          </span>
          <span className="text-[10px] text-[#718096] mt-0.5">
            예측수요 {demandTotal.toLocaleString()}
          </span>
        </div>
        <div
          className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
            isShort
              ? 'bg-[#FEE2E2] text-[#DC3545]'
              : 'bg-[#E6F7FB] text-[#0B8BB1]'
          }`}
        >
          {isShort ? `부족 ${Math.abs(remain).toLocaleString()}` : `여유 ${remain.toLocaleString()}`}
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="mt-3">
        <div className="h-3 w-full rounded-full bg-[#F0F2F6] overflow-hidden">
          <div
            className={`h-full transition-all ${
              isShort
                ? 'bg-gradient-to-r from-[#FCA5A5] to-[#DC3545]'
                : 'bg-gradient-to-r from-[#00B4D8] to-[#7C3AED]'
            }`}
            style={{ width: `${capped}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] text-[#718096]">
          <span>커버리지</span>
          <span className="tabular-nums font-semibold text-[#1B3A5C]">
            {coverage.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 사이즈별 분해 */}
      <div className="mt-3 border-t border-[#EDEFF2] pt-2">
        <div className="text-[10px] text-[#A0AEC0] mb-1">사이즈별 AP재고</div>
        <div className="flex items-center gap-1 flex-wrap">
          {warehouseStock.map((s) => (
            <div
              key={s.sizCd}
              className="flex items-baseline gap-1 bg-[#F8F9FB] border border-[#E2E8F0] rounded px-1.5 py-0.5"
            >
              <span className="text-[9px] text-[#718096]">{s.sizCd}</span>
              <span className="text-[10px] tabular-nums font-semibold text-[#1B3A5C]">
                {s.qty}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
