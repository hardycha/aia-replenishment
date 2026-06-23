# Version Archive Skill

## 설명
코드 수정 시 버전을 관리하고 아카이빙하는 스킬

## 버전 관리 규칙

### 버전 태그 형식
- `v{major}.{minor}` 형식 사용 (예: v1.0, v2.0, v2.1)
- major: 큰 기능 변경 또는 화면 구조 변경
- minor: 작은 수정 또는 버그 수정

### 버전 업 시점
- 화면 구조 변경 시 major 버전 업
- 기능 추가/수정 시 minor 버전 업
- 커밋 메시지에 버전 명시

### 태그 생성 방법
```bash
# 태그 생성
git tag -a v{버전} -m "설명"

# 태그 목록 확인
git tag -l

# 특정 버전으로 이동
git checkout v{버전}

# 태그 원격 저장소에 push
git push origin --tags
```

## 현재 버전 히스토리

| 버전 | 설명 | 날짜 |
|------|------|------|
| v1.0 | 초기 화면 구성 (SerpNav 제거, 탭 주석처리) | 2026-03-25 |
| v2.0 | 화면 간소화 (조회조건 + 재고요약 + 보충테이블) | 2026-03-25 |
| v3.0 | HTML 프로토타입 (실시간 계산 아키텍처) | 2026-03-27 |
| v4.0 | 실시간 계산 모드 적용 (Pipeline, KPI, SC요약, SCS상세) | 2026-03-27 |
| v5.0 | AIA 목록/등록/상세 화면 통합 (ListView, RegisterView, DetailView) | 2026-03-30 |
| v5.1 | 워딩 변경 (배분보충 → 보충배분), 브라우저 타이틀 설정 | 2026-03-30 |
| v6.0 | **구조 대전환** — 단일 화면 구조 (헤더/목록/등록/상세 뷰 제거). 조회조건 2단(브랜드·AP·시즌 / 매장·스타일·컬러), 매장별/스타일별 보기 토글, 배분 시뮬레이션·엑셀 다운로드 | 2026-03-30 |
| v10.0 | **피벗 테이블 기반 배분 화면** — SCS 배분 현황 요약 패널, 매장별/스타일별 피벗 테이블(재고·예측·배분 셀), 배분 셀 직접 편집, AI 배분 시뮬레이션, 엑셀 다운로드 | 2026-04-01 |
| v10.1 | 엑셀 스타일 셀 조작 추가 — 다중 셀 선택(클릭/Shift/Ctrl/드래그), 복사/붙여넣기(Ctrl+C/V), Fill Down/Right(Ctrl+D/R), Ctrl+A 전체선택, Delete/Backspace 삭제, 더블클릭·Enter·F2·숫자키 편집, 화살표키 네비게이션, Ctrl+Enter 일괄입력, 복사 셀 점선 표시 | 2026-04-01 |
| v10.2 | Mock 데이터 확장 (매장 32개, 스타일 20개, 사이즈 5개) | 2026-04-02 |
| v11.0 | **Python 이관** — TypeScript/React → Streamlit + AG Grid. 전체 코드를 Python으로 재작성. config.py로 데이터 관리 분리, pandas 기반 피벗, AI 시뮬레이션/엑셀 내보내기 모듈화 | 2026-04-03 |
| v12.0 | **2차 실 설계 전체 구현** — 2단계 화면([화면 A] 매장 조정 → [화면 B] 3컬럼 피벗 상세). 스타일 네비게이터 모달(복수 SC 선택), 탭 기반 상태 분리, Colly API 연동(POST /optimize), SERP 프록시(warehouse-stock/shop-stock), Snowflake 아카이빙 JSON 5종, API Route 6개, api-client 5개 함수, ExcelJS 엑셀 다운로드(Case 3 물류배분), mock/실 모드 스위치 | 2026-04-22 |

### 주요 전환점 메모
- **v5→v6**: 목록/등록/상세 3화면 구조 → 단일 화면 구조로 대전환. page.tsx가 ReplenishmentTab 하나만 렌더링.
- **v6→v10**: 단순 테이블 → 피벗 테이블 기반. 엑셀처럼 셀 직접 편집 가능한 UX로 진화.
- **v10→v10.1**: 셀 조작 UX를 엑셀 수준으로 고도화 (다중선택, 복붙, Fill, 키보드 네비게이션).
- **v10→v11**: **기술 스택 전환** — TypeScript/React/Next.js → Python/Streamlit/AG Grid.
- **v11→v12**: **Next.js 복귀 + 실 설계** — 2단계 화면(매장 조정 → 피벗 상세), 스타일 네비게이터 + 탭, Colly/SERP API 연동, 아카이빙 JSON, ExcelJS 엑셀 다운로드.

## 버전 복구 방법
```bash
# 특정 버전 코드 확인
git show v1.0

# 특정 버전으로 브랜치 생성
git checkout -b restore-v1 v1.0
```
