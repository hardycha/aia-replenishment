'use client';

import FilterBar from './FilterBar';
import Pipeline from './Pipeline';
import AiInsightBox from './AiInsightBox';
import KpiCards from './KpiCards';
import ForecastChart from './ForecastChart';
import PriorityTable from './PriorityTable';
import ShopDetailTable from './ShopDetailTable';
import { aiInsights } from '@/data/mockData';

export default function ForecastTab() {
  return (
    <div>
      <FilterBar />

      <div className="p-4">
        <Pipeline />

        <AiInsightBox
          title={aiInsights.forecast.title}
          content={aiInsights.forecast.content}
        />

        <KpiCards />

        <div className="grid grid-cols-2 gap-4 mb-4 max-lg:grid-cols-1">
          <ForecastChart />
          <PriorityTable />
        </div>

        <ShopDetailTable />
      </div>
    </div>
  );
}
