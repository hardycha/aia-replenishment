'use client';

// ReplenishmentTab — 컨테이너 (Phase 3 T3.1)
// phase: 'adjustment' → ShopAdjustmentView / 'detail' → PivotDetailView (Phase 5)
// mock 직접 호출 제거 → lib/api-client.ts fetch 함수 사용

import { useCallback, useEffect, useMemo, useState } from 'react';
import ShopAdjustmentView from './ShopAdjustmentView';
import PivotDetailView from './PivotDetailView';
import BriefingView from './briefing/BriefingView';
import brandShopsArchive from '@/data/brand_shops_archive.json';
import {
  fetchShopGrp,
  fetchForecast,
  fetchWarehouseStock,
  fetchShopStock,
  fetchBriefing,
  postOptimize,
  postOptimizeAdd3,
} from '@/lib/api-client';
import { useProductTree } from '@/hooks/useProductTree';
import type { BriefingData, BriefingSc } from '@/data/mockBriefingData';
import type {
  Filters,
  Phase,
  ShopGrp,
  ShopRow,
  StockData,
  StyleColorSelection,
  WarehouseStockItem,
} from '@/lib/types';

const keyOf = (sel: StyleColorSelection) => `${sel.prodCd}__${sel.colorCd}`;
const effectiveColor = (colorCd: string) => (colorCd === 'ALL' ? 'BKS' : colorCd);

// ── 드롭다운 타입 ──
interface DropdownOption { value: string; label: string }
interface DropdownData {
  brands: DropdownOption[];
  seasons: DropdownOption[];
  shopGrps: DropdownOption[];
}

