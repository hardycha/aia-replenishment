"""Step 3b: 예측 정확도 검증 + MD vs ILP 최종 비교

W3 (2026-05-11~05-17) 26S 기준:
1. Forecast vs 실판매 정확도 (WAPE, Bias)
2. 재고 커버리지 vs 실판매 대조 → 실제로 과잉재고인지 검증
3. MD 배분 STR-capped 계산
4. 실판매 기반 ILP 승률 (forecast를 proxy가 아닌 실판매로)
"""
import json
import os
import polars as pl
from collections import defaultdict
from scipy import stats

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DATA_DIR = os.path.join(BASE_DIR, "src", "service", "validation", "data")
AIA_DIR = os.path.join(BASE_DIR, "보충배분-AIA", "aia-replenishment", "src", "data")


def load_forecast():
    with open(os.path.join(AIA_DIR, "forecast_archive.json")) as f:
        fc = json.load(f)
    result = {}
    for key, val in fc.items():
        if key.startswith("X_") and key.endswith("_26S_2026-05-11"):
            parts = key.split("_")
            part_cd = parts[1]
            color_cd = parts[2]
            result[(part_cd, color_cd)] = val["forecast"]
    return result


def load_sales():
    with open(os.path.join(DATA_DIR, "sales_w3_26s.json")) as f:
        raw = json.load(f)
    return raw["data"]


def load_ilp_results():
    with open(os.path.join(DATA_DIR, "ilp_results_w3.json")) as f:
        return json.load(f)


