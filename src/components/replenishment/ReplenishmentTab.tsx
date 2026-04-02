'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

type ViewMode = 'shop' | 'style';

// Mock 데이터 - 매장 목록 (32개)
const SHOPS = [
  {id:'S001',name:'강남점',grade:'S'},{id:'S002',name:'잠실점',grade:'S'},
  {id:'S003',name:'명동점',grade:'S'},{id:'S004',name:'코엑스점',grade:'A'},
  {id:'S005',name:'여의도IFC점',grade:'A'},{id:'S006',name:'판교현대점',grade:'A'},
  {id:'S007',name:'스타필드하남점',grade:'A'},{id:'S008',name:'타임스퀘어점',grade:'A'},
  {id:'S009',name:'수원AK점',grade:'B'},{id:'S010',name:'대전갤러리아점',grade:'B'},
  {id:'S011',name:'부산센텀점',grade:'B'},{id:'S012',name:'광주신세계점',grade:'B'},
  {id:'S013',name:'대구현대점',grade:'B'},{id:'S014',name:'울산현대점',grade:'B'},
  {id:'S015',name:'인천스퀘어원점',grade:'B'},{id:'S016',name:'청주지웰시티점',grade:'C'},
  {id:'S017',name:'천안신세계점',grade:'C'},{id:'S018',name:'전주현대점',grade:'C'},
  {id:'S019',name:'창원NC점',grade:'C'},{id:'S020',name:'김해롯데점',grade:'C'},
  {id:'S021',name:'제주노형점',grade:'C'},{id:'S022',name:'포항점',grade:'C'},
  {id:'S023',name:'안양점',grade:'C'},{id:'S024',name:'일산현대점',grade:'B'},
  {id:'S025',name:'분당AK점',grade:'B'},{id:'S026',name:'동탄롯데점',grade:'B'},
  {id:'S027',name:'평택점',grade:'C'},{id:'S028',name:'춘천점',grade:'C'},
  {id:'S029',name:'원주점',grade:'C'},{id:'S030',name:'속초점',grade:'C'},
  {id:'S031',name:'강릉점',grade:'C'},{id:'S032',name:'세종점',grade:'C'},
];

// Mock 데이터 - 스타일 (20개)
const STYLES = [
  {code:'XJWT7341',name:'경량 바람막이 JKT',item:'JKT',colors:['BK','IV','NV']},
  {code:'XJOT5230',name:'오버핏 코치 JKT',item:'JKT',colors:['BK','KH']},
  {code:'XMST3120',name:'에센셜 반팔 TEE',item:'TEE',colors:['BK','IV','NV','KH']},
  {code:'XMPT4210',name:'클래식 조거 PNT',item:'PNT',colors:['BK','NV']},
  {code:'XJVT6310',name:'경량 다운 VST',item:'VST',colors:['BK','IV']},
  {code:'XJWT8150',name:'레트로 윈드 JKT',item:'JKT',colors:['NV','KH','WH']},
  {code:'XMST3250',name:'그래픽 오버핏 TEE',item:'TEE',colors:['BK','WH']},
  {code:'XMST3380',name:'쿨링 메쉬 TEE',item:'TEE',colors:['BK','GY','NV']},
  {code:'XMPT4320',name:'카고 와이드 PNT',item:'PNT',colors:['BK','KH','BG']},
  {code:'XJOT5440',name:'MA-1 봄버 JKT',item:'JKT',colors:['BK','NV']},
  {code:'XMST3510',name:'빅로고 크롭 TEE',item:'TEE',colors:['WH','PK','IV']},
  {code:'XMPT4630',name:'트레이닝 쇼트 PNT',item:'PNT',colors:['BK','GY']},
  {code:'XJWT7720',name:'고어텍스 쉘 JKT',item:'JKT',colors:['BK','RD','NV']},
  {code:'XAHT2100',name:'버킷햇 로고',item:'ACC',colors:['BK','IV','NV']},
  {code:'XASG2200',name:'크로스백 미니',item:'ACC',colors:['BK','KH']},
  {code:'XMPT4850',name:'스트레치 슬랙스 PNT',item:'PNT',colors:['BK','NV','BG']},
  {code:'XJOT5960',name:'플리스 집업 JKT',item:'JKT',colors:['BK','IV','GY']},
  {code:'XMST3670',name:'피그먼트 워싱 TEE',item:'TEE',colors:['BK','BG','NV']},
  {code:'XMPT4780',name:'데님 와이드 PNT',item:'PNT',colors:['LB','MB']},
  {code:'XJVT6490',name:'패딩 후드 VST',item:'VST',colors:['BK','NV','KH']},
];

