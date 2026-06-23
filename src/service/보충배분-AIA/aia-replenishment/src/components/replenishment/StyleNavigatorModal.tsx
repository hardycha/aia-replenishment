'use client';

// 스타일 네비게이터 모달
// 3단 레이아웃: 좌(필터) / 중(리스트+검색) / 우(선택된 스타일 · 컬러 지정)
// S-ERP 스타일 네비게이터 UI 참조

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  BrandCd,
  CategoryTree,
  StyleCatalogItem,
  StyleColorSelection,
} from '@/lib/types';

// 바스켓 내부용 — 복수 컬러 지원
interface BasketItem {
  prodCd: string;
  prodNm: string;
  ssnCd: string;
  colorCds: string[]; // ['ALL'] 또는 ['BKS', 'WHS'] 등
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (selections: StyleColorSelection[]) => void;
  initialSelections: StyleColorSelection[];
  brandCd: BrandCd;
  defaultSsnCd?: string;
  styleCatalog?: StyleCatalogItem[];
  categoryTree?: CategoryTree;
  seasonOptions?: string[];
}

export default function StyleNavigatorModal({
  open,
  onClose,
  onSubmit,
  initialSelections,
  brandCd,
  defaultSsnCd,
  styleCatalog = [],
  categoryTree = {},
  seasonOptions = [],
}: Props) {
  // ── 필터 상태 ──────────────────────────────────
  const [seasonFilter, setSeasonFilter] = useState<Set<string>>(new Set());
  const [cat1Filter, setCat1Filter] = useState<Set<string>>(new Set());
  const [cat2Filter, setCat2Filter] = useState<Set<string>>(new Set());
  const [cat3Filter, setCat3Filter] = useState<Set<string>>(new Set());
  const [cat1Open, setCat1Open] = useState(true);
  const [cat2Open, setCat2Open] = useState(false);
  const [cat3Open, setCat3Open] = useState(false);
  const [showMoreSeasons, setShowMoreSeasons] = useState(false);

  // ── 검색 상태 ──────────────────────────────────
  const [query, setQuery] = useState('');
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);

  // ── 선택 상태 ──────────────────────────────────
  const [checkedInList, setCheckedInList] = useState<Set<string>>(new Set());
  // 선택된 스타일 = 누적. 키: prodCd (한 스타일 당 한 번만 추가, 컬러는 토글로 복수 지정)
  const [basket, setBasket] = useState<BasketItem[]>([]);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setSeasonFilter(defaultSsnCd ? new Set([defaultSsnCd]) : new Set());
      setCat1Filter(new Set());
      setCat2Filter(new Set());
      setCat3Filter(new Set());
      setQuery('');
      setAutocompleteOpen(false);
      setCheckedInList(new Set());
      // initialSelections(개별 컬러)를 BasketItem(복수 컬러)으로 그루핑
      const grouped: Record<string, BasketItem> = {};
      for (const sel of initialSelections) {
        if (!grouped[sel.prodCd]) {
          grouped[sel.prodCd] = { prodCd: sel.prodCd, prodNm: sel.prodNm, ssnCd: sel.ssnCd, colorCds: [] };
        }
        if (!grouped[sel.prodCd].colorCds.includes(sel.colorCd)) {
          grouped[sel.prodCd].colorCds.push(sel.colorCd);
        }
      }
      setBasket(Object.values(grouped));
    }
  }, [open, defaultSsnCd, initialSelections]);

  // ── ESC 닫기 ──────────────────────────────────
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  // ── 중분류·아이템 선택지 (대분류에 연동) ──────────
  const cat2Options = useMemo(() => {
    const set = new Set<string>();
    const sources =
      cat1Filter.size === 0 ? Object.keys(categoryTree) : Array.from(cat1Filter);
    for (const c1 of sources) {
      const sub = categoryTree[c1];
      if (sub) for (const c2 of Object.keys(sub)) set.add(c2);
    }
    return Array.from(set).sort();
  }, [cat1Filter]);

  const cat3Options = useMemo(() => {
    const set = new Set<string>();
    const c1s =
      cat1Filter.size === 0 ? Object.keys(categoryTree) : Array.from(cat1Filter);
    for (const c1 of c1s) {
      const c2map = categoryTree[c1];
      if (!c2map) continue;
      const c2s = cat2Filter.size === 0 ? Object.keys(c2map) : Array.from(cat2Filter);
      for (const c2 of c2s) {
        const c3s = c2map[c2];
        if (c3s) c3s.forEach((c3) => set.add(c3));
      }
    }
    return Array.from(set).sort();
  }, [cat1Filter, cat2Filter]);

  // ── 중앙 리스트 필터링 ─────────────────────────
  const filtered: StyleCatalogItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    return styleCatalog.filter((s) => s.brandCd === brandCd)
      .filter((s) => (seasonFilter.size === 0 ? true : seasonFilter.has(s.ssnCd)))
      .filter((s) => (cat1Filter.size === 0 ? true : cat1Filter.has(s.category1)))
      .filter((s) => (cat2Filter.size === 0 ? true : cat2Filter.has(s.category2)))
      .filter((s) => (cat3Filter.size === 0 ? true : cat3Filter.has(s.category3)))
      .filter((s) => {
        if (!q) return true;
        return (
          s.prodCd.toLowerCase().includes(q) ||
          s.prodNm.toLowerCase().includes(q)
        );
      });
  }, [query, brandCd, seasonFilter, cat1Filter, cat2Filter, cat3Filter]);

  // ── 자동완성 리스트 (검색어 기반, 최대 8개) ──────
  const autocomplete = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as StyleCatalogItem[];
    return styleCatalog.filter((s) => s.brandCd === brandCd)
      .filter(
        (s) =>
          s.prodCd.toLowerCase().includes(q) ||
          s.prodNm.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [query, brandCd]);

  // ── 유틸: 체크박스 토글 ────────────────────────
  function toggleInSet(
    set: Set<string>,
    setter: (s: Set<string>) => void,
    value: string,
  ) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  // ── 바스켓 조작 ────────────────────────────────
  function addToBasket(style: StyleCatalogItem) {
    setBasket((prev) => {
      if (prev.some((p) => p.prodCd === style.prodCd)) return prev;
      return [
        ...prev,
        {
          prodCd: style.prodCd,
          prodNm: style.prodNm,
          ssnCd: style.ssnCd,
          colorCds: ['ALL'],
        },
      ];
    });
  }

  function removeFromBasket(prodCd: string) {
    setBasket((prev) => prev.filter((p) => p.prodCd !== prodCd));
    setCheckedInList((prev) => {
      const next = new Set(prev);
      next.delete(prodCd);
      return next;
    });
  }

  function toggleBasketColor(prodCd: string, colorCd: string, allColors: string[]) {
    setBasket((prev) =>
      prev.map((p) => {
        if (p.prodCd !== prodCd) return p;
        if (colorCd === 'ALL') {
          // ALL 토글: 이미 ALL이면 전부 해제, 아니면 ALL로 설정
          return { ...p, colorCds: p.colorCds.includes('ALL') ? [] : ['ALL'] };
        }
        // 개별 컬러 토글
        let next = p.colorCds.filter((c) => c !== 'ALL'); // ALL 해제
        if (next.includes(colorCd)) {
          next = next.filter((c) => c !== colorCd);
        } else {
          next = [...next, colorCd];
        }
        // 전체 컬러가 다 선택되면 ALL로 전환
        if (next.length === allColors.length) {
          next = ['ALL'];
        }
        return { ...p, colorCds: next };
      }),
    );
  }

  function clearBasket() {
    setBasket([]);
    setCheckedInList(new Set());
  }

  // 리스트 체크 토글 시 바스켓에도 반영
  function toggleListCheck(style: StyleCatalogItem) {
    const next = new Set(checkedInList);
    if (next.has(style.prodCd)) {
      next.delete(style.prodCd);
      removeFromBasket(style.prodCd);
    } else {
      next.add(style.prodCd);
      addToBasket(style);
    }
    setCheckedInList(next);
  }

  // 바스켓 프로드코드와 동기화
  useEffect(() => {
    setCheckedInList(new Set(basket.map((b) => b.prodCd)));
  }, [basket]);

  const seasonsToShow = showMoreSeasons
    ? seasonOptions
    : seasonOptions.slice(0, 7);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45">
      <div className="bg-white rounded-lg shadow-2xl w-[1280px] h-[86vh] max-h-[880px] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="px-5 py-3 border-b border-[#D2D8E0] flex items-center justify-between shrink-0">
          <h2 className="text-[16px] font-bold text-[#1B3A5C]">스타일 네비게이터</h2>
          <button
            onClick={onClose}
            className="text-[#8492A6] hover:text-[#1B3A5C] text-xl leading-none px-1"
          >
            ✕
          </button>
        </div>

        {/* 본문 3단 */}
        <div className="flex-1 flex overflow-hidden">
          {/* ───── 좌측 필터 ─────────────────────── */}
          <aside className="w-[260px] border-r border-[#D2D8E0] bg-[#FAFBFC] overflow-y-auto">
            <div className="p-3 border-b border-[#EDEFF2] flex items-center justify-between">
              <button className="text-[11px] text-[#4A5568] hover:text-[#1B3A5C] flex items-center gap-1">
                <span>&lt; 필터</span>
              </button>
            </div>

            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-bold text-[#1B3A5C]">필터</span>
                <button
                  onClick={() => {
                    setSeasonFilter(new Set());
                    setCat1Filter(new Set());
                    setCat2Filter(new Set());
                    setCat3Filter(new Set());
                  }}
                  className="text-[11px] text-[#00B4D8] hover:underline"
                >
                  초기화
                </button>
              </div>

              {/* 상품 시즌 */}
              <FilterSection
                title="상품 시즌"
                count={seasonFilter.size}
                onReset={() => setSeasonFilter(new Set())}
                defaultOpen
              >
                <div className="flex flex-col gap-1.5">
                  {seasonsToShow.map((s) => (
                    <CheckRow
                      key={s}
                      label={s}
                      checked={seasonFilter.has(s)}
                      onChange={() =>
                        toggleInSet(seasonFilter, setSeasonFilter, s)
                      }
                    />
                  ))}
                  <button
                    onClick={() => setShowMoreSeasons((v) => !v)}
                    className="text-[11px] text-[#00B4D8] hover:underline text-left mt-1"
                  >
                    {showMoreSeasons ? '− 접기' : '+ 더보기'}
                  </button>
                </div>
              </FilterSection>

              {/* 대분류 */}
              <FilterSection
                title="대분류"
                count={cat1Filter.size}
                onReset={() => setCat1Filter(new Set())}
                open={cat1Open}
                onToggleOpen={() => setCat1Open((v) => !v)}
              >
                <div className="flex flex-col gap-1.5">
                  {Object.keys(categoryTree).map((c1) => (
                    <CheckRow
                      key={c1}
                      label={c1}
                      checked={cat1Filter.has(c1)}
                      onChange={() => toggleInSet(cat1Filter, setCat1Filter, c1)}
                    />
                  ))}
                </div>
              </FilterSection>

              {/* 중분류 */}
              <FilterSection
                title="중분류"
                count={cat2Filter.size}
                onReset={() => setCat2Filter(new Set())}
                open={cat2Open}
                onToggleOpen={() => setCat2Open((v) => !v)}
              >
                <div className="flex flex-col gap-1.5">
                  {cat2Options.length === 0 ? (
                    <div className="text-[10px] text-[#A0AEC0]">
                      대분류를 먼저 선택하세요
                    </div>
                  ) : (
                    cat2Options.map((c2) => (
                      <CheckRow
                        key={c2}
                        label={c2}
                        checked={cat2Filter.has(c2)}
                        onChange={() =>
                          toggleInSet(cat2Filter, setCat2Filter, c2)
                        }
                      />
                    ))
                  )}
                </div>
              </FilterSection>

              {/* 아이템 */}
              <FilterSection
                title="아이템"
                count={cat3Filter.size}
                onReset={() => setCat3Filter(new Set())}
                open={cat3Open}
                onToggleOpen={() => setCat3Open((v) => !v)}
              >
                <div className="flex flex-col gap-1.5">
                  {cat3Options.length === 0 ? (
                    <div className="text-[10px] text-[#A0AEC0]">
                      중분류까지 좁혀서 선택하세요
                    </div>
                  ) : (
                    cat3Options.map((c3) => (
                      <CheckRow
                        key={c3}
                        label={c3}
                        checked={cat3Filter.has(c3)}
                        onChange={() =>
                          toggleInSet(cat3Filter, setCat3Filter, c3)
                        }
                      />
                    ))
                  )}
                </div>
              </FilterSection>
            </div>
          </aside>

          {/* ───── 중앙 리스트 ─────────────────────── */}
          <section className="flex-1 flex flex-col overflow-hidden">
            {/* 검색 + 자동완성 */}
            <div className="px-4 py-3 border-b border-[#D2D8E0] relative">
              <div className="relative">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8492A6] text-xs pointer-events-none">
                  🔍
                </div>
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setAutocompleteOpen(true);
                  }}
                  onFocus={() => setAutocompleteOpen(true)}
                  onBlur={() => setTimeout(() => setAutocompleteOpen(false), 150)}
                  placeholder="스타일코드를 입력해주세요 (스타일명 검색도 가능)"
                  className="h-9 pl-8 text-xs"
                />
              </div>
              {autocompleteOpen && autocomplete.length > 0 && (
                <div className="absolute top-[54px] left-4 right-4 bg-white border border-[#D2D8E0] rounded-md shadow-lg z-30 max-h-[280px] overflow-y-auto">
                  {autocomplete.map((s) => (
                    <button
                      key={s.prodCd}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setQuery(s.prodCd);
                        setAutocompleteOpen(false);
                        toggleListCheck(s);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[#F7F9FC] border-b border-[#EDEFF2] last:border-b-0 flex items-center gap-3"
                    >
                      <span className="text-[10px] text-[#718096] bg-[#F0F2F6] px-1.5 py-0.5 rounded tabular-nums">
                        {s.ssnCd}
                      </span>
                      <span className="text-xs font-semibold text-[#1B3A5C] tabular-nums">
                        {s.prodCd}
                      </span>
                      <span className="text-xs text-[#4A5568] truncate">
                        {s.prodNm}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 리스트 */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-[#F8F9FB] sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-2.5 border-b border-[#D2D8E0] font-semibold text-[#8492A6] w-[44px]"></th>
                    <th className="text-left p-2.5 border-b border-[#D2D8E0] font-semibold text-[#8492A6] w-[80px]">
                      상품시즌
                    </th>
                    <th className="text-left p-2.5 border-b border-[#D2D8E0] font-semibold text-[#8492A6] w-[130px]">
                      스타일코드
                    </th>
                    <th className="text-left p-2.5 border-b border-[#D2D8E0] font-semibold text-[#8492A6]">
                      스타일명
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-[#A0AEC0]">
                        검색 결과가 없습니다
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s) => {
                      const checked = checkedInList.has(s.prodCd);
                      return (
                        <tr
                          key={s.prodCd}
                          onClick={() => toggleListCheck(s)}
                          className={`border-b border-[#EDEFF2] cursor-pointer ${
                            checked ? 'bg-[rgba(0,180,216,0.05)]' : 'hover:bg-[#F7F9FC]'
                          }`}
                        >
                          <td className="p-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleListCheck(s)}
                              onClick={(e) => e.stopPropagation()}
                              className="accent-[#00B4D8]"
                            />
                          </td>
                          <td className="p-2.5">
                            <span className="text-[10px] text-[#2F855A] bg-[#E6F4EA] px-2 py-0.5 rounded font-semibold">
                              {s.ssnCd}
                            </span>
                          </td>
                          <td className="p-2.5 tabular-nums text-[#1B3A5C] font-medium">
                            {s.prodCd}
                          </td>
                          <td className="p-2.5 text-[#4A5568]">{s.prodNm}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2 border-t border-[#D2D8E0] bg-[#FAFBFC] flex items-center gap-4 text-[11px] text-[#718096] shrink-0">
              <span>
                Rows: <b className="text-[#1B3A5C] tabular-nums">{filtered.length}</b>
              </span>
              <span>
                Selected Rows:{' '}
                <b className="text-[#00B4D8] tabular-nums">{checkedInList.size}</b>
              </span>
            </div>
          </section>

          {/* ───── 우측 선택된 스타일 ───────────────── */}
          <aside className="w-[360px] border-l border-[#D2D8E0] bg-[#FAFBFC] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[#D2D8E0] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-[#1B3A5C]">
                  선택된 스타일
                </span>
                <span className="text-[11px] text-[#7C3AED] bg-[#F3EFFE] px-2 py-0.5 rounded-full font-semibold tabular-nums">
                  {basket.length}
                </span>
              </div>
              <button
                onClick={clearBasket}
                disabled={basket.length === 0}
                className="text-[#A0AEC0] hover:text-[#DC3545] disabled:opacity-30 text-sm px-1"
                title="전체 비우기"
              >
                🗑
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {basket.length === 0 ? (
                <div className="p-10 text-center text-xs text-[#A0AEC0]">
                  선택된 스타일이 없습니다.
                </div>
              ) : (
                <ul className="divide-y divide-[#EDEFF2]">
                  {basket.map((b) => {
                    const meta = styleCatalog.find(
                      (s) => s.prodCd === b.prodCd,
                    );
                    return (
                      <li key={b.prodCd} className="p-3 bg-white">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[#2F855A] bg-[#E6F4EA] px-1.5 py-0.5 rounded font-semibold">
                                {b.ssnCd}
                              </span>
                              <span className="text-xs font-bold text-[#1B3A5C] tabular-nums">
                                {b.prodCd}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#4A5568] mt-1 line-clamp-2">
                              {b.prodNm}
                            </div>
                          </div>
                          <button
                            onClick={() => removeFromBasket(b.prodCd)}
                            className="text-[#A0AEC0] hover:text-[#DC3545] text-sm px-1 shrink-0"
                            title="제거"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          <button
                            onClick={() => toggleBasketColor(b.prodCd, 'ALL', meta?.colors.map((c) => c.colorCd) ?? [])}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                              b.colorCds.includes('ALL')
                                ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                                : 'bg-white text-[#8492A6] border-[#D2D8E0] hover:border-[#7C3AED]'
                            }`}
                          >
                            ALL
                          </button>
                          {meta?.colors.map((c) => {
                            const selected = b.colorCds.includes('ALL') || b.colorCds.includes(c.colorCd);
                            return (
                              <button
                                key={c.colorCd}
                                onClick={() => toggleBasketColor(b.prodCd, c.colorCd, meta.colors.map((cc) => cc.colorCd))}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                                  selected
                                    ? 'bg-[#00B4D8] text-white border-[#00B4D8]'
                                    : 'bg-white text-[#4A5568] border-[#D2D8E0] hover:border-[#00B4D8]'
                                }`}
                                title={c.colorNm}
                              >
                                {c.colorCd}
                              </button>
                            );
                          })}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="px-4 py-2 border-t border-[#D2D8E0] bg-white flex items-center gap-4 text-[11px] text-[#718096] shrink-0">
              <span>
                Rows: <b className="text-[#1B3A5C] tabular-nums">{basket.length}</b>
              </span>
            </div>
          </aside>
        </div>

        {/* 푸터 */}
        <div className="px-5 py-3 border-t border-[#D2D8E0] flex items-center justify-end gap-2 bg-white shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button
            size="sm"
            disabled={basket.length === 0}
            onClick={() => {
              // BasketItem(복수 컬러) → StyleColorSelection(개별 컬러)로 전개
              const selections: StyleColorSelection[] = [];
              for (const item of basket) {
                if (item.colorCds.length === 0) continue;
                for (const colorCd of item.colorCds) {
                  selections.push({
                    prodCd: item.prodCd,
                    prodNm: item.prodNm,
                    ssnCd: item.ssnCd,
                    colorCd,
                  });
                }
              }
              onSubmit(selections);
              onClose();
            }}
            className="bg-[#00B4D8] hover:bg-[#0096B4] text-white disabled:opacity-40 px-6"
          >
            선택 ({basket.length})
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── 공통 체크박스 행 ──────────────────────────────
function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-[#4A5568] cursor-pointer select-none hover:text-[#1B3A5C]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-[#00B4D8]"
      />
      {label}
    </label>
  );
}

// ─── 접이식 필터 섹션 ──────────────────────────────
function FilterSection({
  title,
  count,
  onReset,
  open,
  defaultOpen,
  onToggleOpen,
  children,
}: {
  title: string;
  count: number;
  onReset?: () => void;
  open?: boolean;
  defaultOpen?: boolean;
  onToggleOpen?: () => void;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState<boolean>(
    defaultOpen ?? true,
  );
  const resolvedOpen = open !== undefined ? open : internalOpen;
  const toggle = onToggleOpen ?? (() => setInternalOpen((v) => !v));

  return (
    <div className="border-b border-[#EDEFF2] py-2.5">
      <div className="flex items-center justify-between">
        <button
          onClick={toggle}
          className="text-[12px] font-bold text-[#1B3A5C] flex items-center gap-1.5"
        >
          {title}
        </button>
        <div className="flex items-center gap-2">
          {onReset && (
            <button
              onClick={onReset}
              className="text-[10px] text-[#00B4D8] hover:underline"
            >
              초기화
            </button>
          )}
          <span className="text-[10px] bg-[#E8F7FB] text-[#0B8BB1] px-1.5 py-0.5 rounded-full font-semibold tabular-nums min-w-[18px] text-center">
            {count}
          </span>
          <button onClick={toggle} className="text-[#8492A6] text-xs">
            {resolvedOpen ? '▲' : '▼'}
          </button>
        </div>
      </div>
      {resolvedOpen && <div className="mt-2.5">{children}</div>}
    </div>
  );
}