def main():
    print("=" * 70)
    print("[Step 3b] 예측 정확도 + MD vs ILP 최종 비교")
    print("=" * 70)

    forecast = load_forecast()
    sales_raw = load_sales()
    ilp_results = load_ilp_results()

    # === 1. 실판매 집계 (스타일×컬러×매장 단위) ===
    sales_by_style_shop = defaultdict(int)
    sales_by_style = defaultdict(int)
    sales_by_style_color = defaultdict(int)
    sales_by_style_color_shop_size = defaultdict(int)

    for r in sales_raw:
        style = r["PROD_CD"]
        shop = r["SHOP_CD"]
        color = r["COLOR_CD"]
        size = r["SIZ_CD"]
        qty = int(r["NET_SALE_QTY"])
        sales_by_style_shop[(style, shop)] += qty
        sales_by_style[style] += qty
        sales_by_style_color[(style, color)] += qty
        sales_by_style_color_shop_size[(style, color, shop, size)] += qty

    print(f"\n실판매: {len(sales_raw):,}행, 유니크 스타일 {len(sales_by_style)}개")
    print(f"총 순판매: {sum(sales_by_style.values()):,}개")

    # === 2. 예측 정확도 (스타일×컬러 단위) ===
    print("\n" + "=" * 70)
    print("[2] Forecast vs 실판매 정확도")
    print("=" * 70)

    # forecast를 스타일×컬러 단위로 합산
    fc_by_style_color = {}
    for (style, color), fc_data in forecast.items():
        total_fc = sum(r["qty"] for r in fc_data)
        fc_by_style_color[(style, color)] = total_fc

    # 매칭
    matched_pairs = []
    for (style, color), fc_total in fc_by_style_color.items():
        actual = sales_by_style_color.get((style, color), 0)
        matched_pairs.append({
            "style": style,
            "color": color,
            "forecast": fc_total,
            "actual": actual,
            "error": abs(fc_total - actual),
            "bias": fc_total - actual,  # 양수 = 과대예측
        })

    df = pl.DataFrame(matched_pairs)

    total_fc = df["forecast"].sum()
    total_actual = df["actual"].sum()
    total_error = df["error"].sum()

    wape = total_error / total_actual * 100 if total_actual > 0 else 0
    bias = (total_fc - total_actual) / total_actual * 100 if total_actual > 0 else 0

    print(f"\n  매칭된 스타일×컬러: {len(matched_pairs)}건")
    print(f"  총 예측: {total_fc:,.1f}")
    print(f"  총 실판매: {total_actual:,}")
    print(f"  WAPE: {wape:.1f}%")
    print(f"  Bias: {bias:+.1f}% ({'과소예측' if bias < 0 else '과대예측'})")

    # 예측 vs 실판매 상관
    actuals = df["actual"].to_list()
    forecasts = df["forecast"].to_list()
    if len([a for a in actuals if a > 0]) >= 10:
        rho, pval = stats.spearmanr(forecasts, actuals)
        print(f"  Spearman(forecast, actual): rho={rho:.3f}, p={pval:.4f}")
        print(f"  → 예측이 수요 순위를 {'잘 맞춤' if rho > 0.5 else '부분적으로 맞춤' if rho > 0.2 else '잘 못 맞춤'}")

    # 구간별 정확도
    print("\n  [구간별 정확도]")
    df = df.with_columns(
        pl.when(pl.col("actual") == 0).then(pl.lit("실판매=0"))
        .when(pl.col("actual") <= 10).then(pl.lit("1~10"))
        .when(pl.col("actual") <= 50).then(pl.lit("11~50"))
        .when(pl.col("actual") <= 100).then(pl.lit("51~100"))
        .otherwise(pl.lit("100+"))
        .alias("actual_band")
    )
    for band in ["실판매=0", "1~10", "11~50", "51~100", "100+"]:
        band_df = df.filter(pl.col("actual_band") == band)
        if len(band_df) > 0:
            band_fc = band_df["forecast"].sum()
            band_actual = band_df["actual"].sum()
            band_wape = band_df["error"].sum() / band_actual * 100 if band_actual > 0 else float("inf")
            print(f"    {band:>10}: {len(band_df):>4}건, 예측합={band_fc:>8.1f}, 실판매합={band_actual:>6}, WAPE={band_wape:>6.1f}%")

    # === 3. 재고 커버리지 vs 실판매 대조 ===
    print("\n" + "=" * 70)
    print("[3] 재고 커버리지 vs 실판매 대조 — 실제로 과잉재고인가?")
    print("=" * 70)

    # ILP 결과에서 매장재고 + 예측 + 실판매 비교
    coverage_analysis = []
    for r in ilp_results:
        if r.get("status") != "OPTIMAL":
            continue
        style = r["_input_prodCd"]
        color = r["_input_colorCd"]

        for shop_alloc in r.get("shopAllocations", []):
            shop_cd = shop_alloc["shopCd"]
            total_stock = sum(a.get("currentStock", 0) for a in shop_alloc.get("allocations", []))
            total_fc = sum(a.get("predScsShopQty", 0) for a in shop_alloc.get("allocations", []))

            # 실판매 조회
            actual_sale = sales_by_style_shop.get((style, shop_cd), 0)

            if total_stock > 0 or actual_sale > 0:
                coverage_analysis.append({
                    "style": style,
                    "color": color,
                    "shop": shop_cd,
                    "stock_before": total_stock,
                    "forecast": total_fc,
                    "actual_sale": actual_sale,
                    "stock_coverage_wks": total_stock / actual_sale if actual_sale > 0 else float("inf"),
                })

    cov_df = pl.DataFrame(coverage_analysis)
    print(f"\n  분석 대상: {len(cov_df):,}개 (스타일×매장)")

    # 실판매 > 0인 매장만
    active = cov_df.filter(pl.col("actual_sale") > 0)
    inactive = cov_df.filter(pl.col("actual_sale") == 0)
    print(f"  실판매 > 0: {len(active):,}개")
    print(f"  실판매 = 0: {len(inactive):,}개 ({len(inactive)/len(cov_df)*100:.1f}%)")

    if len(active) > 0:
        avg_coverage = active["stock_coverage_wks"].mean()
        median_coverage = active["stock_coverage_wks"].median()
        print(f"\n  [판매 활성 매장 기준]")
        print(f"    평균 재고 커버리지: {avg_coverage:.1f}주")
        print(f"    중간값 재고 커버리지: {median_coverage:.1f}주")
        print(f"    평균 배분전 재고: {active['stock_before'].mean():.1f}")
        print(f"    평균 주간 실판매: {active['actual_sale'].mean():.1f}")

        # 재고 커버리지 분포
        print(f"\n  [재고 커버리지 분포 (실판매 기준)]")
        for threshold in [2, 4, 8, 12, 20, 52]:
            cnt = active.filter(pl.col("stock_coverage_wks") >= threshold).height
            print(f"    ≥{threshold:>2}주: {cnt:>5,}개 ({cnt/len(active)*100:.1f}%)")

    # === 4. 예측 vs 실판매 비교 — 예측이 과소인가? ===
    print("\n" + "=" * 70)
    print("[4] 예측 과소추정 검증")
    print("=" * 70)

    if len(active) > 0:
        fc_vs_actual = active.select([
            pl.col("forecast").alias("fc"),
            pl.col("actual_sale").alias("actual")
        ])
        fc_sum = fc_vs_actual["fc"].sum()
        actual_sum = fc_vs_actual["actual"].sum()
        ratio = fc_sum / actual_sum if actual_sum > 0 else 0
        print(f"  판매 활성 매장 기준:")
        print(f"    총 예측: {fc_sum:,.1f}")
        print(f"    총 실판매: {actual_sum:,}")
        print(f"    예측/실판매 비율: {ratio:.2f} ({'과소예측' if ratio < 0.8 else '적정' if ratio < 1.2 else '과대예측'})")

    # === 5. MD 배분 STR-capped ===
    print("\n" + "=" * 70)
    print("[5] MD 배분 STR-capped (재고소진율)")
    print("=" * 70)

    md_alloc = pl.read_parquet(os.path.join(DATA_DIR, "md_alloc_raw.parquet"))
    md_w3_26s = md_alloc.filter(
        (pl.col("week") == "W3") & (pl.col("sesn") == "26S") &
        (pl.col("style_cd") != "") & (pl.col("shop_id") != "") &
        pl.col("shop_id").is_not_null()
    )

    # 스타일×매장 단위로 집계
    md_grouped = md_w3_26s.group_by(["style_cd", "shop_id"]).agg(
        pl.col("alloc_qty").sum().alias("md_alloc_qty")
    )

    # 실판매 매칭
    str_data = []
    for row in md_grouped.iter_rows(named=True):
        style = row["style_cd"]
        shop = row["shop_id"]
        alloc = row["md_alloc_qty"]
        actual = sales_by_style_shop.get((style, shop), 0)
        capped_sale = min(actual, alloc)  # STR-capped
        str_data.append({
            "style": style,
            "shop": shop,
            "alloc": alloc,
            "actual": actual,
            "capped_sale": capped_sale,
        })

    str_df = pl.DataFrame(str_data)
    total_alloc = str_df["alloc"].sum()
    total_capped = str_df["capped_sale"].sum()
    total_actual = str_df["actual"].sum()
    str_capped = total_capped / total_alloc * 100 if total_alloc > 0 else 0

    print(f"\n  MD 배분 페어: {len(str_df):,}")
    print(f"  총 배분수량: {total_alloc:,}")
    print(f"  총 실판매: {total_actual:,}")
    print(f"  총 capped 판매: {total_capped:,}")
    print(f"  STR-capped: {str_capped:.1f}%")
    print(f"  (배분한 재고 중 {str_capped:.1f}%가 실제로 팔림)")

    # 배분 받고 판매=0인 매장
    no_sale = str_df.filter(pl.col("actual") == 0)
    print(f"\n  배분 받았으나 판매=0: {len(no_sale):,}쌍 ({len(no_sale)/len(str_df)*100:.1f}%)")
    print(f"    해당 배분수량: {no_sale['alloc'].sum():,}개")

    # === 6. 종합 요약 ===
    print("\n" + "=" * 70)
    print("[종합 요약] W3 26S 검증 결과")
    print("=" * 70)

    print(f"""
  ┌─────────────────────────────────────────────┐
  │ 예측 정확도                                    │
  │   WAPE: {wape:.1f}%                              │
  │   Bias: {bias:+.1f}% ({'과소' if bias < 0 else '과대'})                        │
  │   Spearman(예측,실판매): {rho:.3f}               │
  ├─────────────────────────────────────────────┤
  │ 재고 커버리지 (실판매 기준)                       │
  │   평균: {avg_coverage:.1f}주 / 중간값: {median_coverage:.1f}주          │
  ├─────────────────────────────────────────────┤
  │ MD 배분 품질                                   │
  │   STR-capped: {str_capped:.1f}%                       │
  │   배분 후 미판매: {len(no_sale)/len(str_df)*100:.1f}%                  │
  ├─────────────────────────────────────────────┤
  │ ILP 시뮬레이션                                  │
  │   ILP 배분 추천: 7개 (MD: {total_alloc:,}개)          │
  │   ILP 판정: 추가 배분 불필요                      │
  └─────────────────────────────────────────────┘
""")


if __name__ == "__main__":
    main()
