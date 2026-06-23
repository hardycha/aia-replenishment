@AGENTS.md

## 보충배분-AIA 프로젝트 규칙

### 현재 버전: v12 (2차 실 설계 · 2026-04-22)
- **2단계 화면**: [화면 A] 매장 조정(조회하기 직후) → [화면 B] 3컬럼 피벗(시뮬레이션 후)
- **복수 스타일·컬러 지원**: 스타일 네비게이터 모달에서 여러 스타일+컬러 선택 → 각 조합별 탭
- **외부 API 3개만 호출**: SERP `/warehouse-stock`, SERP `/shop-stock`, ILP `POST /optimize`
- 배분그룹·예측치는 Snowflake 아카이빙 JSON으로 공급 (별도 API 아님)
- W1 고정, executionDate 숨김 자동 주입

### 상세 스펙
- **task.md** — Phase 1~8 구현 플랜, 완료 상태, 수용 기준
- **analysis.md** — 사전 분석 & 검수 완료본 (아키텍처 결정 근거)
- **docs/colly_api_spec.md** — Colly(PI팀) 가 제공하는 ILP API 실제 명세 + 아카이빙 JSON 포맷 (2026-04-22 수령)

### ★ API 연결 원칙 (재확인)
Colly 서버(`http://10.81.1.91:8002`)는 6개 엔드포인트를 제공하지만,
**우리는 `POST /optimize` 하나만 실 호출**한다. 나머지 5개(드롭박스 3종 +
`/shop-grp` + `/forecast`)는 Snowflake 아카이빙 JSON 으로 대체.
SERP 2개(`/warehouse-stock`, `/shop-stock`)는 실 호출 예정이지만
**현재 IT팀 미수령** — URL·스펙 확정 전까지 Mock 고정.
실 API 목표 합계 = 3개. 현 가동 합계 = 1개 (ILP 만).
상세 근거는 `docs/colly_api_spec.md` 참조.

### ⚠️ SERP API 미수령 주의
- `.env.local` 의 `NEXT_PUBLIC_USE_MOCK_API` 를 **반드시 true 유지**
- false 로 바꾸면 `/api/warehouse-stock`, `/api/shop-stock` 가 실패
- IT팀 URL 수령 → `.env.local` 에 `NEXT_PUBLIC_SERP_API_BASE` 기입 →
  mock 스위치 false 로 전환 (코드 수정 불필요)

### ⚠️ 테스트 전용 기능: TargetStock+3 ILP 비교 (실 배포 시 제거)
- `src/app/api/optimize-add3/route.ts` — Colly `/optimize-add3` 프록시
- `src/lib/api-client.ts` — `postOptimizeAdd3()` 함수
- `ShopAdjustmentView.tsx` — 배분 시뮬레이션 옆 "TargetStock+3" 체크박스
- `ReplenishmentTab.tsx` — `useTargetStock` state, `handleSimulate` 분기
- 목적: 기존 ILP(/optimize)와 TargetStock 도입 버전(/optimize-add3) 배분 결과 비교 테스트
- **배포 전 반드시 위 4개 파일에서 관련 코드를 제거할 것**

### 현재 구현 상태
- ✅ Phase 4 (매장 조정 화면 + 스타일 네비게이터 + 탭 + 차트) 완료
- 🔴 Phase 1 의존성(exceljs, date-fns) 미설치, API Route 6개 미구현
- 🔴 Phase 3 ReplenishmentTab 컨테이너화 미완 (현재는 `/adjustment-preview` 라우트에서 동작)
- 🔴 Phase 5 [화면 B] ILP 연동, Phase 6 엑셀 다운로드, Phase 7~8 미착수

### 프리뷰 라우트
```bash
npm run dev
# http://localhost:3000/adjustment-preview  (React 구현, 실제 상태 관리)
# http://localhost:3000/ui-reference/index.html  (단일 HTML · UI 디자인 확정본)
```

