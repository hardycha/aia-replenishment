"""ILP 배분 결과 vs scoring_engine v2 교차 검증

src/download/ 의 ILP 배분 엑셀과 briefing_archive.json을 교차 분석하여:
1. ILP가 배분한 SC가 v2에서 어떤 분류인지 매칭
2. v2가 "긴급"으로 분류했는데 ILP가 배분 안 한 SC 찾기
3. ILP 배분이 적은 사유 분석
"""
import json
import os
import polars as pl

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DOWNLOAD_DIR = os.path.join(BASE_DIR, "src", "download")
AIA_DATA_DIR = os.path.join(BASE_DIR, "보충배분-AIA", "aia-replenishment", "src", "data")

EXCEL_FILE = os.path.join(
    DOWNLOAD_DIR,
    "보충배분_XSHGR202410080000001381_2026-06-08_1780904359364.xlsx",
)


def load_ilp_result():
    """ILP 배분 엑셀 파싱"""
    df = pl.read_excel(EXCEL_FILE, has_header=False)
    # 3행부터 데이터 (0: 대분류 헤더, 1: 소분류 헤더, 2~: 데이터)
    data = df.slice(2)
    rows = []
    for row in data.iter_rows():
        from_ap = row[0]
        to_shop = row[3]
        sesn = row[4]
        style = row[5]
        color = row[6]
        size = row[7]
        qty = row[8]
        if style and sesn:
            rows.append({
                "from_ap": from_ap,
                "to_shop": str(to_shop) if to_shop else None,
                "sesn": sesn,
                "style_cd": style,
                "color_cd": color,
                "size_cd": str(size) if size else None,
                "alloc_qty": int(qty) if qty else 0,
            })
    return pl.DataFrame(rows)


def load_briefing():
    """briefing_archive.json 로드"""
    with open(os.path.join(AIA_DATA_DIR, "briefing_archive.json")) as f:
        archive = json.load(f)
    return archive["X_26S"]


