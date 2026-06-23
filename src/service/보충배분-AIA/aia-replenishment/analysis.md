# 보충배분-AIA 2차 실 설계 — 최종 분석 (검수 완료본)

> 작성일: 2026-04-22
> 소스: 노션「배분AIA 화면 2차 실 설계」(2026-04-16) + `aia-replenishment` (Next.js 16 + React 19) + 엑셀배분_템플릿.xlsx + 사용자 검수 답변
> 상태: **✅ 검수 완료, task.md 착수 대기**

---

## 1. 프로젝트 정의

유통MD가 **배분그룹(shopGrpNo) + 상품(시즌/스타일/컬러)** 을 선택하고 "조회하기"를 누르면, 프론트가 **Snowflake 아카이빙 데이터(매장리스트·예측치) + SERP 실시간 API(AP재고·매장재고)** 를 조합해 **매장 조정 화면**을 띄운다. MD가 예측값 시각화를 보며 매장을 추가/제거/확정하고 "배분 시뮬레이션"을 누르면 **ILP 서버(`POST /optimize`)** 로 현재 상태가 전송되고, 결과 수령 후 **3컬럼 피벗 상세 화면**으로 전환된다. 여기서 수량을 후조정하고 **S-ERP 업로드용 엑셀 템플릿(.xlsx)** 을 Next.js API Route에서 생성해 다운로드한다.

---

## 2. 확정된 아키텍처

### 2.1 API 호출 (3개)
| 구분 | 메소드 | 엔드포인트 | 호출 주체 | 호출 시점 |
|---|---|---|---|---|
| SERP | GET | `/warehouse-stock` | 프론트 → SERP | 조회하기 |
| SERP | GET | `/shop-stock?shopCds=...` | 프론트 → SERP | 조회하기 + 매장 추가 |
| ILP | POST | `/optimize` | 프론트 → 배분서버 | 배분 시뮬레이션 |

### 2.2 Snowflake 아카이빙 데이터 (API 아님, 정적 공급)
| 데이터 | 소스 | 공급 방식 |
|---|---|---|
| 배분그룹 리스트 (`shopGrpNo`, `shopGrpNm`, `shopCnt`, `shops[].adjRank`) | Snowflake 아카이빙 | **Next.js 레포 내 `src/data/shop_grp_archive.json`** (정적 JSON, 배치로 갱신) |
| 매장별 SCS 판매 예측치 (W1 기준) | Snowflake 아카이빙 | **Next.js 레포 내 `src/data/forecast_archive.json`** (정적 JSON, 배치로 갱신) |

**장점**: 구현 제로, Vercel CDN 캐싱, 비용 0. **향후 용량 증가 시 Vercel Blob/S3 + API Route 마이그레이션 가능** (인터페이스 유지).

### 2.3 예측 기준일 정책
- **W1 고정** (`executionDate` 의 주 월요일이 `forecastStartDate`)
- 메모리 상 "요일별 분기 규칙"은 이번 버전 미적용 (추후 재논의 TODO)
- `executionDate` 는 **숨김 파라미터** — 버튼 클릭 시점 오늘 날짜 자동 주입, `POST /optimize` 페이로드에만 포함

### 2.4 배포 구조
- **`aia-replenishment` (Next.js 16) 단일 갈래로 일원화**
- `v11_vercel` Python 버전은 유지하되 이번 작업 범위 밖
- Vercel 자동 배포 (git push)

---

## 3. 화면 구성 (2단계 전환)

### 3.1 [화면 A] 매장 조정 화면 — 신규 설계
**언제 뜨는가**: "조회하기" 직후. "조회하기" 누를 때마다 무조건 API 재호출 + 이 화면으로 초기화. 되돌아가기 없음.

**구성 요소**
1. **상단 필터바** (기존 유지 + 배분그룹 드롭다운 신규)
2. **매장 조정 테이블** (심플)
   - 컬럼: 체크박스 / 매장명(shopNm) / adjRank / AP대비예측합계 / 현재고합계 / 행액션(X 제거)
   - 행 정렬: adjRank 오름차순 (기본)
3. **예측값 시각화 3종 (MD 판단 보조)**
   - ① **매장별 예측 수량 바차트** — 가로축=매장(adjRank 순), 세로축=예측합계
   - ② **등급(adjRank 버킷)별 분포 요약** — 1계열/2계열/3계열 각 그룹의 총예측, 매장 수
   - ③ **AP재고 vs 예측총수요 대시 게이지** — "지금 AP에 X개, 예측 총판매 Y개 → 부족/여유"
   - ※ 사이즈별 파이/도넛은 제외 (사용자 요청)
