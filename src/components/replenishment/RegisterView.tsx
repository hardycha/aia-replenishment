'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  TableFooter,
} from '@/components/ui/table';

// 등록된 스타일 mock 데이터
const registeredStyles = [
  { season: '26S', item: 'JK', styleCode: 'DXDJ73041', styleName: '레저 바람막이 자켓', apStock: 580, apIn: 0, apTotal: 2340, distQty: 0, avgRate: '-', remain: '-', shipDate: '2026-03-29' },
  { season: '26S', item: 'TS', styleCode: 'DXTS72031', styleName: '에센셜 라운드 반팔티', apStock: 320, apIn: 0, apTotal: 1850, distQty: 0, avgRate: '-', remain: '-', shipDate: '2026-03-29' },
  { season: '26S', item: 'PT', styleCode: 'DXPN72011', styleName: '에센셜 조거 팬츠', apStock: 290, apIn: 0, apTotal: 1420, distQty: 0, avgRate: '-', remain: '-', shipDate: '2026-03-29' },
  { season: '26S', item: 'JK', styleCode: 'DXDJ73055', styleName: '레저 마운틴 자켓', apStock: 245, apIn: 0, apTotal: 980, distQty: 0, avgRate: '-', remain: '-', shipDate: '2026-03-29' },
  { season: '26S', item: 'CP', styleCode: 'DXCR72010', styleName: '에센셜 볼캡', apStock: 185, apIn: 0, apTotal: 640, distQty: 0, avgRate: '-', remain: '-', shipDate: '2026-03-29' },
];

interface RegisterViewProps {
  onBack: () => void;
  onRunILP: () => void;
}

export default function RegisterView({ onBack, onRunILP }: RegisterViewProps) {
  const totals = {
    apStock: registeredStyles.reduce((sum, s) => sum + s.apStock, 0),
    apIn: registeredStyles.reduce((sum, s) => sum + s.apIn, 0),
    apTotal: registeredStyles.reduce((sum, s) => sum + s.apTotal, 0),
    distQty: registeredStyles.reduce((sum, s) => sum + s.distQty, 0),
  };

  return (
    <div>
      {/* 상단 탭 + 필터 */}
      <div className="bg-white border-b border-[#E2E8F0] flex items-center">
        <div className="flex">
          <div className="px-5 py-2.5 text-[13px] font-semibold text-[#00B4D8] border-b-2 border-[#00B4D8] bg-white">
            보충배분
          </div>
        </div>
        <div className="ml-5 flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-[#718096] font-semibold">
              <span className="text-[#DC3545]">*</span>브랜드
            </label>
            <Select defaultValue="X">
              <SelectTrigger className="w-[130px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="X" className="text-xs">X: Discovery</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-[#718096] font-semibold">
              <span className="text-[#DC3545]">*</span>AP
            </label>
            <Select defaultValue="offline">
              <SelectTrigger className="w-[130px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="offline" className="text-xs">오프라인 정상</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex-1" />
        <div className="px-6 flex gap-2">
          <Button className="h-7 px-3 text-xs bg-[#00B4D8] hover:bg-[#0096B4]">
            조회하기
          </Button>
          <Button variant="outline" className="h-7 px-3 text-xs">
            ↻ 선택 초기화
          </Button>
        </div>
      </div>

      {/* 툴바 */}
      <div className="bg-white px-6 py-2 flex items-center gap-2 border-b border-[#E2E8F0]">
        <Button variant="outline" size="sm" className="text-[11px] h-7">
          ▼ 필터/컬럼
        </Button>
        <div className="border border-dashed border-[#E2E8F0] rounded px-3 py-1 text-[11px] text-[#A0AEC0] min-w-[160px]">
          파일을 등록하세요...
        </div>
        <Button variant="outline" size="sm" className="text-[11px] h-7">
          엑셀 업로드
        </Button>
        <Button size="sm" className="text-[11px] h-7 bg-[#00B4D8] hover:bg-[#0096B4]">
          행 추가
        </Button>
        <Button variant="outline" size="sm" className="text-[11px] h-7">
          🗑
        </Button>
        <span className="text-xs text-[#7C3AED] font-medium cursor-pointer ml-2">
          ✦ 재고 구간별 SCS 배분율
        </span>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="text-[11px] h-7 text-[#DC3545] border-[#DC3545]">
          등급별 MAX 수량 수정
        </Button>
        <Button variant="outline" size="sm" className="text-[11px] h-7 text-[#DC3545] border-[#DC3545]">
          SCS 배분율 수정
        </Button>
        <Button
          size="sm"
          className="text-[11px] h-7 bg-gradient-to-r from-[#7C3AED] to-[#9F7AEA] border-none"
          onClick={onRunILP}
        >
          ✦ 보충 실행
        </Button>
      </div>

      {/* 등록 테이블 */}
      <div className="bg-white overflow-x-auto min-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F7F8FA]">
              <TableHead className="w-10"><Checkbox /></TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">상품시즌</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">ITEM</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap min-w-[200px]">스타일코드</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">스타일명</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">배분 그룹</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">배분 전략</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-center">마지 적용 여부</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">AP 가용재고</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">AP입고</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">AP재고</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">배분예상수량</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">평균배분율</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap text-right">잔량</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#718096] whitespace-nowrap">출고예정일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registeredStyles.map((style) => (
              <TableRow key={style.styleCode} className="hover:bg-[#F7F9FC]">
                <TableCell><Checkbox defaultChecked /></TableCell>
                <TableCell className="text-xs">{style.season}</TableCell>
                <TableCell className="text-xs">{style.item}</TableCell>
                <TableCell className="text-xs font-semibold">{style.styleCode}</TableCell>
                <TableCell className="text-xs">{style.styleName}</TableCell>
                <TableCell>
                  <Select defaultValue="26S_APP">
                    <SelectTrigger className="h-6 text-[11px] min-w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="26S_APP" className="text-xs">26S APP</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select defaultValue="ILP">
                    <SelectTrigger className="h-6 text-[11px] min-w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ILP" className="text-xs">ILP 최적화 전략</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-center"><Checkbox /></TableCell>
                <TableCell className="text-xs text-right tabular-nums">{style.apStock}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{style.apIn}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{style.apTotal.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-right tabular-nums font-semibold">{style.distQty}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{style.avgRate}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{style.remain}</TableCell>
                <TableCell>
                  <Input type="date" defaultValue={style.shipDate} className="h-6 text-[11px] min-w-[110px]" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-[#F7F8FA]">
              <TableCell></TableCell>
              <TableCell className="text-xs font-semibold">합계</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell className="text-xs text-right tabular-nums font-semibold">{totals.apStock.toLocaleString()}</TableCell>
              <TableCell className="text-xs text-right tabular-nums font-semibold">{totals.apIn}</TableCell>
              <TableCell className="text-xs text-right tabular-nums font-semibold">{totals.apTotal.toLocaleString()}</TableCell>
              <TableCell className="text-xs text-right tabular-nums font-semibold">{totals.distQty}</TableCell>
              <TableCell>-</TableCell>
              <TableCell className="text-xs text-right tabular-nums font-semibold">0</TableCell>
              <TableCell>-</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* 하단 바 */}
      <div className="bg-white border-t border-[#E2E8F0] px-6 py-2 flex justify-between items-center">
        <span className="text-[11px] text-[#718096]">
          Rows: {registeredStyles.length} &nbsp;&nbsp; Selected Rows: {registeredStyles.length}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-[11px] h-7" onClick={onBack}>
            ← 목록으로
          </Button>
        </div>
      </div>
    </div>
  );
}
