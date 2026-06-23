# 수요지수(Demand Index) 산정 로직 분석

> 작성일: 2026-04-29
> 대상: 보충배분-AIA [화면 A] 매장 조정 화면의 "수요지수" 컬럼

---

## 1. 한 줄 요약

> **수요지수 = 해당 매장의 예측 판매량 ÷ 배분그룹 내 최대 매장의 예측 판매량 × 100 (반올림)**
>
> 가장 많이 팔릴 것으로 예측되는 매장이 100, 나머지 매장은 상대적 비율로 0~99.

---

## 2. 데이터 흐름 (원천 → 화면)

```
Snowflake
  └─ FNF.ML_DIST.PRED_SH_SCS_W (예측 테이블)
       ↓ scripts/sync_forecast.py (배치 실행)
src/data/forecast_archive.json
       ↓ GET /api/forecast (API Route)
ReplenishmentTab.tsx handleQuery()
       ↓ 수요지수 계산
[화면 A] 매장 테이블 + 바차트
```

---

## 3. 단계별 상세

### Step 1: Snowflake에서 예측값 추출

**테이블**: `FNF.ML_DIST.PRED_SH_SCS_W`

| 컬럼 | 의미 | 예시값 |
|------|------|--------|
| `PART_CD` | 스타일코드 | DKAZ11061 |
| `COLOR_CD` | 컬러코드 | BES |
| `SIZE_CD` | 사이즈 | 130, 140, 150 등 |
| `SHOP_ID` | 매장코드 | 10018 |
| `PRED_SH_SCS_NORM_QTY` | **정규화된 SCS 예측값** (소수점) | 0.0151 |
| `METHOD_CD` | 예측 모델 | tsb |
| `PRED_START_DT` | 예측 시작일 (주 월요일) | 2026-04-27 |

이 값은 **SC-Total 예측(전체 판매량)을 매장별 비중 × 사이즈별 비중으로 분배한 값**입니다.

예: SC-Total이 11.2개이고, 매장 10018의 SC 비중이 0.075, 사이즈 130의 PO_RATIO가 0.200이면:
```
PRED_SH_SCS_NORM_QTY = 11.2 × 0.075 × 0.200 ≈ 0.0151
```

### Step 2: forecast_archive.json 생성

`sync_forecast.py`가 Snowflake에서 전량을 뽑아 JSON으로 저장합니다.

```json
{
  "X_DKAZ11061_BES_26S_2026-04-27": {
    "forecastStartDate": "2026-04-27",
    "forecast": [
      { "shopCd": "11005", "sizCd": "130", "qty": 0.0151 },
      { "shopCd": "11005", "sizCd": "140", "qty": 0.0207 },
      ...
    ]
  }
}
```

### Step 3: API Route가 해당 스타일-컬러 예측을 반환

`GET /api/forecast?brandCd=X&prodCd=DKAZ11061&colorCd=BES&ssnCd=26S&executionDate=2026-04-28`

- `executionDate`(오늘)를 **주 월요일(W1)**로 변환: `2026-04-28` → `2026-04-27`
- 키 `X_DKAZ11061_BES_26S_2026-04-27`로 JSON 조회
- 매장×사이즈별 예측 배열 반환

### Step 4: 매장별 예측합계 (forecastTotal) 계산

`ReplenishmentTab.tsx:175-189`

```
매장 10018의 forecastTotal
  = SUM(해당 매장의 모든 사이즈 PRED_SH_SCS_NORM_QTY)
  = 0.0138(120) + 0.0151(130) + 0.0207(140) + 0.0166(150) + 0.0137(160)
  = 0.0799
```

이 값은 **이 매장에서 이 스타일-컬러가 다음 주에 팔릴 총 예상 수량**(소수점).

### Step 5: 수요지수 계산 (핵심)

`ReplenishmentTab.tsx:192-196`

