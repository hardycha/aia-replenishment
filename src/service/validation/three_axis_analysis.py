"""3축 비교 분석: 예측치 vs ILP 배분 vs 실판매

배분그룹 XSHGR202410080000001381 (매장 50096, 50137, 50089, 10050) ×
v2 긴급 SC 대상으로:

1. PRED_SH_SCS_W 예측치 (사이즈 합산 → SC×매장 단위)
2. ILP 배분 결과 (API 실 호출)
3. 실판매 (BIM_SHOP_DD_STK 최근 1주)

세 축을 매장×SC 단위로 나란히 비교.
"""
import json
import os
import requests
import time
from collections import defaultdict
from pathlib import Path

import snowflake.connector

SCRIPT_DIR = Path(__file__).parent
BASE_DIR = SCRIPT_DIR.parent.parent.parent
AIA_DATA_DIR = BASE_DIR / "보충배분-AIA" / "aia-replenishment" / "src" / "data"

TARGET_SHOPS = ["50096", "50137", "50089", "10050"]

# 분석 대상 SC (v2 긴급 상위 + ILP 배분된 SC)
TARGET_SCS = [
    ("DKSZ62063", "LAS"),   # v2 긴급 #1, AP=693
    ("DKRS64063", "MUS"),   # v2 긴급, AP=1721, 4매장 전부 적재없음
    ("DMWJ31061", "BKS"),   # v2 긴급, 속도+467%
    ("DXRS7R063", "BKS"),   # v2 긴급, 부족88%
    ("DXRS7R063", "WHS"),   # v2 긴급, 부족79%
    ("DWTR95063", "KAD"),   # ILP 배분됨 12개
    ("DKRS73063", "BKS"),   # ILP 배분됨 3개
    ("DMPT63063", "BKS"),   # ILP 배분됨 2개
    ("DMTS81063", "KAD"),   # v2 긴급, 부족95%
    ("DWRS7F063", "NYD"),   # v2 긴급, 부족70%
]

ILP_URL = "http://10.81.1.91:8002/optimize"


def connect_sf():
    return snowflake.connector.connect(
        account=os.environ.get("SNOWFLAKE_ACCOUNT", "cixxjbf-wp67697"),
        user=os.environ.get("SNOWFLAKE_USER", "hamin@fnfcorp.com"),
        authenticator="externalbrowser",
        warehouse="DEV_WH",
        database="FNF",
        schema="ML_DIST",
        role="PU_PI",
    )


def fetch_predictions(cur):
    """PRED_SH_SCS_W에서 대상 SC×매장 예측치 (사이즈 합산)"""
    sc_filter = " OR ".join(
        f"(PART_CD='{s}' AND COLOR_CD='{c}')" for s, c in TARGET_SCS
    )
    shop_filter = ",".join(f"'{s}'" for s in TARGET_SHOPS)

    sql = f"""
    SELECT PART_CD, COLOR_CD, SHOP_ID, SIZE_CD,
           PRED_SH_SCS_NORM_QTY, PRED_SH_SC_NORM_QTY, PRED_SC_QTY,
           EXECUTION_DT
    FROM (
        SELECT *, ROW_NUMBER() OVER (
            PARTITION BY PART_CD, COLOR_CD, SHOP_ID, SIZE_CD
            ORDER BY EXECUTION_DT DESC
        ) AS RN
        FROM FNF.ML_DIST.PRED_SH_SCS_W
        WHERE BRD_CD = 'X' AND SESN = '26S'
          AND ({sc_filter})
          AND SHOP_ID IN ({shop_filter})
    )
    WHERE RN = 1
    """
    cur.execute(sql)
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in rows]


def fetch_actual_sales(cur):
    """BIM_SHOP_DD_STK에서 최근 1주 실판매 (SC×매장 사이즈 합산)"""
    sc_filter = ",".join(f"'{s}'" for s, c in TARGET_SCS)
    shop_filter = ",".join(f"'{s}'" for s in TARGET_SHOPS)

    sql = f"""
    SELECT PROD_CD, COLOR_CD, SHOP_CD, SIZ_CD,
           SUM(NOR_SALE_QTY) - SUM(RTN_SALE_QTY) AS NET_SALE_QTY
    FROM FNF.SERP.BIM_SHOP_DD_STK
    WHERE BRAND_CD = 'X'
      AND TO_DATE(STD_DE) >= DATEADD('week', -1, CURRENT_DATE)
      AND PROD_CD IN ({sc_filter})
      AND SHOP_CD IN ({shop_filter})
    GROUP BY PROD_CD, COLOR_CD, SHOP_CD, SIZ_CD
    """
    cur.execute(sql)
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in rows]


