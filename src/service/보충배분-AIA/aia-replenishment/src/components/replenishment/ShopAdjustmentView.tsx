'use client';

// [화면 A] 매장 조정 화면 — 조회하기 직후 표시
// 근거: /보충배분-AIA/task.md Phase 4 + 스타일 네비게이터 확장
// v10 팔레트 유지: #F5F7FA 배경 / #1B3A5C 타이틀 / #00B4D8 시안 / #7C3AED 보라

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ShopForecastBar from './charts/ShopForecastBar';
import AddShopModal from './AddShopModal';
import StyleNavigatorModal from './StyleNavigatorModal';
import type {
  Filters,
  ShopGrp,
  ShopRow,
  StyleColorSelection,
  WarehouseStockItem,
} from '@/lib/types';

interface Props {
  filters: Filters;
  onFiltersChange: (next: Filters) => void;
  onQuery: () => void;
  onReset: () => void;

  shopGrp: ShopGrp | null;
  shops: ShopRow[];
  warehouseStock: WarehouseStockItem[];

  shopGrpOptions: { value: string; label: string }[];

  // 탭 (스타일-컬러 조합별)
  activeSelectionIdx: number;
  onActiveSelectionChange: (idx: number) => void;

  onAddShop: (shopCd: string) => void;
  onRemoveShop: (shopCd: string) => void;
  onRestoreShop: (shopCd: string) => void;
  onSimulate: () => void;
  isSimulating?: boolean;
  productTreeLoading?: boolean;
  // ⚠️ 테스트 전용: 실 배포 시 제거할 것 — TargetStock+3 ILP 비교 토글
  useTargetStock?: boolean;
  onUseTargetStockChange?: (v: boolean) => void;
  toast?: string | null;

  // 실데이터 드롭다운
  brandOptions?: { value: string; label: string }[];
  seasonOptions?: { value: string; label: string }[];
  styleCatalog?: import('@/lib/types').StyleCatalogItem[];
  categoryTree?: import('@/lib/types').CategoryTree;
  styleSeasonOptions?: string[];
  shopPool?: { shopCd: string; shopNm: string; region: string }[];
}