```typescript
// 배분그룹 내 전체 매장 중 forecastTotal이 가장 큰 매장을 찾음
const maxFc = Math.max(...shopRows.map((s) => s.forecastTotal), 0.001);

// 각 매장의 수요지수 = (해당 매장 예측 / 최대 매장 예측) × 100
for (const shop of shopRows) {
  shop.demandIndex = Math.round((shop.forecastTotal / maxFc) * 100);
}
```

**공식:**
```
수요지수 = ROUND( forecastTotal / MAX(forecastTotal) × 100 )
```

**예시** (배분그룹에 5개 매장이 있다고 가정):

| 매장 | forecastTotal | 계산 | 수요지수 |
|------|--------------|------|---------|
| 명동점 | 0.0990 | 0.0990 / 0.0990 × 100 | **100** |
| 강남점 | 0.0750 | 0.0750 / 0.0990 × 100 | **76** |
| 잠실점 | 0.0500 | 0.0500 / 0.0990 × 100 | **51** |
| 부산점 | 0.0250 | 0.0250 / 0.0990 × 100 | **25** |
| 포항점 | 0.0050 | 0.0050 / 0.0990 × 100 | **5** |

### Step 6: 화면 표시

| 위치 | 표시 | 호버 툴팁 |
|------|------|----------|
| 매장 테이블 "수요지수" 컬럼 | `76` (보라색 정수) | `예상 판매량: 0.08개` |
| 바차트 | 수요지수 0~100 막대 | `강남점 (adjRank 3)` / `수요지수: 76` |

---

## 4. 특수 케이스

| 케이스 | 처리 |
|--------|------|
| 예측치 없음 (404) | 모든 매장 forecastTotal=0, 수요지수=0 |
| 모든 매장 예측 동일 | 전부 수요지수 100 |
| 매장 추가 (매장 추가 모달) | demandIndex=0 고정 (예측 데이터 없으므로) |
| maxFc가 0 | 분모 최소값 0.001로 방어 → 전부 수요지수 0 |
| ALL 컬러 선택 | 각 컬러별 탭으로 전개, 탭마다 독립 수요지수 계산 |

---

## 5. 수요지수의 의미 해석

수요지수는 **절대적인 판매 예측 수량이 아닌, 배분그룹 내 상대적 수요 크기**입니다.

- **수요지수 100** = 이 배분그룹에서 가장 많이 팔릴 것으로 예측되는 매장
- **수요지수 50** = 최대 매장의 절반 수준 예측
- **수요지수 0** = 예측 판매량이 거의 없거나 데이터 없음

MD(상품기획자)는 이 지수를 보고:
- 수요지수가 높은 매장 → 배분 우선 대상
- 수요지수가 0인 매장 → 배분에서 제거 검토
- 수요지수 대비 adjRank가 맞지 않는 매장 → 등급 재검토

---

## 6. 향후 개선 가능 방향

| 개선 | 설명 |
|------|------|
| 절대값 병기 | 수요지수 옆에 실제 예상 수량(0.08개) 작게 표시 |
| 등급 표시 | A(상위 10%), B(상위 30%), C(기타) 뱃지 추가 |
| 히스토리 비교 | 전주 대비 수요지수 변동 (↑↓) 표시 |
| 컬러별 합산 | ALL 선택 시 컬러 합산 수요지수도 제공 |

---

## 7. 코드 위치

| 파일 | 행 | 역할 |
|------|-----|------|
| `scripts/sync_forecast.py` | 전체 | Snowflake → JSON 배치 |
| `src/app/api/forecast/route.ts` | 29-38 | JSON 조회 + W1 계산 |
| `src/components/replenishment/ReplenishmentTab.tsx` | 175-196 | forecastTotal 합산 + 수요지수 계산 |
| `src/components/replenishment/ShopAdjustmentView.tsx` | 매장 테이블 | 수요지수 표시 + 툴팁 |
| `src/components/replenishment/charts/ShopForecastBar.tsx` | 전체 | 수요지수 바차트 |
| `src/lib/types.ts` | 220-227 | ShopRow.demandIndex 타입 정의 |
