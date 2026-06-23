# 보충배분-AIA v12 2차 실 설계 — 전체 구현 심층 분석

> 작성일: 2026-04-22 · 분석 대상: Phase 1~8 전체 · 상태: SERP API 미연동 (mock 모드)
> 분석 방법: Planner → Architect → Critic 3단계 컨센서스 리뷰

---

## 0. 요약 (Executive Summary)

### 전체 판정: ACCEPT-WITH-RESERVATIONS

v12 구현은 아키텍처적으로 건실하며, mock/실 전환 구조가 우수합니다.
단일 탭 사용 시 정상 동작하나, **복수 탭(multi-SC) 시나리오에서 3건의 데이터 정확성 버그**가 발견되었습니다.

| 등급 | 건수 | 핵심 |
|------|------|------|
| 🔴 CRITICAL | 0 | — |
| 🟠 MAJOR | 4 | warehouseStock 탭별 미분리, activeSel 크래시, 순차 재고 소진, spliceRows O(n²) |
| 🟡 MEDIUM | 6 | 아카이빙 JSON 3종 미소비, 필터바 중복, body 검증 누락 등 |
| 🔵 LOW | 7 | 레거시 코드, 배지 텍스트, React.memo 미적용 등 |

---

## 1. 프로젝트 현황

### 1.1 코드 규모

| 범주 | 파일수 | 행수 | 비율
|------|--------|------|------|
| replenishment 핵심 (화면 A/B) | 8 | 3,056 | 39% |
| API Routes | 6 | 350 | 5% |
| lib (types/api-client/xlsx/utils) | 4 | 394 | 5% |
| data (mock + archives) | 2 (.ts) + 5 (.json) | 658 + 1.3MB | 8% |
| ui (shadcn) | 8 | 663 | 9% |
| **레거시 (미사용)** | **26** | **2,120** | **27%** |
| 기타 | 6 | 520 | 7% |
| **합계** | ~65 | ~7,761 | 100% |

### 1.2 Phase 완료 상태

| Phase | 내용 | 상태 | 비고 |
|---|---|---|---|
| 1 | 프로젝트 기반 세팅 | ✅ 완료 | exceljs, date-fns, API 스텁, 템플릿, .env |
| 2 | 데이터 레이어 + API Routes | ✅ 완료 | 아카이빙 JSON 5종, Route 6개, api-client |
| 3 | 상태 머신 리팩터 | ✅ 완료 | ReplenishmentTab 컨테이너화 |
| 4 | [화면 A] 매장 조정 | ✅ 완료 | 스타일 네비게이터 + 탭 + 차트 3종 |
| 5 | [화면 B] 피벗 상세 | ✅ 완료 | PivotDetailView + ILP 결과 매핑 + 셀 편집 |
| 6 | 엑셀 다운로드 | ✅ 완료 | ExcelJS Case 3 물류배분 |
| 7 | 테스트 + 버그 수정 | ✅ 완료 | 11개 API 테스트, mock 기본값 버그 수정 |
| 8 | 문서 갱신 + 배포 | ✅ 완료 | version-archive, screen-structure, project-context |

### 1.3 외부 API 연동 현황

| API | 상태 | mock 동작 | 실 전환 시 필요 작업 |
|-----|------|----------|-------------------|
| SERP `/warehouse-stock` | 🔴 미연동 | ✅ 고정 응답 | `.env.local` 2줄 변경 |
| SERP `/shop-stock` | 🔴 미연동 | ✅ hashSeed 결정적 생성 | 동일 |
| Colly `POST /optimize` | 🔴 미연동 | ✅ adjRank 역순 분배 | 동일 |
| Colly 드롭박스 5종 | ✅ 아카이빙 JSON | — | Snowflake 배치 운영 |

---

## 2. 🟠 MAJOR 이슈 (4건)

### M1. warehouseStock이 selections[0]에 대해서만 조회됨

**파일:** `ReplenishmentTab.tsx:87-91`

