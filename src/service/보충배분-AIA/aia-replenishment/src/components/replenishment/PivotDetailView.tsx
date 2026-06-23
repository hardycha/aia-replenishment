'use client';

// [화면 B] 3컬럼 피벗 상세 — 배분 시뮬레이션 후 표시
// 기존 v10 ReplenishmentTab 의 피벗+셀편집 로직 이식
// 필터바·탭바를 포함하며, "조회하기" 클릭 시 phase='adjustment' 로 복귀

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import StyleNavigatorModal from './StyleNavigatorModal';
import ScsAllocationChart from './charts/ScsAllocationChart';
import type {
  Filters,
  ShopRow,
  StockData,
  StyleColorSelection,
  WarehouseStockItem,
} from '@/lib/types';

type ViewMode = 'shop' | 'style';

// ── 엑셀 스타일 컬럼 필터 드롭다운 (fixed position — overflow:auto 컨테이너에서도 잘리지 않음) ──
function ColumnFilter({
  label,
  allValues,
  selected,
  onChange,
}: {
  label: string;
  allValues: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const dropRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 2, left: rect.left });
    }
    setOpen(!open);
  };

  const isFiltered = selected.size < allValues.length;

  return (
    <span className="inline-flex items-center gap-0.5">
      <span>{label}</span>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={`w-3.5 h-3.5 flex items-center justify-center rounded text-[8px] leading-none transition-colors ${isFiltered ? 'bg-[#7C3AED] text-white' : 'hover:bg-[#E0E7EF] text-[#A0AEC0]'}`}
        title="필터"
      >
        ▼
      </button>
      {open && (
        <div
          ref={dropRef}
          className="fixed bg-white border border-[#D2D8E0] rounded-md shadow-lg min-w-[140px] max-h-[220px] flex flex-col"
          style={{ top: pos.top, left: pos.left, zIndex: 9999 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-1.5 border-b border-[#EDEFF2] flex gap-1">
            <button
              onClick={() => onChange(new Set(allValues))}
              className="flex-1 text-[10px] px-2 py-1 rounded bg-[#F0F2F5] hover:bg-[#E0E7EF] text-[#4A5568]"
            >전체 선택</button>
            <button
              onClick={() => onChange(new Set())}
              className="flex-1 text-[10px] px-2 py-1 rounded bg-[#F0F2F5] hover:bg-[#E0E7EF] text-[#4A5568]"
            >전체 해제</button>
          </div>
          <div className="overflow-auto p-1">
            {allValues.map((v) => (
              <label key={v} className="flex items-center gap-1.5 px-2 py-1 hover:bg-[#F5F7FA] rounded cursor-pointer text-[11px] text-[#1B3A5C]">
                <input
                  type="checkbox"
                  checked={selected.has(v)}
                  onChange={() => {
                    const next = new Set(selected);
                    if (next.has(v)) next.delete(v); else next.add(v);
                    onChange(next);
                  }}
                  className="w-3 h-3 accent-[#7C3AED]"
                />
                {v}
              </label>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}

interface Props {
  filters: Filters;
  onFiltersChange: (next: Filters) => void;
  onQuery: () => void;
  onReset: () => void;
  shopGrpOptions: { value: string; label: string }[];

  activeSelectionIdx: number;
  onActiveSelectionChange: (idx: number) => void;

  shops: ShopRow[];
  stockData: StockData;
  warehouseStock: WarehouseStockItem[];
  activeSelection: StyleColorSelection;

  onStockDataChange: (next: StockData) => void;
  onDownload: () => void;
  onBack: () => void;

  toast?: string | null;
}

function getCellKey(row: number, col: number) {
  return `cell_${row}_${col}`;
}

export default function PivotDetailView({
  filters,
  onFiltersChange,
  onQuery,
  onReset,
  shopGrpOptions,
  activeSelectionIdx,
  onActiveSelectionChange,
  shops,
  stockData,
  warehouseStock,
  activeSelection,
  onStockDataChange,
  onDownload,
  onBack,
  toast,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('shop');
  const [styleNavOpen, setStyleNavOpen] = useState(false);

  // ── 컬럼 필터 상태 (행 필터: 매장/사이즈, 값 필터: 재고/예측/배분) ──
  const [shopFilter, setShopFilter] = useState<Set<string>>(new Set());
  const [sizeFilter, setSizeFilter] = useState<Set<string>>(new Set());
  const [stockValueFilter, setStockValueFilter] = useState<Set<string> | null>(null);   // null = 전체
  const [forecastValueFilter, setForecastValueFilter] = useState<Set<string> | null>(null);
  const [allocValueFilter, setAllocValueFilter] = useState<Set<string> | null>(null);

  // 셀 편집 상태
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [anchorCell, setAnchorCell] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [clipboard, setClipboard] = useState<{ rows: number; cols: number; data: (number | null)[][] } | null>(null);
  const [copiedCells, setCopiedCells] = useState<Set<string>>(new Set());
  const [internalToast, setInternalToast] = useState<string | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const update = (patch: Partial<Filters>) => onFiltersChange({ ...filters, ...patch });
  const selections = filters.selections;

  const showInternalToast = useCallback((msg: string) => {
    setInternalToast(msg);
    setTimeout(() => setInternalToast(null), 2500);
  }, []);

  // 사이즈 목록 추출 (stockData 키에서)
  const sizes = useMemo(() => {
    const sizeSet = new Set<string>();
    for (const key of Object.keys(stockData)) {
      const parts = key.split('_');
      if (parts.length >= 4) sizeSet.add(parts[parts.length - 1]);
    }
    return [...sizeSet].sort((a, b) => Number(a) - Number(b));
  }, [stockData]);

  const prodCd = activeSelection.prodCd;
  const colorCd = activeSelection.colorCd === 'ALL' ? 'BKS' : activeSelection.colorCd;

  // ── 필터 초기화 (데이터 변경 시 전체 선택으로 리셋) ──
  useEffect(() => {
    setShopFilter(new Set(shops.map((s) => s.shopCd)));
  }, [shops]);
  useEffect(() => {
    setSizeFilter(new Set(sizes));
  }, [sizes]);

  // ── 행별 합계 계산 (값 필터용) ──
  const rowTotals = useMemo(() => {
    const result: Record<string, { stock: number; forecast: number; alloc: number }> = {};
    for (const shop of shops) {
      let st = 0, fc = 0, al = 0;
      for (const sz of sizes) {
        const d = stockData[`${shop.shopCd}_${prodCd}_${colorCd}_${sz}`];
        if (d) { st += d.stock; fc += d.forecast; al += d.alloc; }
      }
      result[shop.shopCd] = { stock: st, forecast: fc, alloc: al };
    }
    return result;
  }, [shops, sizes, stockData, prodCd, colorCd]);

  // 사이즈별 보기용 행 합계
  const sizeRowTotals = useMemo(() => {
    const result: Record<string, { stock: number; forecast: number; alloc: number }> = {};
    for (const sz of sizes) {
      let st = 0, fc = 0, al = 0;
      for (const shop of shops) {
        const d = stockData[`${shop.shopCd}_${prodCd}_${colorCd}_${sz}`];
        if (d) { st += d.stock; fc += d.forecast; al += d.alloc; }
      }
      result[sz] = { stock: st, forecast: fc, alloc: al };
    }
    return result;
  }, [shops, sizes, stockData, prodCd, colorCd]);

  // ── 값 필터 초기화 (데이터 변경 시) ──
  useEffect(() => {
    setStockValueFilter(null);
    setForecastValueFilter(null);
    setAllocValueFilter(null);
  }, [stockData]);

  // ── 값 필터용 고유값 목록 ──
  const uniqueStockValues = useMemo(() => [...new Set(Object.values(rowTotals).map((t) => String(t.stock)))].sort((a, b) => Number(a) - Number(b)), [rowTotals]);
  const uniqueForecastValues = useMemo(() => [...new Set(Object.values(rowTotals).map((t) => String(t.forecast)))].sort((a, b) => Number(a) - Number(b)), [rowTotals]);
  const uniqueAllocValues = useMemo(() => [...new Set(Object.values(rowTotals).map((t) => String(t.alloc)))].sort((a, b) => Number(a) - Number(b)), [rowTotals]);

  const uniqueSizeStockValues = useMemo(() => [...new Set(Object.values(sizeRowTotals).map((t) => String(t.stock)))].sort((a, b) => Number(a) - Number(b)), [sizeRowTotals]);
  const uniqueSizeForecastValues = useMemo(() => [...new Set(Object.values(sizeRowTotals).map((t) => String(t.forecast)))].sort((a, b) => Number(a) - Number(b)), [sizeRowTotals]);
  const uniqueSizeAllocValues = useMemo(() => [...new Set(Object.values(sizeRowTotals).map((t) => String(t.alloc)))].sort((a, b) => Number(a) - Number(b)), [sizeRowTotals]);

  // ── 필터 적용된 목록 ──
  const filteredShops = useMemo(() => {
    return shops.filter((s) => {
      if (!shopFilter.has(s.shopCd)) return false;
      const t = rowTotals[s.shopCd];
      if (stockValueFilter && !stockValueFilter.has(String(t?.stock ?? 0))) return false;
      if (forecastValueFilter && !forecastValueFilter.has(String(t?.forecast ?? 0))) return false;
      if (allocValueFilter && !allocValueFilter.has(String(t?.alloc ?? 0))) return false;
      return true;
    });
  }, [shops, shopFilter, rowTotals, stockValueFilter, forecastValueFilter, allocValueFilter]);

  const filteredSizes = useMemo(() => {
    return sizes.filter((sz) => {
      if (!sizeFilter.has(sz)) return false;
      const t = sizeRowTotals[sz];
      if (stockValueFilter && !stockValueFilter.has(String(t?.stock ?? 0))) return false;
      if (forecastValueFilter && !forecastValueFilter.has(String(t?.forecast ?? 0))) return false;
      if (allocValueFilter && !allocValueFilter.has(String(t?.alloc ?? 0))) return false;
      return true;
    });
  }, [sizes, sizeFilter, sizeRowTotals, stockValueFilter, forecastValueFilter, allocValueFilter]);

  // ═══════ 셀 맵 ═══════
  const cellMap = useMemo(() => {
    const map: Record<string, { row: number; col: number; dataKey: string }> = {};
    if (viewMode === 'shop') {
      shops.forEach((shop, rowIdx) => {
        sizes.forEach((sizCd, colIdx) => {
          const cellKey = getCellKey(rowIdx, colIdx);
          map[cellKey] = { row: rowIdx, col: colIdx, dataKey: `${shop.shopCd}_${prodCd}_${colorCd}_${sizCd}` };
        });
      });
    } else {
      sizes.forEach((sizCd, rowIdx) => {
        shops.forEach((shop, colIdx) => {
          const cellKey = getCellKey(rowIdx, colIdx);
          map[cellKey] = { row: rowIdx, col: colIdx, dataKey: `${shop.shopCd}_${prodCd}_${colorCd}_${sizCd}` };
        });
      });
    }
    return map;
  }, [viewMode, shops, sizes, prodCd, colorCd]);

  const coordMap = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(cellMap).forEach(([cellKey, info]) => {
      map[`${info.row}_${info.col}`] = cellKey;
    });
    return map;
  }, [cellMap]);

  const maxRow = useMemo(() => (viewMode === 'shop' ? shops.length - 1 : sizes.length - 1), [viewMode, shops, sizes]);
  const maxCol = useMemo(() => (viewMode === 'shop' ? sizes.length - 1 : shops.length - 1), [viewMode, shops, sizes]);

  // 선택 초기화
  const clearSelection = useCallback(() => {
    setSelectedCells(new Set());
    setActiveCell(null);
    setAnchorCell(null);
    setCopiedCells(new Set());
  }, []);

  // 범위 선택
  const selectRange = useCallback((fromKey: string, toKey: string) => {
    const from = cellMap[fromKey];
    const to = cellMap[toKey];
    if (!from || !to) return;
    const r1 = Math.min(from.row, to.row), r2 = Math.max(from.row, to.row);
    const c1 = Math.min(from.col, to.col), c2 = Math.max(from.col, to.col);
    const newSel = new Set<string>();
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const key = coordMap[`${r}_${c}`];
        if (key) newSel.add(key);
      }
    }
    setSelectedCells(newSel);
    setActiveCell(toKey);
  }, [cellMap, coordMap]);

  // 셀 클릭 시 테이블 컨테이너에 포커스 (키보드 이벤트 수신 보장)
  const focusTableContainer = useCallback(() => {
    tableContainerRef.current?.focus({ preventScroll: true });
  }, []);

  // 편집 커밋
  const commitEdit = useCallback(() => {
    if (!isEditing || !activeCell) return;
    const info = cellMap[activeCell];
    if (!info) return;
    const numVal = editValue === '' ? 0 : parseInt(editValue) || 0;
    const next = { ...stockData, [info.dataKey]: { ...stockData[info.dataKey], alloc: numVal } };
    onStockDataChange(next);
    setIsEditing(false);
    setEditValue('');
    // 편집 완료 후 컨테이너에 포커스 복구 — 다음 키 입력 즉시 수신
    setTimeout(() => focusTableContainer(), 0);
  }, [isEditing, activeCell, cellMap, editValue, stockData, onStockDataChange, focusTableContainer]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue('');
    setTimeout(() => focusTableContainer(), 0);
  }, [focusTableContainer]);

  // 셀 클릭
  const handleCellMouseDown = useCallback((cellKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (isEditing) commitEdit();
    focusTableContainer();
    if (e.shiftKey && anchorCell) {
      selectRange(anchorCell, cellKey);
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedCells((prev) => {
        const n = new Set(prev);
        n.has(cellKey) ? n.delete(cellKey) : n.add(cellKey);
        return n;
      });
      setActiveCell(cellKey);
    } else {
      setSelectedCells(new Set([cellKey]));
      setActiveCell(cellKey);
      setAnchorCell(cellKey);
      setIsDragging(true);
    }
  }, [anchorCell, isEditing, selectRange, commitEdit, focusTableContainer]);

  const handleCellMouseOver = useCallback((cellKey: string) => {
    if (isDragging && anchorCell) selectRange(anchorCell, cellKey);
  }, [isDragging, anchorCell, selectRange]);

  useEffect(() => {
    const up = () => setIsDragging(false);
    document.addEventListener('mouseup', up);
    return () => document.removeEventListener('mouseup', up);
  }, []);

  const handleCellDoubleClick = useCallback((cellKey: string) => {
    const info = cellMap[cellKey];
    if (!info) return;
    setEditValue(String(stockData[info.dataKey]?.alloc ?? 0));
    setIsEditing(true);
    setActiveCell(cellKey);
    setTimeout(() => editInputRef.current?.select(), 0);
  }, [cellMap, stockData]);

  // 이동
  const getNeighbor = useCallback((ck: string, dr: number, dc: number): string | null => {
    const info = cellMap[ck];
    if (!info) return null;
    const nr = info.row + dr, nc = info.col + dc;
    if (nr < 0 || nr > maxRow || nc < 0 || nc > maxCol) return null;
    return coordMap[`${nr}_${nc}`] || null;
  }, [cellMap, coordMap, maxRow, maxCol]);

  const moveTo = useCallback((from: string, dr: number, dc: number) => {
    const t = getNeighbor(from, dr, dc);
    if (!t) return;
    setSelectedCells(new Set([t]));
    setActiveCell(t);
    setAnchorCell(t);
  }, [getNeighbor]);

  // 선택 범위
  const getSelectionBounds = useCallback(() => {
    let minR = Infinity, maxR2 = -Infinity, minC = Infinity, maxC2 = -Infinity;
    selectedCells.forEach((ck) => {
      const info = cellMap[ck];
      if (info) { minR = Math.min(minR, info.row); maxR2 = Math.max(maxR2, info.row); minC = Math.min(minC, info.col); maxC2 = Math.max(maxC2, info.col); }
    });
    return { minR, maxR: maxR2, minC, maxC: maxC2 };
  }, [selectedCells, cellMap]);

  // 복사
  const copySelection = useCallback(() => {
    if (selectedCells.size === 0) return;
    const { minR, maxR: mr, minC, maxC: mc } = getSelectionBounds();
    const rows = mr - minR + 1, cols = mc - minC + 1;
    const data: (number | null)[][] = [];
    for (let r = 0; r < rows; r++) {
      data[r] = [];
      for (let c = 0; c < cols; c++) {
        const ck = coordMap[`${minR + r}_${minC + c}`];
        data[r][c] = ck && cellMap[ck] ? (stockData[cellMap[ck].dataKey]?.alloc ?? null) : null;
      }
    }
    setClipboard({ rows, cols, data });
    setCopiedCells(new Set(selectedCells));
    showInternalToast(`${selectedCells.size}개 셀 복사됨 (${rows}×${cols})`);
  }, [selectedCells, getSelectionBounds, coordMap, cellMap, stockData, showInternalToast]);

  // 붙여넣기
  const pasteClipboard = useCallback(() => {
    if (!clipboard || !activeCell) return;
    const base = cellMap[activeCell];
    if (!base) return;
    let pasted = 0;
    const newData = { ...stockData };
    const pastedCells = new Set<string>();
    for (let r = 0; r < clipboard.rows; r++) {
      for (let c = 0; c < clipboard.cols; c++) {
        const tk = coordMap[`${base.row + r}_${base.col + c}`];
        if (tk && cellMap[tk]) {
          newData[cellMap[tk].dataKey] = { ...newData[cellMap[tk].dataKey], alloc: clipboard.data[r][c] ?? 0 };
          pastedCells.add(tk);
          pasted++;
        }
      }
    }
    onStockDataChange(newData);
    setSelectedCells(pastedCells);
    setCopiedCells(new Set());
    showInternalToast(`${pasted}개 셀에 붙여넣기 완료`);
    setTimeout(() => focusTableContainer(), 0);
  }, [clipboard, activeCell, cellMap, coordMap, stockData, onStockDataChange, showInternalToast, focusTableContainer]);

  // Fill Down / Right
  const fillDown = useCallback(() => {
    const { minR, maxR: mr, minC, maxC: mc } = getSelectionBounds();
    if (minR === mr) return;
    const newData = { ...stockData };
    let filled = 0;
    for (let c = minC; c <= mc; c++) {
      const sk = coordMap[`${minR}_${c}`];
      if (!sk || !cellMap[sk]) continue;
      const sv = stockData[cellMap[sk].dataKey]?.alloc ?? 0;
      for (let r = minR + 1; r <= mr; r++) {
        const tk = coordMap[`${r}_${c}`];
        if (tk && cellMap[tk]) { newData[cellMap[tk].dataKey] = { ...newData[cellMap[tk].dataKey], alloc: sv }; filled++; }
      }
    }
    onStockDataChange(newData);
    showInternalToast(`아래로 채우기 완료 (${filled}개 셀)`);
  }, [getSelectionBounds, coordMap, cellMap, stockData, onStockDataChange, showInternalToast]);

  const fillRight = useCallback(() => {
    const { minR, maxR: mr, minC, maxC: mc } = getSelectionBounds();
    if (minC === mc) return;
    const newData = { ...stockData };
    let filled = 0;
    for (let r = minR; r <= mr; r++) {
      const sk = coordMap[`${r}_${minC}`];
      if (!sk || !cellMap[sk]) continue;
      const sv = stockData[cellMap[sk].dataKey]?.alloc ?? 0;
      for (let c = minC + 1; c <= mc; c++) {
        const tk = coordMap[`${r}_${c}`];
        if (tk && cellMap[tk]) { newData[cellMap[tk].dataKey] = { ...newData[cellMap[tk].dataKey], alloc: sv }; filled++; }
      }
    }
    onStockDataChange(newData);
    showInternalToast(`오른쪽으로 채우기 완료 (${filled}개 셀)`);
  }, [getSelectionBounds, coordMap, cellMap, stockData, onStockDataChange, showInternalToast]);

  const deleteSelection = useCallback(() => {
    if (selectedCells.size === 0) return;
    const newData = { ...stockData };
    selectedCells.forEach((ck) => { const info = cellMap[ck]; if (info) newData[info.dataKey] = { ...newData[info.dataKey], alloc: 0 }; });
    onStockDataChange(newData);
    showInternalToast(`${selectedCells.size}개 셀 삭제됨`);
    setTimeout(() => focusTableContainer(), 0);
  }, [selectedCells, cellMap, stockData, onStockDataChange, showInternalToast, focusTableContainer]);

  const selectAll = useCallback(() => {
    const allCells = new Set(Object.keys(cellMap));
    setSelectedCells(allCells);
    const first = Object.keys(cellMap)[0];
    if (first) { setActiveCell(first); setAnchorCell(first); }
  }, [cellMap]);

  // 키보드 — 테이블 컨테이너 스코프 (document 대신)
  const handleTableKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          const numVal = editValue === '' ? 0 : parseInt(editValue) || 0;
          const newData = { ...stockData };
          selectedCells.forEach((ck) => { const info = cellMap[ck]; if (info) newData[info.dataKey] = { ...newData[info.dataKey], alloc: numVal }; });
          onStockDataChange(newData);
          setIsEditing(false); setEditValue('');
          showInternalToast(`${selectedCells.size}개 셀에 값 일괄 입력 완료`);
        } else {
          commitEdit();
          if (activeCell) moveTo(activeCell, 1, 0);
        }
      } else if (e.key === 'Tab') {
        e.preventDefault(); commitEdit();
        if (activeCell) moveTo(activeCell, 0, e.shiftKey ? -1 : 1);
      } else if (e.key === 'Escape') { cancelEdit(); }
      return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      if (!activeCell) return;
      const dr = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      const dc = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (e.shiftKey) { const t = getNeighbor(activeCell, dr, dc); if (t && anchorCell) selectRange(anchorCell, t); }
      else moveTo(activeCell, dr, dc);
      return;
    }
    if (e.key === 'Enter' && activeCell) { e.preventDefault(); handleCellDoubleClick(activeCell); return; }
    if (e.key === 'F2' && activeCell) { e.preventDefault(); handleCellDoubleClick(activeCell); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCells.size > 0) { e.preventDefault(); deleteSelection(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); copySelection(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); pasteClipboard(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); selectAll(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedCells.size > 1) { e.preventDefault(); fillDown(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'r' && selectedCells.size > 1) { e.preventDefault(); fillRight(); return; }
    if (/^[0-9\-]$/.test(e.key) && activeCell && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      setEditValue(e.key); setIsEditing(true);
      setTimeout(() => { editInputRef.current?.focus(); editInputRef.current?.setSelectionRange(1, 1); }, 0);
    }
  }, [isEditing, editValue, activeCell, anchorCell, selectedCells, commitEdit, cancelEdit, moveTo, getNeighbor, selectRange, handleCellDoubleClick, deleteSelection, copySelection, pasteClipboard, selectAll, fillDown, fillRight, stockData, cellMap, onStockDataChange, showInternalToast]);

  // 외부 클릭 — 테이블 컨테이너 blur 시 선택 해제 (편집 중이 아닐 때만)
  const handleTableBlur = useCallback((e: React.FocusEvent) => {
    // 포커스가 테이블 내부(편집 input 등)로 이동하면 해제하지 않음
    if (tableContainerRef.current?.contains(e.relatedTarget as Node)) return;
    if (!isEditing) clearSelection();
  }, [clearSelection, isEditing]);

  // ═══════ SCS 요약 ═══════
  const scsSummary = useMemo(() => {
    return sizes.map((sizCd) => {
      const apItem = warehouseStock.find((w) => w.sizCd === sizCd);
      const apQty = apItem?.qty ?? 0;
      let totalAlloc = 0;
      let totalForecast = 0;
      let totalStock = 0;
      for (const shop of shops) {
        const dk = `${shop.shopCd}_${prodCd}_${colorCd}_${sizCd}`;
        const d = stockData[dk];
        if (d) { totalAlloc += d.alloc; totalForecast += d.forecast; totalStock += d.stock; }
      }
      return { sizCd, apQty, totalAlloc, totalForecast, totalStock, remaining: apQty - totalAlloc };
    });
  }, [sizes, warehouseStock, shops, stockData, prodCd, colorCd]);

  const grandTotal = useMemo(() => scsSummary.reduce(
    (acc, e) => ({ apQty: acc.apQty + e.apQty, alloc: acc.alloc + e.totalAlloc, remaining: acc.remaining + e.remaining }),
    { apQty: 0, alloc: 0, remaining: 0 },
  ), [scsSummary]);

  // ═══════ 선택 범위 외곽 보더 계산 ═══════
  const selectionBorders = useMemo(() => {
    const borders: Record<string, { top: boolean; bottom: boolean; left: boolean; right: boolean }> = {};
    if (selectedCells.size <= 1) return borders;
    selectedCells.forEach((ck) => {
      const info = cellMap[ck];
      if (!info) return;
      const { row, col } = info;
      borders[ck] = {
        top: !selectedCells.has(coordMap[`${row - 1}_${col}`] ?? ''),
        bottom: !selectedCells.has(coordMap[`${row + 1}_${col}`] ?? ''),
        left: !selectedCells.has(coordMap[`${row}_${col - 1}`] ?? ''),
        right: !selectedCells.has(coordMap[`${row}_${col + 1}`] ?? ''),
      };
    });
    return borders;
  }, [selectedCells, cellMap, coordMap]);

  const copiedBorders = useMemo(() => {
    const borders: Record<string, { top: boolean; bottom: boolean; left: boolean; right: boolean }> = {};
    if (copiedCells.size === 0) return borders;
    copiedCells.forEach((ck) => {
      const info = cellMap[ck];
      if (!info) return;
      const { row, col } = info;
      borders[ck] = {
        top: !copiedCells.has(coordMap[`${row - 1}_${col}`] ?? ''),
        bottom: !copiedCells.has(coordMap[`${row + 1}_${col}`] ?? ''),
        left: !copiedCells.has(coordMap[`${row}_${col - 1}`] ?? ''),
        right: !copiedCells.has(coordMap[`${row}_${col + 1}`] ?? ''),
      };
    });
    return borders;
  }, [copiedCells, cellMap, coordMap]);

  // ═══════ 셀 렌더 ═══════
  const renderAllocCell = (dataKey: string, row: number, col: number) => {
    const cellKey = getCellKey(row, col);
    const value = stockData[dataKey]?.alloc ?? 0;
    const isSelected = selectedCells.has(cellKey);
    const isActive = activeCell === cellKey;
    const isCopied = copiedCells.has(cellKey);
    const isEditingThis = isEditing && isActive;

    // 범위 외곽 보더 스타일
    const sb = selectionBorders[cellKey];
    const cb = copiedBorders[cellKey];
    const borderStyle: React.CSSProperties = {};
    if (sb && isSelected) {
      if (sb.top) { borderStyle.borderTopColor = '#00B4D8'; borderStyle.borderTopWidth = '2px'; }
      if (sb.bottom) { borderStyle.borderBottomColor = '#00B4D8'; borderStyle.borderBottomWidth = '2px'; }
      if (sb.left) { borderStyle.borderLeftColor = '#00B4D8'; borderStyle.borderLeftWidth = '2px'; }
      if (sb.right) { borderStyle.borderRightColor = '#00B4D8'; borderStyle.borderRightWidth = '2px'; }
    }
    if (cb && isCopied && !isSelected) {
      if (cb.top) { borderStyle.borderTopColor = '#28A745'; borderStyle.borderTopWidth = '2px'; borderStyle.borderTopStyle = 'dashed'; }
      if (cb.bottom) { borderStyle.borderBottomColor = '#28A745'; borderStyle.borderBottomWidth = '2px'; borderStyle.borderBottomStyle = 'dashed'; }
      if (cb.left) { borderStyle.borderLeftColor = '#28A745'; borderStyle.borderLeftWidth = '2px'; borderStyle.borderLeftStyle = 'dashed'; }
      if (cb.right) { borderStyle.borderRightColor = '#28A745'; borderStyle.borderRightWidth = '2px'; borderStyle.borderRightStyle = 'dashed'; }
    }

    return (
      <td
        key={cellKey}
        className={`p-0 border border-[#D2D8E0] bg-[#F8F6FF] relative cursor-cell select-none min-w-[52px]
          ${isSelected && !isActive ? 'bg-[rgba(0,180,216,0.08)]' : ''}
          ${isActive ? 'outline outline-2 outline-[#00B4D8] -outline-offset-1 z-10 bg-white' : ''}
        `}
        style={borderStyle}
        onMouseDown={(e) => handleCellMouseDown(cellKey, e)}
        onMouseOver={() => handleCellMouseOver(cellKey)}
        onDoubleClick={() => handleCellDoubleClick(cellKey)}
      >
        {isEditingThis ? (
          <input
            ref={editInputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => { commitEdit(); }}
            className="absolute inset-0 w-full h-full p-1.5 text-right tabular-nums text-[#7C3AED] font-semibold bg-white border-2 border-[#00B4D8] outline-none text-xs z-20"
            autoFocus
          />
        ) : (
          <span className="block w-full h-full p-1.5 text-right tabular-nums text-[#7C3AED] font-medium text-xs leading-[22px]">
            {value}
          </span>
        )}
      </td>
    );
  };

  // ═══════ 렌더 ═══════
  const displayToast = toast || internalToast;

  return (
    <div className="flex flex-col h-screen bg-[#F4F6F9]">
      {displayToast && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-[#1B3A5C] text-white px-6 py-2.5 rounded-lg text-xs font-medium z-50 shadow-lg">
          {displayToast}
        </div>
      )}

      {/* Page Title */}
      <div className="bg-white px-6 py-3 border-b border-[#D2D8E0] flex items-center gap-2.5 shrink-0">
        <button onClick={onBack} className="text-[#8492A6] hover:text-[#1B3A5C] transition-colors" title="매장 조정 화면으로 돌아가기">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 className="text-base font-bold text-[#1B3A5C]">┃ 보충배분-AIA</h1>
        <span className="text-[11px] text-[#7C3AED] bg-[#F3EFFE] px-2 py-0.5 rounded-full font-semibold">
          v11 배분 상세
        </span>
        <span className="ml-auto text-[11px] text-[#A0AEC0]">
          executionDate&nbsp;
          <b className="text-[#1B3A5C] tabular-nums">{filters.executionDate}</b>
          <span className="mx-1.5">·</span>W1 기준
        </span>
      </div>

      {/* Filter Bar — 화면 B에서는 조회조건 변경 불가 (비활성화) */}
      <div className="bg-[#F4F6F9] border-b border-[#D2D8E0]">
        <div className="px-6 py-2 flex flex-wrap gap-3 items-end opacity-60 pointer-events-none select-none">
          <FilterField label="브랜드" required>
            <div className="w-[130px] h-8 text-xs flex items-center px-3 bg-[#E8EBF0] border border-[#D2D8E0] rounded-md text-[#4A5568]">
              {{ X: 'X: Discovery', M: 'M: MLB', V: 'V: Duvetica', ST: 'ST: Sergio Tacchini', I: 'I: MLB KIDS' }[filters.brandCd] ?? filters.brandCd}
            </div>
          </FilterField>
          <FilterField label="AP" required>
            <div className="w-[130px] h-8 text-xs flex items-center px-3 bg-[#E8EBF0] border border-[#D2D8E0] rounded-md text-[#4A5568]">
              {{ U100: '오프라인 정상 (U100)', U110: '오프라인 이월 (U110)' }[filters.apCd] ?? filters.apCd}
            </div>
          </FilterField>
          <FilterField label="상품시즌" required>
            <div className="w-[100px] h-8 text-xs flex items-center px-3 bg-[#E8EBF0] border border-[#D2D8E0] rounded-md text-[#4A5568]">
              {filters.ssnCd}
            </div>
          </FilterField>
          <FilterField label="배분그룹" required>
            <div className="w-[220px] h-8 text-xs flex items-center px-3 bg-[#E8EBF0] border border-[#D2D8E0] rounded-md text-[#4A5568]">
              {shopGrpOptions.find((o) => o.value === filters.shopGrpNo)?.label ?? filters.shopGrpNo}
            </div>
          </FilterField>
          <FilterField label="스타일" required>
            <div className="h-8 px-3 text-xs flex items-center min-w-[200px] bg-[#E8EBF0] border border-[#D2D8E0] rounded-md text-[#4A5568]">
              <b>{selections.length}</b>개 선택됨
              <span className="text-[#A0AEC0] ml-2">({selections[0]?.prodCd}{selections.length > 1 ? ` 외 ${selections.length - 1}` : ''})</span>
            </div>
          </FilterField>
          <Button className="h-8 px-3 text-xs bg-[#A0AEC0] text-white cursor-not-allowed" disabled>조회하기</Button>
          <Button variant="outline" className="h-8 px-3 text-xs cursor-not-allowed" disabled>초기화</Button>
        </div>
      </div>

      {/* Tab Bar */}
      {selections.length > 0 && (
        <div className="bg-white border-b border-[#D2D8E0] overflow-hidden">
          <div className="px-3 py-2 border-b border-[#EDEFF2] flex items-center gap-2 bg-[#FAFBFC]">
            <span className="text-[11px] font-semibold text-[#8492A6]">스타일-컬러 조합</span>
            <span className="text-[10px] text-[#A0AEC0]">탭을 눌러 각 조합의 배분 결과를 확인하세요</span>
          </div>
          <div className="flex overflow-x-auto">
            {selections.map((sel, idx) => {
              const active = idx === activeSelectionIdx;
              return (
                <button key={`${sel.prodCd}-${sel.colorCd}-${idx}`} onClick={() => { onActiveSelectionChange(idx); clearSelection(); }}
                  className={`shrink-0 px-4 py-2.5 border-r border-[#EDEFF2] text-left transition-colors ${active ? 'bg-white border-b-2 border-b-[#7C3AED] -mb-px' : 'bg-[#F8F9FB] hover:bg-[#F0F2F6] border-b border-b-[#EDEFF2]'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${active ? 'bg-[#F3EFFE] text-[#7C3AED]' : 'bg-[#E6F4EA] text-[#2F855A]'}`}>{sel.ssnCd}</span>
                    <span className={`text-xs font-bold tabular-nums ${active ? 'text-[#1B3A5C]' : 'text-[#4A5568]'}`}>{sel.prodCd}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${sel.colorCd === 'ALL' ? 'bg-[#FFF3CD] text-[#92400E]' : 'bg-[#E0E7EF] text-[#4A5568]'}`}>{sel.colorCd}</span>
                  </div>
                  <div className={`text-[10px] mt-0.5 truncate max-w-[220px] ${active ? 'text-[#718096]' : 'text-[#A0AEC0]'}`}>{sel.prodNm}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Toggle + Actions Bar */}
      <div className="bg-white px-6 py-2 flex items-center gap-4 border-b border-[#D2D8E0]">
        <div className="flex border border-[#D2D8E0] rounded-md overflow-hidden">
          <button className={`px-4 py-1.5 text-xs font-medium transition-colors ${viewMode === 'shop' ? 'bg-[#00B4D8] text-white' : 'bg-white text-[#8492A6] hover:bg-[#F4F6F9]'}`}
            onClick={() => { setViewMode('shop'); clearSelection(); }}>매장별 보기</button>
          <button className={`px-4 py-1.5 text-xs font-medium transition-colors ${viewMode === 'style' ? 'bg-[#00B4D8] text-white' : 'bg-white text-[#8492A6] hover:bg-[#F4F6F9]'}`}
            onClick={() => { setViewMode('style'); clearSelection(); }}>사이즈별 보기</button>
        </div>
        <span className="text-[11px] text-[#A0AEC0]">
          셀: <b className="text-[#4A5568]">현 재고</b> · <b className="text-[#92400E]">판매 예측</b> · <b className="text-[#7C3AED]">배분</b>
          <span className="ml-3 text-[10px]">(Ctrl+C 복사 / Ctrl+V 붙여넣기 / Ctrl+D 아래채우기 / Ctrl+R 오른쪽채우기)</span>
        </span>
        <div className="flex-1" />
        <Button variant="outline" className="h-7 px-3 text-[11px]" onClick={onDownload}>엑셀 다운로드</Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* SCS 배분 현황 — Stacked Bar + 히트맵 */}
        <ScsAllocationChart
          scsSummary={scsSummary}
          grandTotal={grandTotal}
          shops={shops}
          stockData={stockData}
          prodCd={prodCd}
          colorCd={colorCd}
          sizes={sizes}
          viewMode={viewMode}
        />

        {/* Section Divider */}
        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-px bg-[#D2D8E0]" />
          <span className="text-xs font-semibold text-[#8492A6] whitespace-nowrap">
            {viewMode === 'shop' ? '매장별 배분 상세' : '사이즈별 배분 상세'}
          </span>
          <div className="flex-1 h-px bg-[#D2D8E0]" />
        </div>

        {/* Pivot Table */}
        <div ref={tableContainerRef} tabIndex={0} onKeyDown={handleTableKeyDown} onBlur={handleTableBlur}
          className="bg-white border border-[#D2D8E0] rounded-md overflow-hidden outline-none focus:ring-2 focus:ring-[#00B4D8]/30">
          <div ref={tableRef} className="overflow-auto max-h-[50vh]">
            {viewMode === 'shop' ? (
              <table className="text-xs border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F0F2F6]">
                    <th className="sticky left-0 top-0 z-30 bg-[#E4E8EE] p-2 border border-[#D2D8E0] text-left font-semibold text-[#8492A6] min-w-[150px]" rowSpan={2}>
                      <ColumnFilter
                        label="매장"
                        allValues={shops.map((s) => s.shopCd)}
                        selected={shopFilter}
                        onChange={setShopFilter}
                      />
                    </th>
                    {filteredSizes.map((sizCd) => (
                      <th key={`h1-${sizCd}`} colSpan={3} className="sticky top-0 z-20 p-1.5 border border-[#D2D8E0] text-center font-semibold text-[#8492A6] text-[10px] bg-[#F0F2F6]">
                        {sizCd}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-[#F0F2F6]">
                    {filteredSizes.map((sizCd, i) => (
                      <React.Fragment key={`h2-${sizCd}`}>
                        <th className="sticky top-[26px] z-20 p-1 border border-[#D2D8E0] text-center text-[10px] font-medium bg-[#E0E7EF] text-[#4A5568] w-[60px]">
                          <ColumnFilter label="재고" allValues={uniqueStockValues} selected={stockValueFilter ?? new Set(uniqueStockValues)} onChange={setStockValueFilter} />
                        </th>
                        <th className="sticky top-[26px] z-20 p-1 border border-[#D2D8E0] text-center text-[10px] font-medium bg-[#FFF3CD] text-[#92400E] w-[60px]">
                          <ColumnFilter label="예측" allValues={uniqueForecastValues} selected={forecastValueFilter ?? new Set(uniqueForecastValues)} onChange={setForecastValueFilter} />
                        </th>
                        <th className="sticky top-[26px] z-20 p-1 border border-[#D2D8E0] text-center text-[10px] font-medium bg-[#E0D6F9] text-[#7C3AED] w-[60px]">
                          <ColumnFilter label="배분" allValues={uniqueAllocValues} selected={allocValueFilter ?? new Set(uniqueAllocValues)} onChange={setAllocValueFilter} />
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredShops.map((shop, rowIdx) => (
                    <tr key={shop.shopCd} className="hover:bg-[#F7F9FC]/50">
                      <td className="sticky left-0 z-10 bg-[#F0F2F6] p-2 border border-[#D2D8E0] font-medium shadow-[4px_0_8px_rgba(0,0,0,0.08)]">
                        {shop.shopNm} <span className="text-[10px] text-[#A0AEC0]">({shop.adjRank})</span>
                      </td>
                      {filteredSizes.map((sizCd, colIdx) => {
                        const dataKey = `${shop.shopCd}_${prodCd}_${colorCd}_${sizCd}`;
                        const d = stockData[dataKey] || { stock: 0, forecast: 0, alloc: 0 };
                        return (
                          <React.Fragment key={dataKey}>
                            <td className="p-1.5 border border-[#D2D8E0] text-right tabular-nums bg-[#EBF0F5] text-[#4A5568] min-w-[52px]">{d.stock}</td>
                            <td className="p-1.5 border border-[#D2D8E0] text-right tabular-nums bg-[#FFF8E1] text-[#92400E] min-w-[52px]">{d.forecast}</td>
                            {renderAllocCell(dataKey, rowIdx, colIdx)}
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="text-xs border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F0F2F6]">
                    <th className="sticky left-0 top-0 z-30 bg-[#E4E8EE] p-2 border border-[#D2D8E0] text-left font-semibold text-[#8492A6] min-w-[80px]" rowSpan={2}>
                      <ColumnFilter
                        label="사이즈"
                        allValues={sizes}
                        selected={sizeFilter}
                        onChange={setSizeFilter}
                      />
                    </th>
                    {filteredShops.map((shop) => (
                      <th key={`h1-${shop.shopCd}`} colSpan={3} className="sticky top-0 z-20 p-1.5 border border-[#D2D8E0] text-center font-semibold text-[#8492A6] text-[10px] bg-[#F0F2F6]">
                        {shop.shopNm}
                        <br /><span className="text-[9px] text-[#A0AEC0]">({shop.adjRank})</span>
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-[#F0F2F6]">
                    {filteredShops.map((shop, i) => (
                      <React.Fragment key={`h2-${shop.shopCd}`}>
                        <th className="sticky top-[26px] z-20 p-1 border border-[#D2D8E0] text-center text-[10px] font-medium bg-[#E0E7EF] text-[#4A5568] w-[60px]">
                          <ColumnFilter label="재고" allValues={uniqueSizeStockValues} selected={stockValueFilter ?? new Set(uniqueSizeStockValues)} onChange={setStockValueFilter} />
                        </th>
                        <th className="sticky top-[26px] z-20 p-1 border border-[#D2D8E0] text-center text-[10px] font-medium bg-[#FFF3CD] text-[#92400E] w-[60px]">
                          <ColumnFilter label="예측" allValues={uniqueSizeForecastValues} selected={forecastValueFilter ?? new Set(uniqueSizeForecastValues)} onChange={setForecastValueFilter} />
                        </th>
                        <th className="sticky top-[26px] z-20 p-1 border border-[#D2D8E0] text-center text-[10px] font-medium bg-[#E0D6F9] text-[#7C3AED] w-[60px]">
                          <ColumnFilter label="배분" allValues={uniqueSizeAllocValues} selected={allocValueFilter ?? new Set(uniqueSizeAllocValues)} onChange={setAllocValueFilter} />
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSizes.map((sizCd, rowIdx) => (
                    <tr key={sizCd} className="hover:bg-[#F7F9FC]/50">
                      <td className="sticky left-0 z-10 bg-[#F0F2F6] p-2 border border-[#D2D8E0] font-bold">{sizCd}</td>
                      {filteredShops.map((shop, colIdx) => {
                        const dataKey = `${shop.shopCd}_${prodCd}_${colorCd}_${sizCd}`;
                        const d = stockData[dataKey] || { stock: 0, forecast: 0, alloc: 0 };
                        return (
                          <React.Fragment key={dataKey}>
                            <td className="p-1.5 border border-[#D2D8E0] text-right tabular-nums bg-[#EBF0F5] text-[#4A5568] min-w-[52px]">{d.stock}</td>
                            <td className="p-1.5 border border-[#D2D8E0] text-right tabular-nums bg-[#FFF8E1] text-[#92400E] min-w-[52px]">{d.forecast}</td>
                            {renderAllocCell(dataKey, rowIdx, colIdx)}
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <StyleNavigatorModal
        open={styleNavOpen}
        onClose={() => setStyleNavOpen(false)}
        onSubmit={(next: StyleColorSelection[]) => update({ selections: next })}
        initialSelections={selections}
        brandCd={filters.brandCd}
        defaultSsnCd={filters.ssnCd}
      />
    </div>
  );
}

function FilterField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[11px] text-[#8492A6] font-semibold">
        {required && <span className="text-[#DC3545]">*</span>} {label}
      </label>
      {children}
    </div>
  );
}