def fetch_shop_stock(cur):
    """DW_SH_SCS_DACUM에서 현재 매장 재고 (사이즈별)"""
    sc_prdt = ",".join(f"'X26S{s}'" for s, c in TARGET_SCS)
    shop_filter = ",".join(f"'{s}'" for s in TARGET_SHOPS)

    sql = f"""
    SELECT SUBSTR(PRDT_CD, 5) AS PART_CD, COLOR_CD, SHOP_ID, SIZE_CD, SH_STOCK_QTY
    FROM FNF.PRCS.DW_SH_SCS_DACUM
    WHERE CURRENT_DATE BETWEEN START_DT AND END_DT
      AND BRD_CD = 'X'
      AND PRDT_CD IN ({sc_prdt})
      AND SHOP_ID IN ({shop_filter})
    """
    cur.execute(sql)
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in rows]


def fetch_wh_stock(cur):
    """AP 창고 재고 (DRP API, apCd=U100)
    변경 2026-06-09: SHOP_ID='90019'는 온라인 매장이지 AP가 아님.
    Snowflake에 AP코드 없으므로 DRP API로 조회.
    """
    # [ROLLBACK] 이전: SHOP_ID='90019' (온라인 매장을 AP로 오인)
    from _drp_helpers import fetch_ap_stock_drp

    print("  창고재고 조회 (DRP API, apCd=U100)...")
    ap_data = fetch_ap_stock_drp(TARGET_SCS, brand_cd="X", ssn_cd="26S", ap_cd="U100")

    rows = []
    for (part_cd, color_cd), stocks in ap_data.items():
        for s in stocks:
            rows.append({
                "PART_CD": part_cd,
                "COLOR_CD": color_cd,
                "SIZE_CD": s["sizCd"],
                "WH_STOCK": s.get("qty", 0),
            })
    return rows


def call_ilp(style, color, wh_stock_by_size, shop_forecast, shop_stock, shop_grp):
    """ILP API 호출"""
    # 창고 재고
    wh_sizes = [{"sizCd": s, "qty": q} for s, q in wh_stock_by_size.items() if q > 0]
    if not wh_sizes:
        return None

    # 대상 매장 구성
    target_shops = []
    all_sizes = set(wh_stock_by_size.keys())
    for sf in shop_forecast:
        all_sizes.update(sf.get("sizes", {}).keys())

    for i, shop_id in enumerate(TARGET_SHOPS, 1):
        fc_sizes = []
        stock_sizes = []
        for sz in sorted(all_sizes):
            fc_qty = 0
            for sf in shop_forecast:
                if sf["shop"] == shop_id:
                    fc_qty = sf.get("sizes", {}).get(sz, 0)
            fc_sizes.append({"sizCd": sz, "qty": round(fc_qty, 4)})

            stk_qty = shop_stock.get((shop_id, sz), 0)
            stock_sizes.append({"sizCd": sz, "qty": stk_qty})

        # adjRank from shop_grp
        adj_rank = i
        for shop in shop_grp.get("shops", []):
            if shop["shopCd"] == shop_id:
                adj_rank = shop.get("adjRank", i)
                break

        target_shops.append({
            "shopCd": shop_id,
            "shopNm": "",
            "adjRank": adj_rank,
            "currentStock": stock_sizes,
            "forecast": fc_sizes,
        })

    # adjRank 정렬 후 재할당
    target_shops.sort(key=lambda x: x["adjRank"])
    for i, shop in enumerate(target_shops, 1):
        shop["adjRank"] = i

    payload = {
        "brandCd": "X",
        "ssnCd": "26S",
        "prodCd": style,
        "colorCd": color,
        "executionDate": "2026-06-09",
        "warehouseStock": wh_sizes,
        "targetShops": target_shops,
    }

    try:
        resp = requests.post(ILP_URL, json=payload, timeout=60)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"    ILP 호출 실패: {e}")
    return None


