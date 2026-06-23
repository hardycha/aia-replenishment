"""Step 1-2: 전처리 + 시즌 3단 분류 + Need Score 분석

Step 1: MD 배분 데이터에 재고 데이터 조인, 시즌 3단 분류
Step 2: Need Score 계산 + Spearman 상관분석 + Missed Pair 분석
"""
import polars as pl
import json
import os
from scipy import stats
import warnings
warnings.filterwarnings("ignore")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DATA_DIR = os.path.join(BASE_DIR, "src", "service", "validation", "data")
OUTPUT_DIR = os.path.join(BASE_DIR, "src", "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

WEEK_MAP = {
    "W1": {"alloc_before_date": "2026-04-26", "file": "stock_all_w1.json",
            "vel_start": "2026-04-06", "vel_end": "2026-04-26"},
    "W2": {"alloc_before_date": "2026-05-03", "file": "stock_all_w2.json",
            "vel_start": "2026-04-13", "vel_end": "2026-05-03"},
    "W3": {"alloc_before_date": "2026-05-10", "file": "stock_all_w3.json",
            "vel_start": "2026-04-20", "vel_end": "2026-05-10"},
}

# 당시즌 기준: 2026년 5월 기준 → 26S(Spring), 26N(Non-season)이 당시즌
CURRENT_SEASONS = {"26S", "26N"}


def load_stock_data(week: str) -> pl.DataFrame:
    """주차별 재고 데이터 로드"""
    file_path = os.path.join(DATA_DIR, WEEK_MAP[week]["file"])
    with open(file_path) as f:
        raw = json.load(f)
    data = raw["data"] if isinstance(raw, dict) and "data" in raw else raw
    df = pl.DataFrame(data)
    df = df.with_columns(pl.lit(week).alias("week"))
    # STOCK_QTY를 정수로 변환
    df = df.with_columns(pl.col("STOCK_QTY").cast(pl.Int64))
    return df


def load_md_alloc() -> pl.DataFrame:
    """MD 배분 데이터 로드 (스타일×매장 집계)"""
    df = pl.read_parquet(os.path.join(DATA_DIR, "md_alloc_style_shop.parquet"))
    # 빈 행 제거
    df = df.filter(
        (pl.col("style_cd") != "") &
        (pl.col("shop_id") != "") &
        pl.col("shop_id").is_not_null()
    )
    # PRDT_CD 생성: 'X' + sesn + style_cd
    df = df.with_columns(
        (pl.lit("X") + pl.col("sesn") + pl.col("style_cd")).alias("PRDT_CD")
    )
    return df


def classify_season(sesn: str) -> str:
    """시즌 3단 분류: [A] 당시즌 신상품 / [B] 이월상품"""
    if sesn in CURRENT_SEASONS:
        return "A_당시즌"
    else:
        return "B_이월"


def step1_preprocess():
    """Step 1: 전처리 + 시즌 3단 분류"""
    print("=" * 70)
    print("[Step 1] 전처리 + 시즌 3단 분류")
    print("=" * 70)

    # MD 배분 로드
    alloc = load_md_alloc()
    print(f"\nMD 배분 데이터: {len(alloc):,}행")

    # 시즌 3단 분류
    alloc = alloc.with_columns(
        pl.col("sesn").map_elements(classify_season, return_dtype=pl.Utf8).alias("season_class")
    )

    # 시즌 분류 통계
    print("\n[시즌 3단 분류 결과]")
    season_stats = alloc.group_by("season_class").agg(
        pl.len().alias("pairs"),
        pl.col("alloc_qty").sum().alias("total_qty"),
        pl.col("style_cd").n_unique().alias("unique_styles"),
    ).sort("season_class")
    for row in season_stats.iter_rows(named=True):
        pct = row["pairs"] / len(alloc) * 100
        print(f"  {row['season_class']}: {row['pairs']:,}쌍 ({pct:.1f}%), "
              f"배분수량 {row['total_qty']:,}, 스타일 {row['unique_styles']}개")

    # 세부 시즌 분포
    print("\n[세부 시즌별 분포]")
    sesn_stats = alloc.group_by(["season_class", "sesn"]).agg(
        pl.len().alias("pairs"),
        pl.col("alloc_qty").sum().alias("total_qty"),
    ).sort(["season_class", "pairs"], descending=[False, True])
    for row in sesn_stats.iter_rows(named=True):
        print(f"  [{row['season_class']}] {row['sesn']}: {row['pairs']:,}쌍, {row['total_qty']:,}수량")

    # 재고 데이터 조인 (주차별)
    print("\n[재고 데이터 조인]")
    # 오프라인 매장 목록 로드 (90019 하드코딩 대체)
    # 변경 2026-06-09: SHOP_ID='90019'는 온라인 매장. brand_shops_archive 기반 필터로 교체.
    # [ROLLBACK] 이전: shop_stock = stock.filter(pl.col("SHOP_ID") != "90019")
    #                   wh_stock = stock.filter(pl.col("SHOP_ID") == "90019")
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from _drp_helpers import load_offline_shop_ids
    offline_ids = load_offline_shop_ids("X")

    results = []
    for week in ["W1", "W2", "W3"]:
        stock = load_stock_data(week)
        # 오프라인 매장만 필터 (온라인 매장 제외)
        shop_stock = stock.filter(pl.col("SHOP_ID").is_in(list(offline_ids))) if offline_ids else stock
        # AP 재고는 DW_SH_SCS_DACUM에 없음 — 빈 DataFrame으로 처리
        wh_stock = pl.DataFrame({"PRDT_CD": [], "WH_STOCK_QTY": []}).cast({"WH_STOCK_QTY": pl.Int64})

        # 해당 주차 MD 배분만 필터
        week_alloc = alloc.filter(pl.col("week") == week)

        # 매장 재고 조인 (PRDT_CD + SHOP_ID → shop_id)
        merged = week_alloc.join(
            shop_stock.select(["PRDT_CD", "SHOP_ID", "STOCK_QTY"]),
            left_on=["PRDT_CD", "shop_id"],
            right_on=["PRDT_CD", "SHOP_ID"],
            how="left"
        ).with_columns(
            pl.col("STOCK_QTY").fill_null(0).alias("shop_stock_before")
        )

        # 창고 재고 조인
        merged = merged.join(
            wh_stock,
            on="PRDT_CD",
            how="left"
        ).with_columns(
            pl.col("WH_STOCK_QTY").fill_null(0).alias("wh_stock")
        )

        results.append(merged)

        matched = merged.filter(pl.col("shop_stock_before") > 0)
        print(f"  {week}: {len(week_alloc):,}쌍 → 매장재고 매칭 {len(matched):,}쌍 "
              f"({len(matched)/len(week_alloc)*100:.1f}%), 창고재고 매칭 "
              f"{merged.filter(pl.col('wh_stock') > 0).height:,}쌍")

    combined = pl.concat(results)
    combined.write_parquet(os.path.join(DATA_DIR, "alloc_with_stock.parquet"))
    print(f"\n✅ Step 1 완료: alloc_with_stock.parquet ({len(combined):,}행)")
    return combined


def step2_need_score(combined: pl.DataFrame):
    """Step 2: Need Score 분석"""
    print("\n" + "=" * 70)
    print("[Step 2] Need Score 분석")
    print("=" * 70)

    # velocity 계산은 BIM_SHOP_DD_STK에서 해야 하지만,
    # 현재 판매 데이터가 없으므로 배분 직전 재고 기반 분석에 집중

    # === 2.1 Need Score 계산 ===
    # Need = target_weeks * velocity - stock_before_alloc
    # velocity가 없으므로 대안: "배분량 대비 재고 커버리지" 분석
    # 즉, MD가 이미 재고가 충분한 곳에 배분했는지 판단

    print("\n[2.1] 배분 직전 매장 재고 분석 — MD 배분 의사결정 품질")

    for week in ["W1", "W2", "W3"]:
        week_data = combined.filter(pl.col("week") == week)

        # 배분 직전 매장 재고가 0인 곳 vs 재고가 있는 곳
        zero_stock = week_data.filter(pl.col("shop_stock_before") == 0)
        has_stock = week_data.filter(pl.col("shop_stock_before") > 0)

        print(f"\n  [{week}] 총 {len(week_data):,}쌍")
        print(f"    재고=0인 매장에 배분: {len(zero_stock):,}쌍 ({len(zero_stock)/len(week_data)*100:.1f}%)")
        print(f"    재고>0인 매장에 배분: {len(has_stock):,}쌍 ({len(has_stock)/len(week_data)*100:.1f}%)")
        if len(has_stock) > 0:
            avg_existing = has_stock["shop_stock_before"].mean()
            avg_alloc = has_stock["alloc_qty"].mean()
            print(f"      재고>0 매장 평균 기존재고: {avg_existing:.1f}, 평균 배분량: {avg_alloc:.1f}")

    # === 2.2 시즌 분류별 재고 패턴 ===
    print("\n[2.2] 시즌 분류별 재고 패턴")
    for season_class in ["A_당시즌", "B_이월"]:
        sc_data = combined.filter(pl.col("season_class") == season_class)
        zero_pct = sc_data.filter(pl.col("shop_stock_before") == 0).height / len(sc_data) * 100 if len(sc_data) > 0 else 0
        print(f"  {season_class}: {len(sc_data):,}쌍, "
              f"재고=0 비율 {zero_pct:.1f}%, "
              f"평균 기존재고 {sc_data['shop_stock_before'].mean():.1f}, "
              f"평균 배분량 {sc_data['alloc_qty'].mean():.1f}")

    # === 2.3 Spearman 상관분석 (배분량 vs 매장재고) ===
    print("\n[2.3] Spearman 상관분석: MD 배분량 vs 배분직전 매장재고")
    print("  (높을수록 MD가 재고 많은 곳에 더 배분 = 오히려 비효율)")

    for week in ["W1", "W2", "W3"]:
        week_data = combined.filter(pl.col("week") == week)
        # 재고>0인 매장만 대상 (재고=0이면 상관 계산 무의미)
        has_stock = week_data.filter(pl.col("shop_stock_before") > 0)
        if len(has_stock) >= 10:
            rho, pval = stats.spearmanr(
                has_stock["alloc_qty"].to_list(),
                has_stock["shop_stock_before"].to_list()
            )
            print(f"  {week}: rho={rho:.3f}, p={pval:.4f} (n={len(has_stock)})")
        else:
            print(f"  {week}: 데이터 부족 (n={len(has_stock)})")

    # 전체 통합
    all_has_stock = combined.filter(pl.col("shop_stock_before") > 0)
    if len(all_has_stock) >= 10:
        rho, pval = stats.spearmanr(
            all_has_stock["alloc_qty"].to_list(),
            all_has_stock["shop_stock_before"].to_list()
        )
        print(f"  전체: rho={rho:.3f}, p={pval:.4f} (n={len(all_has_stock)})")

    # === 2.4 Missed Pair 분석 (공급 제약 감안) ===
    print("\n[2.4] Missed Pair 분석 — 판매 중이나 배분 못 받은 매장")

    for week in ["W1", "W2", "W3"]:
        week_alloc = combined.filter(pl.col("week") == week)
        stock = load_stock_data(week)
        # 오프라인 매장만 (90019 하드코딩 대체)
        shop_stock = stock.filter(pl.col("SHOP_ID").is_in(list(offline_ids))) if offline_ids else stock

        # 매장에 재고가 있지만 MD가 배분하지 않은 (PRDT_CD, SHOP_ID) 페어
        alloc_pairs = set(
            zip(week_alloc["PRDT_CD"].to_list(), week_alloc["shop_id"].to_list())
        )
        stock_pairs = set(
            zip(shop_stock["PRDT_CD"].to_list(), shop_stock["SHOP_ID"].to_list())
        )

        # MD가 배분한 스타일 목록
        alloc_styles = set(week_alloc["PRDT_CD"].to_list())

        # 같은 스타일에 대해: 어떤 매장은 배분 받고, 어떤 매장은 못 받음
        # "재고가 적은(0~2개) 매장인데 배분 못 받은" 케이스 = missed pair
        missed = []
        for prdt_cd, shop_id in stock_pairs:
            if prdt_cd in alloc_styles and (prdt_cd, shop_id) not in alloc_pairs:
                # 이 매장의 해당 스타일 재고
                stk = shop_stock.filter(
                    (pl.col("PRDT_CD") == prdt_cd) & (pl.col("SHOP_ID") == shop_id)
                )["STOCK_QTY"].to_list()
                if stk and stk[0] <= 3:  # 재고 3개 이하 = 보충 필요
                    missed.append({
                        "PRDT_CD": prdt_cd,
                        "SHOP_ID": shop_id,
                        "current_stock": stk[0],
                    })

        # 창고 재고 확인 — DW_SH_SCS_DACUM에는 AP코드 없음
        # 90019는 온라인 매장이었으므로 제거. 창고재고 기반 분기는 빈 set으로 처리.
        wh_styles: set[str] = set()  # TODO: DRP API로 AP 재고 조회 시 여기에 채울 것

        supply_possible = [m for m in missed if m["PRDT_CD"] in wh_styles]
        supply_impossible = [m for m in missed if m["PRDT_CD"] not in wh_styles]

        print(f"\n  [{week}] MD가 배분한 스타일 {len(alloc_styles)}개 기준:")
        print(f"    재고 ≤3개인데 배분 못 받은 매장: {len(missed):,}쌍")
        print(f"      → 창고재고 있음 (배분 가능했음): {len(supply_possible):,}쌍")
        print(f"      → 창고재고 없음 (배분 불가): {len(supply_impossible):,}쌍")

    # === 2.5 Need Score 기반 분석 (target_weeks 민감도) ===
    print("\n[2.5] Need Score 민감도 분석 (target_weeks = 1, 2, 3)")
    print("  Need = target_weeks * (alloc_qty/1주 기대치) - shop_stock_before")
    print("  대안: alloc_qty 자체를 '수요 프록시'로 사용")
    print("  Spearman(alloc_qty, -shop_stock_before) → 재고 적은 곳에 많이 배분했는가?")

    # 재고가 적은 매장에 많이 배분 = 음의 상관
    # 즉 Spearman(alloc, stock) < 0이면 MD가 재고 부족한 곳에 더 배분한 것
    for week in ["W1", "W2", "W3"]:
        week_data = combined.filter(
            (pl.col("week") == week) & (pl.col("shop_stock_before") > 0)
        )
        if len(week_data) >= 10:
            # Need Score 근사: 배분량이 필요도의 프록시
            # 이상적이면: 재고 적은 곳 → 배분 많이 → 음의 상관
            rho, pval = stats.spearmanr(
                week_data["alloc_qty"].to_list(),
                week_data["shop_stock_before"].to_list()
            )
            sig = "***" if pval < 0.001 else "**" if pval < 0.01 else "*" if pval < 0.05 else "ns"
            direction = "재고 적은 곳에 더 배분 (좋음)" if rho < 0 else "재고 많은 곳에 더 배분 (비효율)"
            print(f"  {week}: rho={rho:+.3f} {sig} → {direction}")

    # === 2.6 종합 요약 ===
    print("\n" + "=" * 70)
    print("[종합 요약]")
    print("=" * 70)

    total_pairs = len(combined)
    zero_stock_pairs = combined.filter(pl.col("shop_stock_before") == 0).height
    zero_pct = zero_stock_pairs / total_pairs * 100

    a_pairs = combined.filter(pl.col("season_class") == "A_당시즌").height
    b_pairs = combined.filter(pl.col("season_class") == "B_이월").height

    print(f"\n  총 배분 페어: {total_pairs:,}")
    print(f"  당시즌(26S/26N): {a_pairs:,}쌍 ({a_pairs/total_pairs*100:.1f}%)")
    print(f"  이월상품: {b_pairs:,}쌍 ({b_pairs/total_pairs*100:.1f}%)")
    print(f"  배분 직전 매장재고=0: {zero_stock_pairs:,}쌍 ({zero_pct:.1f}%)")
    print(f"  → 이 중 당시즌: "
          f"{combined.filter((pl.col('shop_stock_before')==0) & (pl.col('season_class')=='A_당시즌')).height:,}쌍")
    print(f"  → 이 중 이월: "
          f"{combined.filter((pl.col('shop_stock_before')==0) & (pl.col('season_class')=='B_이월')).height:,}쌍")

    # 결과 저장
    combined.write_parquet(os.path.join(DATA_DIR, "alloc_with_stock.parquet"))
    print(f"\n✅ 분석 결과 저장: {DATA_DIR}/alloc_with_stock.parquet")


def main():
    combined = step1_preprocess()
    step2_need_score(combined)


if __name__ == "__main__":
    main()
