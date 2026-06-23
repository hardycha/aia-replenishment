import { NextResponse } from 'next/server';
import { buildExcelBuffer, type ExportRow } from '@/lib/xlsx-builder';

interface ExportRequestBody {
  rows: ExportRow[];
  meta: { shopGrpNo: string; executionDate: string };
}

// POST /api/export-xlsx
// ExcelJS 로 템플릿에 데이터 주입 → xlsx 스트리밍 응답
export async function POST(req: Request) {
  const body = (await req.json()) as ExportRequestBody;

  if (!body.rows || body.rows.length === 0) {
    return NextResponse.json(
      { detail: '배분 데이터가 없습니다 (alloc > 0 항목 0건)' },
      { status: 422 },
    );
  }

  const buffer = await buildExcelBuffer(body.rows, body.meta);
  const ts = Date.now();
  const filename = `보충배분_${body.meta.shopGrpNo}_${body.meta.executionDate}_${ts}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
