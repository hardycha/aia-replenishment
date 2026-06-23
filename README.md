# 배분AI

F&F 오프라인 매장 보충배분 최적화 프로젝트.

## 구조

```
doc/
├── plan/              설계·로드맵
├── review/            보고·검증 문서
└── reference/         참고 자료 (분석 쿼리, 화면 기획 아카이브, 구버전)

src/
├── core/{config,utils}    공통 설정·유틸
├── service/
│   ├── validation/        배분 정합성 검증 (Python)
│   └── 보충배분-AIA/
│       └── aia-replenishment/   Next.js 화면 (핵심)
├── output/                분석 결과물
└── download/              다운로드 파일
```

## 보충배분-AIA 실행

```bash
cd src/service/보충배분-AIA/aia-replenishment
npm install
npm run dev
# http://localhost:3000
```

## 진행 상태

- Phase 1~6: 완료 (화면 개발 + 실 API 연동 + 엑셀 다운로드)
- Phase 7: 통합 테스트 진행 중
- Phase 8: DCS AI 내부망 배포 미착수

상세: `doc/task.md`
