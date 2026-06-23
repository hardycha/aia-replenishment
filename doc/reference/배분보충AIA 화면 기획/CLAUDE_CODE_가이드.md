# 배분보충-AIA 화면 개발 가이드 (Claude Code용)

## 1. 프로젝트 초기 셋업

터미널에서 아래 명령어로 시작하세요:

```bash
# 작업 폴더로 이동
cd ~/Desktop/AI/배분AI/배분보충AIA\ 화면\ 기획

# Next.js 프로젝트 생성
npx create-next-app@latest aia-replenishment --typescript --tailwind --eslint --app --src-dir --no-import-alias

cd aia-replenishment
```

## 2. Claude Code 첫 프롬프트 (복사해서 사용)

Claude Code를 열고 아래 프롬프트를 입력하세요:

---

```
이 프로젝트는 F&F S-ERP의 "배분보충-AIA" 화면 프로토타입이야.
현재 폴더에 있는 `배분보충AIA_화면기획_초안.html` 파일이 화면 기획 초안이야.

이 HTML을 분석해서 Next.js App Router + TypeScript + Tailwind CSS 구조로 변환해줘.

### 화면 구성 (4개 탭)
1. **AI 수요예측 & 보충제안** - 메인 대시보드. 예측 파이프라인, 카드형 KPI, SC별 보충 우선순위, 매장별 상세 보충 테이블
2. **스타일 맵핑** - 신상품 ↔ 전년 유사 스타일 맵핑. AI 자동제안 + 사용자 수정
3. **보충 실행 관리** - 배분RT 진행현황, 보충 RT 리스트 관리
4. **성과 모니터링** - AI보충 vs 수동보충 성과 비교

### 기술 요구사항
- shadcn/ui 컴포넌트 사용 (Table, Card, Badge, Tabs, Button, Input, Select)
- 차트: recharts 사용
- 반응형 레이아웃
- 데이터는 목업(mock) JSON으로 분리
- src/app/page.tsx 가 메인 페이지
- src/components/ 아래에 컴포넌트 분리

### 디자인 키컬러
- Primary: #1B3A5C (S-ERP 네이비)
- Accent: #00A3E0 (S-ERP 블루)
- AI Purple: #7C3AED (AI 기능 강조)

### 폴더 구조
src/
├── app/
│   ├── page.tsx          # 메인 페이지
│   ├── layout.tsx        # 레이아웃
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── SerpNav.tsx        # S-ERP 상단 네비게이션
│   │   └── PageHeader.tsx     # 페이지 헤더
│   ├── forecast/
│   │   ├── ForecastTab.tsx    # 탭1 메인
│   │   ├── AiInsightBox.tsx   # AI 인사이트 박스
│   │   ├── KpiCards.tsx       # 통계 카드
│   │   ├── ForecastChart.tsx  # 수요예측 차트
│   │   ├── PriorityTable.tsx  # 보충 우선순위 테이블
│   │   └── ShopDetailTable.tsx # 매장별 상세 테이블
│   ├── mapping/
│   │   ├── MappingTab.tsx     # 탭2 메인
│   │   └── MappingTable.tsx   # 맵핑 테이블
│   ├── execution/
│   │   ├── ExecutionTab.tsx   # 탭3 메인
│   │   └── RtListTable.tsx    # RT 리스트
│   └── monitor/
│       ├── MonitorTab.tsx     # 탭4 메인
│       └── PerformanceTable.tsx
├── data/
│   └── mockData.ts            # 목업 데이터
└── lib/
    └── utils.ts

우선 shadcn/ui 초기화 후 필요 컴포넌트 설치하고,
탭1(AI 수요예측 & 보충제안)부터 만들어줘.
```

---

## 3. 단계별 진행 프롬프트

### Step 1 완료 후 → Step 2

```
탭1 잘 됐어. 이제 탭2(스타일 맵핑)를 만들어줘.

핵심 기능:
- AI 자동맵핑 결과를 테이블로 보여주고, 사용자가 행 클릭 시 맵핑 변경 가능
- 같은 ITEM군 내에서만 전년 스타일 선택 가능 (드롭다운)
- 1:N 맵핑 지원 (하나의 신상에 여러 전년 스타일 매칭 가능)
- 신뢰도(%) 표시
- 미맵핑 스타일은 노란색 하이라이트
- 상단에 맵핑 진행률 프로그레스 바
```

### Step 2 완료 후 → Step 3

```
탭2 좋아. 이제 탭3(보충 실행 관리)를 만들어줘.

기존 S-ERP의 "배분RT 진행현황" 화면 스타일을 참고하되:
- MD 대응 진행 현황 (보충유형별 집계 테이블)
- 매장 요청 진행 현황 (요청/처리 현황)
- 보충 RT 리스트 (개별 RT 확인/확정)
- AI보충 유형에는 보라색 뱃지로 구분
```

### Step 3 완료 후 → Step 4

```
탭3 완료. 마지막으로 탭4(성과 모니터링)를 만들어줘.

- AI보충 vs 수동보충 판매율 비교 차트 (recharts Bar + Line)
- 품절률 추이 라인 차트
- 예측 정확도(WAPE) 추이
- 카테고리별 성과 상세 테이블
```

### Step 4 완료 후 → 배포

```
모든 탭이 완성됐어. Vercel 배포 준비해줘:
1. 빌드 테스트 (npm run build)
2. 에러 있으면 수정
3. vercel.json 설정이 필요하면 추가
4. git init, 첫 커밋까지
```

## 4. 추가 팁

### 특정 부분 수정이 필요할 때

```
# 예: 차트 수정
ForecastChart.tsx의 recharts를 수정해줘.
- X축: W8~W13 + T+1, T+2 (예측 구간은 점선)
- 실제 판매량(파란 bar) + AI 예측치(보라 bar) 겹쳐 표시
- T+1, T+2 구간에 confidence interval 밴드 추가

# 예: 데이터 연동 준비
mockData.ts를 API Routes로 전환해줘.
src/app/api/forecast/route.ts 만들어서 GET 핸들러 작성.
나중에 실제 API 연동 시 URL만 바꾸면 되게.
```

### 디자인 다듬기

```
전체적으로 디자인 다듬어줘:
- shadcn/ui 다크모드 토글 추가
- 사이드바 네비게이션 추가 (S-ERP 좌측 메뉴 스타일)
- 테이블 행 선택 시 우측에 상세 패널 슬라이드인
- 로딩 스켈레톤 추가
```

## 5. 프로젝트 컨텍스트 (Claude Code CLAUDE.md에 추가 가능)

```markdown
## 배분보충-AIA 프로젝트

### 도메인 용어
- SC: Style-Color (스타일+컬러 조합)
- AP: Allocation Party (논리 창고)
- RT: RoTation (재고의 매장 간 이동)
- ILP: Integer Linear Programming (정수선형계획법, 보충 최적화)

### F&F 브랜드 코드
- M: MLB, X: Discovery, V: Duvetica, ST: Sergio Tacchini, I: MLB KIDS

### 보충 파이프라인
판매데이터 → AI 수요예측(LightGBM) → ILP 보충수량 최적화 → MD 검토/수정 → 보충 확정 → RT 생성

### UI 컨벤션
- AI 기능은 보라색(#7C3AED) 계열로 강조
- 기존 S-ERP 화면과 동일한 필터바 패턴 유지 (브랜드/AP/기간)
- 숫자는 우측 정렬, tabular-nums
```
