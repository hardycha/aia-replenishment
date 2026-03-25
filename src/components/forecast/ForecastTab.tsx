'use client';

import FilterBar from './FilterBar';
import InventorySummary from './InventorySummary';
import ReplenishmentTable from './ReplenishmentTable';

export default function ForecastTab() {
  return (
    <div>
      <FilterBar />

      <div className="p-4 space-y-4">
        <InventorySummary />
        <ReplenishmentTable />
      </div>
    </div>
  );
}