```typescript
fetchWarehouseStock({
  brandCd: filters.brandCd,
  prodCd: filters.selections[0].prodCd,        // ← 첫 번째 탭만
  colorCd: effectiveColor(filters.selections[0].colorCd),  // ← 첫 번째 탭만
  apCd: filters.apCd,
})
```

**문제:** 탭 2, 3, ... 의 AP 재고가 탭 1의 스타일-컬러로 조회된 값. SCS 요약 패널에서 잘못된 AP 잔량이 표시됨.

**영향:** 복수 탭 사용 시 MD가 부정확한 데이터로 배분 결정을 내릴 수 있음.

**수정 방향:** `warehouseStock`을 `Record<string, WarehouseStockItem[]>` (탭별)로 변경하거나, 탭 전환 시 재조회.

**우선순위:** 🟠 MVP 전 수정 필요

---

### M2. handleSimulate가 공유 warehouseStock을 덮어씀 (순차 소진)

**파일:** `ReplenishmentTab.tsx:354`

```typescript
setWarehouseStock(result.warehouseRemaining);  // ← 탭 1 시뮬 후 잔량으로 덮어씀
```

**문제:** 탭 1 시뮬레이션 → warehouseStock이 탭 1 잔량으로 업데이트 → 탭 2 시뮬레이션 시 ILP에 탭 1 잔량이 전달됨. 즉 **탭 순서에 따라 배분 결과가 달라짐**.

**영향:** 이것이 의도된 순차 소진인지, 각 탭 독립 배분인지 **도메인 결정 필요**.
- 순차 소진이 맞다면: UX에서 "탭 1부터 순서대로 시뮬레이션하세요" 안내 필요
- 독립 배분이 맞다면: 원본 warehouseStock을 보존하고 결과를 탭별로 저장

**우선순위:** 🟠 도메인 확인 + MVP 전 수정

---

### M3. activeSel! 비null 단언 — 크래시 가능

**파일:** `ReplenishmentTab.tsx:481`

```typescript
activeSelection={activeSel!}  // ← undefined일 수 있음
```

**문제:** `activeSel`은 `filters.selections[activeIdx]`에서 파생. selections이 변경되어 activeIdx가 범위를 초과하면 `undefined`가 PivotDetailView에 전달되고, `activeSelection.prodCd` 접근 시 런타임 크래시 → 화면 백화.

**수정:** 간단한 가드 추가:
```typescript
if (!activeSel) { setPhase('adjustment'); return null; }
```

**우선순위:** 🟠 즉시 수정 (5분)

---

### M4. xlsx-builder spliceRows O(n²) 성능

**파일:** `xlsx-builder.ts:43-45`

```typescript
for (let i = ws.rowCount; i >= 4 + rows.length; i--) {
  ws.spliceRows(i, 1);  // ← 5000번 호출, 각 O(n)
}
```

**문제:** 템플릿 5004행에서 데이터 10행이면 약 4990회 spliceRows 호출 → ~12.5M 연산.

**수정:** 단일 호출로 대체:
```typescript
const firstEmpty = 4 + rows.length;
if (firstEmpty <= ws.rowCount) {
  ws.spliceRows(firstEmpty, ws.rowCount - firstEmpty + 1);
}
```

**우선순위:** 🟠 프로덕션 전 수정

---

## 3. 🟡 MEDIUM 이슈 (6건)

### MD1. 아카이빙 JSON 3종 미소비

| 파일 | 크기 | 의도된 용도 | 현재 상태 |
|------|------|------------|----------|
| `ssn_archive.json` | 360B | 시즌 드롭다운 | ❌ 하드코딩 (26S/25F/25S) |
| `sc_archive.json` | 21KB | 스타일 카탈로그 | ❌ `MOCK_STYLE_CATALOG` 사용 |
| `shop_grp_dropdown_archive.json` | 121B | 배분그룹 드롭다운 | ❌ `shop_grp_archive.json`에서 파생 |

**영향:** 실 데이터 전환 시 가장 큰 차단 요소. 특히 `sc_archive.json` → `StyleCatalogItem[]` 변환 로직이 없으면 StyleNavigatorModal이 실 데이터를 소비할 수 없음.

