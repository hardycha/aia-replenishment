'use client';

// [화면 A] 매장 조정 화면 프리뷰 라우트
// - 스타일 네비게이터 모달로 복수 스타일+컬러 선택
// - 각 조합별 탭으로 전환
// - Phase 2/3 리팩터 이전, mock 데이터만으로 시각적 검증

import { useCallback, useMemo, useState } from 'react';
import ShopAdjustmentView from '@/components/replenishment/ShopAdjustmentView';
import {
  MOCK_BRAND_SHOP_POOL,
  MOCK_SHOP_GRPS,
  MOCK_SIZES,
  MOCK_WAREHOUSE_STOCK,
  buildMockAdjustmentData,
  mockForecast,
  mockShopStock,
} from '@/data/mockAdjustmentData';
import type {
  Filters,
  ShopGrp,
  ShopRow,
  StockData,
  StyleColorSelection,
  WarehouseStockItem,
} from '@/lib/types';

export default function AdjustmentPreviewPage() {
  const [filters, setFilters] = useState<Filters>({
    brandCd: 'X',
    apCd: 'offline_normal',
    ssnCd: '26S',
    shopGrpNo: MOCK_SHOP_GRPS[0].shopGrpNo,
    selections: [], // 스타일 네비게이터로 선택
    executionDate: new Date().toISOString().slice(0, 10),
  });

  const [shopGrp, setShopGrp] = useState<ShopGrp | null>(null);
  // 탭 인덱스
  const [activeIdx, setActiveIdx] = useState(0);
  // 각 스타일-컬러 조합별 shops 상태 관리 (탭 전환 시 각 조합 자체 상태 유지)
  const [shopsByKey, setShopsByKey] = useState<Record<string, ShopRow[]>>({});
  const [stockByKey, setStockByKey] = useState<Record<string, StockData>>({});
  const [warehouseStock, setWarehouseStock] = useState<WarehouseStockItem[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const shopGrpOptions = useMemo(
    () =>
      MOCK_SHOP_GRPS.map((g) => ({
        value: g.shopGrpNo,
        label: `${g.shopGrpNm} · ${g.shopGrpNo} (${g.shopCnt}개 매장)`,
      })),
    [],
  );

  const keyOf = (sel: StyleColorSelection) =>
    `${sel.prodCd}__${sel.colorCd}`;

  const activeSel = filters.selections[activeIdx];
  const activeKey = activeSel ? keyOf(activeSel) : '';
  const activeShops: ShopRow[] = activeKey ? shopsByKey[activeKey] ?? [] : [];

  // ============= 핸들러 =============

  function handleQuery() {
    if (filters.selections.length === 0) {
      showToast('스타일을 먼저 선택해주세요');
      return;
    }
    const nextShops: Record<string, ShopRow[]> = {};
    const nextStock: Record<string, StockData> = {};
    let firstShopGrp: ShopGrp | null = null;

    for (const sel of filters.selections) {
      // colorCd 가 'ALL' 이면 첫 컬러를 편의상 사용 (실제 API 에서는 전체 컬러로 확장)
      const effectiveColor = sel.colorCd === 'ALL' ? 'BKS' : sel.colorCd;
      const built = buildMockAdjustmentData(
        filters.shopGrpNo,
        sel.prodCd,
        effectiveColor,
        sel.ssnCd,
      );
      if (!firstShopGrp) firstShopGrp = built.shopGrp;
      const k = keyOf(sel);
      nextShops[k] = built.shops;
      nextStock[k] = built.stockData;
    }

    setShopsByKey(nextShops);
    setStockByKey(nextStock);
    setShopGrp(firstShopGrp);
    setWarehouseStock(MOCK_WAREHOUSE_STOCK.stocks);
    setActiveIdx(0);
    setFilters((prev) => ({
      ...prev,
      executionDate: new Date().toISOString().slice(0, 10),
    }));
    showToast(`조회 완료 — ${filters.selections.length}개 스타일-컬러 탭이 준비되었습니다`);
  }

  function handleReset() {
    setFilters({
      brandCd: 'X',
      apCd: 'offline_normal',
      ssnCd: '26S',
      shopGrpNo: MOCK_SHOP_GRPS[0].shopGrpNo,
      selections: [],
      executionDate: new Date().toISOString().slice(0, 10),
    });
    setShopsByKey({});
    setStockByKey({});
    setShopGrp(null);
    setActiveIdx(0);
    showToast('필터가 초기화되었습니다');
  }

  function handleAddShop(shopCd: string) {
    if (!activeSel) return;
    const pool = MOCK_BRAND_SHOP_POOL.find((s) => s.shopCd === shopCd);
    if (!pool) return;

    const k = activeKey;
    const prevShops = shopsByKey[k] ?? [];
    const prevStock = stockByKey[k] ?? {};

    const nextRank = (Math.max(0, ...prevShops.map((s) => s.adjRank)) || 0) + 1;
    const effectiveColor = activeSel.colorCd === 'ALL' ? 'BKS' : activeSel.colorCd;

    const stockRes = mockShopStock(
      [shopCd],
      [{ shopCd, shopNm: pool.shopNm, adjRank: nextRank }],
      activeSel.prodCd,
      effectiveColor,
    );
    const fcRes = mockForecast(
      [shopCd],
      activeSel.prodCd,
      effectiveColor,
      activeSel.ssnCd,
    );

    const nextStock = { ...prevStock };
    for (const item of stockRes.shopStocks) {
      const key = `${item.shopCd}_${activeSel.prodCd}_${effectiveColor}_${item.sizCd}`;
      nextStock[key] = { stock: item.qty, forecast: 0, alloc: 0 };
    }
    for (const f of fcRes.rows) {
      const key = `${f.shopCd}_${activeSel.prodCd}_${effectiveColor}_${f.sizCd}`;
      if (!nextStock[key]) nextStock[key] = { stock: 0, forecast: 0, alloc: 0 };
      nextStock[key].forecast = f.qty;
    }

    let fcTot = 0;
    let stTot = 0;
    for (const sz of MOCK_SIZES) {
      const key = `${shopCd}_${activeSel.prodCd}_${effectiveColor}_${sz}`;
      fcTot += nextStock[key]?.forecast ?? 0;
      stTot += nextStock[key]?.stock ?? 0;
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
          demandIndex: 0,
          currentStockTotal: stTot,
          removed: false,
        },
      ],
    }));
    showToast(`${pool.shopNm} 매장 추가 (탭 ${activeIdx + 1} · adjRank ${nextRank})`);
  }

  function handleRemoveShop(shopCd: string) {
    if (!activeKey) return;
    setShopsByKey((prev) => ({
      ...prev,
      [activeKey]: (prev[activeKey] ?? []).map((s) =>
        s.shopCd === shopCd ? { ...s, removed: true } : s,
      ),
    }));
    showToast('매장이 제거되었습니다 (현재 탭만)');
  }

  function handleRestoreShop(shopCd: string) {
    if (!activeKey) return;
    setShopsByKey((prev) => ({
      ...prev,
      [activeKey]: (prev[activeKey] ?? []).map((s) =>
        s.shopCd === shopCd ? { ...s, removed: false } : s,
      ),
    }));
    showToast('매장이 복원되었습니다');
  }

  function handleSimulate() {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      showToast(
        '[프리뷰 전용] ILP 시뮬레이션 완료 — 실 구현 시 3컬럼 피벗 화면으로 전환됩니다',
      );
    }, 1200);
  }

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
      isSimulating={isSimulating}
      toast={toast}
    />
  );
}
