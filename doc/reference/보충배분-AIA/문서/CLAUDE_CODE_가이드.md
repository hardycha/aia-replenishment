# 보충배분-AIA 화면 개발 가이드 (Claude Code용)

> 마지막 업데이트: v10.2 (2026-04-02)

## 1. 프로젝트 현황

### 기술 스택
- Next.js (App Router) + TypeScript + Tailwind CSS
- shadcn/ui 컴포넌트
- Vercel 배포: https://aia-replenishment.vercel.app

### 프로젝트 경로
```bash
cd ~/Desktop/AI/배분AI/배분보충AIA\ 화면\ 기획/aia-replenishment
```

### 현재 아키텍처 (v10)
```
page.tsx → ReplenishmentTab (단일 화면)
  ├── 조회 조건 바 (브랜드/AP/시즌 + 매장/스타일/컬러)
  ├── 뷰 모드 토글 (매장별 / 스타일별)
  ├── SCS 배분 현황 요약 패널
  ├── 피벗 테이블 (엑셀 스타일 셀 조작)
  ├── AI 배분 시뮬레이션
  └── 엑셀 다운로드
```

### 주요 파일
| 파일 | 역할 |
|------|------|
| `src/app/page.tsx` | 메인 — ReplenishmentTab 렌더링 |
| `src/components/replenishment/ReplenishmentTab.tsx` | **핵심 컴포넌트** — 조회, 피벗테이블, 셀조작, 시뮬레이션 |
| `src/data/mockData.ts` | v4 이전 목업 데이터 (현재 미사용) |
| `.claude/skills/*.md` | Claude Code 스킬 문서 |

## 2. Claude Code 프롬프트

### 현재 버전에서 수정할 때

```
이 프로젝트는 F&F S-ERP의 "보충배분-AIA" 화면 프로토타입이야.
현재 v10.2 — 피벗 테이블 기반 단일 화면 구조야.

### 현재 구조
- page.tsx → ReplenishmentTab 하나만 렌더링
- ReplenishmentTab.tsx에 조회조건, 피벗테이블, 엑셀셀조작, AI시뮬레이션 전부 포함
- Mock 데이터: 매장 32개, 스타일 20개, 사이즈 5개
- 매장별 보기 / 스타일별 보기 토글
- 엑셀 스타일 셀 조작 (다중선택, 복붙, Fill, 키보드 네비게이션)

### 수정 요청
[여기에 수정 내용 입력]
```

### API 연동 시

```
현재 Mock 데이터로 동작하는 ReplenishmentTab.tsx를 API 연동으로 전환해줘.

### API 엔드포인트
- 재고 조회: GET /api/stock?brand=X&ap=offline&season=26S&style=XJWT7341&color=BK
- 예측 조회: GET /api/forecast?... (같은 파라미터)
- ILP 최적화: POST /api/optimize { shopStocks, forecasts, apStock }

### 규칙
- generateInitialData() → API 호출로 대체
- cellMap/coordMap 구조는 유지
- 에러 핸들링, 로딩 스켈레톤 추가
- Mock 데이터는 fallback으로 유지
```

### 새 기능 추가 시

```
ReplenishmentTab에 [기능명] 기능을 추가해줘.

현재 구조를 참고해:
- .claude/skills/screen-structure.md (v10 화면 구조)
- .claude/skills/project-context.md (비즈니스 컨텍스트)
- .claude/skills/version-archive.md (버전 히스토리)

### 요구사항
[기능 상세 입력]

### 주의
- ReplenishmentTab 단일 컴포넌트 구조 유지
- 엑셀 셀 조작 UX 깨지지 않게
- 피벗 테이블 성능 고려 (32매장 × 20스타일 × 5사이즈)
```

## 3. 디자인 키컬러
| 구분 | 값 | 용도 |
|------|-----|------|
| Primary | `#1B3A5C` | S-ERP 네이비 |
| Accent | `#00A3E0` | S-ERP 블루 |
| AI Purple | `#7C3AED` | AI 기능 강조 |
| Success | `#28A745` | 확정/입고 |
| Danger | `#DC3545` | 긴급/S+ |
| Warning | `#F5A623` | MD 수정 |
| Background | `#F5F7FA` | 페이지 배경 |

## 4. 도메인 용어
| 약어 | 의미 |
|------|------|
| SC | Style-Color (스타일+컬러 조합) |
| SCS | Style-Color-Size |
| AP: Allocation Party (논리 창고) |
| RT: RoTation (재고의 매장 간 이동) |
| ILP | Integer Linear Programming (보충 최적화) |

### F&F 브랜드 코드
M: MLB, X: Discovery, V: Duvetica, ST: Sergio Tacchini, I: MLB KIDS

## 5. 버전 히스토리 요약

| 버전 | 핵심 변경 |
|------|-----------|
| v1~v4 | 4탭 구조 → 간소화 → 실시간계산 모드 |
| v5 | 목록/등록/상세 3화면 구조 |
| **v6** | **단일 화면 구조로 대전환** |
| **v10** | **피벗 테이블 기반 배분 화면** |
| **v10.1** | **엑셀 스타일 셀 조작** |
| v10.2 | Mock 데이터 확장 (32매장/20스타일/5사이즈) |

> 상세 히스토리: `.claude/skills/version-archive.md`

## 6. 레거시 파일 안내
아래 파일들은 v4 이전 구조의 잔재로, 현재 사용되지 않음:
- `src/components/forecast/` 폴더 전체 (ForecastTab, Pipeline, KpiCards 등)
- `src/components/mapping/`, `execution/`, `monitor/` 폴더
- `src/components/layout/` (PageHeader, SerpNav)
- `src/components/replenishment/ListView.tsx`, `RegisterView.tsx`, `DetailView.tsx` (v5)
- `src/data/mockData.ts` (v4 이전 목업 — ReplenishmentTab 내장 데이터로 대체)

> 필요 시 정리(삭제) 가능. 삭제 전 사용자 확인 필요.