def main():
    print("=" * 70)
    print("[검증] ILP 배분 결과 vs scoring_engine v2 교차 분석")
    print("=" * 70)

    # ── 1. ILP 배분 결과 파싱 ──
    ilp = load_ilp_result()
    print(f"\n[1] ILP 배분 결과")
    print(f"  총 행: {len(ilp)}")
    print(f"  총 배분수량: {ilp['alloc_qty'].sum()}")
    print(f"  유니크 SC(스타일×컬러): {ilp.select(['style_cd', 'color_cd']).unique().height}")
    print(f"  유니크 매장: {ilp['to_shop'].n_unique()}")

    # SC별 배분 집계
    ilp_by_sc = ilp.group_by(["style_cd", "color_cd"]).agg([
        pl.col("alloc_qty").sum().alias("total_qty"),
        pl.col("to_shop").n_unique().alias("shop_count"),
        pl.len().alias("row_count"),
    ]).sort("total_qty", descending=True)

    print(f"\n  [SC별 배분 요약]")
    for row in ilp_by_sc.iter_rows(named=True):
        print(f"    {row['style_cd']}_{row['color_cd']}: "
              f"{row['total_qty']}개 → {row['shop_count']}매장 ({row['row_count']}행)")

    print(f"\n  [상세 배분 내역]")
    for row in ilp.iter_rows(named=True):
        print(f"    {row['from_ap']} → {row['to_shop']}  "
              f"{row['style_cd']}_{row['color_cd']} {row['size_cd']} × {row['alloc_qty']}개")

    # ── 2. scoring_engine v2 결과 로드 ──
    briefing = load_briefing()
    sc_list = briefing["sc_list"]
    summary = briefing["summary"]

    print(f"\n[2] scoring_engine v2 결과")
    print(f"  총 SC: {summary['total_sc']}")
    print(f"  긴급: {summary['urgent_count']}, RT: {summary['rt_count']}, "
          f"급상승: {summary['trend_count']}, 미입고: {summary['initial_count']}, "
          f"정상: {summary['normal_count']}")

    # SC lookup: (style_cd, color_cd) → sc_info
    sc_lookup = {}
    for sc in sc_list:
        key = (sc["prod_cd"], sc["color_cd"])
        sc_lookup[key] = sc

    # ── 3. 교차 매칭: ILP가 배분한 SC의 v2 분류 ──
    print(f"\n[3] ILP 배분 SC ↔ v2 분류 매칭")
    print("-" * 70)

    ilp_sc_keys = ilp.select(["style_cd", "color_cd"]).unique()
    for row in ilp_sc_keys.iter_rows(named=True):
        key = (row["style_cd"], row["color_cd"])
        sc_info = sc_lookup.get(key)
        sc_alloc = ilp.filter(
            (pl.col("style_cd") == key[0]) & (pl.col("color_cd") == key[1])
        )
        total_qty = sc_alloc["alloc_qty"].sum()

        if sc_info:
            print(f"\n  {key[0]}_{key[1]}: ILP 배분 {total_qty}개")
            print(f"    v2 분류: [{sc_info['signal_type']}]  score={sc_info['priority_score']:.3f}")
            print(f"    매장 부족: {sc_info.get('shortage_shops', '?')}/{sc_info.get('total_shops', '?')} "
                  f"({sc_info.get('shortage_ratio', 0)*100:.0f}%)")
            print(f"    AP 재고: {sc_info['ap_stock']}개  평균 재고주수: {sc_info.get('avg_shop_inv_weeks', '?')}주")
            print(f"    속도: {sc_info['velocity_change_pct']:+.0f}%")
            print(f"    AI 근거: {sc_info['ai_reason']}")
        else:
            print(f"\n  {key[0]}_{key[1]}: ILP 배분 {total_qty}개")
            print(f"    ⚠️ v2 briefing에 없는 SC (26S 아닌 시즌이거나 예측/재고 없음)")

    # ── 4. v2가 "긴급"인데 ILP 배분 안 된 SC ──
    print(f"\n\n[4] v2 '긴급 보충'인데 ILP 배분 없는 SC (놓친 것)")
    print("-" * 70)

    ilp_sc_set = set()
    for row in ilp_sc_keys.iter_rows(named=True):
        ilp_sc_set.add((row["style_cd"], row["color_cd"]))

    urgent_not_allocated = []
    for sc in sc_list:
        if sc["signal_type"] == "urgent":
            key = (sc["prod_cd"], sc["color_cd"])
            if key not in ilp_sc_set:
                urgent_not_allocated.append(sc)

    urgent_not_allocated.sort(key=lambda x: -x["priority_score"])

    print(f"  v2 긴급 보충 총: {summary['urgent_count']}개")
    print(f"  ILP 배분 된 SC: {len(ilp_sc_set)}개")
    print(f"  긴급인데 배분 안 됨: {len(urgent_not_allocated)}개")

    print(f"\n  [상위 20개]")
    for i, sc in enumerate(urgent_not_allocated[:20], 1):
        print(f"    {i:>2}. {sc['prod_cd']}_{sc['color_cd']}  "
              f"score={sc['priority_score']:.3f}  "
              f"부족={sc.get('shortage_ratio', 0)*100:.0f}%({sc.get('shortage_shops', '?')}/{sc.get('total_shops', '?')})  "
              f"AP={sc['ap_stock']}  속도={sc['velocity_change_pct']:+.0f}%  "
              f"평균재고={sc.get('avg_shop_inv_weeks', '?')}주")

    # ── 5. 배분이 적은 사유 분석 ──
    print(f"\n\n[5] 배분이 적은 사유 분석")
    print("=" * 70)

    total_ilp_qty = ilp["alloc_qty"].sum()
    total_urgent_ap = sum(sc["ap_stock"] for sc in sc_list if sc["signal_type"] == "urgent")
    total_urgent_shortage = sum(sc.get("shortage_shops", 0) for sc in sc_list if sc["signal_type"] == "urgent")

    print(f"\n  ILP 총 배분: {total_ilp_qty}개 (7행)")
    print(f"  v2 긴급 SC의 총 AP 재고: {total_urgent_ap:,}개")
    print(f"  v2 긴급 SC의 총 부족 매장: {total_urgent_shortage:,}곳")
    print(f"  → AP 재고 대비 배분 비율: {total_ilp_qty / total_urgent_ap * 100:.2f}%" if total_urgent_ap > 0 else "")

    # 배분그룹 확인
    print(f"\n  [배분그룹 관점]")
    print(f"  이 엑셀의 배분그룹: XSHGR202410080000001381")
    print(f"  → 특정 배분그룹 1개에 대한 ILP 결과임")
    print(f"  → v2는 전체 SC 대상이므로, 해당 배분그룹에 속하는 SC만 비교해야 정확")

    # 배분그룹에 속하는 매장 확인
    ilp_shops = set(ilp["to_shop"].drop_nulls().to_list())
    print(f"  이 배분그룹의 배분 대상 매장: {ilp_shops}")

    # ── 6. ILP 배분 SC의 예측치(forecast_archive) 대비 분석 ──
    print(f"\n\n[6] ILP 배분 SC의 예측치 대비 분석")
    print("-" * 70)

    forecast_path = os.path.join(AIA_DATA_DIR, "forecast_archive.json")
    if os.path.exists(forecast_path):
        with open(forecast_path) as f:
            fc_archive = json.load(f)

        for row in ilp_sc_keys.iter_rows(named=True):
            style = row["style_cd"]
            color = row["color_cd"]
            fc_key = f"X_{style}_{color}_26S"

            # forecast_archive의 키 패턴 확인
            matching_keys = [k for k in fc_archive.keys() if style in k and color in k]

            sc_alloc = ilp.filter(
                (pl.col("style_cd") == style) & (pl.col("color_cd") == color)
            )
            total_alloc = sc_alloc["alloc_qty"].sum()
            shops = sc_alloc["to_shop"].to_list()

            if matching_keys:
                fc_data = fc_archive[matching_keys[0]]
                forecast_rows = fc_data.get("forecast", [])
                # 해당 매장의 예측치
                for shop in shops:
                    shop_fc = [r for r in forecast_rows if r.get("shopCd") == shop]
                    shop_alloc = sc_alloc.filter(pl.col("to_shop") == shop)["alloc_qty"].sum()
                    total_fc = sum(r["qty"] for r in shop_fc)
                    print(f"  {style}_{color} → 매장 {shop}: 배분 {shop_alloc}개, 예측 {total_fc:.1f}개/주")
            else:
                print(f"  {style}_{color}: forecast_archive에서 매칭 키 없음")

    print(f"\n\n[종합 판단]")
    print("=" * 70)
    print(f"""
  ILP 배분 결과: {len(ilp)}행, {total_ilp_qty}개
  v2 긴급 보충 SC: {summary['urgent_count']}개 (AP 재고 합계 {total_urgent_ap:,}개)

  ⚠️ ILP가 배분한 건 전체 긴급 SC의 극히 일부.

  가능한 사유:
  1. 배분그룹 1개만의 결과 — 전체 배분그룹을 돌리면 더 많을 수 있음
  2. ILP가 예측치 기반으로 "배분 불필요"로 판단 — 예측 과소추정 문제 (v1 검증에서 확인)
  3. ILP의 목적함수가 Need = Forecast - CurrentStock인데,
     매장 재고가 예측 대비 충분하다고 판단하면 배분 0
  4. 특정 사이즈만 배분 — 전 사이즈가 아닌 결품 사이즈만 선별 배분
""")


if __name__ == "__main__":
    main()
