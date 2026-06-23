'use client';

import ReplenishmentTab from '@/components/replenishment/ReplenishmentTab';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[13px]">
      {/* v6: 단일 화면 보충배분 */}
      <ReplenishmentTab />
    </div>
  );
}
