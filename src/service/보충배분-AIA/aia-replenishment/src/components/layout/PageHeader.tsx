'use client';

export default function PageHeader() {
  return (
    <div className="bg-white border-b border-[#E2E8F0] px-5 py-3 flex items-center justify-between">
      <h1 className="text-base font-bold text-[#1B3A5C] flex items-center gap-2">
        ┃ 보충배분-AIA
        <span className="bg-gradient-to-r from-[#7C3AED] to-[#9F7AEA] text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
          ✦ AI Assisted
        </span>
      </h1>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#718096]">
          Menu Path: 배분RT 관리 &gt; 배분 관리 &gt; 보충배분-AIA
        </span>
      </div>
    </div>
  );
}