const SIZES = ['S','M','L','XL','XXL'];

// 초기 데이터 생성
function generateInitialData() {
  const data: Record<string, {stock: number; forecast: number; alloc: number}> = {};
  const apStock: Record<string, number> = {};

  STYLES.forEach(style => {
    style.colors.forEach(color => {
      SIZES.forEach(size => {
        const scsKey = `${style.code}-${color}-${size}`;
        apStock[scsKey] = 30 + Math.floor(Math.random() * 120);
        SHOPS.forEach(shop => {
          const key = `${shop.id}_${style.code}_${color}_${size}`;
          const forecast = Math.floor(Math.random() * 10) + 1;
          data[key] = {
            stock: Math.floor(Math.random() * 18),
            forecast: forecast,
            alloc: forecast
          };
        });
      });
    });
  });

  return { data, apStock };
}

// 셀 키 생성 (row, col 기반)
function getCellKey(row: number, col: number) {
  return `cell_${row}_${col}`;
}

export default function ReplenishmentTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('shop');
  const [stockData, setStockData] = useState(() => generateInitialData().data);
  const [apStockMap] = useState(() => generateInitialData().apStock);
  const [toast, setToast] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // 엑셀 스타일 셀 선택 상태
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [anchorCell, setAnchorCell] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [clipboard, setClipboard] = useState<{rows: number; cols: number; data: (number | null)[][]} | null>(null);
  const [copiedCells, setCopiedCells] = useState<Set<string>>(new Set());

  const editInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // 셀 맵 (row, col -> dataKey)
  const cellMap = useMemo(() => {
    const map: Record<string, { row: number; col: number; dataKey: string }> = {};
    let colIdx = 0;

    if (viewMode === 'shop') {
      STYLES.forEach(style => {
        style.colors.forEach(color => {
          SIZES.forEach(size => {
            SHOPS.forEach((shop, rowIdx) => {
              const cellKey = getCellKey(rowIdx, colIdx);
              map[cellKey] = { row: rowIdx, col: colIdx, dataKey: `${shop.id}_${style.code}_${color}_${size}` };
            });
            colIdx++;
          });
        });
      });
    } else {
      let rowIdx = 0;
      STYLES.forEach(style => {
        style.colors.forEach(color => {
          colIdx = 0;
          SHOPS.forEach(shop => {
            SIZES.forEach(size => {
              const cellKey = getCellKey(rowIdx, colIdx);
              map[cellKey] = { row: rowIdx, col: colIdx, dataKey: `${shop.id}_${style.code}_${color}_${size}` };
              colIdx++;
            });
          });
          rowIdx++;
        });
      });
    }

    return map;
  }, [viewMode]);

  // 역방향 맵 (row_col -> cellKey)
  const coordMap = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(cellMap).forEach(([cellKey, info]) => {
      map[`${info.row}_${info.col}`] = cellKey;
    });
    return map;
  }, [cellMap]);

  // 최대 row, col 계산
  const maxRow = useMemo(() => {
    return viewMode === 'shop' ? SHOPS.length - 1 : STYLES.reduce((sum, s) => sum + s.colors.length, 0) - 1;
  }, [viewMode]);

  const maxCol = useMemo(() => {
    if (viewMode === 'shop') {
      return STYLES.reduce((sum, s) => sum + s.colors.length * SIZES.length, 0) - 1;
    } else {
      return SHOPS.length * SIZES.length - 1;
    }
  }, [viewMode]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

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

    const r1 = Math.min(from.row, to.row);
    const r2 = Math.max(from.row, to.row);
    const c1 = Math.min(from.col, to.col);
    const c2 = Math.max(from.col, to.col);

    const newSelection = new Set<string>();
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const key = coordMap[`${r}_${c}`];
        if (key) newSelection.add(key);
      }
    }
    setSelectedCells(newSelection);
    setActiveCell(toKey);
  }, [cellMap, coordMap]);

  // 셀 클릭
  const handleCellMouseDown = useCallback((cellKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (isEditing) {
      commitEdit();
    }

    if (e.shiftKey && anchorCell) {
      selectRange(anchorCell, cellKey);
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedCells(prev => {
        const newSet = new Set(prev);
        if (newSet.has(cellKey)) {
          newSet.delete(cellKey);
        } else {
          newSet.add(cellKey);
        }
        return newSet;
      });
      setActiveCell(cellKey);
    } else {
      setSelectedCells(new Set([cellKey]));
      setActiveCell(cellKey);
      setAnchorCell(cellKey);
      setIsDragging(true);
    }
  }, [anchorCell, isEditing, selectRange]);

  // 드래그 선택
  const handleCellMouseOver = useCallback((cellKey: string) => {
    if (isDragging && anchorCell) {
      selectRange(anchorCell, cellKey);
    }
  }, [isDragging, anchorCell, selectRange]);

  // 마우스 업
  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // 더블클릭 편집
  const handleCellDoubleClick = useCallback((cellKey: string) => {
    const info = cellMap[cellKey];
    if (!info) return;
    const value = stockData[info.dataKey]?.alloc ?? 0;
    setEditValue(String(value));
    setIsEditing(true);
    setActiveCell(cellKey);
    setTimeout(() => editInputRef.current?.select(), 0);
  }, [cellMap, stockData]);

  // 편집 커밋
  const commitEdit = useCallback(() => {
    if (!isEditing || !activeCell) return;
    const info = cellMap[activeCell];
    if (!info) return;

    const numVal = editValue === '' ? 0 : parseInt(editValue) || 0;
    setStockData(prev => ({
      ...prev,
      [info.dataKey]: { ...prev[info.dataKey], alloc: numVal }
    }));
    setIsEditing(false);
    setEditValue('');
  }, [isEditing, activeCell, cellMap, editValue]);

  // 편집 취소
  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue('');
  }, []);

  // 이웃 셀 찾기
  const getNeighbor = useCallback((cellKey: string, dr: number, dc: number): string | null => {
    const info = cellMap[cellKey];
    if (!info) return null;
    const newRow = info.row + dr;
    const newCol = info.col + dc;
    if (newRow < 0 || newRow > maxRow || newCol < 0 || newCol > maxCol) return null;
    return coordMap[`${newRow}_${newCol}`] || null;
  }, [cellMap, coordMap, maxRow, maxCol]);

  // 이동
  const moveTo = useCallback((fromKey: string, dr: number, dc: number) => {
    const target = getNeighbor(fromKey, dr, dc);
    if (!target) return;
    setSelectedCells(new Set([target]));
    setActiveCell(target);
    setAnchorCell(target);
  }, [getNeighbor]);

  // 선택된 셀 범위 계산
  const getSelectionBounds = useCallback(() => {
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    selectedCells.forEach(ck => {
      const info = cellMap[ck];
      if (info) {
        minR = Math.min(minR, info.row);
        maxR = Math.max(maxR, info.row);
        minC = Math.min(minC, info.col);
        maxC = Math.max(maxC, info.col);
      }
    });
    return { minR, maxR, minC, maxC };
  }, [selectedCells, cellMap]);

  // 복사
  const copySelection = useCallback(() => {
    if (selectedCells.size === 0) return;
    const { minR, maxR, minC, maxC } = getSelectionBounds();
    const rows = maxR - minR + 1;
    const cols = maxC - minC + 1;
    const data: (number | null)[][] = [];

    for (let r = 0; r < rows; r++) {
      data[r] = [];
      for (let c = 0; c < cols; c++) {
        const ck = coordMap[`${minR + r}_${minC + c}`];
        if (ck && cellMap[ck]) {
          const d = stockData[cellMap[ck].dataKey];
          data[r][c] = d ? d.alloc : null;
        } else {
          data[r][c] = null;
        }
      }
    }

    setClipboard({ rows, cols, data });
    setCopiedCells(new Set(selectedCells));
    showToast(`${selectedCells.size}개 셀 복사됨 (${rows}×${cols})`);
  }, [selectedCells, getSelectionBounds, coordMap, cellMap, stockData, showToast]);

  // 붙여넣기
  const pasteClipboard = useCallback(() => {
    if (!clipboard || !activeCell) return;
    const base = cellMap[activeCell];
    if (!base) return;

    let pasted = 0;
    const newData = { ...stockData };

    for (let r = 0; r < clipboard.rows; r++) {
      for (let c = 0; c < clipboard.cols; c++) {
        const targetKey = coordMap[`${base.row + r}_${base.col + c}`];
        if (targetKey && cellMap[targetKey]) {
          const val = clipboard.data[r][c];
          newData[cellMap[targetKey].dataKey] = {
            ...newData[cellMap[targetKey].dataKey],
            alloc: val ?? 0
          };
          pasted++;
        }
      }
    }

    setStockData(newData);
    setCopiedCells(new Set());
    showToast(`${pasted}개 셀에 붙여넣기 완료`);
  }, [clipboard, activeCell, cellMap, coordMap, stockData, showToast]);

  // Fill Down
  const fillDown = useCallback(() => {
    const { minR, maxR, minC, maxC } = getSelectionBounds();
    if (minR === maxR) return;

    let filled = 0;
    const newData = { ...stockData };

    for (let c = minC; c <= maxC; c++) {
      const srcKey = coordMap[`${minR}_${c}`];
      if (!srcKey) continue;
      const srcInfo = cellMap[srcKey];
      const srcVal = stockData[srcInfo.dataKey]?.alloc ?? 0;

      for (let r = minR + 1; r <= maxR; r++) {
        const tKey = coordMap[`${r}_${c}`];
        if (tKey && cellMap[tKey]) {
          newData[cellMap[tKey].dataKey] = {
            ...newData[cellMap[tKey].dataKey],
            alloc: srcVal
          };
          filled++;
        }
      }
    }

    setStockData(newData);
    showToast(`아래로 채우기 완료 (${filled}개 셀)`);
  }, [getSelectionBounds, coordMap, cellMap, stockData, showToast]);

  // Fill Right
  const fillRight = useCallback(() => {
    const { minR, maxR, minC, maxC } = getSelectionBounds();
    if (minC === maxC) return;

    let filled = 0;
    const newData = { ...stockData };

    for (let r = minR; r <= maxR; r++) {
      const srcKey = coordMap[`${r}_${minC}`];
      if (!srcKey) continue;
      const srcInfo = cellMap[srcKey];
      const srcVal = stockData[srcInfo.dataKey]?.alloc ?? 0;

      for (let c = minC + 1; c <= maxC; c++) {
        const tKey = coordMap[`${r}_${c}`];
        if (tKey && cellMap[tKey]) {
          newData[cellMap[tKey].dataKey] = {
            ...newData[cellMap[tKey].dataKey],
            alloc: srcVal
          };
          filled++;
        }
      }
    }

    setStockData(newData);
    showToast(`오른쪽으로 채우기 완료 (${filled}개 셀)`);
  }, [getSelectionBounds, coordMap, cellMap, stockData, showToast]);

  // 선택 셀 삭제
  const deleteSelection = useCallback(() => {
    if (selectedCells.size === 0) return;
    const newData = { ...stockData };
    selectedCells.forEach(ck => {
      const info = cellMap[ck];
      if (info) {
        newData[info.dataKey] = { ...newData[info.dataKey], alloc: 0 };
      }
    });
    setStockData(newData);
    showToast(`${selectedCells.size}개 셀 삭제됨`);
  }, [selectedCells, cellMap, stockData, showToast]);

  // 전체 선택
  const selectAll = useCallback(() => {
    const allCells = new Set(Object.keys(cellMap));
    setSelectedCells(allCells);
    const firstKey = Object.keys(cellMap)[0];
    if (firstKey) {
      setActiveCell(firstKey);
      setAnchorCell(firstKey);
    }
    showToast(`전체 배분 셀 선택됨 (${allCells.size}개)`);
  }, [cellMap, showToast]);

  // 키보드 이벤트
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 편집 중일 때
      if (isEditing) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            // Ctrl+Enter: 선택된 모든 셀에 값 입력
            const numVal = editValue === '' ? 0 : parseInt(editValue) || 0;
            const newData = { ...stockData };
            selectedCells.forEach(ck => {
              const info = cellMap[ck];
              if (info) {
                newData[info.dataKey] = { ...newData[info.dataKey], alloc: numVal };
              }
            });
            setStockData(newData);
            setIsEditing(false);
            setEditValue('');
            showToast(`${selectedCells.size}개 셀에 값 일괄 입력 완료`);
          } else {
            commitEdit();
            if (activeCell) moveTo(activeCell, 1, 0);
          }
        } else if (e.key === 'Tab') {
          e.preventDefault();
          commitEdit();
          if (activeCell) moveTo(activeCell, 0, e.shiftKey ? -1 : 1);
        } else if (e.key === 'Escape') {
          cancelEdit();
        }
        return;
      }

      // 화살표 키
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        if (!activeCell) return;
        const dr = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
        const dc = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;

        if (e.shiftKey) {
          const target = getNeighbor(activeCell, dr, dc);
          if (target && anchorCell) selectRange(anchorCell, target);
        } else {
          moveTo(activeCell, dr, dc);
        }
        return;
      }

      // Enter: 편집 시작
      if (e.key === 'Enter' && activeCell) {
        e.preventDefault();
        handleCellDoubleClick(activeCell);
        return;
      }

      // F2: 편집
      if (e.key === 'F2' && activeCell) {
        e.preventDefault();
        handleCellDoubleClick(activeCell);
        return;
      }

      // Delete/Backspace: 삭제
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCells.size > 0) {
        e.preventDefault();
        deleteSelection();
        return;
      }

      // Ctrl+C: 복사
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        copySelection();
        return;
      }

      // Ctrl+V: 붙여넣기
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        pasteClipboard();
        return;
      }

      // Ctrl+A: 전체 선택
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }

      // Ctrl+D: Fill Down
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedCells.size > 1) {
        e.preventDefault();
        fillDown();
        return;
      }

      // Ctrl+R: Fill Right
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && selectedCells.size > 1) {
        e.preventDefault();
        fillRight();
        return;
      }

      // 숫자 입력: 편집 시작 (덮어쓰기)
      if (/^[0-9\-]$/.test(e.key) && activeCell && !e.ctrlKey && !e.metaKey) {
        setEditValue(e.key);
        setIsEditing(true);
        setTimeout(() => editInputRef.current?.focus(), 0);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, editValue, activeCell, anchorCell, selectedCells, commitEdit, cancelEdit, moveTo, getNeighbor, selectRange, handleCellDoubleClick, deleteSelection, copySelection, pasteClipboard, selectAll, fillDown, fillRight, stockData, cellMap, showToast]);

  // 외부 클릭 시 선택 해제
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        if (!isEditing) clearSelection();
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [clearSelection, isEditing]);

  const handleQuery = () => {
    const newData = generateInitialData();
    setStockData(newData.data);
    clearSelection();
    showToast('조회 완료 - 데이터가 갱신되었습니다.');
  };

  const handleReset = () => {
    showToast('필터가 초기화되었습니다.');
  };

  const handleSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const newData = { ...stockData };
      Object.keys(newData).forEach(k => {
        const forecast = Math.floor(Math.random() * 10) + 1;
        newData[k] = { ...newData[k], forecast, alloc: forecast };
      });
      setStockData(newData);
      setIsSimulating(false);
      showToast('AI 배분 시뮬레이션 완료 - 판매 예측값이 배분 셀에 반영되었습니다.');
    }, 1800);
  };

  const handleDownload = () => {
    showToast('엑셀(CSV) 다운로드 완료');
  };

  // SCS 요약 계산
  const scsSummary = useMemo(() => {
    const summary: Record<string, {label: string; name: string; apStock: number; alloc: number}> = {};

    STYLES.forEach(style => {
      style.colors.forEach(color => {
        SIZES.forEach(size => {
          const scsKey = `${style.code}-${color}-${size}`;
          let totalAlloc = 0;
          SHOPS.forEach(shop => {
            const dk = `${shop.id}_${style.code}_${color}_${size}`;
            if (stockData[dk]) totalAlloc += stockData[dk].alloc || 0;
          });
          summary[scsKey] = {
            label: `${style.code} / ${color} / ${size}`,
            name: style.name,
            apStock: apStockMap[scsKey] || 0,
            alloc: totalAlloc
          };
        });
      });
    });

    return Object.values(summary).sort((a, b) => b.alloc - a.alloc);
  }, [stockData, apStockMap]);

  const grandTotals = useMemo(() => {
    return scsSummary.reduce((acc, e) => ({
      apStock: acc.apStock + e.apStock,
      alloc: acc.alloc + e.alloc
    }), { apStock: 0, alloc: 0 });
  }, [scsSummary]);

  // 셀 렌더링 (배분 셀)
  const renderAllocCell = (dataKey: string, row: number, col: number) => {
    const cellKey = getCellKey(row, col);
    const value = stockData[dataKey]?.alloc ?? 0;
    const isSelected = selectedCells.has(cellKey);
    const isActive = activeCell === cellKey;
    const isCopied = copiedCells.has(cellKey);
    const isEditingThis = isEditing && isActive;

    return (
      <td
        key={cellKey}
        className={`p-0 border border-[#D2D8E0] bg-[#F8F6FF] relative cursor-cell select-none
          ${isSelected ? 'bg-[rgba(0,180,216,0.15)] outline outline-2 outline-[#00B4D8] -outline-offset-1 z-10' : ''}
          ${isActive ? 'outline outline-2 outline-[#00B4D8] -outline-offset-1 z-10' : ''}
          ${isCopied ? 'outline outline-2 outline-dashed outline-[#28A745] -outline-offset-1' : ''}
        `}
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
            <div className="text-sm font-semibold text-[#1B3A5C] mb-1">AI 배분 시뮬레이션 실행 중</div>
            <div className="text-xs text-[#A0AEC0]">LightGBM 수요예측 → ILP 최적 배분 계산 중...</div>
          </div>
        </div>
      )}

      {/* Page Title */}
      <div className="bg-white px-6 py-3 border-b border-[#D2D8E0] flex items-center gap-2.5 shrink-0">
        <h1 className="text-base font-bold text-[#1B3A5C]">┃ 보충배분-AIA</h1>
        <span className="text-[11px] text-[#7C3AED] bg-[#F3EFFE] px-2 py-0.5 rounded-full font-semibold">v10</span>
      </div>

      {/* Filter Section */}
      <div className="bg-white border-b border-[#D2D8E0]">
        <div className="px-6 py-2 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-[#8492A6] font-semibold"><span className="text-[#DC3545]">*</span> 브랜드</label>
            <Select defaultValue="X">
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="X" className="text-xs">X: Discovery</SelectItem>
                <SelectItem value="M" className="text-xs">M: MLB</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-[#8492A6] font-semibold"><span className="text-[#DC3545]">*</span> AP</label>
            <Select defaultValue="offline">
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="offline" className="text-xs">오프라인 정상</SelectItem>
                <SelectItem value="online" className="text-xs">온라인</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-[#8492A6] font-semibold"><span className="text-[#DC3545]">*</span> 상품시즌</label>
            <Select defaultValue="26S">
              <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="26S" className="text-xs">26S</SelectItem>
                <SelectItem value="25F" className="text-xs">25F</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-[#8492A6] font-semibold">매장</label>
            <Select defaultValue="all">
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">전체</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-[#8492A6] font-semibold">스타일</label>
            <Input type="text" placeholder="스타일코드" className="w-[110px] h-8 text-xs" />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-[#8492A6] font-semibold">컬러</label>
            <Select defaultValue="all">
              <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">전체</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="h-8 px-3 text-xs bg-[#00B4D8] hover:bg-[#0096B4]" onClick={handleQuery}>
            조회
          </Button>
          <Button variant="outline" className="h-8 px-3 text-xs" onClick={handleReset}>
            초기화
          </Button>
        </div>
      </div>

      {/* Toggle Bar */}
      <div className="bg-white px-6 py-2 flex items-center gap-4 border-b border-[#D2D8E0]">
        <div className="flex border border-[#D2D8E0] rounded-md overflow-hidden">
          <button
            className={`px-4 py-1.5 text-xs font-medium transition-colors ${viewMode === 'shop' ? 'bg-[#00B4D8] text-white' : 'bg-white text-[#8492A6] hover:bg-[#F4F6F9]'}`}
            onClick={() => { setViewMode('shop'); clearSelection(); }}
          >
            매장별 보기
          </button>
          <button
            className={`px-4 py-1.5 text-xs font-medium transition-colors ${viewMode === 'style' ? 'bg-[#00B4D8] text-white' : 'bg-white text-[#8492A6] hover:bg-[#F4F6F9]'}`}
            onClick={() => { setViewMode('style'); clearSelection(); }}
          >
            스타일별 보기
          </button>
        </div>
        <span className="text-[11px] text-[#A0AEC0]">
          셀: <b className="text-[#4A5568]">현 재고</b> · <b className="text-[#92400E]">판매 예측</b> · <b className="text-[#7C3AED]">배분</b>
          <span className="ml-3 text-[10px]">(Ctrl+C 복사 / Ctrl+V 붙여넣기 / Ctrl+D 아래로채우기 / Ctrl+R 오른쪽채우기)</span>
        </span>
        <div className="flex-1" />
        <Button className="h-7 px-3 text-[11px] bg-gradient-to-r from-[#7C3AED] to-[#9F7AEA] border-none" onClick={handleSimulation}>
          배분 시뮬레이션
        </Button>
        <Button variant="outline" className="h-7 px-3 text-[11px]" onClick={handleDownload}>
          엑셀 다운로드
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* SCS Summary Panel */}
        <div className="bg-white border border-[#D2D8E0] rounded-md p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-[13px] font-semibold text-[#1B3A5C]">SCS 배분 현황</span>
            <span className="text-[11px] text-[#A0AEC0]">스타일-컬러-사이즈별 배분 수량 합계</span>
          </div>
          <div className="overflow-x-auto max-h-[180px] overflow-y-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#F0F2F6]">
                  <th className="text-left p-1.5 border border-[#D2D8E0] font-semibold text-[#8492A6] min-w-[200px] sticky top-0 bg-[#F0F2F6]">SCS (스타일-컬러-사이즈)</th>
                  <th className="text-right p-1.5 border border-[#D2D8E0] font-semibold text-[#8492A6] min-w-[100px] sticky top-0 bg-[#F0F2F6]">AP 가용재고</th>
                  <th className="text-right p-1.5 border border-[#D2D8E0] font-semibold text-[#7C3AED] min-w-[100px] sticky top-0 bg-[#F0F2F6]">배분 수량 합계</th>
                  <th className="text-right p-1.5 border border-[#D2D8E0] font-semibold text-[#8492A6] min-w-[80px] sticky top-0 bg-[#F0F2F6]">잔량</th>
                </tr>
              </thead>
              <tbody>
                {scsSummary.slice(0, 10).map((e, i) => {
                  const remain = e.apStock - e.alloc;
                  return (
                    <tr key={i} className="hover:bg-[#F7F9FC]">
                      <td className="p-1.5 border border-[#D2D8E0]">{e.label} <span className="text-[10px] text-[#A0AEC0]">{e.name}</span></td>
                      <td className="p-1.5 border border-[#D2D8E0] text-right tabular-nums">{e.apStock.toLocaleString()}</td>
                      <td className="p-1.5 border border-[#D2D8E0] text-right tabular-nums text-[#7C3AED] font-semibold">{e.alloc.toLocaleString()}</td>
                      <td className={`p-1.5 border border-[#D2D8E0] text-right tabular-nums ${remain < 0 ? 'text-[#DC3545] font-semibold' : ''}`}>{remain.toLocaleString()}</td>
                    </tr>
                  );
                })}
                <tr className="bg-[#F0F2F6] font-bold">
                  <td className="p-1.5 border border-[#D2D8E0]">합계</td>
                  <td className="p-1.5 border border-[#D2D8E0] text-right tabular-nums">{grandTotals.apStock.toLocaleString()}</td>
                  <td className="p-1.5 border border-[#D2D8E0] text-right tabular-nums text-[#7C3AED]">{grandTotals.alloc.toLocaleString()}</td>
                  <td className={`p-1.5 border border-[#D2D8E0] text-right tabular-nums ${grandTotals.apStock - grandTotals.alloc < 0 ? 'text-[#DC3545]' : ''}`}>
                    {(grandTotals.apStock - grandTotals.alloc).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section Divider */}
        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-px bg-[#D2D8E0]" />
          <span className="text-xs font-semibold text-[#8492A6] whitespace-nowrap">
            {viewMode === 'shop' ? '매장별 배분 상세' : '스타일별 배분 상세'}
          </span>
          <div className="flex-1 h-px bg-[#D2D8E0]" />
        </div>

        {/* Pivot Table */}
        <div ref={tableRef} className="bg-white border border-[#D2D8E0] rounded-md overflow-hidden">
          <div className="overflow-auto max-h-[50vh]">
            {viewMode === 'shop' ? (
              <table className="text-xs border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F0F2F6]">
                    <th className="sticky left-0 top-0 z-30 bg-[#E4E8EE] p-2 border border-[#D2D8E0] text-left font-semibold text-[#8492A6] min-w-[150px]" rowSpan={2}>매장</th>
                    {STYLES.map(style =>
                      style.colors.map(color =>
                        SIZES.map(size => (
                          <th key={`h1-${style.code}-${color}-${size}`} colSpan={3} className="sticky top-0 z-20 p-1.5 border border-[#D2D8E0] text-center font-semibold text-[#8492A6] text-[10px] bg-[#F0F2F6]">
                            {style.code}<br/><span className="text-[9px] text-[#A0AEC0]">{color}-{size}</span>
                          </th>
                        ))
                      )
                    )}
                  </tr>
                  <tr className="bg-[#F0F2F6]">
                    {STYLES.map(style =>
                      style.colors.map(color =>
                        SIZES.map(size => (
                          <React.Fragment key={`h2-${style.code}-${color}-${size}`}>
                            <th className="sticky top-[50px] z-20 p-1 border border-[#D2D8E0] text-center text-[10px] font-medium bg-[#E0E7EF] text-[#4A5568] w-[60px]">재고</th>
                            <th className="sticky top-[50px] z-20 p-1 border border-[#D2D8E0] text-center text-[10px] font-medium bg-[#FFF3CD] text-[#92400E] w-[60px]">예측</th>
                            <th className="sticky top-[50px] z-20 p-1 border border-[#D2D8E0] text-center text-[10px] font-medium bg-[#E0D6F9] text-[#7C3AED] w-[60px]">배분</th>
                          </React.Fragment>
                        ))
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {SHOPS.map((shop, rowIdx) => {
                    let colIdx = 0;
                    return (
                      <tr key={shop.id} className="hover:bg-[#F7F9FC]/50">
                        <td className="sticky left-0 z-10 bg-[#F0F2F6] p-2 border border-[#D2D8E0] font-medium shadow-[4px_0_8px_rgba(0,0,0,0.08)]">
                          {shop.name} <span className="text-[10px] text-[#A0AEC0]">({shop.grade})</span>
                        </td>
                        {STYLES.map(style =>
                          style.colors.map(color =>
                            SIZES.map(size => {
                              const dataKey = `${shop.id}_${style.code}_${color}_${size}`;
                              const d = stockData[dataKey] || { stock: 0, forecast: 0, alloc: 0 };
                              const currentColIdx = colIdx++;
                              return (
                                <React.Fragment key={dataKey}>
                                  <td className="p-1.5 border border-[#D2D8E0] text-right tabular-nums bg-[#EBF0F5] text-[#4A5568]">{d.stock}</td>
                                  <td className="p-1.5 border border-[#D2D8E0] text-right tabular-nums bg-[#FFF8E1] text-[#92400E]">{d.forecast}</td>
                                  {renderAllocCell(dataKey, rowIdx, currentColIdx)}
                                </React.Fragment>
                              );
                            })
                          )
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="text-xs border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F0F2F6]">
                    <th className="sticky left-0 top-0 z-30 bg-[#E4E8EE] p-2 border border-[#D2D8E0] text-left font-semibold text-[#8492A6] min-w-[180px]" rowSpan={2}>스타일 / 컬러</th>
                    {SHOPS.map(shop => (
                      <th key={shop.id} colSpan={SIZES.length * 3} className="sticky top-0 z-20 p-1.5 border border-[#D2D8E0] text-center font-semibold text-[#8492A6] text-[11px] bg-[#F0F2F6]">
                        {shop.name} <span className="text-[10px] font-normal">({shop.grade})</span>
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-[#F0F2F6]">
                    {SHOPS.map(shop =>
                      SIZES.map(size => (
                        <React.Fragment key={`${shop.id}-${size}`}>
                          <th className="sticky top-[40px] z-20 p-1 border border-[#D2D8E0] text-center text-[10px] font-medium bg-[#E0E7EF] text-[#4A5568] w-[50px]">{size}<br/>재고</th>
                          <th className="sticky top-[40px] z-20 p-1 border border-[#D2D8E0] text-center text-[10px] font-medium bg-[#FFF3CD] text-[#92400E] w-[50px]">{size}<br/>예측</th>
                          <th className="sticky top-[40px] z-20 p-1 border border-[#D2D8E0] text-center text-[10px] font-medium bg-[#E0D6F9] text-[#7C3AED] w-[50px]">{size}<br/>배분</th>
                        </React.Fragment>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let rowIdx = 0;
                    return STYLES.map(style =>
                      style.colors.map(color => {
                        const currentRowIdx = rowIdx++;
                        let colIdx = 0;
                        return (
                          <tr key={`${style.code}-${color}`} className="hover:bg-[#F7F9FC]/50">
                            <td className="sticky left-0 z-10 bg-[#F0F2F6] p-2 border border-[#D2D8E0] font-medium shadow-[4px_0_8px_rgba(0,0,0,0.08)]">
                              {style.code} / {color}<br/><span className="text-[10px] text-[#A0AEC0]">{style.name}</span>
                            </td>
                            {SHOPS.map(shop =>
                              SIZES.map(size => {
                                const dataKey = `${shop.id}_${style.code}_${color}_${size}`;
                                const d = stockData[dataKey] || { stock: 0, forecast: 0, alloc: 0 };
                                const currentColIdx = colIdx++;
                                return (
                                  <React.Fragment key={dataKey}>
                                    <td className="p-1.5 border border-[#D2D8E0] text-right tabular-nums bg-[#EBF0F5] text-[#4A5568]">{d.stock}</td>
                                    <td className="p-1.5 border border-[#D2D8E0] text-right tabular-nums bg-[#FFF8E1] text-[#92400E]">{d.forecast}</td>
                                    {renderAllocCell(dataKey, currentRowIdx, currentColIdx)}
                                  </React.Fragment>
                                );
                              })
                            )}
                          </tr>
                        );
                      })
                    );
                  })()}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
