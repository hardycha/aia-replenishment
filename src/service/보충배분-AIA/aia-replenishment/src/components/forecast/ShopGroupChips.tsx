'use client';

import { useState } from 'react';

const shopGroups = [
  { id: 'all', label: '전체 매장', count: 320 },
  { id: 'splus', label: 'S+', count: 28 },
  { id: 'a', label: 'A등급', count: 64 },
  { id: 'dept', label: '백화점', count: 52 },
  { id: 'direct', label: '직영', count: 38 },
  { id: 'mall', label: '쇼핑몰', count: 45 },
];

export default function ShopGroupChips() {
  const [selected, setSelected] = useState('all');

  return (
    <div className="flex gap-2 flex-wrap items-center">
      <span className="text-[11px] text-[#718096] font-semibold">선택 매장:</span>
      {shopGroups.map((group) => (
        <button
          key={group.id}
          onClick={() => setSelected(group.id)}
          className={`
            inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] border transition-all
            ${selected === group.id
              ? 'bg-[#E6F7FF] border-[#00A3E0] text-[#00A3E0]'
              : 'bg-[#EDF2F7] border-[#E2E8F0] text-[#718096] hover:bg-[#E2E8F0]'
            }
          `}
        >
          {group.label} ({group.count})
          {selected === group.id && (
            <span className="text-[10px] ml-1 opacity-70">×</span>
          )}
        </button>
      ))}
    </div>
  );
}
