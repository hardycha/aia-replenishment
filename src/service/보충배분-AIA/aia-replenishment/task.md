# 보충배분-AIA 2차 실 설계 · 구현 Task

> 작성일: 2026-04-22 · 최종 갱신: 2026-04-22 (Colly API 명세 반영)
> 기반: `분석_검수용.md` (검수 완료본) + `docs/colly_api_spec.md` (Colly, 2026-04-22)
> 대상 레포: **`보충배분-AIA/aia-replenishment/`** (Next.js 16, React 19, Tailwind v4, shadcn/ui)
> 로컬 경로: `/Users/hamin/Documents/Claude/Projects/보충배분-AIA/보충배분-AIA/aia-replenishment/`
> 마일스톤: **2026-04-24(금) MVP 리뷰 배포**

## 0-1. Colly API 명세 반영 (2026-04-22)

Colly 가 공유한 실제 ILP 서버는 `http://10.81.1.91:8002` 이며 6개 엔드포인트를 노출한다.
**우리 호출 범위는 `POST /optimize` 단 하나로 고정**. 드롭박스·shop-grp·forecast 는
`src/data/*_archive.json` 아카이빙으로 대체. SERP 2개(`/warehouse-stock`, `/shop-stock`)
는 실 호출. ⇒ 실 API 합계 3개 (원칙 유지).

실제 `AllocationResult` 스키마 확인됨 — `shopAllocations[].allocations[].allocQty` 등.
`src/lib/types.ts` 에 정확히 반영 완료.
상세: `docs/colly_api_spec.md`.

---

## 0. 구현 전 반드시 숙지할 원칙

