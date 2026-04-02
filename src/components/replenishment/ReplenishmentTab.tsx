'use client';

import React, { useState, useCallback, useMemo } from 'react';
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

// Mock 데이터 - 매장 목록
const SHOPS = [
  {id:'S001',name:'강남점',grade:'S'},{id:'S002',name:'잠실점',grade:'S'},
  {id:'S003',name:'명동점',grade:'S'},{id:'S004',name:'코엑스점',grade:'A'},
  {id:'S005',name:'여의도IFC점',grade:'A'},{id:'S006',name:'판교현대점',grade:'A'},
  {id:'S007',name:'스타필드하남점',grade:'A'},{id:'S008',name:'타임스퀘어점',grade:'A'},
  {id:'S009',name:'수원AK점',grade:'B'},{id:'S010',name:'대전갤러리아점',grade:'B'},
  {id:'S011',name:'부산센텀점',grade:'B'},{id:'S012',name:'광주신세계점',grade:'B'},
];

// Mock 데이터 - 스타일
const STYLES = [
  {code:'XJWT7341',name:'경량 바람막이 JKT',item:'JKT',colors:['BK','IV','NV']},
  {code:'XJOT5230',name:'오버핏 코치 JKT',item:'JKT',colors:['BK','KH']},
  {code:'XMST3120',name:'에센셜 반팔 TEE',item:'TEE',colors:['BK','IV','NV','KH']},
  {code:'XMPT4210',name:'클래식 조거 PNT',item:'PNT',colors:['BK','NV']},
];

const SIZES = ['S','M','L','XL'];

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

