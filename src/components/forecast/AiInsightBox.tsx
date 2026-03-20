'use client';

interface AiInsightBoxProps {
  title: string;
  content: string;
}

export default function AiInsightBox({ title, content }: AiInsightBoxProps) {
  return (
    <div className="bg-gradient-to-r from-[#F5F3FF] to-[#EDE9FE] border border-[#DDD6FE] rounded-lg p-4 mb-4 flex gap-3 items-start">
      <div className="bg-[#7C3AED] text-white w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0">
        ✦
      </div>
      <div className="text-xs leading-relaxed text-[#4C1D95]">
        <strong className="text-[#7C3AED]">{title}</strong>
        <br />
        <span dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
}
