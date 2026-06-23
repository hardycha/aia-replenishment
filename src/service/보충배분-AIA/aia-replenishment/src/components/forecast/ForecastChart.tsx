'use client';

import { Card } from '@/components/ui/card';
import { forecastChartData } from '@/data/mockData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function ForecastChart() {
  return (
    <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#FAFBFC] flex justify-between items-center">
        <h3 className="text-[13px] font-semibold flex items-center gap-1.5">
          📊 SC-Total 주간 수요예측 추이
        </h3>
        <div className="flex gap-3">
          <span className="text-[11px] flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#00A3E0] rounded-sm inline-block" />
            실제 판매
          </span>
          <span className="text-[11px] flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#7C3AED] rounded-sm inline-block" />
            AI 예측
          </span>
        </div>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={forecastChartData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: '#718096' }}
              axisLine={{ stroke: '#E2E8F0' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#718096' }}
              axisLine={{ stroke: '#E2E8F0' }}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #E2E8F0',
              }}
            />
            <Bar
              dataKey="actual"
              name="실제 판매"
              fill="#00A3E0"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="forecast"
              name="AI 예측"
              fill="#7C3AED"
              fillOpacity={0.7}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
