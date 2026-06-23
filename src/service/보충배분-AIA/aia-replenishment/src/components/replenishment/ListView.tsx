'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// 목록 mock 데이터
const listData = [
  { aiaNo: 'MREPLDIST20260327000000012', type: '보충배분', ap: '오프라인 정상', status: 'done', registrar: '정윤성(YOONSEONG)', regDate: '2026-03-27', execDate: '2026-03-27', shipDate: '2026-03-29 ~ 2026-04-02', styleCount: 8, totalQty: 2847 },
  { aiaNo: 'MREPLDIST20260325000000011', type: '보충배분', ap: '오프라인 정상', status: 'done', registrar: '정윤성(YOONSEONG)', regDate: '2026-03-25', execDate: '2026-03-25', shipDate: '2026-03-27 ~ 2026-03-31', styleCount: 5, totalQty: 1562 },
  { aiaNo: 'MREPLDIST20260324000000010', type: '보충배분', ap: '오프라인 정상', status: 'error', registrar: '우문홍(CHONG323)', regDate: '2026-03-24', execDate: '2026-03-24', shipDate: '-', styleCount: 3, totalQty: 0 },
  { aiaNo: 'MREPLDIST20260320000000009', type: '보충배분', ap: '오프라인 정상', status: 'done', registrar: '조아영(JOY0929)', regDate: '2026-03-20', execDate: '2026-03-20', shipDate: '2026-03-22 ~ 2026-03-26', styleCount: 12, totalQty: 4215 },
];

const statusConfig = {
  done: { label: '완료', className: 'bg-green-50 text-green-700 border-green-200' },
  error: { label: '오류 포함', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  wait: { label: '대기', className: 'bg-sky-50 text-sky-700 border-sky-200' },
};

interface ListViewProps {
  onNewRegister: () => void;
  onViewDetail: (aiaNo: string) => void;
}

export default function ListView({ onNewRegister, onViewDetail }: ListViewProps) {
  return (
    <div>
      {/* 필터 영역 */}
      <div className="bg-white px-6 py-3 flex flex-wrap gap-3 items-end border-b border-[#E2E8F0]">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#718096] font-semibold">
            <span className="text-[#DC3545]">*</span>브랜드
          </label>
          <Select defaultValue="X">
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="X" className="text-xs">X: Discovery</SelectItem>
              <SelectItem value="M" className="text-xs">M: MLB</SelectItem>
              <SelectItem value="I" className="text-xs">I: MLB KIDS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#718096] font-semibold">
            <span className="text-[#DC3545]">*</span>AP
          </label>
          <Select defaultValue="offline">
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="offline" className="text-xs">오프라인 정상</SelectItem>
              <SelectItem value="online" className="text-xs">온라인</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#718096] font-semibold">
            <span className="text-[#DC3545]">*</span>보충AIA 등록일
          </label>
          <div className="flex gap-1 items-center">
            <Input type="date" defaultValue="2026-03-20" className="w-[130px] h-8 text-xs" />
            <span className="text-[#718096]">~</span>
            <Input type="date" defaultValue="2026-03-27" className="w-[130px] h-8 text-xs" />
          </div>
        </div>

        <div className="flex-1" />

        <Button className="h-8 px-4 text-xs bg-[#00B4D8] hover:bg-[#0096B4]">
          조회하기
        </Button>
        <Button variant="outline" className="h-8 px-4 text-xs">
          ↻ 선택 초기화
        </Button>
      </div>

      {/* 신규 등록 버튼 */}
      <div className="bg-white px-6 py-2 border-b border-[#E2E8F0] text-right">
        <Button
          className="h-8 px-4 text-xs bg-[#00B4D8] hover:bg-[#0096B4]"
          onClick={onNewRegister}
        >
          신규 등록
        </Button>
      </div>

      {/* 목록 테이블 */}
      <div className="bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F7F8FA]">
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">AIA 번호</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">배분 구분</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">AP</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">실행 상태</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">등록자</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">등록일</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">실행일</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">출고예정일</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">스타일 수</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">총 보충 수량</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">상세보기</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listData.map((item) => {
              const status = statusConfig[item.status as keyof typeof statusConfig];
              return (
                <TableRow key={item.aiaNo} className="hover:bg-[#F7F9FC]">
                  <TableCell className="text-[11px] font-mono">{item.aiaNo}</TableCell>
                  <TableCell className="text-xs">{item.type}</TableCell>
                  <TableCell className="text-xs">{item.ap}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${status.className}`}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{item.registrar}</TableCell>
                  <TableCell className="text-xs">{item.regDate}</TableCell>
                  <TableCell className="text-xs">{item.execDate}</TableCell>
                  <TableCell className="text-xs">{item.shipDate}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{item.styleCount}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-semibold">{item.totalQty.toLocaleString()}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-6 px-2 text-[#00B4D8] border-[#00B4D8]"
                      onClick={() => onViewDetail(item.aiaNo)}
                    >
                      상세보기
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* 하단 바 */}
      <div className="bg-white border-t border-[#E2E8F0] px-6 py-2 text-[11px] text-[#718096]">
        Rows: {listData.length}
      </div>
    </div>
  );
}
