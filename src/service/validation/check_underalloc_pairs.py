"""과소 배분 의심 매장×SC 쌍 추출

배분그룹 XSHGR202410080000001381의 4개 매장에 대해:
- v2 긴급 SC 45개 중 해당 매장에 재고가 부족한데 ILP 배분이 0인 쌍을 추출
- 매장별 현재고, AP 재고, 예측치를 함께 출력
"""
import json
import os
import polars as pl

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
AIA_DATA_DIR = os.path.join(BASE_DIR, "보충배분-AIA", "aia-replenishment", "src", "data")

# 이 배분그룹의 매장
TARGET_SHOPS = {"50096", "50137", "50089", "10050"}

# ILP가 실제 배분한 (style, color, shop) 쌍
ILP_ALLOCATED = {
    ("DKSZ62063", "LAS", "50096"),
    ("DWTR95063", "KAD", "50137"),
    ("DWTR95063", "KAD", "10050"),
    ("DWTR95063", "KAD", "50089"),
    ("DWTR95063", "KAD", "50096"),
    ("DKRS73063", "BKS", "50096"),
    ("DMPT63063", "BKS", "50089"),
}


def main():
    # briefing_archive에서 긴급 SC 목록
    with open(os.path.join(AIA_DATA_DIR, "briefing_archive.json")) as f:
        briefing = json.load(f)["X_26S"]

    urgent_scs = [sc for sc in briefing["sc_list"] if sc["signal_type"] == "urgent"]
    print(f"v2 긴급 SC: {len(urgent_scs)}개")
    print(f"배분그룹 매장: {TARGET_SHOPS}")

    # forecast_archive에서 매장별 예측치
    with open(os.path.join(AIA_DATA_DIR, "forecast_archive.json")) as f:
        fc_archive = json.load(f)

    # 매장별 예측 lookup: (style, color, shop) → total_forecast
    fc_lookup = {}
    for key, val in fc_archive.items():
        # key = "X_DMTS71063_BKS_26S" 형태
        parts = key.split("_")
        if len(parts) >= 4 and parts[0] == "X":
            style = parts[1]
            color = parts[2]
            for row in val.get("forecast", []):
                shop = row.get("shopCd", "")
                qty = row.get("qty", 0)
                fc_key = (style, color, shop)
                fc_lookup[fc_key] = fc_lookup.get(fc_key, 0) + qty

    # 과소 배분 의심 쌍 추출
    print(f"\n{'='*90}")
    print("[과소 배분 의심] 긴급 SC × 배분그룹 매장 — ILP 배분 0인데 부족한 쌍")
    print(f"{'='*90}")
    print(f"{'SC':<25} {'매장':<8} {'부족비율':>8} {'AP재고':>7} {'예측(주)':>8} {'평균재고주':>10} {'비고'}")
    print("-" * 90)

    underalloc_pairs = []

    for sc in urgent_scs:
        style = sc["prod_cd"]
        color = sc["color_cd"]

        for shop in TARGET_SHOPS:
            triple = (style, color, shop)

            # ILP가 이미 배분한 건 제외
            if triple in ILP_ALLOCATED:
                continue

            # 해당 매장의 예측치
            forecast = fc_lookup.get(triple, 0)

            underalloc_pairs.append({
                "sc": f"{style}_{color}",
                "style": style,
                "color": color,
                "shop": shop,
                "shortage_ratio": sc.get("shortage_ratio", 0),
                "ap_stock": sc["ap_stock"],
                "forecast": forecast,
                "avg_inv_weeks": sc.get("avg_shop_inv_weeks", 0),
                "priority_score": sc["priority_score"],
                "velocity": sc["velocity_change_pct"],
            })

    # 정렬: priority_score 높은 순
    underalloc_pairs.sort(key=lambda x: -x["priority_score"])

    # 예측 0인 것과 아닌 것 분리
    fc_zero = [p for p in underalloc_pairs if p["forecast"] <= 0.01]
    fc_nonzero = [p for p in underalloc_pairs if p["forecast"] > 0.01]

    print(f"\n[A] 예측치 = 0 (ILP가 배분 불필요로 판단한 원인) — {len(fc_zero)}쌍")
    print("-" * 90)
    for p in fc_zero[:30]:
        print(f"  {p['sc']:<25} {p['shop']:<8} {p['shortage_ratio']*100:>7.0f}% {p['ap_stock']:>7} {p['forecast']:>8.1f} {p['avg_inv_weeks']:>10.1f}주  예측0→배분0")

    print(f"\n[B] 예측치 > 0 (예측은 있는데 배분 안 됨) — {len(fc_nonzero)}쌍")
    print("-" * 90)
    for p in fc_nonzero[:30]:
        note = "예측 있는데 배분 안 됨"
        print(f"  {p['sc']:<25} {p['shop']:<8} {p['shortage_ratio']*100:>7.0f}% {p['ap_stock']:>7} {p['forecast']:>8.1f} {p['avg_inv_weeks']:>10.1f}주  {note}")

    print(f"\n{'='*90}")
    print(f"[요약]")
    print(f"  긴급 SC × 배분그룹 매장 전체 쌍: {len(underalloc_pairs) + len(ILP_ALLOCATED)}")
    print(f"  ILP 배분됨: {len(ILP_ALLOCATED)}쌍")
    print(f"  배분 안 됨 (과소 의심): {len(underalloc_pairs)}쌍")
    print(f"    - 예측치 = 0: {len(fc_zero)}쌍 ← 예측 과소추정이 원인")
    print(f"    - 예측치 > 0: {len(fc_nonzero)}쌍 ← ILP 로직 점검 필요")

    # Colly 확인용: 유니크 SC×매장 리스트 (예측 0인 것)
    print(f"\n{'='*90}")
    print(f"[Colly 확인 요청] PRED_SH_SCS_W 예측치 점검 대상")
    print(f"아래 SC×매장 쌍의 예측치가 0이라 ILP 배분이 0입니다.")
    print(f"{'='*90}")

    # 유니크 SC 목록
    unique_scs = sorted(set(p["sc"] for p in fc_zero), key=lambda x: next(
        p["priority_score"] for p in fc_zero if p["sc"] == x
    ), reverse=True)

    print(f"\n유니크 SC (예측=0): {len(unique_scs)}개")
    for sc in unique_scs[:20]:
        matching = [p for p in fc_zero if p["sc"] == sc]
        shops = ", ".join(sorted(set(p["shop"] for p in matching)))
        ap = matching[0]["ap_stock"]
        ratio = matching[0]["shortage_ratio"]
        print(f"  {sc:<25} AP={ap:>5}  부족={ratio*100:.0f}%  매장: {shops}")


if __name__ == "__main__":
    main()
