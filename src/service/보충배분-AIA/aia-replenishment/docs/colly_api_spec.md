# Colly API 명세 요약 (FE 구현 기준)

> 출처: 노션 「FE - ILP API 연동 참고 문서」 (2026-04-22, Colly)
> 원본: https://www.notion.so/fnf-digital/FE-ILP-API-34afd8bcf55880868b1cd603d9aae436
> Swagger: http://10.81.1.91:8002/docs (사내망 전용)

---

## 1. 우리 프로젝트의 호출 범위

Colly 서버는 **6개 엔드포인트**를 제공하지만, 본 프로젝트는 **원칙적으로 `POST /optimize` 하나만 실 호출**한다.
나머지 5개는 Snowflake 아카이빙 JSON 으로 대체한다.

| Colly 엔드포인트 | 우리 처리 |
|---|---|
| `GET /dropdowns/ssns` | ❌ 호출 안 함 → `src/data/ssn_archive.json` |
| `GET /dropdowns/shop-grps` | ❌ 호출 안 함 → `src/data/shop_grp_dropdown_archive.json` |
| `GET /dropdowns/sc` | ❌ 호출 안 함 → `src/data/sc_archive.json` (= 스타일 카탈로그) |
| `GET /shop-grp?shopGrpNo=…` | ❌ 호출 안 함 → `src/data/shop_grp_archive.json` |
| `GET /forecast?…` | ❌ 호출 안 함 → `src/data/forecast_archive.json` |
| `POST /optimize` | ✅ **실 호출** — `src/app/api/optimize/route.ts` 가 프록시 |

별도로 SERP 실 호출 2개 (예정):
- `GET <SERP>/warehouse-stock` (프록시 → `src/app/api/warehouse-stock/route.ts`)
- `GET <SERP>/shop-stock` (프록시 → `src/app/api/shop-stock/route.ts`)

> ⚠️ **현재 SERP API 는 IT팀으로부터 수령 전**. URL·스펙 미확정 상태라
> `NEXT_PUBLIC_USE_MOCK_API=true` 로 강제하고 시드 기반 목업으로 동작시킨다.
> 상세: 본 문서 §7 "SERP API 미수령 대응".

## 2. 왜 이렇게 하는가

- 아카이빙 JSON 방식은 **조회하기 클릭 전에도 드롭박스 선택지를 즉시 표시**할 수 있다 (Colly API 호출 왕복 없음).
- 사내망(10.81.1.91) 의존도를 낮춘다 — Vercel 프리뷰/외부 데모 환경에서도 동작.
- 스펙 변동 영향 최소화 — Colly 가 엔드포인트 모양을 바꿔도 우리는 JSON 갱신 주기만 맞추면 됨.
- 단점: 아카이빙 배치가 지연되면 데이터가 오래됨 → 운영 단계에서 일·주 단위 갱신 SLA 필요.

---

## 3. 아카이빙 JSON 포맷 (Colly 응답을 그대로 따름)

### 3.1 `ssn_archive.json` (예: W1 기준 최근 6개)
```json
{
  "items": [
    { "ssnCd": "26S" },
    { "ssnCd": "25F" },
    { "ssnCd": "25S" },
    { "ssnCd": "24F" }
  ]
}
```

### 3.2 `shop_grp_dropdown_archive.json`
```json
{
  "items": [
    { "shopGrpNo": "XSHGR202512100000003546", "shopGrpNm": "26S 아우터" },
    { "shopGrpNo": "XSHGR202512100000003547", "shopGrpNm": "26S 이너" }
  ]
}
```

### 3.3 `sc_archive.json` (= 스타일 네비게이터 소스)
```json
{
  "items": [
    {
      "brandCd": "X",
      "ssnCd": "25F",
      "prodCd": "DMDJ61046",
      "colorCd": "BKS",
      "prodNm": "울 블렌드 자켓 BLACK",
      "item": "JKDM",
      "prdtKindCd": "OUTR"
    }
  ]
}
```
- 스타일 네비게이터의 분류 트리(대분류/중분류/아이템)는 `prdtKindCd` / `item` 값을 가공해서 만든다.
- 컬러 선택지는 `(prodCd, colorCd)` 집합에서 추출.

