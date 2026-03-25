# Screen Structure Skill

## 화면 구조

### 레이아웃 구성
```
┌─────────────────────────────────────────┐
│ PageHeader (배분보충-AIA 타이틀)          │
├─────────────────────────────────────────┤
│ Tabs (현재 1개 탭만 활성화)               │
├─────────────────────────────────────────┤
│ FilterBar (조회 조건)                    │
├─────────────────────────────────────────┤
│ InventorySummary (사이즈별 재고 현황)     │
├─────────────────────────────────────────┤
│ ReplenishmentTable (매장별 보충 수량)     │
├─────────────────────────────────────────┤
│ Footer (버전 정보, 피드백/가이드 버튼)     │
└─────────────────────────────────────────┘
```

## 컴포넌트 목록

### 활성화된 컴포넌트
| 컴포넌트 | 경로 | 설명 |
|----------|------|------|
| PageHeader | `src/components/layout/PageHeader.tsx` | 페이지 타이틀 |
| FilterBar | `src/components/forecast/FilterBar.tsx` | 조회 조건 필터 |
| InventorySummary | `src/components/forecast/InventorySummary.tsx` | 사이즈별 재고 요약 |
| ReplenishmentTable | `src/components/forecast/ReplenishmentTable.tsx` | 매장별 보충 수량 |
| ForecastTab | `src/components/forecast/ForecastTab.tsx` | 메인 탭 컨테이너 |

### 비활성화된 컴포넌트 (주석처리)
| 컴포넌트 | 상태 | 비고 |
|----------|------|------|
| SerpNav | 제거됨 | 남색 상단 네비게이션 |
| MappingTab | 주석처리 | 스타일 맵핑 탭 |
| ExecutionTab | 주석처리 | 보충 실행 관리 탭 |
| MonitorTab | 주석처리 | 성과 모니터링 탭 |
| Pipeline | 미사용 | 파이프라인 표시 |
| AiInsightBox | 미사용 | AI 인사이트 박스 |
| KpiCards | 미사용 | KPI 카드 |
| ForecastChart | 미사용 | 예측 차트 |
| PriorityTable | 미사용 | 우선순위 테이블 |
| ShopDetailTable | 미사용 | 기존 매장 상세 테이블 |

## UI 컴포넌트 (shadcn/ui)
- Button, Input, Select, Checkbox
- Card, Badge, Tabs
- Table (TableHeader, TableBody, TableRow, TableCell, TableHead)

## 스타일 가이드
- 메인 컬러: `#00A3E0` (파란색)
- 서브 컬러: `#7C3AED` (보라색, AI 관련)
- 배경색: `#F5F7FA`
- 텍스트: `#1B3A5C` (진한), `#718096` (연한)
- 폰트 크기: 기본 13px, 라벨 11px