export default function ReplenishmentTab() {
  const [phase, setPhase] = useState<Phase>('briefing');
  const [filters, setFilters] = useState<Filters>({
    brandCd: 'X',
    apCd: 'U100',
    ssnCd: '26S',
    shopGrpNo: '',
    selections: [],
    executionDate: new Date().toISOString().slice(0, 10),
  });

  const [shopGrp, setShopGrp] = useState<ShopGrp | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [shopsByKey, setShopsByKey] = useState<Record<string, ShopRow[]>>({});
  const [stockByKey, setStockByKey] = useState<Record<string, StockData>>({});
  const [warehouseStockByKey, setWarehouseStockByKey] = useState<Record<string, WarehouseStockItem[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  // ⚠️ 테스트 전용: 실 배포 시 제거할 것 — TargetStock+3 ILP 비교 토글
  const [useTargetStock, setUseTargetStock] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ── 화면 0: 브리핑 데이터 ──
  const [briefingData, setBriefingData] = useState<BriefingData | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);

  // ── 실데이터 드롭다운 ──
  const [dropdowns, setDropdowns] = useState<DropdownData>({ brands: [], seasons: [], shopGrps: [] });

  // ── 상품트리: 화면0(briefing)에서는 로딩하지 않음 (8MB+ lazy load) ──
  const { data: productTree, isLoading: productTreeLoading } = useProductTree(filters.brandCd, phase !== 'briefing');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // ── 드롭다운 로드 (brandCd 변경 시) ──
  useEffect(() => {
    fetch(`/api/dropdowns?brandCd=${filters.brandCd}`)
      .then((r) => r.json())
      .then((data: DropdownData) => {
        setDropdowns(data);
        // 브랜드 변경 시 배분그룹 항상 첫 번째로 리셋
        if (data.shopGrps.length > 0) {
          setFilters((prev) => ({ ...prev, shopGrpNo: data.shopGrps[0].value }));
        }
      })
      .catch(() => showToast('드롭다운 로드 실패'));
  }, [filters.brandCd]); // eslint-disable-line react-hooks/exhaustive-deps

  const shopGrpOptions = dropdowns.shopGrps;

  // 활성 탭 파생값
  const activeSel = filters.selections[activeIdx] as StyleColorSelection | undefined;
  const activeKey = activeSel ? keyOf(activeSel) : '';
  const activeShops: ShopRow[] = activeKey ? shopsByKey[activeKey] ?? [] : [];
  const warehouseStock: WarehouseStockItem[] = activeKey ? warehouseStockByKey[activeKey] ?? [] : [];

  // ═══════ 화면 0: 브리핑 로드 + 배분 시작 핸들러 ═══════

  const handleLoadBriefing = useCallback(async () => {
    setIsBriefingLoading(true);
    try {
      const data = await fetchBriefing({
        brandCd: filters.brandCd,
        ssnCd: filters.ssnCd,
      });
      setBriefingData(data);
    } catch (err) {
      showToast(`브리핑 로드 실패: ${err instanceof Error ? err.message : String(err)}`);
    }
    setIsBriefingLoading(false);
  }, [filters.brandCd, filters.ssnCd, showToast]);

  // 화면 0에서 SC 선택 후 "배분 시작" → selections 자동 주입 → 화면 A로 전환
  const handleBriefingStart = useCallback((selectedScs: BriefingSc[]) => {
    const selections: StyleColorSelection[] = selectedScs.map((sc) => ({
      prodCd: sc.prod_cd,
      prodNm: sc.prod_nm,
      colorCd: sc.color_cd,
      ssnCd: filters.ssnCd,
    }));
    setFilters((prev) => ({ ...prev, selections }));
    setPhase('adjustment');
    showToast(`${selections.length}개 SC 선택 → 매장 조정 화면으로 이동`);
  }, [filters.ssnCd, showToast]);

  // 화면 0 진입 시 자동 로드 (1회만 — 실패 시 재시도하지 않음)
  const [briefingLoaded, setBriefingLoaded] = useState(false);
  useEffect(() => {
    if (phase === 'briefing' && !briefingLoaded && !isBriefingLoading) {
      setBriefingLoaded(true);
      handleLoadBriefing();
    }
  }, [phase, briefingLoaded, isBriefingLoading, handleLoadBriefing]);

  // ═══════ handleQuery ═══════
  // 조회하기: 배분그룹(JSON) + 예측치(JSON) + SERP 재고(DRP) 조회
  // colorCd='ALL' → 해당 스타일의 모든 컬러를 개별 탭으로 전개
  const handleQuery = useCallback(async () => {
    if (filters.selections.length === 0) {
      showToast('스타일을 먼저 선택해주세요');
      return;
    }
    setIsLoading(true);
    try {
      // 1) 배분그룹 조회 (아카이빙 JSON)
      const grp = await fetchShopGrp(filters.shopGrpNo, {
        brandCd: filters.brandCd,
        ssnCd: filters.ssnCd,
      });

      const executionDate = new Date().toISOString().slice(0, 10);

      // 2) ALL 컬러 → 개별 컬러로 전개
      const expandedSelections: StyleColorSelection[] = [];
      for (const sel of filters.selections) {
        if (sel.colorCd === 'ALL') {
          const style = productTree.styles.find((s) => s.prodCd === sel.prodCd);
          if (style && style.colors.length > 0) {
            for (const c of style.colors) {
              expandedSelections.push({ ...sel, colorCd: c.colorCd });
            }
          } else {
            expandedSelections.push({ ...sel, colorCd: 'BKS' });
          }
        } else {
          expandedSelections.push(sel);
        }
      }

      // 3) 각 스타일-컬러 조합별 예측치 + 재고 조회 (병렬)
      const nextShops: Record<string, ShopRow[]> = {};
      const nextStock: Record<string, StockData> = {};
      const nextWhStock: Record<string, WarehouseStockItem[]> = {};
      const allShopCds = grp.shops.map((s) => s.shopCd);

      await Promise.all(
        expandedSelections.map(async (sel) => {
          const color = sel.colorCd;
          const k = keyOf(sel);

          // 3-1) 예측치 조회 (404 허용)
          let forecastRows: { shopCd: string; sizCd: string; qty: number }[] = [];
          try {
            const forecast = await fetchForecast({
              brandCd: filters.brandCd,
              prodCd: sel.prodCd,
              colorCd: color,
              ssnCd: sel.ssnCd,
              executionDate,
            });
            forecastRows = forecast.rows;
          } catch {
            // 예측치 없음 — 매장 목록은 표시하되 예측 0
          }

          // 3-2) SERP 재고 조회 (실패 시 graceful degradation — stock=0)
          let whStocks: WarehouseStockItem[] = [];
          let shopStockItems: { shopCd: string; shopNm: string; sizCd: string; qty: number }[] = [];
          try {
            const [whRes, shopRes] = await Promise.all([
              fetchWarehouseStock({
                brandCd: filters.brandCd,
                prodCd: sel.prodCd,
                colorCd: color,
                apCd: filters.apCd,
                ssnCd: sel.ssnCd,
              }),
              fetchShopStock({
                brandCd: filters.brandCd,
                prodCd: sel.prodCd,
                colorCd: color,
                ssnCd: sel.ssnCd,
                shopCds: allShopCds,
              }),
            ]);
            whStocks = whRes.stocks;
            shopStockItems = shopRes.shopStocks;
          } catch {
            // 재고 조회 실패 — stock=0으로 진행
            console.warn(`[handleQuery] SERP 재고 조회 실패 (${sel.prodCd}/${color})`);
          }

          // StockData 조립 — 예측 + 재고
          const sd: StockData = {};
          for (const f of forecastRows) {
            const key = `${f.shopCd}_${sel.prodCd}_${color}_${f.sizCd}`;
            sd[key] = { stock: 0, forecast: f.qty, alloc: 0 };
          }
          for (const item of shopStockItems) {
            const key = `${item.shopCd}_${sel.prodCd}_${color}_${item.sizCd}`;
            if (sd[key]) {
              sd[key] = { ...sd[key], stock: item.qty };
            } else {
              sd[key] = { stock: item.qty, forecast: 0, alloc: 0 };
            }
          }

          // 사이즈 목록: 예측 + 재고 양쪽에서 추출
          const sizeSet = new Set<string>();
          for (const key of Object.keys(sd)) {
            const parts = key.split('_');
            sizeSet.add(parts[parts.length - 1]);
          }
          const sizes = [...sizeSet];

          // ShopRow 조립 (예측합계 + 현재고합계)
          const shopRows = grp.shops.map((s) => {
            let fcTot = 0;
            let stTot = 0;
            for (const sz of sizes) {
              const dk = `${s.shopCd}_${sel.prodCd}_${color}_${sz}`;
              fcTot += sd[dk]?.forecast ?? 0;
              stTot += sd[dk]?.stock ?? 0;
            }
            return {
              shopCd: s.shopCd,
              shopNm: s.shopNm,
              adjRank: s.adjRank,
              forecastTotal: fcTot,
              demandIndex: 0,
              currentStockTotal: stTot,
              removed: false,
            };
          });

          // 수요지수 계산 (0~100, P90 기준)
          const sorted = [...shopRows].map((s) => s.forecastTotal).sort((a, b) => a - b);
          const p90 = sorted[Math.floor(sorted.length * 0.9)] || 0.001;
          for (const shop of shopRows) {
            shop.demandIndex = Math.min(100, Math.round((shop.forecastTotal / p90) * 100));
          }

          nextShops[k] = shopRows;
          nextStock[k] = sd;
          nextWhStock[k] = whStocks;
        }),
      );

      setShopGrp(grp);
      setWarehouseStockByKey(nextWhStock);
      setShopsByKey(nextShops);
      setStockByKey(nextStock);
      setActiveIdx(0);
      setPhase('adjustment');
      setFilters((prev) => ({ ...prev, selections: expandedSelections, executionDate }));
      showToast(
        `조회 완료 — ${expandedSelections.length}개 스타일-컬러 탭이 준비되었습니다`,
      );
    } catch (err) {
      showToast(`조회 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, [filters, productTree.styles, showToast]);

  // ═══════ handleReset ═══════
  const handleReset = useCallback(() => {
    setFilters({
      brandCd: 'X',
      apCd: 'U100',
      ssnCd: '26S',
      shopGrpNo: dropdowns.shopGrps[0]?.value ?? '',
      selections: [],
      executionDate: new Date().toISOString().slice(0, 10),
    });
    setShopsByKey({});
    setStockByKey({});
    setWarehouseStockByKey({});
    setShopGrp(null);
    setActiveIdx(0);
    setPhase('adjustment');
    showToast('필터가 초기화되었습니다');
  }, [showToast]);

  // ═══════ handleAddShop ═══════
  const handleAddShop = useCallback(
    async (shopCd: string) => {
      if (!activeSel) return;
      const brandShops = (brandShopsArchive as { shops: Record<string, { shopCd: string; shopNm: string; region: string }[]> }).shops[filters.brandCd] ?? [];
      const pool = brandShops.find((s) => s.shopCd === shopCd);
      if (!pool) return;

      const k = activeKey;
      const prevShops = shopsByKey[k] ?? [];
      const prevStock = stockByKey[k] ?? {};
      const nextRank = (Math.max(0, ...prevShops.map((s) => s.adjRank)) || 0) + 1;
      const color = effectiveColor(activeSel.colorCd);

      try {
        const [stockRes, fcRes] = await Promise.all([
          fetchShopStock({
            brandCd: filters.brandCd,
            prodCd: activeSel.prodCd,
            colorCd: color,
            ssnCd: activeSel.ssnCd,
            shopCds: [shopCd],
          }),
          fetchForecast({
            brandCd: filters.brandCd,
            prodCd: activeSel.prodCd,
            colorCd: color,
            ssnCd: activeSel.ssnCd,
            executionDate: filters.executionDate,
            shopCds: [shopCd],
          }),
        ]);

        const nextStock = { ...prevStock };
        for (const item of stockRes.shopStocks) {
          const key = `${item.shopCd}_${activeSel.prodCd}_${color}_${item.sizCd}`;
          nextStock[key] = { stock: item.qty, forecast: 0, alloc: 0 };
        }
        for (const f of fcRes.rows) {
          const key = `${f.shopCd}_${activeSel.prodCd}_${color}_${f.sizCd}`;
          if (!nextStock[key]) nextStock[key] = { stock: 0, forecast: 0, alloc: 0 };
          nextStock[key].forecast = f.qty;
        }

        const sizes = [...new Set(fcRes.rows.map((r) => r.sizCd))];
        let fcTot = 0;
        let stTot = 0;
        for (const sz of sizes) {
          const dk = `${shopCd}_${activeSel.prodCd}_${color}_${sz}`;
          fcTot += nextStock[dk]?.forecast ?? 0;
          stTot += nextStock[dk]?.stock ?? 0;
        }

        setStockByKey((prev) => ({ ...prev, [k]: nextStock }));
        setShopsByKey((prev) => ({
          ...prev,
          [k]: [
            ...prevShops,
            {
              shopCd,
              shopNm: pool.shopNm,
              adjRank: nextRank,
              forecastTotal: fcTot,
              demandIndex: 0, // 추가된 매장은 후순위이므로 0
              currentStockTotal: stTot,
              removed: false,
            },
          ],
        }));
        showToast(`${pool.shopNm} 매장 추가 (탭 ${activeIdx + 1} · adjRank ${nextRank})`);
      } catch (err) {
        showToast(`매장 추가 실패: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [activeSel, activeKey, activeIdx, shopsByKey, stockByKey, filters, showToast],
  );

  // ═══════ handleRemoveShop / handleRestoreShop ═══════
  const handleRemoveShop = useCallback(
    (shopCd: string) => {
      if (!activeKey) return;
      setShopsByKey((prev) => ({
        ...prev,
        [activeKey]: (prev[activeKey] ?? []).map((s) =>
          s.shopCd === shopCd ? { ...s, removed: true } : s,
        ),
      }));
      showToast('매장이 제거되었습니다 (현재 탭만)');
    },
    [activeKey, showToast],
  );

  const handleRestoreShop = useCallback(
    (shopCd: string) => {
      if (!activeKey) return;
      setShopsByKey((prev) => ({
        ...prev,
        [activeKey]: (prev[activeKey] ?? []).map((s) =>
          s.shopCd === shopCd ? { ...s, removed: false } : s,
        ),
      }));
      showToast('매장이 복원되었습니다');
    },
    [activeKey, showToast],
  );

  // ═══════ handleSimulate (전체 탭 ILP 배분 최적화 — 재고는 이미 조회 시 로딩됨) ═══════
  const handleSimulate = useCallback(async () => {
    const expandedSels = filters.selections;
    if (expandedSels.length === 0) return;

    setIsSimulating(true);
    showToast(`배분 계산 중... (${expandedSels.length}개 SC)`);

    let totalAllocSum = 0;
    let successCount = 0;
    let failCount = 0;

    // 전체 탭 병렬 ILP 호출 — 하나가 실패해도 나머지 계속 진행
    await Promise.all(
      expandedSels.map(async (sel) => {
        const k = keyOf(sel);
        const tabShops = (shopsByKey[k] ?? []).filter((s) => !s.removed);
        const tabStock = stockByKey[k] ?? {};
        const whStocks = warehouseStockByKey[k] ?? [];
        const color = effectiveColor(sel.colorCd);

        // forecast/alloc을 0으로 초기화 (소수점 잔존 방지)
        const nextStock: Record<string, { stock: number; forecast: number; alloc: number }> = {};
        for (const [key, cell] of Object.entries(tabStock)) {
          nextStock[key] = { ...cell, forecast: 0, alloc: 0 };
        }

        if (tabShops.length === 0 || whStocks.length === 0) {
          // 매장 또는 AP재고 없으면 초기화만 하고 스킵
          setStockByKey((prev) => ({ ...prev, [k]: nextStock }));
          return;
        }

        // 사이즈 목록 추출
        const sizeSet = new Set<string>();
        for (const key of Object.keys(tabStock)) {
          const parts = key.split('_');
          sizeSet.add(parts[parts.length - 1]);
        }
        const sizes = [...sizeSet];

        try {
          // ⚠️ 테스트 전용: useTargetStock 토글에 따라 /optimize vs /optimize-add3 분기
          // 실 배포 시 postOptimize만 남기고 이 분기 제거할 것
          const optimizeFn = useTargetStock ? postOptimizeAdd3 : postOptimize;
          const result = await optimizeFn({
            brandCd: filters.brandCd,
            ssnCd: sel.ssnCd,
            prodCd: sel.prodCd,
            colorCd: color,
            executionDate: filters.executionDate,
            warehouseStock: whStocks.map((s) => ({ sizCd: s.sizCd, qty: s.qty })),
            targetShops: tabShops.map((shop) => ({
              shopCd: shop.shopCd,
              shopNm: shop.shopNm,
              adjRank: shop.adjRank,
              currentStock: sizes.map((sizCd) => ({
                sizCd,
                qty: Math.max(0, tabStock[`${shop.shopCd}_${sel.prodCd}_${color}_${sizCd}`]?.stock ?? 0),
              })),
              forecast: sizes.map((sizCd) => ({
                sizCd,
                qty: tabStock[`${shop.shopCd}_${sel.prodCd}_${color}_${sizCd}`]?.forecast ?? 0,
              })),
            })),
          });

          if (result.status !== 'INFEASIBLE') {
            for (const shopAlloc of result.shopAllocations) {
              for (const alloc of shopAlloc.allocations) {
                const key = `${shopAlloc.shopCd}_${sel.prodCd}_${color}_${alloc.sizCd}`;
                if (nextStock[key]) {
                  nextStock[key] = { ...nextStock[key], forecast: alloc.allocQty, alloc: alloc.allocQty };
                }
              }
            }
            totalAllocSum += result.totalAllocatedSCQty;
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          // ILP 실패 — forecast/alloc은 이미 0으로 초기화됨
          failCount++;
        }

        setStockByKey((prev) => ({ ...prev, [k]: nextStock }));
      }),
    );

    setPhase('detail');
    const msg = failCount > 0
      ? `배분 완료 · ${totalAllocSum}개 배분 (${successCount}개 SC 성공, ${failCount}개 실패)`
      : `배분 완료 · ${totalAllocSum}개 배분 (${successCount}개 SC)`;
    showToast(msg);
    setIsSimulating(false);
  }, [filters, shopsByKey, stockByKey, warehouseStockByKey, showToast, useTargetStock]);

  // ═══════ handleStockDataChange (셀 편집 → stockByKey 갱신) ═══════
  const handleStockDataChange = useCallback(
    (next: StockData) => {
      if (!activeKey) return;
      setStockByKey((prev) => ({ ...prev, [activeKey]: next }));
    },
    [activeKey],
  );

  // ═══════ handleDownload (Phase 6) ═══════
  const handleDownload = useCallback(async () => {
    const rows: { fromApCode: string; toShopCode: string; ssnCd: string; prodCd: string; colorCd: string; sizCd: string; qty: number }[] = [];

    for (const sel of filters.selections) {
      const k = keyOf(sel);
      const sd = stockByKey[k];
      if (!sd) continue;
      const color = effectiveColor(sel.colorCd);

      for (const [key, cell] of Object.entries(sd)) {
        if (cell.alloc <= 0) continue;
        const parts = key.split('_');
        const sizCd = parts[parts.length - 1];
        const shopCd = parts[0];
        rows.push({
          fromApCode: filters.apCd,
          toShopCode: shopCd,
          ssnCd: sel.ssnCd,
          prodCd: sel.prodCd,
          colorCd: color,
          sizCd,
          qty: cell.alloc,
        });
      }
    }

    if (rows.length === 0) {
      showToast('배분 데이터가 없습니다 (alloc > 0 항목 0건)');
      return;
    }

    try {
      const res = await fetch('/api/export-xlsx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows,
          meta: { shopGrpNo: filters.shopGrpNo, executionDate: filters.executionDate },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(`다운로드 실패: ${err.detail ?? res.status}`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('Content-Disposition') ?? '';
      const match = cd.match(/filename\*=UTF-8''(.+)/);
      a.download = match ? decodeURIComponent(match[1]) : `보충배분_${filters.shopGrpNo}_${filters.executionDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(`엑셀 다운로드 완료 (${rows.length}행)`);
    } catch (err) {
      showToast(`다운로드 실패: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [filters, stockByKey, showToast]);

  // ═══════ 렌더 ═══════

  // [화면 0] AI 재고 브리핑
  if (phase === 'briefing') {
    return (
      <div className="min-h-screen bg-[#F4F6F9]">
        {/* 타이틀 바 */}
        <div className="bg-white border-b border-[#D2D8E0] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[16px] font-bold text-[#1B3A5C]">보충배분-AIA</h1>
            <span className="text-[12px] text-[#8492A6]">{filters.executionDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#A0AEC0]">
              ● 화면 0 브리핑 → 화면 A 매장조정 → 화면 B 배분확정
            </span>
          </div>
        </div>

        {/* 필터바 간소화 (브랜드 + 시즌) */}
        <div className="bg-white border-b border-[#D2D8E0] px-6 py-2.5 flex items-center gap-3">
          <select
            value={filters.brandCd}
            onChange={(e) => {
              setFilters((p) => ({ ...p, brandCd: e.target.value as Filters['brandCd'] }));
              setBriefingData(null);
              setBriefingLoaded(false);
            }}
            className="h-8 px-3 text-[12px] border border-[#D2D8E0] rounded-md bg-white text-[#1B3A5C]"
          >
            {dropdowns.brands.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
          <select
            value={filters.ssnCd}
            onChange={(e) => {
              setFilters((p) => ({ ...p, ssnCd: e.target.value }));
              setBriefingData(null);
              setBriefingLoaded(false);
            }}
            className="h-8 px-3 text-[12px] border border-[#D2D8E0] rounded-md bg-white text-[#1B3A5C]"
          >
            {dropdowns.seasons.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={() => { setBriefingLoaded(false); setBriefingData(null); handleLoadBriefing(); }}
            className="h-8 px-4 text-[12px] font-medium text-white bg-[#00B4D8] rounded-md hover:bg-[#0097B2] transition-colors"
          >
            브리핑 조회
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setPhase('adjustment')}
            className="h-8 px-4 text-[12px] font-medium text-[#718096] border border-[#D2D8E0] rounded-md hover:bg-[#F0F2F5]"
          >
            직접 조회하기 →
          </button>
        </div>

        {/* 브리핑 콘텐츠 */}
        <div className="max-w-[1200px] mx-auto px-6 py-5">
          <BriefingView
            briefingData={briefingData}
            isLoading={isBriefingLoading}
            filters={filters}
            onStartAllocation={handleBriefingStart}
            onBriefingUpdate={setBriefingData}
          />
        </div>
      </div>
    );
  }

  // [화면 A] 매장 조정
  if (phase === 'adjustment') {
    return (
      <ShopAdjustmentView
        filters={filters}
        onFiltersChange={setFilters}
        onQuery={handleQuery}
        onReset={handleReset}
        shopGrp={shopGrp}
        shops={activeShops}
        warehouseStock={warehouseStock}
        shopGrpOptions={shopGrpOptions}
        activeSelectionIdx={activeIdx}
        onActiveSelectionChange={setActiveIdx}
        onAddShop={handleAddShop}
        onRemoveShop={handleRemoveShop}
        onRestoreShop={handleRestoreShop}
        onSimulate={handleSimulate}
        isSimulating={isSimulating || isLoading}
        productTreeLoading={productTreeLoading}
        // ⚠️ 테스트 전용: 실 배포 시 아래 2줄 제거할 것
        useTargetStock={useTargetStock}
        onUseTargetStockChange={setUseTargetStock}
        brandOptions={dropdowns.brands}
        seasonOptions={dropdowns.seasons}
        styleCatalog={productTree.styles}
        categoryTree={productTree.categoryTree}
        styleSeasonOptions={productTree.seasonOptions}
        shopPool={(brandShopsArchive as { shops: Record<string, { shopCd: string; shopNm: string; region: string }[]> }).shops[filters.brandCd] ?? []}
        toast={toast}
      />
    );
  }

  // [화면 B] PivotDetailView — activeSel 가드
  if (!activeSel) {
    setPhase('adjustment');
    return null;
  }

  const activeStockData = activeKey ? stockByKey[activeKey] ?? {} : {};

  return (
    <PivotDetailView
      filters={filters}
      onFiltersChange={setFilters}
      onQuery={handleQuery}
      onReset={handleReset}
      shopGrpOptions={shopGrpOptions}
      activeSelectionIdx={activeIdx}
      onActiveSelectionChange={setActiveIdx}
      shops={activeShops.filter((s) => !s.removed)}
      stockData={activeStockData}
      warehouseStock={warehouseStock}
      activeSelection={activeSel}
      onStockDataChange={handleStockDataChange}
      onDownload={handleDownload}
      onBack={() => setPhase('adjustment')}
      toast={toast}
    />
  );
}
