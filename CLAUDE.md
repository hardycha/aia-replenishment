# 배분AI

F&F 오프라인 매장 보충배분 최적화 프로젝트.
ILP(Integer Linear Programming) 기반 배분 로직 + AIA 화면을 통해 MD의 수기 배분을 자동화한다.

## 프로젝트 구조

```
배분AI/
├── doc/
│   ├── plan/              설계 문서, 로드맵 (버전별 관리)
│   ├── review/            보고 문서, 검증 결과
│   └── reference/         참고 자료 (분석 쿼리, 화면 기획, 구버전 아카이브)
├── src/
│   ├── core/
│   │   ├── config/        설정 파일
│   │   └── utils/         공통 유틸리티
│   ├── service/
│   │   ├── validation/    Python 검증 스크립트
│   │   └── 보충배분-AIA/
│   │       └── aia-replenishment/  Next.js 화면 (핵심 서비스)
│   ├── output/            분석 결과물
│   └── download/          다운로드 파일
└── CLAUDE.md
```

## 핵심 서비스

- **보충배분-AIA** (`src/service/보충배분-AIA/aia-replenishment/`)
  - Next.js 16 + React 19 + Tailwind v4 + shadcn/ui
  - SERP API (재고), ILP API (최적화) 연동
  - 현재 Phase 7 (통합 테스트) 진행 중

- **validation** (`src/service/validation/`)
  - 배분 정합성 검증 Python 스크립트

## 용어

| 코드 | 뜻 |
|------|------|
| SC | Style-Color |
| SCS | Style-Color-Size |
| AP | Allocation Party (논리 창고) |
| RT | RoTation (매장 간 재고 이동) |
| ILP | Integer Linear Programming (보충 최적화) |
| AIA | AI-Assisted (배분 시스템 명칭) |
