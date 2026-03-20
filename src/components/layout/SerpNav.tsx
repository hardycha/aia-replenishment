'use client';

import { cn } from '@/lib/utils';

const navItems = [
  { label: '기준정보 관리', href: '#' },
  { label: '계획 관리', href: '#' },
  { label: '재고 운영 관리', href: '#' },
  { label: '배분RT 관리', href: '#', active: true },
  { label: '반품 관리', href: '#' },
  { label: '매장 운영 관리', href: '#' },
  { label: '판매 현황', href: '#' },
  { label: '영업/고객 관리', href: '#' },
  { label: '재고조사', href: '#' },
  { label: '관리자', href: '#' },
];

export default function SerpNav() {
  return (
    <nav className="bg-[#1B3A5C] text-white flex items-center h-[42px] px-4 gap-1 text-xs">
      <span className="font-bold text-sm mr-3 tracking-wider">F&F</span>

      {navItems.map((item) => (
        <a
          key={item.label}
          href={item.href}
          className={cn(
            'text-white/70 px-3.5 py-2 rounded-t transition-all whitespace-nowrap hover:text-white hover:bg-white/10',
            item.active && 'text-white bg-[#00A3E0] font-semibold'
          )}
        >
          {item.label}
        </a>
      ))}

      <span className="flex-1" />

      <span className="text-[11px] text-white/60 flex items-center gap-2">
        <span>F&F(FNF)</span>
        <span>🔍</span>
        <span>⏱ 01:59:52 연장</span>
      </span>
    </nav>
  );
}
