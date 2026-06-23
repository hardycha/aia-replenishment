# Screen Structure Skill

## 화면 구조 (v12.0 — 현재)

### 아키텍처 개요
2단계 화면 구조: [화면 A] 매장 조정 → [화면 B] 3컬럼 피벗 상세.
`page.tsx` → `ReplenishmentTab` (컨테이너) → phase에 따라 `ShopAdjustmentView` 또는 `PivotDetailView` 렌더링.

### [화면 A] 매장 조정 (phase: 'adjustment')
```
┌──────────────────────────────────────────────────┐
│ 타이틀 바 ┃보충배분-AIA [v11 매장 조정] executionDate│
├──────────────────────────────────────────────────┤
│ 필터바                                            │
│ [브랜드] [AP] [상품시즌] [배분그룹] [스타일 N개 선택] │
│ [조회하기] [초기화]                                 │
├──────────────────────────────────────────────────┤
│ 배분그룹 요약 헤더                                  │
│ 배분그룹명/번호 | 대상매장 N/원본 M | 활성 SC      │
│                              [배분 시뮬레이션 ▶]   │
├──────────────────────────────────────────────────┤
│ 스타일-컬러 탭 바 (복수 선택 시 여러 탭)              │
├──────────────────────────────────────────────────┤
│ 시각화 3종 그리드 (12-col)                          │
│ [매장별 예측 바차트 6col] [등급별 분포 3col] [AP게이지]│
├──────────────────────────────────────────────────┤
│ 매장 조정 테이블                                    │
│ [제거된 매장도 표시 ☐] [+ 매장 추가]                 │
│ 순위 | 매장코드 | 매장명 | 예측합계 | 현재고 | 작업   │
├──────────────────────────────────────────────────┤
│ 모달: StyleNavigatorModal (3단 좌필터/중리스트/우바스켓)│
│ 모달: AddShopModal (검색+리스트)                    │
└──────────────────────────────────────────────────┘
```

### [화면 B] 피벗 상세 (phase: 'detail')
```
┌──────────────────────────────────────────────────┐
│ 타이틀 바 ┃보충배분-AIA [v11 배분 상세]             │
├──────────────────────────────────────────────────┤
│ 필터바 (화면 A와 동일 — 조회하기 = 화면 A 복귀)       │
├──────────────────────────────────────────────────┤
│ 스타일-컬러 탭 바 (화면 A와 동일)                    │
├──────────────────────────────────────────────────┤
│ 토글 [매장별 보기 | 사이즈별 보기]                   │
│ + 셀 편집 힌트 + [엑셀 다운로드]                    │
├──────────────────────────────────────────────────┤
│ SCS 배분 현황 요약                                 │
│ 사이즈 | AP가용재고 | 예측합계 | 배분합계 | 잔량      │
├──────────────────────────────────────────────────┤
│ 3컬럼 피벗 테이블 (엑셀 스타일 셀 편집)              │
│ ┌──────┬─────────────────────────────┐           │
│ │ 매장 │ 사이즈별 [재고][예측][배분]   │           │
│ │(adj  │  ← 배분 셀 직접 편집 가능    │           │
│ │Rank) │  ← Ctrl+C/V/D/R 지원       │           │
│ └──────┴─────────────────────────────┘           │
└──────────────────────────────────────────────────┘
```

### 화면 전환 플로우
```
조회하기 → [화면 A: 매장 조정]
            ↓ 배분 시뮬레이션 ▶
           [화면 B: 3컬럼 피벗 상세]
            ↓ 조회하기 (재클릭)
           [화면 A: 매장 조정] (전체 상태 초기화)
```

### 엑셀 스타일 셀 조작 ([화면 B] PivotDetailView)
| 기능 | 조작 방법 |
|------|-----------|
| 셀 선택 | 클릭 |
| 범위 선택 | Shift+클릭, 드래그 |
| 다중 선택 | Ctrl+클릭 (Mac: Cmd+클릭) |
| 전체 선택 | Ctrl+A |
| 셀 편집 | 더블클릭, Enter, F2, 숫자키 직접 입력 |
| 편집 확정 | Enter (아래로 이동), Tab (오른쪽 이동) |
| 편집 취소 | Escape |
| 복사 / 붙여넣기 | Ctrl+C / Ctrl+V |
| Fill Down / Right | Ctrl+D / Ctrl+R |
| 일괄 입력 | Ctrl+Enter |
| 삭제 | Delete, Backspace |
| 네비게이션 | 화살표 키 (Shift+화살표로 범위 확장) |

## 컴포넌트 목록