### ★ UI 디자인 고정 규칙
`public/ui-reference/index.html` 은 **[화면 A] 매장 조정 화면의 디자인 확정본**이다.
React 구현물(`ShopAdjustmentView.tsx` 외)과 이 HTML 이 상이하게 보이면
**React 쪽을 이 HTML 에 맞춰 조정**한다. 반대로 하지 말 것.

HTML 은 Tailwind Play CDN + 바닐라 JS 로 작성됐고, 모달/탭/필터/매장 추가/제거 등 
기본 인터랙션이 동작하므로 시각적 검증이 가능하다.

### 실 데이터 붙이기 우선 경로
1. `npm install exceljs date-fns` (task.md T1.2)
2. `.env.local` 작성 — `NEXT_PUBLIC_USE_MOCK_API=true/false`, `NEXT_PUBLIC_SERP_API_BASE`, `ILP_API_BASE`
3. `src/app/api/` 하위 6개 Route 스텁 + 클라이언트 `src/lib/api-client.ts` (task.md T2.2~T2.8)
4. Snowflake 아카이빙 JSON 3개를 `src/data/` 에 배치: `shop_grp_archive.json`, `forecast_archive.json`, `style_catalog_archive.json`
5. `mockAdjustmentData.ts` 의 상수들을 아카이빙 JSON import 로 교체
6. `adjustment-preview/page.tsx` 로직을 `ReplenishmentTab.tsx` 로 이식 (Phase 3 T3.1)

### 필수 규칙: 버전 기록
모든 코드 변경 시 반드시 아래 문서를 함께 업데이트할 것:
1. `.claude/skills/version-archive.md` — 버전 히스토리 테이블에 행 추가
2. `.claude/skills/screen-structure.md` — 컴포넌트/레이아웃 변경 반영
3. `.claude/skills/project-context.md` — 컨텍스트 변경 반영

### 도메인 용어
- SC: Style-Color / SCS: Style-Color-Size
- AP: Allocation Party (논리 창고)
- RT: RoTation (재고의 매장 간 이동)
- ILP: Integer Linear Programming (보충 최적화)
- adjRank: 배분그룹 내 매장 우선순위 (오름차순, 낮을수록 상위)
- shopCnt: P_score 정규화 분모 (배분그룹 원본 매장 수)
- W1: executionDate 의 주 월요일 (forecastStartDate 기준)

### F&F 브랜드 코드
M: MLB, X: Discovery, V: Duvetica, ST: Sergio Tacchini, I: MLB KIDS

### 보충 파이프라인
판매데이터 → AI 수요예측(LightGBM) → ILP 보충수량 최적화 → MD 검토/수정 → 보충 확정 → RT 생성

### UI 컨벤션
- AI/배분 기능은 보라색(#7C3AED) 계열
- 시안(#00B4D8) = 조회·기본 액션
- 딥블루(#1B3A5C) = 타이틀·본문
- 예측 컬러 계열(#92400E / #FFF8E1 배경)
- 재고 컬러 계열(#4A5568 / #EBF0F5 배경)
- 숫자는 우측 정렬, tabular-nums
- 배경: #F4F6F9, 카드 배경: #FFFFFF, 구분선: #D2D8E0

### 화면 구조 요약 (v12)
```
[필터바] 브랜드 · AP · 시즌 · 배분그룹 · [스타일 선택 버튼] · 조회 / 초기화
   ↓ 조회하기
[배분그룹 요약 헤더] + [배분 시뮬레이션 버튼]
[스타일-컬러 탭 바]    ← 복수 선택 시 여러 탭
[시각화 3종] 매장별 예측 바차트 · 등급별 요약 · AP재고 게이지
[매장 조정 테이블] + [매장 추가 버튼(우측 상단)]
   ↓ 시뮬레이션
[3컬럼 피벗 상세] (Phase 5 에서 구현)
```
