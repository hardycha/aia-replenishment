'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// 상세 결과 mock 데이터
const detailData = [
  { distId: 'MDIST2026032700...', season: '26S', item: 'JK', styleCode: 'DXDJ73041', styleName: '레저 바람막이 자켓', group: '26S APP', strategy: 'ILP 최적화 전략', maji: 'N', apStock: 580, apOrder: 0, apIn: 2340, apTotal: 45, estQty: 1498, finalQty: 1498, avgRate: '58%', status: 'confirmed', shipDate: '2026-03-29', distDate: '2026-03-27 14:42', modDate: '2026-03-27 15:49' },
  { distId: 'MDIST2026032700...', season: '26S', item: 'TS', styleCode: 'DXTS72031', styleName: '에센셜 라운드 반팔티', group: '26S APP', strategy: 'ILP 최적화 전략', maji: 'N', apStock: 320, apOrder: 0, apIn: 1850, apTotal: 17, estQty: 892, finalQty: 892, avgRate: '50%', status: 'confirmed', shipDate: '2026-03-29', distDate: '2026-03-27 14:42', modDate: '2026-03-27 15:49' },
  { distId: '-', season: '26S', item: 'PT', styleCode: 'DXPN72011', styleName: '에센셜 조거 팬츠', group: '26S APP', strategy: 'ILP 최적화 전략', maji: 'N', apStock: 290, apOrder: 0, apIn: 1420, apTotal: 40, estQty: 312, finalQty: 0, avgRate: '-', status: 'c', shipDate: '-', distDate: '-', modDate: '-' },
  { distId: '-', season: '26S', item: 'JK', styleCode: 'DXDJ73055', styleName: '레저 마운틴 자켓', group: '26S APP', strategy: 'ILP 최적화 전략', maji: 'N', apStock: 245, apOrder: 0, apIn: 980, apTotal: 0, estQty: 145, finalQty: 0, avgRate: '-', status: 'c', shipDate: '-', distDate: '-', modDate: '-' },
  { distId: '-', season: '26S', item: 'CP', styleCode: 'DXCR72010', styleName: '에센셜 볼캡', group: '26S APP', strategy: 'ILP 최적화 전략', maji: 'N', apStock: 185, apOrder: 0, apIn: 640, apTotal: 0, estQty: 0, finalQty: 0, avgRate: '-', status: 'c', shipDate: '-', distDate: '-', modDate: '-' },
];

const statusConfig = {
  confirmed: { label: '확정', className: 'bg-green-50 text-green-700 border-green-200' },
  c: { label: 'C', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

interface DetailViewProps {
  aiaNo: string;
  onBack: () => void;
}

export default function DetailView({ aiaNo, onBack }: DetailViewProps) {
  return (
    <div>
      {/* 상세 헤더 */}
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="grid grid-cols-10 border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="p-3 border-r border-[#E2E8F0]">
            <div className="text-[10px] text-[#A0AEC0] mb-1">AIA 번호</div>
            <div className="text-[11px] font-semibold font-mono">{aiaNo}</div>
          </div>
          <div className="p-3 border-r border-[#E2E8F0]">
            <div className="text-[10px] text-[#A0AEC0] mb-1">배분 구분</div>
            <div className="text-xs font-semibold">보충배분</div>
          </div>
          <div className="p-3 border-r border-[#E2E8F0]">
            <div className="text-[10px] text-[#A0AEC0] mb-1">AP</div>
            <div className="text-xs font-semibold">오프라인 정상</div>
          </div>
          <div className="p-3 border-r border-[#E2E8F0]">
            <div className="text-[10px] text-[#A0AEC0] mb-1">실행 상태</div>
            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
              완료
            </Badge>
          </div>
          <div className="p-3 border-r border-[#E2E8F0]">
            <div className="text-[10px] text-[#A0AEC0] mb-1">등록자</div>
            <div className="text-xs font-semibold">정윤성(YOONSEONG)</div>
          </div>
          <div className="p-3 border-r border-[#E2E8F0]">
            <div className="text-[10px] text-[#A0AEC0] mb-1">등록일</div>
            <div className="text-xs font-semibold">2026-03-27</div>
          </div>
          <div className="p-3 border-r border-[#E2E8F0]">
            <div className="text-[10px] text-[#A0AEC0] mb-1">실행일</div>
            <div className="text-xs font-semibold">2026-03-27</div>
          </div>
          <div className="p-3 border-r border-[#E2E8F0]">
            <div className="text-[10px] text-[#A0AEC0] mb-1">출고예정일</div>
            <div className="text-xs font-semibold">2026-03-29 ~ 2026-04-02</div>
          </div>
          <div className="p-3 border-r border-[#E2E8F0]">
            <div className="text-[10px] text-[#A0AEC0] mb-1">스타일 수</div>
            <div className="text-base font-bold">5</div>
          </div>
          <div className="p-3">
            <div className="text-[10px] text-[#A0AEC0] mb-1">총 보충 수량</div>
            <div className="text-base font-bold text-[#00B4D8]">2,847</div>
          </div>
        </div>
      </div>

      {/* 결과 테이블 */}
      <div className="bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F7F8FA]">
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">배분ID</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">상품시즌</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">ITEM</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">스타일코드</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">스타일명</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">배분그룹</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">배분전략</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-center">마지적용여부</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">AP 가용재고</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">AP발주</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">AP입고</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">AP재고</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">배분예상수량</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">최종배분수량</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">평균배분율</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">배분RT상태</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">출고예정일</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">수정하기</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">SCS 배분율</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">배분일시</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">수정일시</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detailData.map((item) => {
              const status = statusConfig[item.status as keyof typeof statusConfig];
              return (
                <TableRow key={item.styleCode} className="hover:bg-[#F7F9FC]">
                  <TableCell className="text-[10px] font-mono">{item.distId}</TableCell>
                  <TableCell className="text-xs">{item.season}</TableCell>
                  <TableCell className="text-xs">{item.item}</TableCell>
                  <TableCell className="text-xs font-semibold">{item.styleCode}</TableCell>
                  <TableCell className="text-xs">{item.styleName}</TableCell>
                  <TableCell className="text-xs">{item.group}</TableCell>
                  <TableCell className="text-xs">
                    {item.strategy}
                    <span className="ml-1 bg-[#F3EFFE] text-[#7C3AED] text-[9px] px-1.5 py-0.5 rounded font-semibold">AI</span>
                  </TableCell>
                  <TableCell className="text-xs text-center">{item.maji}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{item.apStock}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{item.apOrder}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{item.apIn.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{item.apTotal}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{item.estQty.toLocaleString()}</TableCell>
                  <TableCell className={`text-xs text-right tabular-nums font-bold ${item.finalQty > 0 ? 'text-[#00B4D8]' : ''}`}>
                    {item.finalQty.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{item.avgRate}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${status.className}`}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{item.shipDate}</TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" className="text-[10px] h-5 px-2 text-[#00B4D8] border-[#00B4D8]">
                      배분율 확인
                    </Button>
                  </TableCell>
                  <TableCell className="text-[11px]">{item.distDate}</TableCell>
                  <TableCell className="text-[11px]">{item.modDate}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* 하단 바 */}
      <div className="bg-white border-t border-[#E2E8F0] px-6 py-2 flex justify-between items-center">
        <span className="text-[11px] text-[#718096]">Rows: {detailData.length}</span>
        <Button variant="outline" size="sm" className="text-[11px] h-7" onClick={onBack}>
          ← 목록으로
        </Button>
      </div>
    </div>
  );
}