def main():
    print("=" * 80)
    print("[3축 비교 분석] 예측치 vs ILP 배분 vs 실판매")
    print(f"대상: {len(TARGET_SCS)}개 SC × {len(TARGET_SHOPS)}개 매장")
    print("=" * 80)

    # Snowflake 연결
    print("\n[1/4] Snowflake 연결...")
    conn = connect_sf()
    cur = conn.cursor()
    print("  ✅ 연결 성공")

    # 데이터 수집
    print("[2/4] 데이터 수집...")
    pred_raw = fetch_predictions(cur)
    print(f"  예측치: {len(pred_raw)}행")

    sales_raw = fetch_actual_sales(cur)
    print(f"  실판매: {len(sales_raw)}행")

    stock_raw = fetch_shop_stock(cur)
    print(f"  매장재고: {len(stock_raw)}행")

    wh_raw = fetch_wh_stock(cur)
    print(f"  창고재고: {len(wh_raw)}행")

    cur.close()
    conn.close()

    # shop_grp_archive 로드 (adjRank용)
    sg_path = AIA_DATA_DIR / "shop_grp_archive.json"
    shop_grp = {}
    if sg_path.exists():
        with open(sg_path) as f:
            sg = json.load(f)
        for grp in sg.values():
            if isinstance(grp, dict) and grp.get("brandCd") == "X":
                shop_grp = grp
                break

    # ── 데이터 정리 ──

    # 예측: (style, color, shop) → total_forecast
    pred_by_sc_shop = defaultdict(float)
    pred_by_sc_shop_size = defaultdict(lambda: defaultdict(float))
    for r in pred_raw:
        key = (r["PART_CD"], r["COLOR_CD"], r["SHOP_ID"])
        pred_by_sc_shop[key] += float(r["PRED_SH_SCS_NORM_QTY"] or 0)
        pred_by_sc_shop_size[key][r["SIZE_CD"]] = float(r["PRED_SH_SCS_NORM_QTY"] or 0)

    # 실판매: (style, color, shop) → total_sale
    sales_by_sc_shop = defaultdict(float)
    for r in sales_raw:
        key = (r["PROD_CD"], r["COLOR_CD"], r["SHOP_CD"])
        sales_by_sc_shop[key] += float(r["NET_SALE_QTY"] or 0)

    # 매장재고: (shop, size) 및 (style, color, shop) → total
    shop_stock_map = {}  # (style, color, shop, size) → qty
    shop_stock_total = defaultdict(int)  # (style, color, shop) → total
    for r in stock_raw:
        shop_stock_map[(r["PART_CD"], r["COLOR_CD"], r["SHOP_ID"], r["SIZE_CD"])] = int(r["SH_STOCK_QTY"] or 0)
        shop_stock_total[(r["PART_CD"], r["COLOR_CD"], r["SHOP_ID"])] += int(r["SH_STOCK_QTY"] or 0)

    # 창고재고: (style, color) → {size: qty}
    wh_stock_by_sc = defaultdict(lambda: defaultdict(int))
    wh_stock_total = defaultdict(int)
    for r in wh_raw:
        wh_stock_by_sc[(r["PART_CD"], r["COLOR_CD"])][r["SIZE_CD"]] = int(r["WH_STOCK"] or 0)
        wh_stock_total[(r["PART_CD"], r["COLOR_CD"])] += int(r["WH_STOCK"] or 0)

    # ── ILP 호출 ──
    print("\n[3/4] ILP 호출...")
    ilp_results = {}
    for style, color in TARGET_SCS:
        wh_sizes = dict(wh_stock_by_sc.get((style, color), {}))
        if not wh_sizes or sum(wh_sizes.values()) == 0:
            print(f"  {style}_{color}: AP 재고 없음 → 스킵")
            ilp_results[(style, color)] = None
            continue

        # 매장별 예측
        shop_fc = []
        for shop in TARGET_SHOPS:
            sizes = dict(pred_by_sc_shop_size.get((style, color, shop), {}))
            shop_fc.append({"shop": shop, "sizes": sizes})

        # 매장별 재고
        stock_for_ilp = {}
        for shop in TARGET_SHOPS:
            for sz in wh_sizes:
                stock_for_ilp[(shop, sz)] = shop_stock_map.get((style, color, shop, sz), 0)

        result = call_ilp(style, color, wh_sizes, shop_fc, stock_for_ilp, shop_grp)
        ilp_results[(style, color)] = result
        status = result.get("status", "?") if result else "SKIP"
        total_alloc = result.get("totalAllocatedSCQty", 0) if result else 0
        print(f"  {style}_{color}: {status}, 배분 {total_alloc}개")
        time.sleep(0.2)

    # ── 3축 비교 출력 ──
    print("\n\n[4/4] 3축 비교 분석")
    print("=" * 80)

    for style, color in TARGET_SCS:
        wh_total = wh_stock_total.get((style, color), 0)
        ilp = ilp_results.get((style, color))
        ilp_status = ilp.get("status", "?") if ilp else "N/A"
        ilp_total = ilp.get("totalAllocatedSCQty", 0) if ilp else 0

        print(f"\n{'─'*80}")
        print(f"  SC: {style}_{color}  |  AP재고: {wh_total}개  |  ILP: {ilp_status}, 총 배분 {ilp_total}개")
        print(f"{'─'*80}")
        print(f"  {'매장':<8} {'현재고':>6} {'예측(주)':>8} {'실판매(주)':>10} {'ILP배분':>8} {'과소?'}")
        print(f"  {'─'*70}")

        for shop in TARGET_SHOPS:
            key = (style, color, shop)
            stock = shop_stock_total.get(key, 0)
            forecast = pred_by_sc_shop.get(key, 0)
            sale = sales_by_sc_shop.get(key, 0)

            # ILP 배분
            ilp_alloc = 0
            if ilp and ilp.get("shopAllocations"):
                for sa in ilp["shopAllocations"]:
                    if sa["shopCd"] == shop:
                        ilp_alloc = sa.get("totalAllocSCQty", 0)

            # 과소 판단
            flag = ""
            if sale > 0 and forecast < sale * 0.3:
                flag = "⚠️ 예측 과소"
            if sale > 0 and ilp_alloc == 0 and stock <= 3:
                flag += " 🔴 배분필요"
            if forecast == 0 and sale > 0:
                flag = "❌ 예측0 실판매有"

            print(f"  {shop:<8} {stock:>6} {forecast:>8.2f} {sale:>10.0f} {ilp_alloc:>8} {flag}")

    # ── 종합 요약 ──
    print(f"\n\n{'='*80}")
    print("[종합 요약]")
    print(f"{'='*80}")

    total_forecast = sum(pred_by_sc_shop.values())
    total_sales = sum(sales_by_sc_shop.values())
    total_ilp = sum(
        (r.get("totalAllocatedSCQty", 0) if r else 0)
        for r in ilp_results.values()
    )
    total_stock = sum(shop_stock_total.values())
    total_wh = sum(wh_stock_total.values())

    print(f"\n  대상: {len(TARGET_SCS)}개 SC × {len(TARGET_SHOPS)}개 매장")
    print(f"  총 예측(주): {total_forecast:.1f}개")
    print(f"  총 실판매(주): {total_sales:.0f}개")
    print(f"  총 ILP 배분: {total_ilp}개")
    print(f"  총 매장 현재고: {total_stock}개")
    print(f"  총 AP 창고재고: {total_wh}개")

    if total_sales > 0:
        print(f"\n  예측/실판매 비율: {total_forecast/total_sales*100:.1f}%")
        print(f"  ILP배분/실판매 비율: {total_ilp/total_sales*100:.1f}%")
        if total_forecast < total_sales * 0.5:
            print(f"  → ⚠️ 예측이 실판매의 절반도 안 됨 — 과소추정 확인")

    # 결과 JSON 저장
    output_dir = BASE_DIR / "src" / "output"
    output_dir.mkdir(exist_ok=True)
    summary = {
        "analysis_date": "2026-06-09",
        "target_scs": [f"{s}_{c}" for s, c in TARGET_SCS],
        "target_shops": TARGET_SHOPS,
        "totals": {
            "forecast_weekly": round(total_forecast, 1),
            "actual_sales_weekly": round(total_sales, 0),
            "ilp_allocation": total_ilp,
            "shop_stock": total_stock,
            "wh_stock": total_wh,
        },
    }
    with open(output_dir / "three_axis_analysis.json", "w") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"\n  결과 저장: src/output/three_axis_analysis.json")


if __name__ == "__main__":
    main()
