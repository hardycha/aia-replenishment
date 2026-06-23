'use client';

// 매장 추가 모달
// 근거: /보충배분-AIA/task.md T4.5

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BrandCd } from '@/lib/types';

interface ShopPoolItem {
  shopCd: string;
  shopNm: string;
  region: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (shopCd: string) => void;
  excludedShopCds: string[]; // 이미 테이블에 있는 매장
  brandCd: BrandCd;
  shopPool?: ShopPoolItem[]; // 브랜드 전체 매장 (실데이터)
}

export default function AddShopModal({
  open,
  onClose,
  onSubmit,
  excludedShopCds,
  brandCd,
  shopPool = [],
}: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(null);
    }
  }, [open]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shopPool.filter((s) => {
      if (!q) return true;
      return (
        s.shopCd.toLowerCase().includes(q) ||
        s.shopNm.toLowerCase().includes(q) ||
        s.region.toLowerCase().includes(q)
      );
    });
  }, [query, shopPool]);

  if (!open) return null;

  const excludedSet = new Set(excludedShopCds);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-[520px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-[#D2D8E0] flex items-center justify-between">
          <div>
            <div className="text-[14px] font-bold text-[#1B3A5C]">매장 추가</div>
            <div className="text-[11px] text-[#A0AEC0] mt-0.5">
              배분그룹 외 매장 중에서 추가 (adjRank는 가장 후순위로 부여)
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8492A6] hover:text-[#1B3A5C] text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[#D2D8E0]">
          <Input
            autoFocus
            placeholder="매장코드 · 매장명 · 지역 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {candidates.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#A0AEC0]">
              검색 결과가 없습니다
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-[#F0F2F6] sticky top-0 z-10">
                <tr>
                  <th className="text-left p-2 font-semibold text-[#8492A6]">매장코드</th>
                  <th className="text-left p-2 font-semibold text-[#8492A6]">매장명</th>
                  <th className="text-left p-2 font-semibold text-[#8492A6]">지역</th>
                  <th className="text-right p-2 font-semibold text-[#8492A6] w-[90px]"></th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((s) => {
                  const already = excludedSet.has(s.shopCd);
                  const isSelected = selected === s.shopCd;
                  return (
                    <tr
                      key={s.shopCd}
                      className={`border-t border-[#EDEFF2] ${
                        already
                          ? 'opacity-40 cursor-not-allowed'
                          : isSelected
                            ? 'bg-[rgba(0,180,216,0.08)] cursor-pointer'
                            : 'hover:bg-[#F7F9FC] cursor-pointer'
                      }`}
                      onClick={() => !already && setSelected(s.shopCd)}
                    >
                      <td className="p-2 tabular-nums text-[#4A5568]">{s.shopCd}</td>
                      <td className="p-2 text-[#1B3A5C] font-medium">{s.shopNm}</td>
                      <td className="p-2 text-[#718096]">{s.region}</td>
                      <td className="p-2 text-right">
                        {already ? (
                          <span className="text-[10px] text-[#DC3545] bg-[#FEE2E2] px-1.5 py-0.5 rounded">
                            이미 포함됨
                          </span>
                        ) : isSelected ? (
                          <span className="text-[10px] text-[#0B8BB1] bg-[#E6F7FB] px-1.5 py-0.5 rounded font-semibold">
                            선택됨
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[#D2D8E0] flex items-center justify-end gap-2 bg-[#F8F9FB]">
          <Button variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button
            size="sm"
            disabled={!selected}
            onClick={() => {
              if (selected) {
                onSubmit(selected);
                onClose();
              }
            }}
            className="bg-[#00B4D8] hover:bg-[#0096B4] text-white disabled:opacity-40"
          >
            매장 추가
          </Button>
        </div>
      </div>
    </div>
  );
}
