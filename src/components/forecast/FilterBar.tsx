'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { brands, apOptions, seasons, categories } from '@/data/mockData';

export default function FilterBar() {
  return (
    <div className="bg-white px-5 py-3 flex flex-wrap gap-3 items-end border-b border-[#E2E8F0]">
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-[#718096] font-semibold">
          <span className="text-[#DC3545]">*</span>브랜드
        </label>
        <Select defaultValue="X">
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {brands.map((brand) => (
              <SelectItem key={brand.code} value={brand.code} className="text-xs">
                {brand.code}: {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-[#718096] font-semibold">
          <span className="text-[#DC3545]">*</span>AP
        </label>
        <Select defaultValue="offline_normal">
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {apOptions.map((ap) => (
              <SelectItem key={ap.value} value={ap.value} className="text-xs">
                {ap.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-[#718096] font-semibold">
          <span className="text-[#DC3545]">*</span>운영시즌
        </label>
        <Select defaultValue="26S">
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {seasons.map((season) => (
              <SelectItem key={season} value={season} className="text-xs">
                {season}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-[#718096] font-semibold">중분류</label>
        <Select defaultValue="전체">
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat} className="text-xs">
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-[#718096] font-semibold">ITEM</label>
        <Select defaultValue="전체">
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="전체" className="text-xs">전체</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-[#718096] font-semibold">
          <span className="text-[#DC3545]">*</span>예측 기준일
        </label>
        <Input
          type="date"
          defaultValue="2026-03-20"
          className="w-[140px] h-8 text-xs"
        />
      </div>

      <Button className="h-8 px-4 text-xs bg-[#00A3E0] hover:bg-[#0093CC]">
        🔍 조회하기
      </Button>

      <Button className="h-8 px-4 text-xs bg-gradient-to-r from-[#7C3AED] to-[#9F7AEA] border-none hover:opacity-90">
        ✦ AI 예측 실행
      </Button>
    </div>
  );
}