export default function ReplenishmentTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('shop');
  const [isQueried, setIsQueried] = useState(true);
  const [stockData, setStockData] = useState(() => generateInitialData().data);
  const [apStockMap] = useState(() => generateInitialData().apStock);
  const [toast, setToast] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleQuery = () => {
    const newData = generateInitialData();
    setStockData(newData.data);
    setIsQueried(true);
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

  const handleAllocChange = (key: string, value: string) => {
    const numVal = value === '' ? 0 : parseInt(value) || 0;
    setStockData(prev => ({
      ...prev,
      [key]: { ...prev[key], alloc: numVal }
    }));
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
            <div className="w-10 h-10 border-3 border-[#E2E8F0] border-t-[#7C3AED] rounded-full animate-spin mx-auto mb-4" />
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
                <SelectItem value="I" className="text-xs">I: MLB KIDS</SelectItem>
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
            onClick={() => setViewMode('shop')}
          >
            매장별 보기
          </button>
          <button
            className={`px-4 py-1.5 text-xs font-medium transition-colors ${viewMode === 'style' ? 'bg-[#00B4D8] text-white' : 'bg-white text-[#8492A6] hover:bg-[#F4F6F9]'}`}
            onClick={() => setViewMode('style')}
          >
            스타일별 보기
          </button>
        </div>
        <span className="text-[11px] text-[#A0AEC0]">
          셀: <b className="text-[#4A5568]">현 재고</b> · <b className="text-[#92400E]">판매 예측</b> · <b className="text-[#7C3AED]">배분</b>
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
                  <th className="text-left p-1.5 border border-[#D2D8E0] font-semibold text-[#8492A6] min-w-[200px]">SCS (스타일-컬러-사이즈)</th>
                  <th className="text-right p-1.5 border border-[#D2D8E0] font-semibold text-[#8492A6] min-w-[100px]">AP 가용재고</th>
                  <th className="text-right p-1.5 border border-[#D2D8E0] font-semibold text-[#7C3AED] min-w-[100px]">배분 수량 합계</th>
                  <th className="text-right p-1.5 border border-[#D2D8E0] font-semibold text-[#8492A6] min-w-[80px]">잔량</th>
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
        <div className="bg-white border border-[#D2D8E0] rounded-md overflow-hidden">
          <div className="overflow-auto max-h-[50vh]">
            {viewMode === 'shop' ? (
              <table className="text-xs border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F0F2F6]">
                    <th className="sticky left-0 z-20 bg-[#E4E8EE] p-2 border border-[#D2D8E0] text-left font-semibold text-[#8492A6] min-w-[150px]">매장</th>
                    {STYLES.map(style =>
                      style.colors.map(color =>
                        SIZES.map(size => (
                          <th key={`${style.code}-${color}-${size}`} colSpan={3} className="p-1.5 border border-[#D2D8E0] text-center font-semibold text-[#8492A6] text-[10px]">
                            {style.code}<br/><span className="text-[9px] text-[#A0AEC0]">{color}-{size}</span>
                          </th>
                        ))
                      )
                    )}
                  </tr>
                  <tr className="bg-[#F0F2F6]">
                    <th className="sticky left-0 z-20 bg-[#E4E8EE] border border-[#D2D8E0]"></th>
                    {STYLES.map(style =>
                      style.colors.map(color =>
                        SIZES.map(size => (
                          <React.Fragment key={`sub-${style.code}-${color}-${size}`}>
                            <th className="p-1 border border-[#D2D8E0] text-center text-[10px] font-medium bg-[#E0E7EF] text-[#4A5568] w-[60px]">재고</th>
                            <th className="p-1 border border-[#D2D8E0] text-center text-[10px] font-medium bg-[#FFF3CD] text-[#92400E] w-[60px]">예측</th>
                            <th className="p-1 border border-[#D2D8E0] text-center text-[10px] font-medium bg-[#E0D6F9] text-[#7C3AED] w-[60px]">배분</th>
                          </React.Fragment>
                        ))
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {SHOPS.map(shop => (
                    <tr key={shop.id} className="hover:bg-[#F7F9FC]">
                      <td className="sticky left-0 z-10 bg-[#F0F2F6] p-2 border border-[#D2D8E0] font-medium shadow-[4px_0_8px_rgba(0,0,0,0.08)]">
                        {shop.name} <span className="text-[10px] text-[#A0AEC0]">({shop.grade})</span>
                      </td>
                      {STYLES.map(style =>
                        style.colors.map(color =>
                          SIZES.map(size => {
                            const key = `${shop.id}_${style.code}_${color}_${size}`;
                            const d = stockData[key] || { stock: 0, forecast: 0, alloc: 0 };
                            return (
                              <React.Fragment key={key}>
                                <td className="p-1.5 border border-[#D2D8E0] text-right tabular-nums bg-[#EBF0F5] text-[#4A5568]">{d.stock}</td>
                                <td className="p-1.5 border border-[#D2D8E0] text-right tabular-nums bg-[#FFF8E1] text-[#92400E]">{d.forecast}</td>
                                <td className="p-0 border border-[#D2D8E0] bg-[#F8F6FF]">
                                  <input
                                    type="number"
                                    value={d.alloc}
                                    onChange={(e) => handleAllocChange(key, e.target.value)}
                                    className="w-full h-full p-1.5 text-right tabular-nums text-[#7C3AED] font-medium bg-transparent border-0 outline-none focus:bg-white focus:ring-2 focus:ring-[#00B4D8] text-xs"
                                  />
                                </td>
                              </React.Fragment>
                            );
                          })
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="text-xs border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F0F2F6]">
                    <th className="sticky left-0 z-20 bg-[#E4E8EE] p-2 border border-[#D2D8E0] text-left font-semibold text-[#8492A6] min-w-[180px]">스타일 / 컬러</th>
                    {SHOPS.map(shop => (
                      <th key={shop.id} colSpan={SIZES.length * 3} className="p-1.5 border border-[#D2D8E0] text-center font-semibold text-[#8492A6] text-[11px]">
                        {shop.name} <span className="text-[10px] font-normal">({shop.grade})</span>
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-[#F0F2F6]">
                    <th className="sticky left-0 z-20 bg-[#E4E8EE] border border-[#D2D8E0]"></th>
                    {SHOPS.map(shop =>
                      SIZES.map(size => (
                        <React.Fragment key={`${shop.id}-${size}`}>
                          <th className="p-1 border border-[#D2D8E0] text-center text-[10px] font-medium bg-[#E0E7EF] text-[#4A5568] w-[50px]">{size}<br/>재고</th>
                          <th className="p-1 border border-[#D2D8E0] text-center text-[10px] font-medium bg-[#FFF3CD] text-[#92400E] w-[50px]">{size}<br/>예측</th>
                          <th className="p-1 border border-[#D2D8E0] text-center text-[10px] font-medium bg-[#E0D6F9] text-[#7C3AED] w-[50px]">{size}<br/>배분</th>
                        </React.Fragment>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {STYLES.map(style =>
                    style.colors.map(color => (
                      <tr key={`${style.code}-${color}`} className="hover:bg-[#F7F9FC]">
                        <td className="sticky left-0 z-10 bg-[#F0F2F6] p-2 border border-[#D2D8E0] font-medium shadow-[4px_0_8px_rgba(0,0,0,0.08)]">
                          {style.code} / {color}<br/><span className="text-[10px] text-[#A0AEC0]">{style.name}</span>
                        </td>
                        {SHOPS.map(shop =>
                          SIZES.map(size => {
                            const key = `${shop.id}_${style.code}_${color}_${size}`;
                            const d = stockData[key] || { stock: 0, forecast: 0, alloc: 0 };
                            return (
                              <React.Fragment key={key}>
                                <td className="p-1.5 border border-[#D2D8E0] text-right tabular-nums bg-[#EBF0F5] text-[#4A5568]">{d.stock}</td>
                                <td className="p-1.5 border border-[#D2D8E0] text-right tabular-nums bg-[#FFF8E1] text-[#92400E]">{d.forecast}</td>
                                <td className="p-0 border border-[#D2D8E0] bg-[#F8F6FF]">
                                  <input
                                    type="number"
                                    value={d.alloc}
                                    onChange={(e) => handleAllocChange(key, e.target.value)}
                                    className="w-full h-full p-1.5 text-right tabular-nums text-[#7C3AED] font-medium bg-transparent border-0 outline-none focus:bg-white focus:ring-2 focus:ring-[#00B4D8] text-xs"
                                  />
                                </td>
                              </React.Fragment>
                            );
                          })
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