### 3.4 `shop_grp_archive.json`
```json
{
  "XSHGR202512100000003546": {
    "shopGrpNo": "XSHGR202512100000003546",
    "shopGrpNm": "26S 아우터",
    "shopCnt": 193,
    "shops": [
      { "shopCd": "10075", "adjRank": 1 },
      { "shopCd": "10090", "adjRank": 2 }
    ]
  }
}
```
- **중요**: Colly 응답에 `shopNm` 이 없다. 프론트가 `shopCd` 만 받아 SERP `/shop-stock` 호출 후 `shopNm` 을 채운다.
- 편의상 아카이빙 JSON 에 `shopNm` 을 함께 저장해두면 shop-stock 응답과 cross-check 가능.

### 3.5 `forecast_archive.json`
```json
{
  "X_DMDJ61046_BKS_25F_2026-04-20": {
    "forecastStartDate": "2026-04-20",
    "forecast": [
      { "shopCd": "10075", "sizCd": "90", "qty": 5.0 },
      { "shopCd": "10075", "sizCd": "95", "qty": 8.0 }
    ]
  }
}
```
- 키: `{brandCd}_{prodCd}_{colorCd}_{ssnCd}_{forecastStartDate}`.
- W1 고정이므로 `executionDate` → `forecastStartDate`(월요일) 계산 후 키 조회.

---

## 4. 실 호출 — `POST /optimize`

### 요청

```json
{
  "brandCd": "X",
  "ssnCd": "25F",
  "prodCd": "DMDJ61046",
  "colorCd": "BKS",
  "executionDate": "2025-01-18",
  "warehouseStock": [
    { "sizCd": "90",  "qty": 100 },
    { "sizCd": "95",  "qty": 250 },
    { "sizCd": "100", "qty": 150 }
  ],
  "targetShops": [
    {
      "shopCd": "10075",
      "shopNm": "신세계본점",
      "adjRank": 1,
      "currentStock": [
        { "sizCd": "90",  "qty": 2 },
        { "sizCd": "95",  "qty": 0 },
        { "sizCd": "100", "qty": 1 }
      ]
    }
  ]
}
```

### 응답 — `AllocationResult` (요약)

```json
{
  "brandCd": "X",
  "ssnCd": "25F",
  "prodCd": "X_DMDJ61046_BKS",
  "colorCd": "BKS",
  "status": "OPTIMAL",
  "objectiveValue": 0.98,
  "shopAllocations": [
    {
      "shopCd": "10075",
      "shopNm": "신세계본점",
      "adjRank": 1,
      "adjRankScore": 1.0,
      "allocations": [
        {
          "sizCd": "90",
          "allocQty": 3,
          "currentStock": 2,
          "finalStock": 5,
          "predScsShopQty": 5.0,
          "effectiveTarget": 5.0,
          "deviation": 0.0,
          "absDeviation": 0.0
        }
      ],
      "totalAllocSCQty": 14,
      "totalCurrentSCStock": 3,
      "totalFinalSCStock": 17,
      "totalPredScShopQty": 17.0,
      "totalEffectiveSCTarget": 17.0,
      "totalSCError": 0.0,
      "totalSCSError": 0.0
    }
  ],
  "warehouseRemaining": [{ "sizCd": "90", "qty": 97 }],
  "totalAllocatedSCQty": 19,
  "totalAllocatedSCError": 0.0,
  "totalAllocatedSCSError": 0.0,
  "totalTargetShops": 2,
  "totalAllocatedShops": 2,
  "solveTimeMs": 12.5,
  "timestamp": "2025-01-18T15:30:00"
}
```

### 화면 매핑 (자주 쓰는 키)

| 응답 필드 | 화면 표시 |
|---|---|
| `status` | `"OPTIMAL"` 정상 / `"INFEASIBLE"` 토스트 경고 |
| `shopAllocations[].allocations[].allocQty` | 3컬럼 피벗의 **배분** 셀 값 |
| `shopAllocations[].allocations[].finalStock` | 할당 후 최종 재고 표시(선택) |
| `shopAllocations[].adjRank` | 행 정렬 기준 |
| `warehouseRemaining[]` | SCS 요약 패널의 AP 잔량 |
| `solveTimeMs` | 토스트에 "배분 완료 · 12ms" 같이 표기(선택) |

---

## 5. 환경변수 요약

`.env.local` (로컬 개발용, git 제외) — `.env.local.example` 참고

```
NEXT_PUBLIC_USE_MOCK_API=true            # IT팀/Colly 연결 전까지 true
ILP_API_BASE=http://10.81.1.91:8002      # POST /optimize 프록시 대상
NEXT_PUBLIC_SERP_API_BASE=               # IT팀 확정 시 기입
ILP_TIMEOUT_MS=60000
SERP_TIMEOUT_MS=15000
```