export default function ShopAdjustmentView({
  filters,
  onFiltersChange,
  onQuery,
  onReset,
  shopGrp,
  shops,
  warehouseStock,
  shopGrpOptions,
  activeSelectionIdx,
  onActiveSelectionChange,
  onAddShop,
  onRemoveShop,
  onRestoreShop,
  onSimulate,
  isSimulating,
  productTreeLoading,
  // ⚠️ 테스트 전용: 실 배포 시 제거할 것
  useTargetStock,
  onUseTargetStockChange,
  toast,
  brandOptions,
  seasonOptions,
  styleCatalog,
  categoryTree,
  styleSeasonOptions,
  shopPool,
}: Props) {
  const [addShopModalOpen, setAddShopModalOpen] = useState(false);
  const [styleNavOpen, setStyleNavOpen] = useState(false);
  const [showRemoved, setShowRemoved] = useState(false);

  const activeShops = useMemo(() => shops.filter((s) => !s.removed), [shops]);
  const removedShops = useMemo(() => shops.filter((s) => s.removed), [shops]);
  const displayedShops = showRemoved ? shops : activeShops;
  const excludedShopCds = useMemo(() => shops.map((s) => s.shopCd), [shops]);
  const selections = filters.selections;
  const activeSelection = selections[activeSelectionIdx];

  const update = (patch: Partial<Filters>) => onFiltersChange({ ...filters, ...patch });

  return (
    <div className="flex flex-col h-screen bg-[#F4F6F9]">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-[#1B3A5C] text-white px-6 py-2.5 rounded-lg text-xs font-medium z-50 shadow-lg">
          {toast}
        </div>
      )}

      {/* Simulation Overlay */}
      {isSimulating && (
        <div className="fixed inset-0 bg-black/35 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 text-center shadow-xl">
            <div className="w-10 h-10 border-[3px] border-[#E2E8F0] border-t-[#7C3AED] rounded-full animate-spin mx-auto mb-4" />
            <div className="text-sm font-semibold text-[#1B3A5C] mb-1">
              잠시만 기다려주세요
            </div>
            <div className="text-xs text-[#A0AEC0]">
              데이터를 불러오는 중입니다...
            </div>
          </div>
        </div>
      )}

      {/* Page Title */}
      <div className="bg-white px-6 py-3 border-b border-[#D2D8E0] flex items-center gap-2.5 shrink-0">
        <h1 className="text-base font-bold text-[#1B3A5C]">┃ 보충배분-AIA</h1>
        <span className="text-[11px] text-[#7C3AED] bg-[#F3EFFE] px-2 py-0.5 rounded-full font-semibold">
          v11 매장 조정
        </span>
        <span className="ml-auto text-[11px] text-[#A0AEC0]">
          executionDate&nbsp;
          <b className="text-[#1B3A5C] tabular-nums">{filters.executionDate}</b>
          <span className="mx-1.5">·</span>W1 기준
        </span>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-[#D2D8E0]">
        <div className="px-6 py-2 flex flex-wrap gap-3 items-end">
          <FilterField label="브랜드" required>
            <Select
              value={filters.brandCd}
              onValueChange={(v) => v && update({ brandCd: v as Filters['brandCd'] })}
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(brandOptions ?? [
                  { value: 'X', label: 'X: Discovery' },
                  { value: 'M', label: 'M: MLB' },
                  { value: 'V', label: 'V: Duvetica' },
                  { value: 'ST', label: 'ST: Sergio Tacchini' },
                  { value: 'I', label: 'I: MLB KIDS' },
                ]).map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="AP" required>
            <Select
              value={filters.apCd}
              onValueChange={(v) => v && update({ apCd: v })}
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="U100" className="text-xs">오프라인 정상 (U100)</SelectItem>
                <SelectItem value="U110" className="text-xs">오프라인 이월 (U110)</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="상품시즌" required>
            <Select
              value={filters.ssnCd}
              onValueChange={(v) => v && update({ ssnCd: v })}
            >
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(seasonOptions ?? [
                  { value: '26S', label: '26S' },
                  { value: '25F', label: '25F' },
                  { value: '25S', label: '25S' },
                ]).map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="배분그룹" required>
            <Select
              key={`grp-${filters.brandCd}-${filters.shopGrpNo}`}
              value={filters.shopGrpNo}
              onValueChange={(v) => v && update({ shopGrpNo: v })}
            >
              <SelectTrigger className="w-[280px] h-8 text-xs">
                <span className="truncate">
                  {shopGrpOptions.find((o) => o.value === filters.shopGrpNo)?.label ?? '배분그룹 선택'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {shopGrpOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="스타일" required>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStyleNavOpen(true)}
              disabled={productTreeLoading}
              className="h-8 px-3 text-xs justify-start min-w-[200px] bg-white"
            >
              {selections.length === 0 ? (
                <span className="text-[#A0AEC0]">스타일을 선택하세요 …</span>
              ) : (
                <span>
                  <b className="text-[#7C3AED]">{selections.length}</b>개 선택됨
                  <span className="text-[#A0AEC0] ml-2">({selections[0].prodCd}
                    {selections.length > 1 ? ` 외 ${selections.length - 1}` : ''})
                  </span>
                </span>
              )}
            </Button>
          </FilterField>

          <Button
            className="h-8 px-3 text-xs bg-[#00B4D8] hover:bg-[#0096B4] text-white"
            onClick={onQuery}
            disabled={selections.length === 0 || productTreeLoading}
          >
            {productTreeLoading ? '상품 데이터 로딩...' : '조회하기'}
          </Button>
          <Button variant="outline" className="h-8 px-3 text-xs" onClick={onReset}>
            초기화
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* 배분그룹 요약 헤더 + 시뮬레이션 버튼 */}
        <div className="bg-white border border-[#D2D8E0] rounded-md p-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[10px] text-[#A0AEC0]">배분그룹</div>
              <div className="text-[13px] font-bold text-[#1B3A5C]">
                {shopGrp ? shopGrp.shopGrpNm : '-'}
              </div>
              <div className="text-[10px] text-[#718096] tabular-nums">
                {shopGrp?.shopGrpNo ?? '-'}
              </div>
            </div>
            <div className="h-10 w-px bg-[#D2D8E0]" />
            <div>
              <div className="text-[10px] text-[#A0AEC0]">대상 매장</div>
              <div className="text-[13px] font-bold text-[#1B3A5C] tabular-nums">
                {activeShops.length}{' '}
                <span className="text-[11px] text-[#718096] font-normal">
                  / 원본 {shopGrp?.shopCnt ?? 0}
                </span>
              </div>
              {removedShops.length > 0 && (
                <div className="text-[10px] text-[#DC3545]">
                  제거 {removedShops.length}개
                </div>
              )}
            </div>
            <div className="h-10 w-px bg-[#D2D8E0]" />
            <div>
              <div className="text-[10px] text-[#A0AEC0]">활성 스타일·컬러</div>
              <div className="text-[13px] font-bold text-[#1B3A5C] tabular-nums">
                {activeSelection
                  ? `${activeSelection.prodCd} · ${activeSelection.colorCd}`
                  : '-'}
              </div>
              <div className="text-[10px] text-[#718096] truncate max-w-[280px]">
                {activeSelection?.prodNm ?? ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* ⚠️ 테스트 전용: 실 배포 시 이 블록 전체 제거할 것
                TargetStock+3 ILP 비교 토글 — /optimize vs /optimize-add3 전환 */}
            {onUseTargetStockChange && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useTargetStock ?? false}
                  onChange={(e) => onUseTargetStockChange(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#7C3AED] cursor-pointer"
                />
                <span className="text-[10px] text-[#7C3AED] font-medium whitespace-nowrap">
                  TargetStock+3
                </span>
              </label>
            )}
            {/* /테스트 전용 끝 */}
            <Button
              size="sm"
              className="h-8 px-4 text-[11px] bg-gradient-to-r from-[#7C3AED] to-[#9F7AEA] text-white border-none"
              onClick={onSimulate}
              disabled={!shopGrp || activeShops.length === 0 || selections.length === 0}
            >
              배분 시뮬레이션 ▶
            </Button>
          </div>
        </div>

        {/* 스타일-컬러 탭 바 */}
        {selections.length > 0 && (
          <div className="bg-white border border-[#D2D8E0] rounded-md overflow-hidden">
            <div className="px-3 py-2 border-b border-[#EDEFF2] flex items-center gap-2 bg-[#FAFBFC]">
              <span className="text-[11px] font-semibold text-[#8492A6]">
                스타일-컬러 조합
              </span>
              <span className="text-[10px] text-[#A0AEC0]">
                탭을 눌러 각 조합의 예측·재고를 확인하세요
              </span>
            </div>
            <div className="flex overflow-x-auto">
              {selections.map((sel, idx) => {
                const active = idx === activeSelectionIdx;
                return (
                  <button
                    key={`${sel.prodCd}-${sel.colorCd}-${idx}`}
                    onClick={() => onActiveSelectionChange(idx)}
                    className={`shrink-0 px-4 py-2.5 border-r border-[#EDEFF2] text-left transition-colors ${
                      active
                        ? 'bg-white border-b-2 border-b-[#7C3AED] -mb-px'
                        : 'bg-[#F8F9FB] hover:bg-[#F0F2F6] border-b border-b-[#EDEFF2]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          active
                            ? 'bg-[#F3EFFE] text-[#7C3AED]'
                            : 'bg-[#E6F4EA] text-[#2F855A]'
                        }`}
                      >
                        {sel.ssnCd}
                      </span>
                      <span
                        className={`text-xs font-bold tabular-nums ${
                          active ? 'text-[#1B3A5C]' : 'text-[#4A5568]'
                        }`}
                      >
                        {sel.prodCd}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          sel.colorCd === 'ALL'
                            ? 'bg-[#FFF3CD] text-[#92400E]'
                            : 'bg-[#E0E7EF] text-[#4A5568]'
                        }`}
                      >
                        {sel.colorCd}
                      </span>
                    </div>
                    <div
                      className={`text-[10px] mt-0.5 truncate max-w-[220px] ${
                        active ? 'text-[#718096]' : 'text-[#A0AEC0]'
                      }`}
                    >
                      {sel.prodNm}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 매장별 수요지수 차트 */}
        <ShopForecastBar shops={shops} />

        {/* 매장 조정 테이블 */}
        <div className="bg-white border border-[#D2D8E0] rounded-md overflow-hidden">
          <div className="px-4 py-2 border-b border-[#D2D8E0] flex items-center justify-between bg-[#F8F9FB]">
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-semibold text-[#1B3A5C]">매장 조정</span>
              <span className="text-[11px] text-[#A0AEC0]">
                예측치를 참고해 매장을 추가하거나 제거하세요
              </span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[11px] text-[#4A5568] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showRemoved}
                  onChange={(e) => setShowRemoved(e.target.checked)}
                />
                제거된 매장도 표시 ({removedShops.length})
              </label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-[11px] text-[#DC3545] border-[#DC3545]/30 hover:bg-[#DC3545]/5"
                onClick={() => {
                  const zeroStockShops = activeShops.filter((s) => !s.removed && s.currentStockTotal === 0);
                  zeroStockShops.forEach((s) => onRemoveShop(s.shopCd));
                }}
                disabled={activeShops.filter((s) => !s.removed && s.currentStockTotal === 0).length === 0}
              >
                현재고 0 매장 제외 ({activeShops.filter((s) => !s.removed && s.currentStockTotal === 0).length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-[11px]"
                onClick={() => setAddShopModalOpen(true)}
                disabled={!shopGrp}
              >
                + 매장 추가
              </Button>
            </div>
          </div>

          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-[#F0F2F6] sticky top-0 z-10">
                <tr>
                  <th className="text-left p-2 border-b border-[#D2D8E0] font-semibold text-[#8492A6] w-[60px]">
                    순위
                  </th>
                  <th className="text-left p-2 border-b border-[#D2D8E0] font-semibold text-[#8492A6] w-[100px]">
                    매장코드
                  </th>
                  <th className="text-left p-2 border-b border-[#D2D8E0] font-semibold text-[#8492A6]">
                    매장명
                  </th>
                  <th className="text-right p-2 border-b border-[#D2D8E0] font-semibold text-[#7C3AED] w-[110px]">
                    수요지수
                  </th>
                  <th className="text-right p-2 border-b border-[#D2D8E0] font-semibold text-[#4A5568] w-[110px]">
                    현재고합계
                  </th>
                  <th className="text-right p-2 border-b border-[#D2D8E0] font-semibold text-[#8492A6] w-[100px]">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedShops.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#A0AEC0]">
                      표시할 매장이 없습니다. 우측 상단 [+ 매장 추가] 버튼으로 추가해주세요.
                    </td>
                  </tr>
                ) : (
                  displayedShops
                    .slice()
                    .sort((a, b) => a.adjRank - b.adjRank)
                    .map((s) => (
                      <tr
                        key={s.shopCd}
                        className={`border-b border-[#EDEFF2] hover:bg-[#F7F9FC] ${
                          s.removed ? 'opacity-45 line-through' : ''
                        }`}
                      >
                        <td className="p-2 tabular-nums text-[#1B3A5C] font-semibold">
                          {s.adjRank}
                        </td>
                        <td className="p-2 tabular-nums text-[#718096]">{s.shopCd}</td>
                        <td className="p-2 font-medium text-[#1B3A5C]">{s.shopNm}</td>
                        <td
                          className="p-2 text-right tabular-nums text-[#7C3AED] font-semibold cursor-help"
                          title={`예상 판매량: ${s.forecastTotal.toFixed(2)}개`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {s.demandIndex}
                            <span className={`inline-block w-2 h-2 rounded-full ${
                              s.demandIndex >= 70 ? 'bg-[#22C55E]' :
                              s.demandIndex >= 30 ? 'bg-[#D1D5DB]' :
                              'bg-[#EF4444]'
                            }`} />
                          </span>
                        </td>
                        <td className="p-2 text-right tabular-nums text-[#4A5568]">
                          {s.currentStockTotal.toLocaleString()}
                        </td>
                        <td className="p-2 text-right">
                          {s.removed ? (
                            <button
                              onClick={() => onRestoreShop(s.shopCd)}
                              className="text-[10px] text-[#0B8BB1] bg-[#E6F7FB] hover:bg-[#D0EFF7] px-2 py-0.5 rounded"
                            >
                              복원
                            </button>
                          ) : (
                            <button
                              onClick={() => onRemoveShop(s.shopCd)}
                              className="text-[10px] text-[#DC3545] bg-[#FEE2E2] hover:bg-[#FECACA] px-2 py-0.5 rounded"
                            >
                              제거 ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-[10px] text-[#A0AEC0] text-center pb-4">
          매장 추가 시 해당 브랜드의 전체 영업 매장 중 배분그룹 미포함 매장이 표시됩니다
        </div>
      </div>

      <AddShopModal
        open={addShopModalOpen}
        onClose={() => setAddShopModalOpen(false)}
        onSubmit={onAddShop}
        excludedShopCds={excludedShopCds}
        brandCd={filters.brandCd}
        shopPool={shopPool}
      />

      <StyleNavigatorModal
        open={styleNavOpen}
        onClose={() => setStyleNavOpen(false)}
        onSubmit={(next: StyleColorSelection[]) => {
          update({ selections: next });
        }}
        initialSelections={selections}
        brandCd={filters.brandCd}
        defaultSsnCd={filters.ssnCd}
        styleCatalog={styleCatalog}
        categoryTree={categoryTree}
        seasonOptions={styleSeasonOptions}
      />
    </div>
  );
}

// ---------- 필터 라벨 컴포넌트 ----------
function FilterField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[11px] text-[#8492A6] font-semibold">
        {required && <span className="text-[#DC3545]">*</span>} {label}
      </label>
      {children}
    </div>
  );
}