**전환 순서 권장:**
1. `sc_archive.json` → StyleNavigatorModal (가장 복잡, 카테고리 매핑 필요)
2. `ssn_archive.json` → 필터바 시즌 드롭다운 (간단)
3. `shop_grp_dropdown_archive.json` → 불필요 가능 (shop_grp_archive에서 이미 파생)

---

### MD2. 필터바·탭바·FilterField 코드 중복 (~420행)

| 중복 코드 | 위치 1 | 위치 2 | 행수 |
|-----------|--------|--------|------|
| 필터바 | ShopAdjustmentView:123-224 | PivotDetailView:481-538 | ~160 |
| 탭 바 | ShopAdjustmentView:282-344 | PivotDetailView:542-565 | ~85 |
| FilterField | ShopAdjustmentView:495-512 | PivotDetailView:737-746 | ~35 |
| StyleNavigatorModal 인스턴스 | ShopAdjustmentView:481 | PivotDetailView:721 | 2곳 |

**권장:** FilterBar.tsx + TabBar.tsx 컴포넌트 추출 (task.md T3.2에 이미 언급)

---

### MD3. /api/optimize body 필드 검증 없음

**파일:** `optimize/route.ts:13`

`body`를 `as OptimizeRequest`로 캐스팅만 함. `brandCd`, `prodCd` 누락이나 `warehouseStock`이 배열이 아닌 경우에도 ILP 서버까지 전달됨.

---

### MD4. 프록시 Route에서 res.json() try-catch 없음

**파일:** `optimize/route.ts:45`, `warehouse-stock/route.ts:37`, `shop-stock/route.ts:51`

실 모드에서 외부 서버가 비-JSON 응답(HTML 에러 페이지, 502 등) 반환 시 unhandled exception → 500.

---

### MD5. ErrorBoundary 부재

프로젝트 전체에 React ErrorBoundary가 없음. M3의 activeSel 크래시 등이 발생하면 전체 페이지 백화.

---

### MD6. 글로벌 키보드 리스너가 모달/필터바 입력을 가로챔

**파일:** `PivotDetailView.tsx:382`

피벗의 `document.addEventListener('keydown', ...)` 가 Ctrl+C/V/A를 전역에서 캡처. StyleNavigatorModal이 열려있거나 필터바 Select에서 타이핑 중일 때도 피벗 핸들러가 먼저 동작할 수 있음.

---

## 4. 🔵 LOW 이슈 (7건)

