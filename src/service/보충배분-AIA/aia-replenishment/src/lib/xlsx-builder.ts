// T6.1 — ExcelJS 로 엑셀배분_템플릿.xlsx 에 데이터 주입
import ExcelJS from 'exceljs';
import path from 'path';

export interface ExportRow {
  fromApCode: string;
  toShopCode: string;
  ssnCd: string;
  prodCd: string;
  colorCd: string;
  sizCd: string;
  qty: number;
}

export async function buildExcelBuffer(
  rows: ExportRow[],
  meta: { shopGrpNo: string; executionDate: string },
): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'public', 'templates', '엑셀배분_템플릿.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);

  const ws = wb.worksheets[0];

  // Case 3 매핑: 4행부터 데이터 주입
  // A=FROM AP CODE, B=FROM 매장(빈값), C=TO AP(빈값), D=TO 매장 CODE
  // E=상품시즌, F=스타일, G=컬러, H=사이즈, I=요청수량
  rows.forEach((row, idx) => {
    const r = ws.getRow(4 + idx);
    r.getCell(1).value = row.fromApCode;  // FROM AP CODE
    r.getCell(2).value = null;             // FROM 매장 (Case 3 = 빈값)
    r.getCell(3).value = null;             // TO AP (Case 3 = 빈값)
    r.getCell(4).value = row.toShopCode;   // TO 매장 CODE
    r.getCell(5).value = row.ssnCd;
    r.getCell(6).value = row.prodCd;
    r.getCell(7).value = row.colorCd;
    r.getCell(8).value = row.sizCd;
    r.getCell(9).value = row.qty;
    r.commit();
  });

  // 남은 빈 행 제거 (템플릿에 5004행까지 있으므로 데이터 이후 행 단일 호출로 제거)
  const firstEmpty = 4 + rows.length;
  if (firstEmpty <= ws.rowCount) {
    ws.spliceRows(firstEmpty, ws.rowCount - firstEmpty + 1);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
