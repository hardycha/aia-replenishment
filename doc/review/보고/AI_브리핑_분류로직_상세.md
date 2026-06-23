# AI 재고 브리핑 — 분류 로직 상세

> 작성일: 2026-06-02  
> 대상: Discovery(X) 26S  
> 목적: 사업부 검토용 — 로직의 적절성 및 분류 결과 검증

---

## 전체 흐름

```
① 각 SC(스타일×컬러)마다 3가지 신호를 측정
② 3가지 신호로 4개 그룹 중 하나로 분류
③ 점수 높은 순으로 정렬하여 화면에 표시
```

---

## 1. 신호 ①: 창고 재고 긴급도 (coverage_urgency)

### 자연어 설명

> "이 SC의 창고(AP) 재고가 앞으로 몇 주 동안 배분할 수 있는 양인가?"

- 창고 재고를 주간 예측 판매량으로 나누면 "몇 주치 재고"인지 알 수 있습니다
- 예: 창고 100개, 주간 예측 50개 → 2주치 → 여유
- 예: 창고 20개, 주간 예측 40개 → 0.5주치 → 긴급
- **2주 미만이면 긴급**, 0에 가까울수록 더 급함

### 코드

```python
# 커버리지 주수 = AP 창고 재고 / 주간 예측 판매량
coverage_weeks = ap_stock / (weekly_forecast + 0.01)

# 긴급도 점수: 2주를 기준선으로, 부족할수록 높음 (0~1)
coverage_urgency = max(0, 1 - coverage_weeks / 2.0)

# coverage_weeks >= 2.0 → 긴급도 0 (여유)
# coverage_weeks = 1.0 → 긴급도 0.5
# coverage_weeks = 0   → 긴급도 1.0 (최대 긴급)
```

### 데이터 소스

| 항목 | 소스 | 비고 |
|------|------|------|
| AP 창고 재고 | DCS AI `get_product_stock` → `WH_STOCK_QTY` | SERP와 일치 확인 완료 |
| 주간 예측 판매량 | Snowflake `PRED_SC_W` → `PRED_SC_QTY` | 최신 EXECUTION_DT 기준 |

---

## 2. 신호 ②: RT(매장 간 이동) 필요도 (rt_score)

### 자연어 설명

> "창고에 줄 재고가 없는데, 매장들 사이에 재고가 쏠려있는가?"

RT(Rotation)는 매장 간 재고 이동입니다. 다음 두 조건이 **동시에** 성립해야 RT가 의미 있습니다:

- **조건 A**: 창고에 재고가 부족하다 → 정상 배분(창고→매장)으로 해결 안 됨
- **조건 B**: 매장 간 재고가 불균등하다 → 어떤 매장은 많고 어떤 매장은 비어있다

| 상황 | 조건 A (창고 부족) | 조건 B (매장 쏠림) | RT 필요? |
|------|-----------------|------------------|---------|
| 창고 충분 + 매장 균등 | ❌ | ❌ | ❌ 그냥 배분 |
| 창고 충분 + 매장 쏠림 | ❌ | ✅ | ❌ 창고에서 배분하면 됨 |
| 창고 부족 + 매장 균등 | ✅ | ❌ | ❌ 옮길 여유 매장도 없음 |
| **창고 부족 + 매장 쏠림** | ✅ | ✅ | **✅ RT 권장** |

추가로, 재고를 줄 수 있는 매장(재고 2개 이상)이 실제로 있는지도 확인합니다.

### 코드

```python
def compute_rt_score(shop_stocks, ap_stock, weekly_forecast):
    """SC 레벨 RT 필요도. 매장 선택은 이 단계에서 하지 않음."""
    
    if not shop_stocks or sum(shop_stocks) == 0:
        return 0.0

    # ① 창고 부족도 (0~1)
    ap_coverage = ap_stock / (weekly_forecast + 0.01)
    ap_shortage = max(0, 1 - ap_coverage / 2.0)
    # 창고 2주치 이상이면 0 (충분), 0이면 1 (고갈)

    # ② 매장 간 불균등도 (0~1)
    mean_stock = 평균(매장 재고)
    std_stock = 표준편차(매장 재고)
    cv = std_stock / (mean_stock + 0.01)  # 변동계수
    distribution_imbalance = min(1.0, cv / 1.5)
    # 매장 재고가 고른 분포 → 0에 가까움
    # 매장 재고가 쏠린 분포 → 1에 가까움

    # ③ 줄 수 있는 매장이 있는가
    donor_exists = any(재고 >= 2 for 재고 in shop_stocks)
    if not donor_exists:
        return 0.0  # 줄 매장이 없으면 RT 불가

    # RT 점수 = 창고 부족 × 매장 쏠림 (곱셈: 둘 다 높아야 의미)
    return ap_shortage * distribution_imbalance
```

### 데이터 소스

| 항목 | 소스 |
|------|------|
| 매장별 SC 재고 | Snowflake `DW_SH_SCS_DACUM` (SHOP_ID ≠ 90019) |
| AP 창고 재고 | DCS AI `WH_STOCK_QTY` (신호 ①과 동일) |
| 주간 예측 | Snowflake `PRED_SC_W` (신호 ①과 동일) |

---

## 3. 신호 ③: 판매 가속도 (velocity_signal)

### 자연어 설명

> "최근 2주 판매가 그 전 2주보다 얼마나 빨라졌는가?"

- 최근 2주 판매량과 그 전 2주 판매량을 비교합니다
- 예: 전전 2주 100개 → 최근 2주 150개 → **+50% 가속**
- +40% 이상이면 "급상승" 신호
- 속도가 올라가고 있다면, 지금은 여유 있어도 곧 부족해질 수 있다는 의미

