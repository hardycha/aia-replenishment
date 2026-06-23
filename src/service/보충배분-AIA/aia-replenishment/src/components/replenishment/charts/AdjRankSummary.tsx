'use client';

// adjRank 버킷(등급)별 요약 (시각화 ②)
// 근거: /보충배분-AIA/task.md T4.3

import type { ShopRow } from '@/lib/types';

interface Props {
  shops: ShopRow[];
  shopCnt: number; // 배분그룹 총 매장수 (버킷 범위 결정용)
}

interface Bucket {
  key: 'S' | 'A' | 'B';
  label: string;
  subtitle: string;
  rankFrom: number;
  rankTo: number;
  accent: string; // 테두리·아이콘 색
  bg: string; // 배경 그라데이션
}

function computeBuckets(shopCnt: number): Bucket[] {
  // 비율 기반 분할: 상위 ~30%, 중위 ~50%, 하위 ~20%
  const s = Math.max(1, Math.ceil(shopCnt * 0.3));
  const a = Math.max(s + 1, Math.ceil(shopCnt * 0.8));
  return [
    {
      key: 'S',
      label: 'S 계열',
      subtitle: `adjRank 1 ~ ${s}`,
      rankFrom: 1,
      rankTo: s,
      accent: '#7C3AED',
      bg: 'from-[#F3EFFE] to-[#EEE6FD]',
    },
    {
      key: 'A',
      label: 'A 계열',
      subtitle: `adjRank ${s + 1} ~ ${a}`,
      rankFrom: s + 1,
      rankTo: a,
      accent: '#00B4D8',
      bg: 'from-[#E8F7FB] to-[#E0F3F9]',
    },
    {
      key: 'B',
      label: 'B 계열',
      subtitle: `adjRank ${a + 1} 이상`,
      rankFrom: a + 1,
      rankTo: shopCnt,
      accent: '#718096',
      bg: 'from-[#F0F2F6] to-[#E8ECF2]',
    },
  ];
}

export default function AdjRankSummary({ shops, shopCnt }: Props) {
  const active = shops.filter((s) => !s.removed);
  const buckets = computeBuckets(shopCnt);

  const rows = buckets.map((b) => {
    const inBucket = active.filter(
      (s) => s.adjRank >= b.rankFrom && s.adjRank <= b.rankTo,
    );
    const demandAvg = inBucket.length > 0
      ? Math.round(inBucket.reduce((a, s) => a + s.demandIndex, 0) / inBucket.length)
      : 0;
    const stock = inBucket.reduce((a, s) => a + s.currentStockTotal, 0);
    return { ...b, shops: inBucket.length, demandAvg, stock };
  });

  return (
    <div className="bg-white border border-[#D2D8E0] rounded-md p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[13px] font-semibold text-[#1B3A5C]">등급별 분포</div>
          <div className="text-[10px] text-[#A0AEC0]">배분그룹 {shopCnt}개 매장 기준</div>
        </div>
      </div>
      <div className="flex flex-col gap-2 mt-1">
        {rows.map((r) => (
          <div
            key={r.key}
            className={`rounded-md p-2.5 border border-[#E2E8F0] bg-gradient-to-r ${r.bg}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: r.accent }}
                />
                <span className="text-[12px] font-bold" style={{ color: r.accent }}>
                  {r.label}
                </span>
                <span className="text-[10px] text-[#718096]">{r.subtitle}</span>
              </div>
              <span className="text-[11px] font-semibold text-[#1B3A5C]">{r.shops} 매장</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#4A5568]">
              <span>
                평균 수요지수{' '}
                <b className="tabular-nums text-[#7C3AED]">{r.demandAvg}</b>
              </span>
              <span>
                현재고{' '}
                <b className="tabular-nums text-[#1B3A5C]">{r.stock.toLocaleString()}</b>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
