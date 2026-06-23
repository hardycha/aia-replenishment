'use client';

/**
 * 화면 0 — AI 재고 브리핑
 * 설계 문서: /오프라인_재고운용_자동화_설계.md §2, §7-A
 *
 * MD가 아침에 열면 "오늘 뭘 해야 하는지"를 AI가 자동 분석하여 보여준다.
 * - NarrativeCard: "213개 SC 중 17개 조치 필요" 한 줄 요약
 * - ScoreCards: 긴급/RT/급상승/정상 4종 카운트
 * - 탭별 SC 카드 리스트 (체크박스 일괄 선택 → 배분 시작)
 */

import { useState, useMemo, useCallback } from 'react';
import type { BriefingData, BriefingSc, BriefingSummary } from '@/data/mockBriefingData';
import type { Filters } from '@/lib/types';
import { refreshApStock } from '@/lib/api-client';
import BriefingNarrative from './BriefingNarrative';
import BriefingScoreCards from './BriefingScoreCards';
import BriefingScCard from './BriefingScCard';

type SignalTab = 'urgent' | 'rt' | 'trend' | 'initial';

const PAGE_SIZE = 20;

// v2 분류 재계산 — shortage_ratio 기반 (scoring_engine v2와 동일)
// AP 갱신 시 shortage_ratio 자체는 변하지 않고, AP 유무만 urgent↔rt 전환
function reclassifySc(sc: BriefingSc, newApStock: number): BriefingSc['signal_type'] {
  const shortageRatio = (sc as unknown as Record<string, unknown>).shortage_ratio as number | undefined;
  const avgCoverage = (sc as unknown as Record<string, unknown>).avg_shop_coverage as number | undefined;

  // shortage_ratio >= 30%: urgent(AP有) or rt(AP無)
  if (shortageRatio !== undefined && shortageRatio >= 0.30) {
    return newApStock > 0 ? 'urgent' : 'rt';
  }

  // trend: 속도 +40%↑ AND 평균 재고주수 3~5주
  if (
    sc.velocity_change_pct >= 40 &&
    avgCoverage !== undefined &&
    avgCoverage >= 3.0 &&
    avgCoverage <= 5.0
  ) {
    return 'trend';
  }

  return 'normal';
}

function recomputeSummary(scList: BriefingSc[]): BriefingSummary {
  const urgent_count = scList.filter((s) => s.signal_type === 'urgent').length;
  const rt_count = scList.filter((s) => s.signal_type === 'rt').length;
  const trend_count = scList.filter((s) => s.signal_type === 'trend').length;
  const normal_count = scList.filter((s) => s.signal_type === 'normal').length;
  const action = urgent_count + rt_count + trend_count;
  return {
    total_sc: scList.length,
    urgent_count,
    rt_count,
    trend_count,
    normal_count,
    narrative: `${scList.length}개 SC 분석 완료. ${action}개 SC에서 즉각 조치 필요 신호 감지.`,
  };
}

interface Props {
  briefingData: BriefingData | null;
  isLoading: boolean;
  filters: Filters;
  onStartAllocation: (selectedScs: BriefingSc[]) => void;
  onBriefingUpdate?: (updated: BriefingData) => void;
}

