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
import { brands, apOptions, seasons } from '@/data/mockData';

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
          <span className="text-[#DC3545]">*</span>시즌
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
        <label className="text-[11px] text-[#718096] font-semibold">ITEM</label>
        <Select defaultValue="all">
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">전체</SelectItem>
            <SelectItem value="windbreaker" className="text-xs">바람막이</SelectItem>
            <SelectItem value="tshirt" className="text-xs">반팔티</SelectItem>
            <SelectItem value="pants" className="text-xs">팬츠</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-[#718096] font-semibold">매장그룹</label>
        <Select defaultValue="all">
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">전체 매장</SelectItem>
            <SelectItem value="splus" className="text-xs">S+ 매장</SelectItem>
            <SelectItem value="dept" className="text-xs">백화점</SelectItem>
            <SelectItem value="direct" className="text-xs">직영점</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-[#718096] font-semibold">RT 모드</label>
        <div className="flex border border-[#E2E8F0] rounded overflow-hidden h-8">
          <button className="px-3 text-xs bg-[#1B3A5C] text-white font-medium">RT Off</button>
          <button className="px-3 text-xs bg-white text-[#718096] hover:bg-[#F5F7FA]">RT On</button>
        </div>
      </div>

      <Button className="h-8 px-5 text-xs bg-[#00A3E0] hover:bg-[#0093CC]">
        조회
      </Button>

      <Button className="h-8 px-4 text-xs bg-gradient-to-r from-[#7C3AED] to-[#9F7AEA] border-none hover:opacity-90">
        보충 계산 요청
      </Button>
    </div>
  );
}