### 활성화된 컴포넌트 (v12)
| 컴포넌트 | 경로 | 설명 |
|----------|------|------|
| ReplenishmentTab | `replenishment/ReplenishmentTab.tsx` | **컨테이너** — phase 상태, filters, shopsByKey/stockByKey 관리, API 호출, 핸들러 |
| ShopAdjustmentView | `replenishment/ShopAdjustmentView.tsx` | **[화면 A]** — 필터바, 배분그룹 헤더, 탭바, 시각화 3종, 매장 테이블 |
| PivotDetailView | `replenishment/PivotDetailView.tsx` | **[화면 B]** — 필터바, 탭바, SCS 요약, 3컬럼 피벗, 셀 편집 |
| StyleNavigatorModal | `replenishment/StyleNavigatorModal.tsx` | 스타일 네비게이터 (3단: 필터/리스트/바스켓) |
| AddShopModal | `replenishment/AddShopModal.tsx` | 매장 추가 모달 |
| ShopForecastBar | `replenishment/charts/ShopForecastBar.tsx` | 매장별 예측 바차트 |
| AdjRankSummary | `replenishment/charts/AdjRankSummary.tsx` | 등급별 분포 요약 (S/A/B) |
| StockGauge | `replenishment/charts/StockGauge.tsx` | AP재고 vs 예측 게이지 |

### API Routes (v12)
| Route | Method | 설명 |
|-------|--------|------|
| `/api/shop-grp` | GET | 배분그룹 조회 (아카이빙 JSON) |
| `/api/forecast` | GET | 예측치 조회 (아카이빙 JSON + date-fns W1) |
| `/api/warehouse-stock` | GET | AP 재고 (mock/SERP 프록시) |
| `/api/shop-stock` | GET | 매장 재고 (mock/SERP 프록시) |
| `/api/optimize` | POST | ILP 최적화 (mock/Colly 프록시) |
| `/api/export-xlsx` | POST | 엑셀 다운로드 (ExcelJS 템플릿 주입) |

### 클라이언트 유틸 (v12)
| 파일 | 설명 |
|------|------|
| `lib/api-client.ts` | fetchShopGrp, fetchForecast, fetchWarehouseStock, fetchShopStock, postOptimize |
| `lib/xlsx-builder.ts` | ExcelJS 서버 유틸 (buildExcelBuffer) |
| `lib/types.ts` | 공통 타입 (Filters, ShopGrp, ForecastBundle, AllocationResult 등) |

## 데이터 흐름 (v12)

```
page.tsx → ReplenishmentTab (컨테이너)
  ├── phase='adjustment' → ShopAdjustmentView
  │   ├── 스타일 네비게이터 → selections[] (복수 SC)
  │   ├── 조회하기 → fetchShopGrp + fetchForecast + fetchShopStock + fetchWarehouseStock
  │   ├── shopsByKey / stockByKey (탭별 상태)
  │   ├── 매장 추가/제거 (활성 탭에만 적용)
  │   └── 배분 시뮬레이션 → postOptimize → phase='detail'
  └── phase='detail' → PivotDetailView
      ├── AllocationResult → stockData[*].alloc 매핑
      ├── 셀 직접 편집 (Ctrl+C/V/D/R)
      ├── 엑셀 다운로드 → /api/export-xlsx (Case 3 물류배분)
      └── 조회하기 재클릭 → phase='adjustment' 복귀
```

### 아카이빙 JSON (Snowflake 배치 → 정적 파일)
| 파일 | Colly 대체 엔드포인트 |
|------|---------------------|
| `src/data/ssn_archive.json` | GET /dropdowns/ssns |
| `src/data/shop_grp_dropdown_archive.json` | GET /dropdowns/shop-grps |
| `src/data/sc_archive.json` | GET /dropdowns/sc |
| `src/data/shop_grp_archive.json` | GET /shop-grp |
| `src/data/forecast_archive.json` | GET /forecast |

## 스타일 가이드
| 구분 | 값 | 용도 |
|------|-----|------|
| 딥블루 | `#1B3A5C` | 타이틀, 본문 |
| 시안 | `#00B4D8` | 조회/기본 액션 버튼 |
| 보라 | `#7C3AED` | AI/배분 기능 |
| 성공 | `#28A745` | 확정, 복사 셀 |
| 위험 | `#DC3545` | 제거, 에러 |
| 예측 | `#92400E` / `#FFF8E1` | 예측값 텍스트/배경 |
| 재고 | `#4A5568` / `#EBF0F5` | 재고값 텍스트/배경 |
| 페이지 배경 | `#F4F6F9` | 전체 배경 |
| 카드 배경 | `#FFFFFF` | 패널 배경 |
| 구분선 | `#D2D8E0` | 보더 |
