'use client';

/**
 * NarrativeCard — "213개 SC 분석 완료. 17개 즉각 조치 필요."
 * 리오더 자동화의 OverviewNarrative.sentence 패턴 이식
 */

import type { BriefingSummary } from '@/data/mockBriefingData';

interface Props {
  summary: BriefingSummary;
}

export default function BriefingNarrative({ summary }: Props) {
  const actionCount = summary.urgent_count + summary.rt_count + summary.trend_count;

  return (
    <div className="bg-gradient-to-r from-[#7C3AED]/5 to-[#9F7AEA]/5 border border-[#7C3AED]/20 rounded-lg p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#7C3AED] flex items-center justify-center">
          <span className="text-white text-[16px]">✦</span>
        </div>
        <div>
          <div className="text-[11px] font-bold text-[#7C3AED] uppercase tracking-wider mb-1">
            AI 재고 브리핑
          </div>
          <div className="text-[15px] font-semibold text-[#1B3A5C] leading-relaxed">
            {summary.narrative}
          </div>
          <div className="mt-2 flex items-center gap-4 text-[12px] text-[#718096]">
            <span>전체 <strong className="text-[#1B3A5C]">{summary.total_sc}</strong>개 SC</span>
            <span>·</span>
            <span>조치 필요 <strong className="text-[#7C3AED]">{actionCount}</strong>건</span>
            <span>·</span>
            <span>정상 <strong className="text-[#28A745]">{summary.normal_count}</strong>건</span>
          </div>
        </div>
      </div>
    </div>
  );
}