**프로덕션(Vercel)** 에서 사내망 `10.81.1.91` 직접 호출이 불가능하면,
중간 프록시(IT팀 제공 게이트웨이) URL 로 교체.

---

## 6. 체크리스트 (Phase 2 구현 시)

- [ ] `POST /api/optimize` 가 mock 모드에서 실제 스키마와 동일한 `AllocationResult` 를 반환
- [ ] `POST /api/optimize` 가 실 모드에서 `ILP_API_BASE/optimize` 로 정확히 프록시
- [ ] `shopGrpNo` 는 요청 페이로드에 **포함하지 않음** (Colly 스펙에 없음)
- [ ] 예측치/배분그룹/드롭박스는 `/api/*` 엔드포인트가 `src/data/*_archive.json` 만 읽음
- [ ] Snowflake 아카이빙 배치 운영 담당 확인 (Colly? IT팀? 주기?)
- [ ] SERP API 수령 전까지 `NEXT_PUBLIC_USE_MOCK_API=true` 유지 (§7 참조)

---

## 7. SERP API 미수령 대응 (2026-04-22 현재)

### 7.1 현황
- **ILP API**: ✅ Colly 제공, `http://10.81.1.91:8002` 로 호출 가능
- **SERP API**: ❌ **IT팀 미수령** — URL·엔드포인트 스펙·인증 방식 전부 미확정
  - `GET <SERP>/warehouse-stock` 스펙 없음
  - `GET <SERP>/shop-stock` 스펙 없음
- S-ERP IT팀 킥오프는 2026-04-08 완료, "협의 필요 API" 항목으로 확인되었으나 명세는 아직.

### 7.2 우리 쪽 구현 방침
SERP URL 이 없어도 **Phase 2~8 전체를 완료할 수 있도록** 아래 2중 방어를 둔다:

1. **API Route 레벨**
   - `/api/warehouse-stock`, `/api/shop-stock` 모두 `NEXT_PUBLIC_USE_MOCK_API === 'true'` 이면 mock 응답을 즉시 반환
   - mock 응답은 `src/data/mockAdjustmentData.ts` 의 `MOCK_WAREHOUSE_STOCK`, `mockShopStock()` 함수를 그대로 사용 (결정적 해시 시드 → 동일 입력 동일 출력)
   - 실 URL(`NEXT_PUBLIC_SERP_API_BASE`) 이 비어있는데 mock 스위치도 false 면 500 Error `{ detail: "SERP_API_BASE not configured" }` 를 반환해 명시적 실패.

2. **환경 변수 디폴트**
   - `.env.local.example` 이 `NEXT_PUBLIC_USE_MOCK_API=true` 로 고정
   - IT팀 수령 후 `.env.local` 을 수정하면 즉시 실 모드 전환 (코드 변경 불필요)

### 7.3 MVP 리뷰(04-24) 영향
- 사업부 데모·UX 검증은 **mock 만으로 완전히 가능**. 수치가 실물과 다를 뿐 흐름은 동일.
- 이때 피드백 수집하고, SERP URL 이 오는 대로 전환하면 수치만 실물로 교체됨.

### 7.4 IT팀에 요청할 사항 (정리)
- [ ] SERP 서버 Base URL (사내망 + 외부 Vercel 에서 접근 가능한 경로)
- [ ] `warehouse-stock` 요청 파라미터·응답 스키마 (현재 우리 가정: `?prodCd&colorCd&brandCd&ssnCd` → `{ stocks: [{sizCd, qty}] }`)
- [ ] `shop-stock` 요청 파라미터·응답 스키마 (현재 가정: `?prodCd&colorCd&brandCd&ssnCd&shopCds` → `{ shopStocks: [{shopCd, shopNm, sizCd, qty}] }`)
- [ ] 인증 방식 (API Key/Bearer/Cookie — 필요 시 추가 env 로 분리)
- [ ] Rate Limit / 동시 호출 제한
- [ ] 실 데이터 갱신 주기 (재고는 실시간인지 배치인지)

### 7.5 만약 "한 번만 snapshot" 이라도 얻을 수 있다면
IT팀이 API 를 당장 못 열어준다면, **특정 (brandCd, ssnCd, prodCd, colorCd) 몇 개에 대해 재고 스냅샷 JSON** 을 수동 덤프로 받아 `src/data/warehouse_stock_sample.json`, `src/data/shop_stock_sample.json` 으로 박아두는 것도 대안. 이러면 MVP 데모에서 실제에 가까운 수치가 보이게 된다.