1. **1차 화면 초안의 UI 외형은 유지한다** — 색상(#1B3A5C/#00B4D8/#7C3AED), 여백, 엑셀 스타일 셀 편집, 피벗 테이블 구조를 그대로 살린다.
2. **호출하는 외부 API는 3개뿐** — SERP `/warehouse-stock`, SERP `/shop-stock`, ILP `POST /optimize`. 노션 스펙의 `/shop-grp`, `/forecast`는 별도 API가 아니라 Snowflake 아카이빙 JSON으로 공급한다.
3. **executionDate는 사용자에게 노출하지 않는다** — 버튼 클릭 시점의 오늘 날짜(`YYYY-MM-DD`)를 자동 주입한다.
4. **화면은 2단계** — "조회하기" → [화면 A: 매장 조정]. "배분 시뮬레이션" → [화면 B: 3컬럼 피벗 상세]. 되돌아가기는 "조회하기" 재클릭뿐이다.
5. **스타일·컬러는 복수 선택** — [화면 A]에 진입하기 전 스타일 네비게이터 모달에서 여러 스타일+컬러 조합을 고른다. 컬러는 `ALL`(전체 컬러) 또는 개별 컬러 중 선택. 선택된 조합들은 [화면 A]에서 **탭으로 전환 가능**하다.
6. **탭별 상태 독립** — 매장 추가·제거, 수량 조정은 현재 활성 탭의 스타일-컬러 조합에만 적용된다. 탭 전환 시 그 조합의 예측·재고·매장 리스트가 표시된다.
7. **모든 실 API는 환경변수 `NEXT_PUBLIC_USE_MOCK_API=true` 상태에서 mock 응답으로도 동작하게 둔다** — IT팀 API 배포 지연 대비.
8. **코드 커밋 단위는 Phase별** — 각 Phase가 동작한 상태에서 다음으로 넘어간다.
9. **버전 히스토리 3개 문서 갱신 의무** — `.claude/skills/version-archive.md`, `screen-structure.md`, `project-context.md`.

---

## 1. 전체 Phase 개요

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | 프로젝트 기반 세팅 (타입/폴더/의존성) | ✅ 완료 |
| 2 | 데이터 레이어 (아카이빙 JSON + API Routes 6개) | ✅ 완료 |
| 3 | 상태 머신 리팩터 (ReplenishmentTab 컨테이너화) | ✅ 완료 |
| 4 | [화면 A] 매장 조정 뷰 + 스타일 네비게이터 + 탭 + 차트 3종 | ✅ 완료 |
| 5 | [화면 B] 피벗 유지 + ILP 연동 + 배분 컬럼 반영 | ✅ 완료 |
| 6 | 엑셀 다운로드 (API Route + 템플릿 주입) | ✅ 완료 |
| 7 | 통합 테스트 + 에러 처리 | ✅ 완료 (버그 1건 수정) |
| 8 | MVP 배포 체크리스트 + 문서 갱신 | ✅ 완료 |
| 9 | Snowflake 실데이터 연동 (조회조건 바인딩) | ✅ 완료 (04/22) |
| 10 | 버그 수정 + 안정성 강화 (4건) | ✅ 완료 (04/27) |
| 11 | 데이터 플로우 재설계 + 예측치 실데이터 + Colly ILP 검증 | ✅ 완료 |
| **12** | **[화면 B] ILP 결과 반영 정합성 + 셀 편집 고도화 + SCS 현황 시각화** | **🟡 T12.1 잔여** |

예상 남은 소요: **8~12시간** (Phase 4가 완료되어 절반 이상 감소)

---

## 2. 현재 완료된 산출물 (Phase 4 완료)

`aia-replenishment/src/` 기준

```
src/
├── app/
│   ├── adjustment-preview/
│   │   └── page.tsx              ← [화면 A] 프리뷰 라우트 (mock 데이터)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  ← 기존 ReplenishmentTab (Phase 3 에서 교체 예정)
├── components/
│   └── replenishment/
│       ├── ShopAdjustmentView.tsx       ★ [화면 A] 본체 (필터바 + 헤더 + 탭 + 테이블)
│       ├── StyleNavigatorModal.tsx      ★ 스타일 네비게이터 (3단 레이아웃)
│       ├── AddShopModal.tsx             ★ 매장 추가 모달
│       ├── ReplenishmentTab.tsx         [화면 B] 기존 피벗 (Phase 3 에서 래핑)
│       └── charts/
│           ├── ShopForecastBar.tsx      ★ 매장별 예측 바차트
│           ├── AdjRankSummary.tsx       ★ 등급(adjRank)별 요약
│           └── StockGauge.tsx           ★ AP재고 vs 예측 게이지
├── data/
│   ├── mockAdjustmentData.ts            ★ 배분그룹/예측/재고/스타일 카탈로그 mock
│   └── mockData.ts                      (기존 더미 데이터)
└── lib/
    ├── types.ts                         ★ 공통 타입 (Filters, StyleColorSelection 등)
    └── utils.ts
```

★ 표시 = Phase 4에서 신규/수정

**동작 확인**: `npm run dev` → http://localhost:3000/adjustment-preview

---

## Phase 1. 프로젝트 기반 세팅 (남은 작업)

### T1.1 ✅ 폴더 구조 (완료)
`src/components/replenishment/`, `src/data/`, `src/lib/`, `charts/` 모두 존재.

### T1.2 🔴 의존성 추가
```bash
npm install exceljs date-fns
```
- `exceljs` → Phase 6 엑셀 서버 생성
- `date-fns` → executionDate 의 주 월요일(W1) 계산

### T1.3 ✅ 타입 정의 (완료)
`src/lib/types.ts` — BrandCd, ShopGrp, ForecastBundle, WarehouseStockItem, OptimizeRequest, AllocationResult, Filters, Phase, **StyleColorSelection**, **StyleCatalogItem**, **CategoryTree** 포함.

### T1.4 🔴 환경변수 스캐폴드
`.env.local.example` 신규 작성:
```
NEXT_PUBLIC_SERP_API_BASE=
ILP_API_BASE=
NEXT_PUBLIC_USE_MOCK_API=true
```

### T1.5 🔴 API Route 6개 빈 스텁
`src/app/api/` 하위:
- `shop-grp/route.ts`
- `forecast/route.ts`
- `warehouse-stock/route.ts`
- `shop-stock/route.ts`
- `optimize/route.ts`
- `export-xlsx/route.ts`

### T1.6 🔴 엑셀 템플릿 복사
`public/templates/엑셀배분_템플릿.xlsx` — 워크스페이스 루트의 템플릿 파일을 복사.

---

## Phase 2. 데이터 레이어 + 실 데이터 연결 지점

### T2.1 ✅ 아카이빙 JSON 목업 (완료)
현재 `src/data/mockAdjustmentData.ts` 안에 다음이 정의되어 있다:
- `MOCK_SHOP_GRPS: ShopGrp[]` (배분그룹 1개 · 매장 32개)
- `MOCK_STYLE_CATALOG: StyleCatalogItem[]` (30+ 스타일, 시즌·대분류·중분류·아이템·컬러 메타)
- `CATEGORY_TREE: CategoryTree` (대분류 > 중분류 > 아이템)
- `MOCK_SEASON_OPTIONS: string[]`
- `MOCK_BRAND_SHOP_POOL` (매장 추가 모달용)
- `MOCK_WAREHOUSE_STOCK`
- `mockShopStock()`, `mockForecast()` 함수 (결정적 해시 시드 기반)
- `buildMockAdjustmentData(shopGrpNo, prodCd, colorCd, ssnCd)` 조립 유틸

**실 데이터 이행 시**: 이 파일을 `src/data/shop_grp_archive.json` + `forecast_archive.json` + `style_catalog_archive.json` 3개로 분리해서 Snowflake 배치 아카이빙 결과를 주기적으로 덮어쓰는 구조로 전환.

### T2.2 🔴 `GET /api/shop-grp?shopGrpNo=...`
파일: `src/app/api/shop-grp/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { MOCK_SHOP_GRPS } from '@/data/mockAdjustmentData';
// 실 배포 시: import archive from '@/data/shop_grp_archive.json';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const shopGrpNo = searchParams.get('shopGrpNo');
  if (!shopGrpNo) {
    return NextResponse.json({ detail: 'shopGrpNo required' }, { status: 400 });
  }
  const found = MOCK_SHOP_GRPS.find((g) => g.shopGrpNo === shopGrpNo);
  if (!found) {
    return NextResponse.json(
      { detail: `배분그룹이 없거나 USE_YN='Y' 매장이 0건입니다 (${shopGrpNo})` },
      { status: 404 },
    );
  }
  return NextResponse.json(found);
}
```

### T2.3 🔴 `GET /api/forecast` (아카이빙 프록시)
필수 쿼리: `prodCd`, `colorCd`, `brandCd`, `ssnCd`, `executionDate`.
선택: `shopCds` (쉼표 구분).
- `executionDate` 의 주 월요일 = `forecastStartDate` (`date-fns: startOfWeek({ weekStartsOn: 1 })`).
- `colorCd='ALL'` 인 경우 해당 스타일의 모든 컬러 행을 합쳐서 반환 (또는 컬러별 분기 반환).

### T2.4 🔴 `GET /api/warehouse-stock` (SERP 프록시)
- `NEXT_PUBLIC_USE_MOCK_API=true` → mock 응답
- `false` → `${NEXT_PUBLIC_SERP_API_BASE}/warehouse-stock?...` 로 fetch 후 그대로 전달

### T2.5 🔴 `GET /api/shop-stock` (SERP 프록시)
동일 패턴, `shopCds` 파라미터 처리.

### T2.6 🔴 `POST /api/optimize` (ILP 프록시)
- body: `OptimizeRequest`
- `targetShops` 비어있으면 422
- mock 모드: warehouseStock 총량을 adjRank 역순 + 예측치 비율로 분배해서 `AllocationResult` 목업 반환
- 실 모드: `${ILP_API_BASE}/optimize` 프록시, 60초 타임아웃

### T2.7 🔴 `POST /api/export-xlsx` (엑셀 생성)
Phase 6 에서 본격 구현. 지금은 빈 xlsx 스트리밍 스텁.

### T2.8 🔴 API 클라이언트 유틸 `src/lib/api-client.ts`
```typescript
export async function fetchShopGrp(shopGrpNo: string): Promise<ShopGrp>;
export async function fetchForecast(params: {...}): Promise<ForecastBundle>;
export async function fetchWarehouseStock(params: {...}): Promise<WarehouseStockResponse>;
export async function fetchShopStock(params: {...}): Promise<ShopStockResponse>;
export async function postOptimize(req: OptimizeRequest): Promise<AllocationResult>;
// 에러는 ApiError(status, detail) 커스텀 예외로 throw
```

### ★ 실 데이터 붙이기 가이드

**Snowflake 아카이빙 데이터를 프론트에 공급하는 3단계**
1. **Snowflake 배치**: 매일/매주 한 번 `shop_grp`, `forecast`, `style_catalog` 3개 결과를 JSON Lines 혹은 JSON Array로 Export.
2. **파일 배치**: 결과 파일을 `aia-replenishment/src/data/` 아래 `shop_grp_archive.json`, `forecast_archive.json`, `style_catalog_archive.json` 세 경로로 덮어쓰기. 갱신 후 `git commit` → `git push` → Vercel 자동 배포.
3. **import 전환**: `mockAdjustmentData.ts` 의 상수들을 아카이빙 JSON import 로 교체. 함수(`mockShopStock`, `mockForecast`)는 실 SERP API 호출로 대체.

**SERP 실 API 연결**
- `.env.local` → `NEXT_PUBLIC_USE_MOCK_API=false` + `NEXT_PUBLIC_SERP_API_BASE=https://serp.fnf.co.kr` (IT팀 제공 URL)
- Route (`/api/warehouse-stock`, `/api/shop-stock`) 가 자동으로 실 API 로 포워딩

**ILP 실 API 연결**
- `.env.local` → `ILP_API_BASE=https://ilp.fnf.co.kr`
- `/api/optimize` 가 자동 포워딩

---

## Phase 3. 상태 머신 리팩터 (남은 작업)

### T3.1 🔴 `ReplenishmentTab` 컨테이너화
- 현재 `app/page.tsx` 는 기존 피벗 `ReplenishmentTab` 을 직접 렌더.
- 변경: `ReplenishmentTab` 을 **컨테이너** 로 리팩터해서
  - `phase: 'adjustment' | 'detail'` 상태 보유
  - `filters: Filters` 상태 (selections 배열 포함)
  - **탭 상태**: `shopsByKey: Record<string, ShopRow[]>`, `stockByKey: Record<string, StockData>`, `activeIdx: number`
  - `warehouseStock`, `shopGrp`, `isLoading`, `toast` 상태
  - 핸들러: `handleQuery`, `handleAddShop`, `handleRemoveShop`, `handleRestoreShop`, `handleSimulate`, `handleDownload`, `setActiveIdx`
  - 조건부 렌더: `phase==='adjustment' ? <ShopAdjustmentView/> : <PivotDetailView/>`
- 프리뷰 페이지(`/adjustment-preview`) 의 로직을 그대로 이식 + [화면 B] 경로 추가.

### T3.2 🔴 `FilterBar` 분리 (선택)
현재 `ShopAdjustmentView` 안에 필터바가 내장. 필요하면 `FilterBar.tsx` 로 분리해서 [화면 A]와 [화면 B] 모두에서 공유 가능.

### T3.3 🔴 Phase 전환 핸들러 정교화
- `handleQuery`: selections 배열 순회, 각 조합별로 병렬 API 호출 후 `shopsByKey` / `stockByKey` 에 적재. `phase='adjustment'`, `activeIdx=0`.
- `handleSimulate`: `targetShops[]` 조립, `/api/optimize` POST, 응답의 `items[]` 로 **현재 활성 탭의** `stockData` `alloc` 필드 덮어쓰기. `phase='detail'` 전환.
- `handleAddShop(shopCd)`: 현재 활성 탭(`activeSel`) 기준으로 `/api/shop-stock` + `/api/forecast` 호출. 해당 탭의 `shopsByKey` 에만 추가.
- `handleRemoveShop/RestoreShop`: 현재 활성 탭의 `removed` 플래그 토글. API 호출 없음.

---

## Phase 4. [화면 A] 매장 조정 뷰 (완료 ✅)

### T4.1 ✅ `ShopAdjustmentView` 구조
파일: `src/components/replenishment/ShopAdjustmentView.tsx`

레이아웃:
1. **페이지 타이틀** — 좌 타이틀, 우 executionDate + W1 뱃지
2. **필터바** — 브랜드 · AP · 상품시즌 · 배분그룹(드롭다운) · **스타일 [N개 선택됨] 버튼** · 조회/초기화
3. **배분그룹 요약 헤더** — 배분그룹명/번호, 대상매장수, 활성 스타일·컬러 + 배분 시뮬레이션 버튼
4. **스타일-컬러 탭 바** — 선택된 조합별 탭, 활성 탭은 상단 보라 보더 + 배경 흰색
5. **시각화 3종 그리드** — 매장별 예측 바차트(6cols) + 등급별 요약(3cols) + AP재고 게이지(3cols)
6. **매장 조정 테이블** — 우측 상단에 "제거된 매장도 표시" 체크박스 + **"+ 매장 추가" 버튼**
7. **모달 2종** — StyleNavigatorModal, AddShopModal

### T4.2 ✅ `ShopForecastBar` — recharts BarChart, 보라 #7C3AED, adjRank 순 정렬

### T4.3 ✅ `AdjRankSummary` — S/A/B 3버킷 자동 분할 (비율 30/50/20%), 각 버킷당 매장수·예측·현재고

### T4.4 ✅ `StockGauge` — AP재고 vs 예측수요, 잔량 양수/음수 색상 반전, 사이즈별 분해

### T4.5 ✅ `AddShopModal` — 매장코드/이름/지역 검색, 이미 포함된 매장 disabled, "매장 조정" 헤더 우측에 위치

### T4.6 ✅ `StyleNavigatorModal` — 3단 레이아웃
- **좌**: 필터 패널 (상품 시즌 체크 + 더보기, 대분류→중분류→아이템 연동 트리)
- **중**: 자동완성 검색(스타일코드/스타일명) + 체크박스 리스트(상품시즌·스타일코드·스타일명만 표시)
- **우**: 선택된 스타일 바스켓 — 각 항목에 컬러 Select(ALL + 개별 컬러)와 제거 X
- **하단**: 취소 / 선택(N) 버튼
- 엑셀 업로드 기능은 **현 버전에서 제거** (향후 요구 시 재추가)

### T4.7 ✅ 제거된 매장 관리 — `removed` 플래그 방식, 토글 "제거된 매장도 표시"로 노출·복원

### T4.8 ✅ 탭 기반 상태 분리
- key = `${prodCd}__${colorCd}` 로 `shopsByKey` / `stockByKey` 관리
- 매장 추가/제거/수량 조정은 **현재 활성 탭에만 적용**
- 탭 전환 시 해당 조합의 예측·재고·매장 리스트가 즉시 바뀜
- `ShopAdjustmentView` 에 `activeSelectionIdx` / `onActiveSelectionChange` props

### ★ Phase 4 완료 확인
```bash
cd aia-replenishment
npm run dev
# http://localhost:3000/adjustment-preview
```
1. 필터바의 "스타일 선택하세요 …" 버튼 클릭 → 스타일 네비게이터 모달
2. 시즌·대분류·검색으로 좁히기 → 체크박스 복수 선택
3. 우측 바스켓에서 각 스타일별 컬러 Select(ALL/개별)
4. "선택(N)" → 조회하기 → 탭 바가 생성
5. 탭 전환 → 각 조합별 시각화/테이블 갱신
6. "제거된 매장도 표시" 옆 "+ 매장 추가" → 모달 → 활성 탭에만 추가
7. 매장 "제거 ✕" → 취소선 + removed 플래그

---

## Phase 5. [화면 B] 피벗 상세 + ILP 연동 (남은 작업)

### T5.1 🔴 `PivotDetailView` 분리
- 기존 `ReplenishmentTab.tsx` 안의 피벗 테이블 렌더 코드(~780-975행)를 `PivotDetailView.tsx` 로 이식
- Props:
  ```typescript
  interface Props {
    shops: ShopRow[];               // !removed 만
    stockData: StockData;
    warehouseStock: WarehouseStockItem[];
    activeSelection: StyleColorSelection;
    viewMode: 'shop' | 'style';
    onViewModeChange: (v) => void;
    onStockDataChange: (next: StockData) => void;
    onDownload: () => Promise<void>;
    onRequery: () => void;
  }
  ```
- SCS 사이즈 목록은 `MOCK_SIZES` 대신 예측치 응답의 `sizCd` 집합에서 추출

### T5.2 🔴 ILP 결과 배분 셀 반영
```typescript
const next = { ...stockData };
for (const item of result.items) {
  const key = `${item.shopCd}_${activeSel.prodCd}_${activeSel.colorCd}_${item.sizCd}`;
  if (next[key]) next[key] = { ...next[key], alloc: item.allocQty };
}
setStockByKey((prev) => ({ ...prev, [activeKey]: next }));
setPhase('detail');
```

### T5.3 🔴 탭 유지
[화면 B] 에서도 상단에 탭 바를 노출해서 조합 간 전환이 가능하게 한다. 각 탭의 ILP 결과는 별도 캐싱(`stockByKey` 그대로).

### T5.4 🔴 "조회하기" 재클릭 플로우
[화면 B] 에서 조회하기를 다시 누르면 `phase='adjustment'` 로 복귀 + 전체 상태 초기화 + 새로 API 호출.

---

## Phase 6. 엑셀 다운로드 (남은 작업)

### T6.1 🔴 `xlsx-builder.ts` 서버 유틸
```typescript
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
): Promise<Buffer>;
```
- ExcelJS로 `public/templates/엑셀배분_템플릿.xlsx` 로드 → Sheet0 헤더 유지 → 4행부터 데이터 주입
- **Case 3 (물류배분)**: A=FROM-AP, D=TO-매장, E=시즌, F=스타일, G=컬러, H=사이즈, I=수량

### T6.2 🔴 `POST /api/export-xlsx` 본구현
- body: `{ rows: ExportRow[], meta }`
- 스트리밍 응답, 파일명 `보충배분_{shopGrpNo}_{executionDate}_{ts}.xlsx`

### T6.3 🔴 클라이언트 트리거
모든 활성 탭의 `stockData` 중 `alloc > 0` 을 순회해서 ExportRow 배열 조립 → `/api/export-xlsx` POST → blob → `<a download>` 클릭.

---

## Phase 7. 통합 테스트 + 에러 처리

### T7.1 🔴 해피패스 E2E
시나리오:
1. 필터 설정 + 스타일 네비게이터에서 2개 이상 스타일 선택(각각 다른 컬러)
2. 조회하기 → [화면 A] + 탭 2개 이상 생성
3. 탭 A에서 매장 1개 제거 → 시각화 즉시 갱신
4. 탭 B로 전환 → 시각화 내용 달라지는지 확인
5. "+ 매장 추가" → 모달 → 추가 → 활성 탭에만 반영
6. 배분 시뮬레이션 → [화면 B] 피벗 화면
7. 피벗에서 엑셀 스타일 셀 편집 (Ctrl+C/V/D/R)
8. 엑셀 다운로드 → xlsx 열어 내용 검증
9. 조회하기 재클릭 → [화면 A] 초기화

### T7.2 🔴 에러 시나리오
- 배분그룹 없는 번호 → 404 토스트
- SERP 500 → "재고 조회 실패" 토스트
- `targetShops` 0개 → 422 → "대상 매장이 없습니다"
- 스타일 선택 없이 조회 → "스타일을 먼저 선택해주세요"

### T7.3 🔴 빈 상태 / 엣지 케이스
- `selections.length === 0` → 조회 버튼 disabled + 스타일 네비게이터 안내
- `activeShops.length === 0` → 시뮬레이션 disabled
- `alloc > 0` 항목 0개 → 엑셀 다운로드 disabled

---

## Phase 8. MVP 배포 체크리스트

### T8.1 환경변수 설정 (Vercel Project Settings)
- [ ] `NEXT_PUBLIC_USE_MOCK_API=true` (IT팀 API 배포 전까지)
- [ ] IT팀 API URL 받으면 `NEXT_PUBLIC_SERP_API_BASE`, `ILP_API_BASE` 설정 + mock 스위치 false
- [ ] Preview / Production 분리

### T8.2 버전 히스토리 갱신
- [ ] `.claude/skills/version-archive.md` — v12 항목 추가 (2차 실 설계)
- [ ] `.claude/skills/screen-structure.md` — 2단계 화면 + 스타일 네비게이터 + 탭 반영
- [ ] `.claude/skills/project-context.md` — 아카이빙/API 구조 반영

### T8.3 배포
```bash
cd 보충배분-AIA/aia-replenishment
npm run build
git add -A
git commit -m "feat: v12 2차 실 설계 - 스타일 네비게이터 + 탭 + 실 API 연동"
git push
```

### T8.4 MVP 리뷰 준비 (04/24)
- [ ] 사업부 테스트 URL + 샘플 시나리오 스크린샷
- [ ] 피드백 수집 채널

---

## 9. 위험 요소 & 대응

| 위험 | 가능성 | 영향 | 대응 |
|---|---|---|---|
| **SERP API 미수령 (현재 상태)** | **확정** | 재고 실물 표시 | Mock 강제 (`NEXT_PUBLIC_USE_MOCK_API=true`). IT팀 URL 수령 시 env 전환만으로 실 모드. 상세: `docs/colly_api_spec.md` §7 |
| ILP `AllocationResult` 스키마 불일치 | 中 | Phase 5 | T1.3의 임시 타입으로 시작, 실 응답 받는 대로 조정 |
| 엑셀 템플릿 Case 3 매핑 오류 | 中 | Phase 6 | 실 엑셀 열어 눈으로 검증 |
| Snowflake 배치 미존재 | 中 | Phase 2 | mock JSON 유지, 실 배치는 별도 트랙 |
| 다수 스타일 탭에서 각각 매장을 다르게 조정 시 혼란 | 中 | Phase 4 | 탭 배지에 매장수·제거수 표시 (선택 개선) |

---

## Phase 12. [화면 B] ILP 결과 반영 정합성 + 셀 편집 고도화 + SCS 현황 시각화

### T12.1 🟡 ILP 결과 반영 정합성 수정
**문제**: ILP 결과로 피벗 전환 후 예측(forecast) 셀에 소수점 원본값이 남아있음
- ILP 응답의 `shopAllocations[].allocations[]`에서:
  - `predScsShopQty` → `Math.round()` → `stockData.forecast` 덮어쓰기 (완료)
  - 그러나 ILP 응답에 **없는 사이즈**(예: 115)의 forecast는 Snowflake 원본 소수점이 그대로 남음
- mock shop-stock 사이즈(90,95,100,105,110)와 실 예측 사이즈(95,100,105,110,115) 불일치
- **수정**: ILP 응답에 없는 사이즈의 forecast도 반올림 처리, 또는 ILP에 보내는 사이즈 목록을 예측 데이터 기준으로 통일

### T12.2 ✅ 배분 셀 편집 고도화 (엑셀 수준) — 2026-05-08 완료
**변경 사항**:
- **키보드 핸들링 스코프 변경**: `document.addEventListener('keydown')` → 테이블 컨테이너 `onKeyDown`으로 이동. 필터바/모달과 키 충돌 방지
- **테이블 포커스 관리**: `tabIndex={0}` 추가 + 셀 클릭 시 `focusTableContainer()` 자동 호출. 포커스 시 시안 링(`focus:ring-2 focus:ring-[#00B4D8]/30`) 표시
- **편집 input 중복 핸들러 제거**: input의 `onKeyDown` 제거 → 컨테이너 핸들러에서 `isEditing` 분기로 통합 처리 (Enter/Tab/Escape)
- **외부 클릭 개선**: `document.addEventListener('click')` → 테이블 컨테이너 `onBlur` 방식으로 변경. `relatedTarget`이 컨테이너 내부(편집 input 등)이면 선택 유지
- **선택 범위 외곽선(Range Border)**: `selectionBorders` / `copiedBorders` useMemo 계산 → 범위 외곽 셀에만 2px 시안 보더 표시 (엑셀 스타일). 복사 셀은 초록 점선 보더
- **파일**: `PivotDetailView.tsx` — `tableContainerRef` 추가, `handleTableKeyDown` / `handleTableBlur` / `focusTableContainer` 신규

### T12.3 ✅ SCS 배분 현황 시각화 개선 — 2026-05-08 완료
**변경 사항**:
- **신규 컴포넌트**: `charts/ScsAllocationChart.tsx` — recharts StackedBarChart + 매장별 히트맵
- **Stacked Bar Chart**: 사이즈별 배분(보라)/잔량(회색)/초과(빨강) 3단 스택. CartesianGrid + Tooltip + Legend
- **사이즈별 소진율 배지**: 80%+ 보라, 초과 빨강, 일반 회색 — 인라인 pill 형태
- **매장별 배분 히트맵**: 토글 펼치기/접기. 사이즈×매장 매트릭스, 배분량에 따른 보라 색상 강도(0.1~0.7 opacity). adjRank 표시. 행 합계 컬럼
- **합계 요약 유지**: AP가용재고 → 배분합계 = 잔량 + 소진율 (기존 레이아웃 그대로)
- **기존 프로그레스바 제거**: `PivotDetailView.tsx`에서 인라인 SCS 현황 섹션(~70행) → `<ScsAllocationChart />` 1줄로 교체

---

## Phase 11. 예측치 실데이터 연동 + Colly ILP 검증

### 배경
- [화면 A]의 매장별 예측합계(`forecastTotal`)가 현재 mock 데이터 (forecast_archive.json, Phase 2 mock)
- 실 예측치는 Snowflake `FNF.ML_DIST` 스키마에 있음
- Colly ILP(`POST /optimize`)는 사내망에서 로컬 테스트 가능 (`ILP_REAL_MODE=true`)

### 소스 테이블

| 테이블 | 단위 | 핵심 컬럼 | 의미 |
|--------|------|----------|------|
| `ML_DIST.PRED_SC_SHOP_WEEKLY` | SC × 매장 × 주 | `PRED_SC_SHOP_QTY` | 매장별 SC 주간 판매 예측 (소수점) |
| `ML_DIST.PRED_SC_TOTAL_WEEKLY` | SC × 주 | `PRED_SC_TOTAL_QTY` | SC 전체 합산 주간 판매 예측 |

- 데이터 규모: X 브랜드 latest 기준 약 322K행 (SC_SHOP), 주별 예측
- HORIZON=1 (1주 예측), METHOD_CD='lgbm', MODEL_VERSION='latest'
- **SC 단위** (Style-Color)이지 SCS(Size 포함)가 아님 — 사이즈 분해는 Colly ILP가 처리

### 예측치 활용 방안 (방안 1: PRED_SC_SHOP 직접 사용)

```
[화면 A] 매장별 예측합계
  = PRED_SC_SHOP_QTY (해당 SC + 매장 + 최신 FORECAST_START_DATE)
  = 소수점 → 반올림 정수 표시
  = "이 매장에서 이 SC가 다음 주에 몇 개 팔릴 예측"
```

향후 방안 2(SC_TOTAL 기반 비중 분배)로 변경 가능.

### T11.0 ✅ 데이터 플로우 재설계 (04/28 완료)

**변경 전:**
```
조회하기 → fetchWarehouseStock(SERP) + fetchShopStock(SERP) + fetchForecast(JSON)
시뮬레이션 → postOptimize(Colly)
```

**변경 후:**
```
조회하기 → fetchShopGrp(JSON) + fetchForecast(JSON)만
           → [화면 A] 예측치 기반 매장 조정 (재고 없이)
시뮬레이션 → fetchWarehouseStock(SERP) + fetchShopStock(SERP) → postOptimize(Colly)
           → [화면 B] 재고 + 배분 결과 피벗
```

이유: 화면 A는 "어떤 매장에 배분할지" 결정하는 단계이므로 예측치만 필요.
재고는 배분 직전에 실시간으로 가져와야 정확함.

### T11.1 🔴 sync_snowflake.py에 예측치 배치 추가
- `PRED_SC_SHOP_WEEKLY` 에서 `MODEL_VERSION='latest'` + 최신 `EXECUTION_DATE` 기준 조회
- 브랜드별 `forecast_{brandCd}.json` 파일 생성 (product_tree와 동일 분할 패턴)
- JSON 키 구조: `{prodCd}_{colorCd}` → `[{shopCd, forecastStartDate, predQty}]`
- 필터: `BRAND_CD IN ('M','X','V','ST','I')`, `MODEL_VERSION='latest'`

### T11.2 🔴 forecast API Route 교체
- `GET /api/forecast` — 기존 `forecast_archive.json` (mock) → 신규 `forecast_{brandCd}.json` (실데이터) 전환
- prodCd는 앞 4자리 제거된 스타일코드 기준으로 매칭 (product_tree와 동일)
- forecastStartDate는 executionDate의 주 월요일(W1) 기준 최근 데이터

### T11.3 🔴 ReplenishmentTab handleQuery 예측치 연동
- `fetchForecast` 응답으로 받은 `PRED_SC_SHOP_QTY`를 `shopRow.forecastTotal`에 반영
- 소수점 → `Math.round()` 정수 변환
- 차트 3종 (ShopForecastBar, AdjRankSummary, StockGauge)에 실 예측치 반영

### T11.4 🔴 Colly ILP 실 연결 로컬 테스트
- `.env.local`에 `ILP_REAL_MODE=true` + `ILP_API_BASE=http://10.81.1.91:8002`
- `/test-api` 페이지에서 mock 재고 + 실 예측치로 `POST /api/optimize` 호출
- `AllocationResult` 응답 스키마 검증 (mock과 실 응답 차이 확인)
- 필요 시 types.ts 타입 조정

### T11.5 🔴 테스트 및 배포
- 로컬(사내망): 예측치 실데이터 + Colly ILP 실 호출 E2E 테스트
- Vercel: 예측치 실데이터 + ILP mock 모드 동작 확인
- 커밋 + 배포

### 선행 조건
- [x] Snowflake 접속 가능 (SSO — sync_snowflake.py 수동 실행)
- [x] Colly 사내망 접근 가능 (로컬 개발 시)
- [x] `/test-api` 페이지 구축 완료
- [x] `ILP_REAL_MODE` 환경변수 분리 완료

---

## 12. 범위 밖 — 추후 작업

### 10.1 Snowflake 일배치 운영 전환 (04/25~ 진행)
현재 `scripts/sync_snowflake.py`로 1회 수동 실행하여 JSON 생성 완료.
운영 자동화를 위해 아래 작업 필요:

- [ ] **서비스 계정 요청** — IT팀에 Snowflake 서비스 계정(`SVC_AIA_BATCH`) 발급 요청. 읽기 전용, 비밀번호 인증 (SSO 아닌 `snowflake` authenticator)
- [ ] **GitHub Actions 워크플로우** — `.github/workflows/sync-snowflake.yml` 작성
  - cron: `0 21 * * *` (KST 06:00 = UTC 21:00)
  - 환경: GitHub Secrets에 `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USER`, `SNOWFLAKE_PASSWORD`, `SNOWFLAKE_WAREHOUSE` 등록
  - 단계: Python 설치 → `pip install snowflake-connector-python` → `python scripts/sync_snowflake.py` → `git add src/data/*.json` → `git commit -m "chore: daily snowflake sync"` → `git push` → Vercel 자동 배포
- [ ] **sync_snowflake.py 인증 분기** — SSO(`externalbrowser`) / 비밀번호(`snowflake`) 환경변수로 자동 분기
- [ ] **product_tree 시즌 범위 제한 검토** — 현재 전량(69K행, 브랜드별 ~5-8MB). 최근 4시즌으로 제한 시 ~2MB로 축소 가능. 운영 부하 모니터링 후 결정
- [ ] **데이터 갱신 SLA** — Snowflake 원본 갱신 주기 확인 (일간? 주간?), 배치 시점과 동기화
- [ ] **배치 실패 알림** — GitHub Actions 실패 시 Slack/Teams 알림 설정

### 10.2 기존 추후 작업
- [ ] `colorCd='ALL'` 처리 방안 확정 — 단일 forecast 호출 vs 컬러별 반복 호출
- [ ] 스타일 네비게이터 엑셀 업로드(스타일 코드 일괄 붙여넣기) 재도입
- [ ] 요일별 이번주/차주 예측 분기 (현재 W1 고정)
- [ ] 다운로드 감사 로그
- [ ] 매장 추가 시 브랜드 전체 매장 조회 API(`/api/brand-shops`) 정식화
- [ ] `v11_vercel` Python 백엔드의 장기 활용 방침
- [ ] AllocationResult 실제 스키마 확정 후 타입 정리
- [ ] 엑셀 템플릿 Case 1/2 (AP이관, RT) 지원 여부
- [ ] warehouseStock 탭별 분리 (현재 selections[0] 기준으로만 조회)
- [ ] activeSel 비null 가드 추가 (ReplenishmentTab.tsx:481)
- [ ] 프록시 route res.json() try-catch (optimize, warehouse-stock, shop-stock)
- [ ] xlsx-builder spliceRows O(n²) → 단일 호출 최적화
- [ ] FilterBar + TabBar 공용 컴포넌트 추출 (중복 ~420행 제거)
- [ ] ErrorBoundary 추가
- [ ] 레거시 파일 2,120행 일괄 제거 (forecast/, monitor/, mapping/, execution/, layout/)

---

## 11. 수용 기준 (MVP 전체 완료 정의)

10개 모두 YES 이면 MVP 완료:

- [ ] 스타일 네비게이터에서 **복수** 스타일+컬러 선택 가능
- [ ] 조회하기 → [화면 A] + 탭이 선택 개수만큼 생성
- [ ] 탭 전환 시 해당 조합의 시각화/매장 테이블 즉시 갱신
- [ ] 매장 추가/제거는 활성 탭에만 적용
- [ ] 배분 시뮬레이션 → [화면 B] 피벗, 활성 탭의 배분 컬럼에 ILP 결과 반영
- [ ] [화면 B] 엑셀 스타일 셀 편집 (Ctrl+C/V/D/R/Enter/Tab) 유지
- [ ] 엑셀 다운로드 Case 3 포맷 생성 확인
- [ ] 조회하기 재클릭 시 [화면 A] 로 초기화 복귀
- [ ] 404/422/500 에러 모두 토스트, 앱 크래시 없음
- [ ] `NEXT_PUBLIC_USE_MOCK_API=true` 에서 완전 mock 동작, Vercel production URL에서 동일 시나리오 통과

---

## 부록 A. 확정된 핵심 타입

```typescript
export interface StyleColorSelection {
  prodCd: string;
  prodNm: string;
  ssnCd: string;
  colorCd: string | 'ALL';
}

export interface Filters {
  brandCd: BrandCd;
  apCd: string;
  ssnCd: string;             // 기본 시즌 (스타일 네비게이터 기본 필터)
  shopGrpNo: string;
  selections: StyleColorSelection[];   // ★ 복수 스타일+컬러
  executionDate: string;     // 숨김, 자동
}

export interface StyleCatalogItem {
  prodCd: string;
  prodNm: string;
  brandCd: BrandCd;
  ssnCd: string;
  category1: string;  // 대분류
  category2: string;  // 중분류
  category3: string;  // 아이템
  colors: { colorCd: string; colorNm: string }[];
}

export type CategoryTree = Record<string, Record<string, string[]>>;
```

## 부록 B. 용어/코드 매핑

| 코드 | 뜻 |
|---|---|
| SC | Style-Color |
| SCS | Style-Color-Size |
| AP | Allocation Party (논리 창고) |
| RT | RoTation (재고 매장 간 이동) |
| ILP | Integer Linear Programming (보충 최적화) |
| W1 | executionDate의 주 월요일 (forecastStartDate 기준) |
| adjRank | 배분그룹 내 매장 우선순위 (오름차순) |
| shopCnt | P_score 정규화 분모 (배분그룹 원본 매장 수) |

**F&F 브랜드 코드**: M=MLB, X=Discovery, V=Duvetica, ST=Sergio Tacchini, I=MLB KIDS
