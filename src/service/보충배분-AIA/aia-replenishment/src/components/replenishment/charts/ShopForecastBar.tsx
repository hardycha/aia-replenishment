'use client';

// 매장별 수요지수 바차트

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { ShopRow } from '@/lib/types';

interface Props {
  shops: ShopRow[];
  height?: number;
}

export default function ShopForecastBar({ shops, height = 220 }: Props) {
  const data = shops
    .filter((s) => !s.removed)
    .sort((a, b) => a.adjRank - b.adjRank)
    .map((s) => ({
      label: `${s.adjRank}.${s.shopNm}`,
      shopNm: s.shopNm,
      adjRank: s.adjRank,
      demandIndex: s.demandIndex,
    }));

  return (
    <div className="bg-white border border-[#D2D8E0] rounded-md p-3 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[13px] font-semibold text-[#1B3A5C]">매장별 수요지수</div>
          <div className="text-[10px] text-[#A0AEC0]">adjRank 순, 최대 매장 = 100</div>
        </div>
      </div>
      <div style={{ width: '100%', height }} className="mt-1">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 32 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDEFF2" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: '#718096' }}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 10, fill: '#718096' }} domain={[0, 100]} />
            <Tooltip
              cursor={{ fill: 'rgba(124,58,237,0.08)' }}
              contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #D2D8E0' }}
              labelStyle={{ color: '#1B3A5C', fontWeight: 600 }}
              formatter={(v) => [`${String(v)}`, '수요지수']}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as
                  | { shopNm: string; adjRank: number }
                  | undefined;
                return p ? `${p.shopNm} (adjRank ${p.adjRank})` : '';
              }}
            />
            <Bar dataKey="demandIndex" fill="#7C3AED" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