4. **상단 액션**
   - `[매장 추가]` 버튼 → 모달 검색 (브랜드 매장 전체 중 조건 검색)
   - `[배분 시뮬레이션]` 버튼 → `POST /optimize` → [화면 B]로 전환
5. **(옵션) 팝업: 예측 상세 보기** — 매장×사이즈 가로형 테이블 (예측값 중심)

### 3.2 [화면 B] 3컬럼 피벗 상세 — 기존 UI 그대로 활용
**언제 뜨는가**: [화면 A]에서 "배분 시뮬레이션" 클릭 후.

**현 `ReplenishmentTab.tsx` 유지 항목**
- 피벗 테이블 (매장별 보기 / 스타일별 보기 토글)
- 재고/예측/배분 3컬럼 구조
- 엑셀 스타일 셀 편집 (다중선택, Ctrl+C/V/D/R/A, 드래그, 더블클릭 편집, Tab/화살표 이동, Delete, F2, Ctrl+Enter 일괄입력)
- SCS 요약 패널 (AP재고/배분합계/잔량)
- 색상 팔레트 (#7C3AED 보라 = AI/배분)

**이 화면에서만 수정되는 것**
- "배분" 컬럼 값 = ILP 결과로 덮어쓰기 (MD 수동 조정 가능)
- "예측" 컬럼 = 매장 조정 화면에서 받은 값 그대로 유지
- `[엑셀 다운로드]` 버튼 → Next.js API Route 호출

**되돌아가기 없음**: 이 화면에서 다시 매장 조정으로 가려면 **"조회하기"를 다시 눌러야 함** (= 필터값 바꿔 새 사이클 시작). 시뮬레이션 결과는 엑셀 다운로드로 확정.

---

## 4. API Route · 페이지 구조 설계 (task.md 기반)

```
aia-replenishment/
├── src/
│   ├── app/
│   │   ├── page.tsx                    ← 기존 (ReplenishmentTab)
│   │   └── api/
│   │       ├── shop-grp/route.ts       ← Snowflake 아카이빙 JSON 읽어 응답 (신규)
│   │       ├── forecast/route.ts       ← 아카이빙 JSON 읽어 응답 (신규)
│   │       ├── warehouse-stock/route.ts ← SERP 프록시 (신규)
│   │       ├── shop-stock/route.ts     ← SERP 프록시 (신규)
│   │       ├── optimize/route.ts       ← ILP 서버 프록시 (신규)
│   │       └── export-xlsx/route.ts    ← 엑셀 템플릿 생성 (신규)
│   ├── components/
│   │   └── replenishment/
│   │       ├── ReplenishmentTab.tsx    ← 최상위 컨테이너로 리팩터 (phase 상태)
│   │       ├── FilterBar.tsx           ← 필터바 분리 (신규)
│   │       ├── ShopAdjustmentView.tsx  ← [화면 A] (신규)
│   │       ├── PivotDetailView.tsx     ← [화면 B] = 현재 ReplenishmentTab 내부
│   │       ├── AddShopModal.tsx        ← 매장 추가 모달 (신규)
│   │       └── charts/
│   │           ├── ShopForecastBar.tsx ← ① 매장별 예측 바차트 (recharts)
│   │           ├── AdjRankSummary.tsx  ← ② 등급별 분포 요약
│   │           └── StockGauge.tsx      ← ③ AP재고 vs 예측 게이지
│   ├── data/
│   │   ├── shop_grp_archive.json       ← Snowflake 아카이빙 (신규)
│   │   └── forecast_archive.json       ← Snowflake 아카이빙 (신규)
│   └── lib/
│       ├── api-client.ts               ← API 호출 유틸 (신규)
│       ├── xlsx-builder.ts             ← 엑셀 템플릿 조립 (신규, 서버 전용)
│       └── types.ts                    ← 타입 정의 (신규)
└── public/
    └── templates/
        └── 엑셀배분_템플릿.xlsx         ← 서버에서 읽는 템플릿 (신규 복사)
```

**Phase 상태**: `'adjustment' | 'detail'` — [화면 A]/[화면 B] 전환용. "조회하기" → `adjustment`, "시뮬레이션" 성공 → `detail`.

---

## 5. 엑셀 다운로드 — Next.js API Route 구조

**엔드포인트**: `GET /api/export-xlsx?...query...` 또는 `POST /api/export-xlsx` (페이로드에 배분 결과)

**서버 처리 흐름**
1. 템플릿 `public/templates/엑셀배분_템플릿.xlsx` 열기 (ExcelJS)
2. 헤더 행(1~3행) 유지, 4행부터 데이터 주입
3. 각 행: `FROM-AP CODE` + `TO-매장 CODE` + 시즌 + 스타일 + 컬러 + 사이즈 + 요청수량 (Case 3 물류배분)
4. 배분 수량 > 0 인 모든 SCS × 매장 조합을 행으로 변환
5. 파일명: `보충배분_{shopGrpNo}_{executionDate}_{timestamp}.xlsx` 로 스트리밍 응답

**타임아웃 걱정 없음**: 500~1000행 기준 1~3초. Vercel Hobby 10초 한도 내.

---

## 6. 주요 타입 정의 (초안)

```typescript
// Snowflake 아카이빙
type ShopGrp = {
  shopGrpNo: string;
  shopGrpNm: string;
  shopCnt: number;
  shops: { shopCd: string; adjRank: number }[];
};
type Forecast = { shopCd: string; sizCd: string; qty: number };

// SERP
type WarehouseStock = { sizCd: string; qty: number };
type ShopStock = { shopCd: string; shopNm: string; sizCd: string; qty: number };

// ILP 요청
type OptimizeRequest = {
  prodCd: string; colorCd: string; brandCd: string; ssnCd: string;
  executionDate: string;  // 자동: today
  shopGrpNo: string;
  warehouseStock: WarehouseStock[];
  targetShops: {
    shopCd: string; shopNm: string; adjRank: number;
    currentStock: { sizCd: string; qty: number }[];
  }[];
};

// 화면 상태
type Phase = 'adjustment' | 'detail';
type Filters = {
  brandCd: string; apCd: string; ssnCd: string;
  shopGrpNo: string;          // 신규 — 드롭다운
  prodCd: string; colorCd: string;
  executionDate: string;      // 숨김, 자동
};
```

---

## 7. 확정되지 않은 세부 항목 (task.md에 기본값으로 넣고 조정 가능)

- **매장 제거 UI**: 매장 조정 테이블 각 행 끝의 X 아이콘 (기본값). 또는 체크박스 + 상단 "선택 매장 제거" 버튼.
- **AllocationResult 스키마**: 노션에 "기존 스키마" 라고만 언급. 실제 키 확인 필요. **→ task.md 작성 시 임시 타입 정의 + 실 데이터 오면 조정.**
- **초기화 버튼**: 기존 stub 유지 여부. 기본값 — 필터만 초기화(데이터/화면은 유지).
- **매장 추가 시 adjRank**: "max(기존 adjRank) + 1" 로 자동 할당.

---

## 8. 마일스톤 & 일정

| 날짜 | 항목 | 비고 |
|---|---|---|
| 2026-04-22 (수) | 분석 검수 완료 | ★ 오늘 |
| 2026-04-22~23 | task.md 작성 + 구현 착수 | |
| **2026-04-24 (금)** | **MVP 리뷰** | 사업부 로직 테스트용 배포, 피드백 수집 |
| 추후 | ML 배치 처리 + ILP RT-On 추가 | Colly |

---

## 9. 결론 — 이 분석 기반으로 생성할 task.md 윤곽

- **Phase 1**: 프로젝트 구조 정리 — `app/api/*` Route 6개 생성, `lib/types.ts`, `lib/api-client.ts`, 템플릿 복사
- **Phase 2**: 데이터 레이어 — 아카이빙 JSON 2개 (목업), `/api/shop-grp`, `/api/forecast` Route
- **Phase 3**: SERP 프록시 — `/api/warehouse-stock`, `/api/shop-stock` (개발 중 목업 응답, 실 API 연결 플래그)
- **Phase 4**: 상태 머신 리팩터 — `ReplenishmentTab` 을 컨테이너화, `phase` 상태, `FilterBar` 분리
- **Phase 5**: [화면 A] `ShopAdjustmentView` + 차트 3종 + `AddShopModal`
- **Phase 6**: [화면 B] 기존 피벗 유지, `/api/optimize` 연결, ILP 결과 → 배분 셀 반영
- **Phase 7**: 엑셀 다운로드 — `/api/export-xlsx` 서버 구현, 버튼 연결
- **Phase 8**: 통합 테스트 시나리오 + MVP 배포 체크리스트
