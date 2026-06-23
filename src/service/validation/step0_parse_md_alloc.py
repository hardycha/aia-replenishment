"""Step 0: MD 배분 CSV 파싱 및 기초 통계 추출

3주간의 MD 배분 CSV를 통합하고, 검증에 필요한 기초 정보를 추출한다.
- 주차별 (매장코드, 스타일코드) 유니크 페어
- 스타일코드 유니크 목록 (시즌 코드 매핑용)
- 매장코드 유니크 목록 (매장 재고 조회용)
"""
import polars as pl
import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
CSV_DIR = os.path.join(BASE_DIR, "보충배분-AIA", "문서", "보충배분-AIA 검증용 문서")
OUTPUT_DIR = os.path.join(BASE_DIR, "src", "service", "validation", "data")
os.makedirs(OUTPUT_DIR, exist_ok=True)

WEEKS = {
    "W1": {
        "file": "DX 260427 ~260503 MD요청, 엑셀수기배분.csv",
        "period": "2026-04-27~2026-05-03",
        "alloc_before_date": "2026-04-26",  # 배분 직전 재고 기준일
    },
    "W2": {
        "file": "DX 260504 ~260510 MD요청, 엑셀수기배분.csv",
        "period": "2026-05-04~2026-05-10",
        "alloc_before_date": "2026-05-03",
    },
    "W3": {
        "file": "DX 260511 ~260517 MD요청, 엑셀수기배분.csv",
        "period": "2026-05-11~2026-05-17",
        "alloc_before_date": "2026-05-10",
    },
}


def parse_csv(file_path: str, week: str) -> pl.DataFrame:
    """CSV 파일을 파싱하여 필요한 컬럼만 추출"""
    df = pl.read_csv(file_path, encoding="utf-8-sig", infer_schema_length=10000)

    # 필요한 컬럼만 선택 + week 컬럼 추가
    df = df.select([
        pl.lit(week).alias("week"),
        pl.col("매장코드").cast(pl.Utf8).alias("shop_id"),
        pl.col("매장명").alias("shop_nm"),
        pl.col("상품시즌").alias("sesn"),
        pl.col("스타일코드").alias("style_cd"),
        pl.col("컬러").alias("color_cd"),
        pl.col("사이즈").alias("size_cd"),
        pl.col("배분상태").alias("alloc_status"),
        pl.col("배분확정수량").cast(pl.Int64).alias("alloc_qty"),
        pl.col("배분확정일").alias("alloc_date"),
        pl.col("배분 확정자").alias("alloc_by"),
    ])

    return df


def main():
    all_dfs = []

    for week_key, week_info in WEEKS.items():
        file_path = os.path.join(CSV_DIR, week_info["file"])
        print(f"\n{'='*60}")
        print(f"[{week_key}] {week_info['period']}")
        print(f"파일: {week_info['file']}")

        df = parse_csv(file_path, week_key)
        all_dfs.append(df)

        print(f"  총 행 수: {len(df):,}")
        print(f"  유니크 매장: {df['shop_id'].n_unique()}")
        print(f"  유니크 스타일: {df['style_cd'].n_unique()}")
        print(f"  총 배분수량: {df['alloc_qty'].sum():,}")
        print(f"  배분상태 분포:")
        status_counts = df.group_by("alloc_status").agg(pl.count().alias("cnt")).sort("cnt", descending=True)
        for row in status_counts.iter_rows():
            print(f"    {row[0]}: {row[1]:,}")

    # 전체 통합
    combined = pl.concat(all_dfs)
    print(f"\n{'='*60}")
    print(f"[전체 통합]")
    print(f"  총 행 수: {len(combined):,}")
    print(f"  유니크 매장: {combined['shop_id'].n_unique()}")
    print(f"  유니크 스타일: {combined['style_cd'].n_unique()}")
    print(f"  총 배분수량: {combined['alloc_qty'].sum():,}")

    # 스타일코드 × 매장코드 유니크 페어 (주차별)
    for week_key in WEEKS:
        week_df = combined.filter(pl.col("week") == week_key)
        pairs = week_df.select(["shop_id", "style_cd"]).unique()
        print(f"  {week_key} 유니크 (매장×스타일) 페어: {len(pairs):,}")

    # 스타일 단위로 집계 (SKU 합산) — 검증 분석의 기본 단위
    style_shop_alloc = (
        combined
        .group_by(["week", "shop_id", "shop_nm", "style_cd", "sesn"])
        .agg(pl.col("alloc_qty").sum().alias("alloc_qty"))
    )
    print(f"\n  스타일×매장 단위 집계 후 행 수: {len(style_shop_alloc):,}")

    # 유니크 스타일 목록 추출 (시즌코드 매핑용)
    unique_styles = combined.select("style_cd").unique().sort("style_cd")
    style_list = unique_styles["style_cd"].to_list()
    print(f"\n  시즌코드 매핑 대상 유니크 스타일: {len(style_list)}개")
    print(f"  예시: {style_list[:5]}")

    # 유니크 매장 목록 추출
    unique_shops = combined.select("shop_id").unique().sort("shop_id")
    shop_list = unique_shops["shop_id"].to_list()
    print(f"  재고 조회 대상 유니크 매장: {len(shop_list)}개")

    # 시즌 분포 (CSV 내 상품시즌 컬럼)
    print(f"\n  CSV 내 상품시즌(sesn) 분포:")
    sesn_dist = combined.group_by("sesn").agg(
        pl.count().alias("rows"),
        pl.col("alloc_qty").sum().alias("total_qty"),
        pl.col("style_cd").n_unique().alias("unique_styles"),
    ).sort("rows", descending=True)
    for row in sesn_dist.iter_rows():
        print(f"    {row[0]}: {row[1]:,}행, {row[2]:,}수량, {row[3]}스타일")

    # 저장
    combined.write_parquet(os.path.join(OUTPUT_DIR, "md_alloc_raw.parquet"))
    style_shop_alloc.write_parquet(os.path.join(OUTPUT_DIR, "md_alloc_style_shop.parquet"))

    with open(os.path.join(OUTPUT_DIR, "unique_styles.json"), "w") as f:
        json.dump(style_list, f, ensure_ascii=False)

    with open(os.path.join(OUTPUT_DIR, "unique_shops.json"), "w") as f:
        json.dump(shop_list, f, ensure_ascii=False)

    # 주차별 배분 직전 기준일 저장
    with open(os.path.join(OUTPUT_DIR, "week_config.json"), "w") as f:
        json.dump(WEEKS, f, ensure_ascii=False, indent=2, default=str)

    print(f"\n✅ 저장 완료:")
    print(f"  - {OUTPUT_DIR}/md_alloc_raw.parquet")
    print(f"  - {OUTPUT_DIR}/md_alloc_style_shop.parquet")
    print(f"  - {OUTPUT_DIR}/unique_styles.json ({len(style_list)}개)")
    print(f"  - {OUTPUT_DIR}/unique_shops.json ({len(shop_list)}개)")
    print(f"  - {OUTPUT_DIR}/week_config.json")


if __name__ == "__main__":
    main()
