'use client';

/**
 * ScoreCards — 긴급/RT/급상승/정상 4종 카운트 카드
 * 클릭 시 해당 탭으로 전환
 */

import type { BriefingSummary } from '@/data/mockBriefingData';

type TabKey = 'urgent' | 'rt' | 'trend' | 'initial';

interface Props {
  summary: BriefingSummary;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const cards: {
  key: TabKey | 'normal';
  emoji: string;
  label: string;
  subLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    key: 'urgent',
    emoji: '🔴',
    label: '긴급 보충',
    subLabel: '매장 부족 + AP 보충 가능',
    color: '#DC3545',
    bgColor: '#FFF5F5',
    borderColor: '#FED7D7',
  },
  {
    key: 'rt',
    emoji: '🔄',
    label: 'RT 검토',
    subLabel: '매장 부족 + AP 없음',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    borderColor: '#E9D5FF',
  },
  {
    key: 'trend',
    emoji: '📈',
    label: '급상승',
    subLabel: '속도 +40%↑',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  {
    key: 'initial',
    emoji: '🆕',
    label: '초도 배분',
    subLabel: 'AP有 · 매장 미입고',
    color: '#00B4D8',
    bgColor: '#F0FDFF',
    borderColor: '#BAE6FD',
  },
  {
    key: 'normal',
    emoji: '⚪',
    label: '정상 모니터링',
    subLabel: '조치 불필요',
    color: '#718096',
    bgColor: '#F7FAFC',
    borderColor: '#E2E8F0',
  },
];

export default function BriefingScoreCards({ summary, activeTab, onTabChange }: Props) {
  const getCount = (key: string) => {
    switch (key) {
      case 'urgent': return summary.urgent_count;
      case 'rt': return summary.rt_count;
      case 'trend': return summary.trend_count;
      case 'initial': return (summary as unknown as Record<string, number>).initial_count ?? 0;
      case 'normal': return summary.normal_count;
      default: return 0;
    }
  };

  return (
    <div className="grid grid-cols-5 gap-3">
      {cards.map((card) => {
        const count = getCount(card.key);
        const isClickable = card.key !== 'normal';
        const isActive = isClickable && activeTab === card.key;

        return (
          <button
            key={card.key}
            onClick={() => isClickable && onTabChange(card.key as TabKey)}
            disabled={!isClickable}
            className={`
              rounded-lg p-4 text-left transition-all
              ${isClickable ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}
              ${isActive
                ? 'ring-2 shadow-md'
                : 'border'
              }
            `}
            style={{
              backgroundColor: card.bgColor,
              borderColor: isActive ? card.color : card.borderColor,
              ...(isActive ? { '--tw-ring-color': card.color } as React.CSSProperties : {}),
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[18px]">{card.emoji}</span>
              <span
                className="text-[28px] font-bold"
                style={{ color: card.color }}
              >
                {count}
              </span>
            </div>
            <div className="text-[13px] font-semibold text-[#1B3A5C]">
              {card.label}
            </div>
            <div className="text-[11px] text-[#8492A6] mt-0.5">
              {card.subLabel}
            </div>
          </button>
        );
      })}
    </div>
  );
}
