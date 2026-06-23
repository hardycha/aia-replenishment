'use client';

/**
 * SC 단위 카드 — 커버리지 게이지 + AI 근거 + 체크박스
 * 설계 문서: /오프라인_재고운용_자동화_설계.md §7 탭 1~3
 */

import type { BriefingSc } from '@/data/mockBriefingData';

interface Props {
  sc: BriefingSc;
  checked: boolean;
  onToggle: () => void;
}

export default function BriefingScCard({ sc, checked, onToggle }: Props) {
  const signalConfig = ({
    urgent: { border: '#DC3545', bg: '#FFF5F5', badge: '긴급', badgeBg: '#DC3545' },
    rt: { border: '#7C3AED', bg: '#F5F3FF', badge: 'RT', badgeBg: '#7C3AED' },
    trend: { border: '#F59E0B', bg: '#FFFBEB', badge: '급상승', badgeBg: '#F59E0B' },
    initial: { border: '#00B4D8', bg: '#F0FDFF', badge: '초도', badgeBg: '#00B4D8' },
    normal: { border: '#D2D8E0', bg: '#F7FAFC', badge: '정상', badgeBg: '#718096' },
  } as Record<string, { border: string; bg: string; badge: string; badgeBg: string }>)[sc.signal_type];

  // 커버리지 게이지 (0~2주 범위, 2주 = 100%)
  const coveragePercent = Math.min(100, (sc.coverage_weeks / 2.0) * 100);
  const coverageColor =
    sc.coverage_weeks < 0.5 ? '#DC3545' :
    sc.coverage_weeks < 1.0 ? '#F59E0B' :
    sc.coverage_weeks < 1.5 ? '#ECC94B' :
    '#28A745';

  return (
    <div
      className={`
        px-4 py-3.5 flex items-start gap-3 transition-colors
        ${checked ? 'bg-[#F5F3FF]' : 'hover:bg-[#FAFBFC]'}
      `}
    >
      {/* 체크박스 */}
      <div className="flex-shrink-0 pt-1">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="w-4 h-4 accent-[#7C3AED] cursor-pointer"
        />
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 min-w-0">
        {/* 1행: SC 코드 + 스타일명 + 배지 */}
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
            style={{ backgroundColor: signalConfig.badgeBg }}
          >
            {signalConfig.badge}
          </span>
          <span className="text-[13px] font-semibold text-[#1B3A5C]">
            {sc.prod_cd} {sc.color_cd}
          </span>
          <span className="text-[12px] text-[#8492A6] truncate">
            {sc.prod_nm}
          </span>
          <span className="text-[11px] text-[#A0AEC0] ml-auto flex-shrink-0">
            {sc.category}
          </span>
        </div>

        {/* 2행: 수치 요약 */}
        <div className="flex items-center gap-4 mb-2 text-[12px]">
          {/* 커버리지 게이지 */}
          <div className="flex items-center gap-2 min-w-[140px]">
            <span className="text-[#718096] w-[52px] flex-shrink-0">커버리지</span>
            <div className="flex-1 h-[6px] bg-[#EDF2F7] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${coveragePercent}%`,
                  backgroundColor: coverageColor,
                }}
              />
            </div>
            <span
              className="text-[11px] font-bold w-[36px] text-right"
              style={{ color: coverageColor }}
            >
              {sc.coverage_weeks.toFixed(1)}주
            </span>
          </div>

          <span className="text-[#D2D8E0]">│</span>

          <span className="text-[#718096]">
            AP <strong className="text-[#1B3A5C]">{sc.ap_stock}</strong>개
          </span>

          <span className="text-[#718096]">
            예측 <strong className="text-[#1B3A5C]">{sc.weekly_forecast.toFixed(0)}</strong>개/주
          </span>

          {sc.broken_shops > 0 && (
            <span className="text-[#DC3545]">
              결품 <strong>{sc.broken_shops}</strong>곳
              {sc.broken_sizes.length > 0 && (
                <span className="text-[#A0AEC0]">({sc.broken_sizes.join('·')})</span>
              )}
            </span>
          )}

          {sc.velocity_change_pct >= 10 && (
            <span className="text-[#F59E0B]">
              속도 <strong>+{sc.velocity_change_pct}%</strong>↑
            </span>
          )}
        </div>

        {/* 3행: AI 근거 */}
        <div className="flex items-start gap-1.5">
          <span className="text-[#7C3AED] text-[11px] flex-shrink-0 mt-0.5">✦</span>
          <span className="text-[12px] text-[#4A5568] leading-relaxed">
            {sc.ai_reason}
          </span>
        </div>
      </div>

      {/* 우측: Priority Score */}
      <div className="flex-shrink-0 text-right pt-0.5">
        <div
          className="text-[20px] font-bold"
          style={{ color: signalConfig.badgeBg }}
        >
          {(sc.priority_score * 100).toFixed(0)}
        </div>
        <div className="text-[10px] text-[#A0AEC0]">점수</div>
      </div>
    </div>
  );
}
