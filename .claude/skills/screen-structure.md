# Screen Structure Skill

## 화면 구조 (v4.0)

### 레이아웃 구성
```
┌─────────────────────────────────────────┐
│ PageHeader (배분보충-AIA 타이틀)          │
├─────────────────────────────────────────┤
│ Tabs (보충 배분 탭 활성화)                │
├─────────────────────────────────────────┤
│ FilterBar (브랜드/시즌/AP/ITEM/매장그룹/RT)│
├─────────────────────────────────────────┤
│ AiInsightBox (실시간 계산 모드 안내)      │
├─────────────────────────────────────────┤
│ Pipeline (5단계 진행 상태)               │
├─────────────────────────────────────────┤
│ KpiCards (4개 KPI 카드)                 │
├─────────────────────────────────────────┤
│ ShopGroupChips (매장그룹 필터 칩)         │
├─────────────────────────────────────────┤
│ ScSummaryTable (SC별 보충 제안 요약)      │
├─────────────────────────────────────────┤
│ ShopScsTable (매장별 SCS 보충 상세)       │
├─────────────────────────────────────────┤
│ Footer (버전 정보, 피드백/가이드 버튼)     │
└─────────────────────────────────────────┘
```

## 컴포넌트 목록

### 활성화된 컴포넌트 (v4.0)
| 컴포넌트 | 경로 | 설명 |
|----------|------|------|
| PageHeader | `layout/PageHeader.tsx` | 페이지 타이틀 |
| FilterBar | `forecast/FilterBar.tsx` | 조회 조건 (브랜드/시즌/AP/ITEM/매장그룹/RT모드) |
| AiInsightBox | `forecast/AiInsightBox.tsx` | 실시간 계산 모드 안내 |
| Pipeline | `forecast/Pipeline.tsx` | 5단계 파이프라인 (SERP→ML→ILP→MD→확정) |
| KpiCards | `forecast/KpiCards.tsx` | KPI 4종 (ML정확도/SCS수/물류재고/보충매장) |
| ShopGroupChips | `forecast/ShopGroupChips.tsx` | 매장그룹 필터 칩 |
| ScSummaryTable | `forecast/ScSummaryTable.tsx` | SC별 보충 제안 요약 테이블 |
| ShopScsTable | `forecast/ShopScsTable.tsx` | 매장별 SCS 보충 상세 (사이즈별) |
| ForecastTab | `forecast/ForecastTab.tsx` | 메인 탭 컨테이너 |

### 미사용 컴포넌트 (v2.0에서 대체됨)
| 컴포넌트 | 상태 | 비고 |
|----------|------|------|
| InventorySummary | 대체됨 | ScSummaryTable로 통합 |
| ReplenishmentTable | 대체됨 | ShopScsTable로 통합 |
| ForecastChart | 미사용 | |
| PriorityTable | 미사용 | |
| ShopDetailTable | 미사용 | |

### 비활성화된 탭 (주석처리)
| 탭 | 상태 |
|----------|------|
| SerpNav | 제거됨 |
| MappingTab | 주석처리 |
| ExecutionTab | 주석처리 |
| MonitorTab | 주석처리 |

## 데이터 흐름

```
유저 요청 → SERP 재고 조회 → ML 예측 조회 (SCS-shop) → ILP 보충 API → 화면 표시
```

- 보충값은 DB에 저장되지 않음 (실시간 계산)
- RT Off: 물류 → 매장 단방향 보충
- RT On: 매장 ↔ 매장 이동 허용 (향후)

## 스타일 가이드
| 구분 | 값 | 용도 |
|------|-----|------|
| 메인 컬러 | `#00A3E0` | 버튼, 예측값 |
| AI 컬러 | `#7C3AED` | AI 관련, ILP 보충량 |
| 성공 | `#28A745` | 확정, 입고 |
| 위험 | `#DC3545` | 긴급, S+ 등급 |
| 경고 | `#F5A623` | MD 수정 |
| 배경 | `#F5F7FA` | 페이지 배경 |
| 텍스트 | `#1B3A5C` / `#718096` | 진한 / 연한 |