| # | 이슈 | 파일 | 비고 |
|---|------|------|------|
| L1 | 버전 배지 "v11" → "v12" | ShopAdjustmentView:113, PivotDetailView:471 | cosmetic |
| L2 | 레거시 파일 2,120행 | forecast/, monitor/, mapping/, execution/, layout/ | import 0회 |
| L3 | adjustment-preview/page.tsx 제거 대상 | 237행 | 본 라우트에서 동일 기능 |
| L4 | renderAllocCell 미메모이제이션 | PivotDetailView:418 | 160셀 매 렌더 함수 재생성 |
| L5 | 차트 컴포넌트 React.memo 미적용 | charts/*.tsx | shops 미변경 시에도 리렌더 |
| L6 | NEXT_PUBLIC_USE_MOCK_API 클라이언트 노출 | 서버 전용이면 접두사 불필요 | 보안 위험은 아님 |
| L7 | forecast_archive.json 1.2MB 서버 메모리 | forecast/route.ts:3 | 대용량화 시 분할 필요 |

---

## 5. SERP API 연동 시 예상 리스크

### 5.1 코드 변경 범위

| 작업 | 파일 | 변경량 |
|------|------|--------|
| `.env.local` 수정 | `.env.local` | 2줄 |
| 코드 변경 | **0행** (mock 스위치로 자동 전환) | — |

**설계 우수:** mock → 실 전환 시 코드 변경 제로.

### 5.2 스키마 불일치 시나리오

| 시나리오 | 가능성 | 영향 | 방어 |
|---------|--------|------|------|
| 필드명 snake_case (shop_cd) | 高 | 전체 데이터 매핑 실패 | 프록시 route에 정규화 레이어 |
| 사이즈 zero-padded ("095") | 中 | StockData 키 불일치 | 사이즈 정규화 |
| shopNm 누락 | 低 | 매장명 빈값 | shop_grp_archive에서 fallback |
| 페이지네이션/URL 길이 제한 | 低 | 대규모 매장 목록 절단 | 배치 요청 |

**권장:** 각 프록시 route에 `normalize*` 함수 추가 (SERP 응답 → 내부 타입 변환)

---

## 6. 타입 시스템 분석

### 6.1 정의 vs 사용 매칭

| 타입 | 정의 | 사용 | 상태 |
|------|------|------|------|
| OptimizeRequest | ✅ | optimize route + api-client | ✅ |
| AllocationResult | ✅ | optimize route + ReplenishmentTab | ✅ |
| ShopGrp | ✅ | shop-grp route + ReplenishmentTab | ✅ |
| ForecastBundle | ✅ | forecast route + api-client | ✅ |
| WarehouseStockResponse | ✅ | warehouse-stock route + api-client | ✅ |
| ShopStockResponse | ✅ | shop-stock route + api-client | ✅ |
| StyleCatalogItem | ✅ | mockAdjustmentData + StyleNavigatorModal | ✅ |
| **ScArchiveItem** | ✅ | **미사용** | ⚠️ sc_archive 전환 시 필요 |
| **SsnArchiveItem** | ✅ | **미사용** | ⚠️ ssn_archive 전환 시 필요 |
| **ShopGrpDropdownItem** | ✅ | **미사용** | ⚠️ 불필요 가능 |
| Filters | ✅ | ReplenishmentTab + 화면 A/B | ✅ |
| StockData | ✅ | ReplenishmentTab + PivotDetailView | ✅ |
| Phase | ✅ | ReplenishmentTab | ✅ |

### 6.2 타입 안전성

- `as any` 사용: **0건** ✅
- 비null 단언(`!`): **1건** (ReplenishmentTab:481) — M3에서 지적
- 타입 캐스팅(`as`): 3건 (모두 JSON import + 쿼리파라미터 변환, 허용 범위)

---

## 7. 환경변수 정합성

| 변수 | .env.local.example | 코드 참조 | 일치 |
|------|-------------------|----------|------|
| NEXT_PUBLIC_USE_MOCK_API | ✅ line 8 | optimize:17, warehouse-stock:17, shop-stock:22 | ✅ |
| ILP_API_BASE | ✅ line 18 | optimize:29 | ✅ |
| NEXT_PUBLIC_SERP_API_BASE | ✅ line 22 | warehouse-stock:24, shop-stock:40 | ✅ |
| ILP_TIMEOUT_MS | ✅ line 25 | optimize:37 | ✅ |
| SERP_TIMEOUT_MS | ✅ line 26 | warehouse-stock:34, shop-stock:49 | ✅ |

**전체 일치.** 누락/미참조 변수 없음.

---

## 8. 아카이빙 JSON — Colly 스펙 대조

| 파일 | Colly 스펙 (docs/colly_api_spec.md §3) | 실제 구조 | 일치 |
|------|---------------------------------------|----------|------|
| ssn_archive.json | `{items: [{ssnCd}]}` | 동일 | ✅ |
| shop_grp_dropdown_archive.json | `{items: [{shopGrpNo, shopGrpNm}]}` | 동일 | ✅ |
| sc_archive.json | `{items: [{brandCd,ssnCd,prodCd,colorCd,prodNm,item,prdtKindCd}]}` | 동일 | ✅ |
| shop_grp_archive.json | `{<shopGrpNo>: {shopGrpNo,shopGrpNm,shopCnt,shops}}` | +shopNm 추가 | ✅ (상위호환) |
| forecast_archive.json | `{<복합키>: {forecastStartDate,forecast}}` | 동일 | ✅ |

---

## 9. 수정 우선순위 로드맵

### 즉시 (04/23 오전, MVP 리뷰 전)

| # | 항목 | 공수 | 파일 |
|---|------|------|------|
| 1 | activeSel 가드 추가 | 5분 | ReplenishmentTab.tsx:481 |
| 2 | 프록시 route res.json() try-catch | 30분 | optimize, warehouse-stock, shop-stock |
| 3 | warehouseStock 탭별 분리 | 1-2시간 | ReplenishmentTab.tsx |
| 4 | handleSimulate 순차소진 도메인 확인 + 수정 | 1시간 | ReplenishmentTab.tsx:354 |
| 5 | spliceRows 단일 호출 최적화 | 15분 | xlsx-builder.ts:43-45 |
| 6 | v11 → v12 배지 수정 | 5분 | ShopAdjustmentView:113, PivotDetailView:471 |

### MVP 배포 후 (04/25~)

| # | 항목 | 공수 |
|---|------|------|
| 7 | sc_archive.json → StyleCatalogItem 변환 유틸 + StyleNavigatorModal 연결 | 3-4시간 |
| 8 | ssn_archive.json → 필터바 시즌 드롭다운 연결 | 1시간 |
| 9 | FilterBar + TabBar + FilterField 컴포넌트 추출 | 2-3시간 |
| 10 | /api/optimize body 스키마 검증 | 30분 |
| 11 | ErrorBoundary 추가 | 30분 |
| 12 | adjustment-preview/page.tsx 제거 | 15분 |

### 후속 (SERP 연동 후)

| # | 항목 |
|---|------|
| 13 | SERP 응답 정규화 레이어 (normalize* 함수) |
| 14 | forecast_archive 파일 분할 (brandCd_ssnCd 단위) |
| 15 | 레거시 파일 2,120행 일괄 제거 |
| 16 | PivotDetailView 셀 편집 → useCellEditor 훅 추출 |
| 17 | 차트 컴포넌트 React.memo 적용 |
| 18 | 스타일 카탈로그 API route 경유 전환 (번들 사이즈) |

---

## 10. 도메인 확인 필요 사항

| # | 질문 | 영향 | 담당 |
|---|------|------|------|
| 1 | warehouseStock 순차 소진 vs 탭별 독립 배분? | ILP 결과 정확성 | 사업부/Roy |
| 2 | colorCd='ALL' 처리 — 전체 컬러 합산 vs 컬러별 분기? | 예측/재고 조회 로직 | 사업부 |
| 3 | prdtKindCd → category1/2/3 매핑 테이블 확정? | sc_archive 전환 | Colly |
| 4 | SERP API 응답 스키마 (camelCase? snake_case?) | 프록시 정규화 | IT팀 |
| 5 | Snowflake 아카이빙 배치 주기 (일간? 주간?) | 데이터 신선도 | IT팀/Colly |

---

## 11. 긍정적 평가

| 항목 | 평가 |
|------|------|
| mock/실 전환 구조 | ✅ 우수 — 코드 변경 0행으로 전환 가능 |
| 타입 시스템 | ✅ 우수 — `as any` 0건, Colly 스펙 완벽 매칭 |
| API Route 설계 | ✅ 양호 — 프록시 패턴 일관성, 환경변수 100% 매칭 |
| 셀 편집 UX | ✅ 우수 — Ctrl+C/V/D/R, Enter/Tab/F2, 드래그 선택 등 엑셀 수준 |
| 엑셀 다운로드 | ✅ 양호 — 템플릿 기반, Case 3 매핑 정확 |
| 아카이빙 JSON 스펙 | ✅ 양호 — Colly 포맷 정확 일치 |
| UI 정합성 | ✅ 양호 — HTML 레퍼런스와 구조/색상/spacing 일치 |

---

*이 문서는 Planner(심층 분석) → Architect(아키텍처 리뷰) → Critic(품질 평가) 3단계 컨센서스 프로세스를 거쳐 작성되었습니다.*