export default function BriefingView({
  briefingData,
  isLoading,
  filters,
  onStartAllocation,
  onBriefingUpdate,
}: Props) {
  const [activeTab, setActiveTab] = useState<SignalTab>('urgent');
  const [selectedScCds, setSelectedScCds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  const filteredList = useMemo(() => {
    if (!briefingData) return [];
    return briefingData.sc_list.filter((sc) => sc.signal_type === activeTab);
  }, [briefingData, activeTab]);

  const visibleList = useMemo(() => filteredList.slice(0, visibleCount), [filteredList, visibleCount]);
  const hasMore = visibleCount < filteredList.length;

  const handleToggleSc = useCallback((scCd: string) => {
    setSelectedScCds((prev) => {
      const next = new Set(prev);
      if (next.has(scCd)) next.delete(scCd);
      else next.add(scCd);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!filteredList.length) return;
    const allSelected = filteredList.every((sc) => selectedScCds.has(sc.sc_cd));
    if (allSelected) {
      setSelectedScCds((prev) => {
        const next = new Set(prev);
        filteredList.forEach((sc) => next.delete(sc.sc_cd));
        return next;
      });
    } else {
      setSelectedScCds((prev) => {
        const next = new Set(prev);
        filteredList.forEach((sc) => next.add(sc.sc_cd));
        return next;
      });
    }
  }, [filteredList, selectedScCds]);

  const handleStartAllocation = useCallback(() => {
    if (!briefingData || selectedScCds.size === 0) return;
    const selected = briefingData.sc_list.filter((sc) => selectedScCds.has(sc.sc_cd));
    onStartAllocation(selected);
  }, [briefingData, selectedScCds, onStartAllocation]);

  // [AP 재고 업데이트] — action SC만 DRP API로 최신 AP 재고 조회 + 분류 재계산
  const handleRefreshApStock = useCallback(async () => {
    if (!briefingData || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const actionScs = briefingData.sc_list.filter(
        (sc) => sc.signal_type !== 'normal',
      );
      if (actionScs.length === 0) {
        setIsRefreshing(false);
        return;
      }
      const result = await refreshApStock({
        brandCd: briefingData.brand_cd,
        ssnCd: briefingData.ssn_cd,
        apCd: filters.apCd || 'U100',
        scList: actionScs.map((sc) => ({ prodCd: sc.prod_cd, colorCd: sc.color_cd })),
      });

      // AP 재고 갱신 + 분류 재계산
      const apMap = new Map(result.stocks.map((s) => [`${s.prodCd}_${s.colorCd}`, s.apStock]));
      const updatedScList = briefingData.sc_list.map((sc) => {
        const key = `${sc.prod_cd}_${sc.color_cd}`;
        const newAp = apMap.get(key);
        if (newAp === undefined) return sc;
        const newSignal = reclassifySc(sc, newAp);
        const newCoverage = newAp / (sc.weekly_forecast + 0.01);
        return { ...sc, ap_stock: newAp, signal_type: newSignal, coverage_weeks: Math.round(newCoverage * 100) / 100 };
      });

      const newSummary = recomputeSummary(updatedScList);
      const updated: BriefingData = {
        ...briefingData,
        summary: newSummary,
        sc_list: updatedScList,
      };
      onBriefingUpdate?.(updated);
      setLastRefreshedAt(result.updatedAt);
    } catch (err) {
      console.error('AP 재고 갱신 실패:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [briefingData, isRefreshing, filters.apCd, onBriefingUpdate]);

  const tabConfig: { key: SignalTab; emoji: string; label: string; color: string }[] = [
    { key: 'urgent', emoji: '🔴', label: '긴급 보충', color: '#DC3545' },
    { key: 'rt', emoji: '🔄', label: 'RT 검토', color: '#7C3AED' },
    { key: 'trend', emoji: '📈', label: '급상승', color: '#F59E0B' },
    { key: 'initial', emoji: '🆕', label: '초도 배분', color: '#00B4D8' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full mx-auto mb-3" />
          <div className="text-[13px] text-[#8492A6]">SC 분석 중...</div>
        </div>
      </div>
    );
  }

  if (!briefingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-[#8492A6]">
          <div className="text-[15px] font-semibold mb-1">브리핑 데이터 없음</div>
          <div className="text-[12px]">브랜드·시즌·배분그룹을 선택하고 조회해주세요.</div>
        </div>
      </div>
    );
  }

  const { summary } = briefingData;
  const selectedCount = selectedScCds.size;
  const allTabSelected = filteredList.length > 0 && filteredList.every((sc) => selectedScCds.has(sc.sc_cd));

  return (
    <div className="space-y-4">
      {/* NarrativeCard + AP 갱신 */}
      <BriefingNarrative summary={summary} />
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-[#A0AEC0]">
          배치 기준: {new Date(briefingData.generated_at).toLocaleString('ko-KR')}
          {lastRefreshedAt && (
            <span className="ml-2 text-[#7C3AED] font-medium">
              · AP 갱신: {new Date(lastRefreshedAt).toLocaleString('ko-KR')}
            </span>
          )}
        </div>
        <button
          onClick={handleRefreshApStock}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium border border-[#D2D8E0] bg-white hover:bg-[#F5F3FF] hover:border-[#7C3AED]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className={isRefreshing ? 'animate-spin' : ''}>↻</span>
          <span>{isRefreshing ? 'AP 재고 갱신 중...' : 'AP 재고 업데이트'}</span>
        </button>
      </div>

      {/* ScoreCards (4종) */}
      <BriefingScoreCards
        summary={summary}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setVisibleCount(PAGE_SIZE);
        }}
      />

      {/* 탭별 SC 리스트 */}
      <div className="bg-white border border-[#D2D8E0] rounded-lg overflow-hidden">
        {/* 탭 헤더 */}
        <div className="flex items-center justify-between border-b border-[#EDEFF2] px-4 py-2.5 bg-[#FAFBFC]">
          <div className="flex items-center gap-1">
            {tabConfig.map((tab) => {
              const count = tab.key === 'urgent'
                ? summary.urgent_count
                : tab.key === 'rt'
                ? summary.rt_count
                : tab.key === 'trend'
                ? summary.trend_count
                : ((summary as unknown as Record<string, number>).initial_count) ?? 0;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors
                    ${isActive
                      ? 'bg-white border border-[#D2D8E0] text-[#1B3A5C] shadow-sm'
                      : 'text-[#8492A6] hover:text-[#1B3A5C] hover:bg-[#F0F2F5]'
                    }
                  `}
                >
                  <span>{tab.emoji}</span>
                  <span>{tab.label}</span>
                  <span
                    className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: isActive ? tab.color : '#A0AEC0' }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allTabSelected}
                onChange={handleSelectAll}
                className="w-3.5 h-3.5 accent-[#7C3AED] cursor-pointer"
              />
              <span className="text-[11px] text-[#718096]">전체 선택</span>
            </label>
          </div>
        </div>

        {/* SC 카드 리스트 */}
        <div className="divide-y divide-[#F0F2F5]">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-[#A0AEC0]">
              해당 분류의 SC가 없습니다.
            </div>
          ) : (
            <>
              {visibleList.map((sc) => (
                <BriefingScCard
                  key={sc.sc_cd}
                  sc={sc}
                  checked={selectedScCds.has(sc.sc_cd)}
                  onToggle={() => handleToggleSc(sc.sc_cd)}
                />
              ))}
              {hasMore && (
                <button
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="w-full py-3 text-[13px] font-medium text-[#7C3AED] hover:bg-[#F5F3FF] transition-colors"
                >
                  더 보기 ({visibleCount}/{filteredList.length})
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 하단 액션 바 */}
      {selectedCount > 0 && (
        <div className="sticky bottom-0 bg-white border border-[#D2D8E0] rounded-lg p-3 flex items-center justify-between shadow-lg">
          <div className="text-[13px] text-[#4A5568]">
            <span className="font-semibold text-[#7C3AED]">{selectedCount}개 SC</span> 선택됨
          </div>
          <button
            onClick={handleStartAllocation}
            className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-r from-[#7C3AED] to-[#9F7AEA] hover:from-[#6D28D9] hover:to-[#8B5CF6] transition-all shadow-sm"
          >
            선택 항목 배분 시작 [{selectedCount}] →
          </button>
        </div>
      )}
    </div>
  );
}