### 코드

```python
# 판매 속도 변화율
if prev_2w_sales > 0:
    velocity_change_pct = (recent_2w_sales - prev_2w_sales) / prev_2w_sales * 100
else:
    velocity_change_pct = 100 if recent_2w_sales > 0 else 0

# 신호 점수: +50% 이상이면 1.0으로 포화 (0~1)
velocity_signal = min(1.0, max(0, velocity_change_pct / 50))
```

### 데이터 소스

| 항목 | 소스 |
|------|------|
| 최근 4주 일별 판매 | Snowflake `BIM_SHOP_DD_STK` → `NOR_SALE_QTY - RTN_SALE_QTY` |

---

## 4. 분류 기준

### 자연어 설명

3가지 신호를 측정한 후, 아래 순서대로 체크하여 **먼저 해당하는 그룹으로 확정**합니다:

| 순서 | 그룹 | 조건 | 의미 |
|------|------|------|------|
| 1 | 🔴 **긴급 보충** | 긴급도 70점 이상 **또는** 커버리지 1주 미만 | 창고에서 매장으로 즉시 보충 필요 |
| 2 | 🔄 **RT 대상** | RT 필요도 50점 이상 | 창고 부족 + 매장 쏠림 → 매장 간 이동 검토 |
| 3 | 📈 **급상승** | 판매 가속 40점 이상 **+** 커버리지 1.5~3.0주 | 아직 여유 있지만 빨라지는 중 → 선제 대응 |
| 4 | ⚪ **정상** | 위 어디에도 해당 안 됨 | 현재 조치 불필요 |

### 코드

```python
if coverage_urgency > 0.7 or coverage_weeks < 1.0:
    signal_type = "urgent"      # 🔴 긴급 보충

elif rt_score > 0.5:
    signal_type = "rt"          # 🔄 RT 대상

elif velocity_signal > 0.4 and 1.5 <= coverage_weeks <= 3.0:
    signal_type = "trend"       # 📈 급상승

else:
    signal_type = "normal"      # ⚪ 정상
```

### 알려진 이슈

**긴급이면서 동시에 RT도 해당하는 SC가 RT 탭에 표시되지 않음**

- 순차 if/elif 구조 때문에 "긴급"에 먼저 걸리면 "RT"로 넘어가지 않음
- 예: 창고 8개(긴급) + 매장 쏠림 심함(RT 해당) → 긴급으로만 분류
- 실제로는 "보충도 하고, 매장 이동도 병행해야" 할 수 있음
- → **사업부 의견에 따라 조정 예정**

---

## 5. 우선순위 점수

### 자연어 설명

각 SC의 최종 점수를 아래 비율로 합산하여, 점수가 높은 SC가 화면 위에 표시됩니다:

- **긴급도 40%** + **RT 필요도 40%** + **판매 가속 20%** = 100%

### 코드

```python
priority_score = 0.40 * coverage_urgency + 0.40 * rt_score + 0.20 * velocity_signal
```

---

## 6. AI 코멘트 생성

### 자연어 설명

각 SC에 대해 AI가 한 줄 코멘트를 자동 생성합니다. 현재는 수치 기반 룰로 생성하며, LLM(대규모 언어모델)은 사용하지 않습니다.

### 코드

```python
def build_ai_reason(coverage_weeks, broken_shops, velocity, ap_stock, signal_type):
    
    if signal_type == "urgent":
        # "상위 14개 매장 재고 부족. AP 18개 기준 0.5주 커버. 판매속도 +52% 상승 중."
        parts = []
        if broken_shops > 0:
            parts.append(f"상위 {broken_shops}개 매장 재고 부족")
        parts.append(f"AP {ap_stock}개 기준 {coverage_weeks:.1f}주 커버")
        if velocity >= 10:
            parts.append(f"판매속도 +{velocity:.0f}% 상승 중")
        return ". ".join(parts) + "."

    if signal_type == "rt":
        # "AP 부족(8개). 하위 매장 과잉 재고 — 상위 11개 매장으로 RT 권장."
        return f"AP 부족({ap_stock}개). 하위 매장 과잉 재고 — 상위 {broken_shops}개 매장으로 RT 권장."

    if signal_type == "trend":
        # "판매속도 전주比 +42% 가속. 선제 배분으로 결품 예방."
        return f"판매속도 전주比 +{velocity:.0f}% 가속. 선제 배분으로 결품 예방."

    return "안정"
```

---

## 7. 필터링 조건

### 자연어 설명

아래에 해당하는 SC는 분석 대상에서 제외합니다:

- 예측 판매량이 0 **이고** AP 창고 재고도 0인 SC → 아직 입고되지 않았거나 시즌 종료된 SC
- 매장 재고와 예측이 모두 없는 SC

### 코드

```python
# 예측도 없고 AP도 없으면 스킵
if weekly_forecast <= 0 and ap_stock <= 0:
    continue

# 예측도 없고 매장 재고도 없으면 스킵
if weekly_forecast <= 0 and len(shop_stocks) == 0:
    continue
```

---

## 8. 용어 정리

| 용어 | 의미 |
|------|------|
| SC | Style-Color. 스타일×컬러 조합 단위 |
| AP | Allocation Party. 물류 창고 |
| 커버리지 | 현재 창고 재고로 몇 주간 배분할 수 있는가 |
| RT | Rotation. 매장 간 재고 이동 |
| 변동계수(CV) | 매장 간 재고의 쏠림 정도. 높을수록 불균등 |
| PRED_SC_W | 주간 SC별 판매 예측 테이블 (LightGBM 모델) |
| WH_STOCK_QTY | 물류 창고 재고 수량 |

---

*보충배분 AIA — F&F DCS AI팀 © 2026*
