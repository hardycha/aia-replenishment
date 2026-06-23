'use client';

interface AiInsightBoxProps {
  variant?: 'default' | 'realtime';
  title?: string;
  content?: string;
}

export default function AiInsightBox({ variant = 'realtime', title, content }: AiInsightBoxProps) {
  if (variant === 'realtime') {
    return (
      <div className="bg-gradient-to-r from-[#F5F3FF] to-[#EDE9FE] border border-[#DDD6FE] rounded-lg p-4 flex gap-3 items-start">
        <div className="w-7 h-7 bg-[#7C3AED] text-white rounded-lg flex items-center justify-center text-sm flex-shrink-0">
          ⚡
        </div>
        <div className="text-xs leading-relaxed text-[#4C1D95]">
          <strong className="text-[#7C3AED]">실시간 계산 모드</strong> — 보충값은 테이블에 저장되지 않고, 요청 시점의{' '}
          <strong>SERP 실시간 재고</strong>와 <strong>ML 예측 테이블</strong>을 조합하여 즉석 계산됩니다.
          매장 재고가 수시로 변동되므로, 보충 수량은 <strong>조회할 때마다 달라질 수 있습니다.</strong>
          <br />
          <span className="text-[11px] opacity-80">
            데이터 흐름: 유저 요청 → SERP 재고 조회 + 예측 테이블(SCS-shop) 조회 → ILP 보충 API → 화면 표시
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-[#F5F3FF] to-[#EDE9FE] border border-[#DDD6FE] rounded-lg p-4 flex gap-3 items-start">
      <div className="bg-[#7C3AED] text-white w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0">
        ✦
      </div>
      <div className="text-xs leading-relaxed text-[#4C1D95]">
        <strong className="text-[#7C3AED]">{title}</strong>
        <br />
        <span dangerouslySetInnerHTML={{ __html: content || '' }} />
      </div>
    </div>
  );
}
