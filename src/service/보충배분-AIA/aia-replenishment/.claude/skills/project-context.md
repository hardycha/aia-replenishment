# Project Context Skill

## 프로젝트 개요
**보충배분-AIA**: F&F S-ERP 유통ERP 시스템의 AI 기반 보충배분 화면
- **현재 버전**: v12.0
- **배포 URL**: https://aia-replenishment.vercel.app
- **기술 스택**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + shadcn/ui
- **마일스톤**: 2026-04-24(금) MVP 리뷰 배포

## 비즈니스 플로우

### 데이터 전제조건
- SC-Total / SC-Shop으로 앙상블하여 매장별 판매 예측값은 DB에 이미 존재
- 보충값은 DB에 저장되지 않음 (실시간 계산)
- 배분그룹·예측치·스타일 카탈로그는 Snowflake 아카이빙 JSON으로 공급

### 외부 API (3개만 실 호출)
| API | Method | URL | 설명 |
|-----|--------|-----|------|
| SERP warehouse-stock | GET | `<SERP_BASE>/warehouse-stock` | AP 가용재고 |
| SERP shop-stock | GET | `<SERP_BASE>/shop-stock` | 매장 현재고 |
| Colly optimize | POST | `<ILP_BASE>/optimize` | ILP 배분 최적화 |

### 아카이빙 JSON (Colly 5개 엔드포인트 대체)
| 파일 | 원본 엔드포인트 |
|------|---------------|
| `ssn_archive.json` | GET /dropdowns/ssns |
| `shop_grp_dropdown_archive.json` | GET /dropdowns/shop-grps |
| `sc_archive.json` | GET /dropdowns/sc |
| `shop_grp_archive.json` | GET /shop-grp |
| `forecast_archive.json` | GET /forecast |

### 화면 플로우 (v12)
1. 필터 설정 + 스타일 네비게이터에서 복수 스타일+컬러 선택
2. "조회하기" → [화면 A: 매장 조정] + 탭 생성
3. 탭 전환으로 각 SC 조합의 시각화/매장 테이블 확인
4. 매장 추가/제거 (활성 탭에만 적용)
5. "배분 시뮬레이션 ▶" → ILP POST /optimize → [화면 B: 3컬럼 피벗 상세]
6. 피벗에서 엑셀 스타일 셀 편집 (Ctrl+C/V/D/R)
7. "엑셀 다운로드" → Case 3 물류배분 xlsx 생성
8. "조회하기" 재클릭 → [화면 A] 초기화 복귀

### 환경변수 (.env.local)
```
NEXT_PUBLIC_USE_MOCK_API=true    # true(기본)/false
ILP_API_BASE=http://10.81.1.91:8002
NEXT_PUBLIC_SERP_API_BASE=       # IT팀 확정 시
ILP_TIMEOUT_MS=60000
SERP_TIMEOUT_MS=15000
```

## 보충 파이프라인
```
판매데이터 → AI 수요예측(LightGBM) → ILP 보충수량 최적화 → MD 검토/수정 → 보충 확정 → RT 생성
```

## 도메인 용어
| 약어 | 의미 |
|------|------|
| SC | Style-Color (스타일+컬러 조합) |
| SCS | Style-Color-Size (스타일+컬러+사이즈) |
| AP | Allocation Party (논리 창고) |
| RT | RoTation (재고 매장 간 이동) |
| ILP | Integer Linear Programming (보충 최적화) |
| W1 | executionDate의 주 월요일 (forecastStartDate 기준) |
| adjRank | 배분그룹 내 매장 우선순위 (오름차순) |
| shopCnt | P_score 정규화 분모 (배분그룹 원본 매장 수) |

## F&F 브랜드 코드
- M: MLB, X: Discovery, V: Duvetica, ST: Sergio Tacchini, I: MLB KIDS

## 관련 메뉴
- Menu Path: 배분RT 관리 > 배분 관리 > 보충배분-AIA
- Menu Code: ALOC10004

## Mock 데이터 현황 (v12)
| 항목 | 수량 | 설명 |
|------|------|------|
| 배분그룹 | 1개 | XSHGR202512100000003546 (32매장) |
| 스타일 카탈로그 | 29개 | 아우터/상의/하의/신발/용품 |
| 시즌 | 10개 | 26N~23F |
| 사이즈 | 5개 | 90, 95, 100, 105, 110 |
| 매장 추가 풀 | 12개 | MOCK_BRAND_SHOP_POOL |
