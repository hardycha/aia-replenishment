'use client';

import { cn } from '@/lib/utils';

const pipelineSteps = [
  { id: 1, label: 'SERP 재고 조회', status: 'done', isAi: false },
  { id: 2, label: 'ML 예측 조회 (SCS-shop)', status: 'done', isAi: true },
  { id: 3, label: 'ILP 보충 최적화 (RT Off)', status: 'active', isAi: true },
  { id: 4, label: 'MD 검토/수정', status: 'pending', isAi: false },
  { id: 5, label: '보충 확정', status: 'pending', isAi: false },
];

const circleNumbers = ['①', '②', '③', '④', '⑤'];

export default function Pipeline() {
  return (
    <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] flex gap-1">
      {pipelineSteps.map((step, index) => {
        const isLast = index === pipelineSteps.length - 1;

        return (
          <div key={step.id} className="flex-1 relative">
            <div
              className={cn(
                'text-center py-2 px-1 rounded text-[11px]',
                step.status === 'done' && !step.isAi && 'bg-green-50 text-green-700',
                step.status === 'done' && step.isAi && 'bg-[#EDE9FE] text-[#7C3AED]',
                step.status === 'active' && !step.isAi && 'bg-[#00A3E0] text-white font-semibold',
                step.status === 'active' && step.isAi && 'bg-[#7C3AED] text-white font-semibold',
                step.status === 'pending' && 'bg-[#F5F7FA] text-[#718096]'
              )}
            >
              {circleNumbers[index]} {step.label}
            </div>
            {!isLast && (
              <span className="absolute right-[-10px] top-1/2 transform -translate-y-1/2 text-[#CBD5E0] text-xs z-10">
                →
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
