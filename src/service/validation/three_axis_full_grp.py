"""3축 비교 분석 — 배분그룹 1008 타겟RT 전체 292매장

배분그룹 XSHGR202410080000001381 전체 매장 대상으로:
1. PRED_SH_SCS_W 예측치
2. ILP 배분 결과 (API 실 호출)
3. 실판매 (BIM_SHOP_DD_STK 최근 1주)
"""
import json
import os
import requests
import time
from collections import defaultdict
from pathlib import Path

import snowflake.connector

BASE_DIR = Path(__file__).parent.parent.parent.parent
AIA_DATA_DIR = BASE_DIR / "보충배분-AIA" / "aia-replenishment" / "src" / "data"

SHOP_GRP_KEY = "XSHGR202410080000001381"

# 분석 대상 SC (v2 긴급 상위)
TARGET_SCS = [
    ("DKSZ62063", "LAS"),
    ("DKRS64063", "MUS"),
    ("DMWJ31061", "BKS"),
    ("DXRS7R063", "BKS"),
    ("DXRS7R063", "WHS"),
    ("DWTR95063", "KAD"),
    ("DKRS73063", "BKS"),
    ("DMPT63063", "BKS"),
    ("DMTS81063", "KAD"),
    ("DWRS7F063", "NYD"),
]

ILP_URL = "http://10.81.1.91:8002/optimize"


def connect_sf():
    return snowflake.connector.connect(
        account=os.environ.get("SNOWFLAKE_ACCOUNT", "cixxjbf-wp67697"),
        user=os.environ.get("SNOWFLAKE_USER", "hamin@fnfcorp.com"),
        authenticator="externalbrowser",
        warehouse="DEV_WH", database="FNF", schema="ML_DIST", role="PU_PI",
    )


def load_shop_grp():
    with open(AIA_DATA_DIR / "shop_grp_archive.json") as f:
        sg = json.load(f)
    grp = sg.get(SHOP_GRP_KEY, {})
    shops = grp.get("shops", [])
    print(f"  배분그룹: {grp.get('shopGrpNm', '?')} — {len(shops)}개 매장")
    return shops


def fetch_data(cur, shop_ids):
    sc_filter = " OR ".join(f"(PART_CD='{s}' AND COLOR_CD='{c}')" for s, c in TARGET_SCS)
    shop_csv = ",".join(f"'{s}'" for s in shop_ids)
    sc_prdt = ",".join(f"'X26S{s}'" for s, c in TARGET_SCS)
    sc_prod = ",".join(f"'{s}'" for s, c in TARGET_SCS)

    # 예측치
    print("  예측치 조회...")
    cur.execute(f"""
    SELECT PART_CD, COLOR_CD, SHOP_ID, SIZE_CD, PRED_SH_SCS_NORM_QTY
    FROM (
        SELECT *, ROW_NUMBER() OVER (
            PARTITION BY PART_CD, COLOR_CD, SHOP_ID, SIZE_CD
            ORDER BY EXECUTION_DT DESC
        ) AS RN
        FROM FNF.ML_DIST.PRED_SH_SCS_W
        WHERE BRD_CD = 'X' AND SESN = '26S'
          AND ({sc_filter})
          AND SHOP_ID IN ({shop_csv})
    ) WHERE RN = 1
    """)
    pred_raw = cur.fetchall()
    print(f"    → {len(pred_raw)}행")

    # 실판매 (최근 1주)
    print("  실판매 조회...")
    cur.execute(f"""
    SELECT PROD_CD, COLOR_CD, SHOP_CD, SIZ_CD,
           SUM(NOR_SALE_QTY) - SUM(RTN_SALE_QTY) AS NET_QTY
    FROM FNF.SERP.BIM_SHOP_DD_STK
    WHERE BRAND_CD = 'X'
      AND TO_DATE(STD_DE) >= DATEADD('week', -1, CURRENT_DATE)
      AND PROD_CD IN ({sc_prod})
      AND SHOP_CD IN ({shop_csv})
    GROUP BY PROD_CD, COLOR_CD, SHOP_CD, SIZ_CD
    """)
    sales_raw = cur.fetchall()
    print(f"    → {len(sales_raw)}행")

    # 매장 재고
    print("  매장재고 조회...")
    cur.execute(f"""
    SELECT SUBSTR(PRDT_CD, 5) AS PART_CD, COLOR_CD, SHOP_ID, SIZE_CD, SH_STOCK_QTY
    FROM FNF.PRCS.DW_SH_SCS_DACUM
    WHERE CURRENT_DATE BETWEEN START_DT AND END_DT
      AND BRD_CD = 'X' AND PRDT_CD IN ({sc_prdt})
      AND SHOP_ID IN ({shop_csv})
    """)
    stock_raw = cur.fetchall()
    print(f"    → {len(stock_raw)}행")

    # 창고 재고 (DRP API, apCd=U100)
    # 변경 2026-06-09: SHOP_ID='90019'는 온라인 매장. AP 재고는 DRP API로 조회.
    # [ROLLBACK] 이전: AND SHOP_ID = '90019'
    print("  창고재고 조회 (DRP API, apCd=U100)...")
    from _drp_helpers import fetch_ap_stock_drp
    ap_data = fetch_ap_stock_drp(TARGET_SCS, brand_cd="X", ssn_cd="26S", ap_cd="U100")
    wh_raw = []
    for (part_cd, color_cd), stocks in ap_data.items():
        for s in stocks:
            wh_raw.append((part_cd, color_cd, s["sizCd"], s.get("qty", 0)))
    print(f"    → {len(wh_raw)}행")

    return pred_raw, sales_raw, stock_raw, wh_raw


def call_ilp(style, color, wh_sizes, target_shops):
    if not wh_sizes or sum(q for _, q in wh_sizes) == 0:
        return None
    payload = {
        "brandCd": "X", "ssnCd": "26S", "prodCd": style, "colorCd": color,
        "executionDate": "2026-06-09",
        "warehouseStock": [{"sizCd": s, "qty": q} for s, q in wh_sizes if q > 0],
        "targetShops": target_shops,
    }
    try:
        resp = requests.post(ILP_URL, json=payload, timeout=120)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"    ILP 실패: {e}")
    return None


def main():
    print("=" * 80)
    print("[3축 분석] 배분그룹 1008 타겟RT — 전체 매장")
    print("=" * 80)

    # 배분그룹 매장 로드
    shops_info = load_shop_grp()
    shop_ids = [s["shopCd"] for s in shops_info]
    shop_rank = {s["shopCd"]: s.get("adjRank", 999) for s in shops_info}

    # Snowflake
    print("\nSnowflake 연결...")
    conn = connect_sf()
    cur = conn.cursor()

    pred_raw, sales_raw, stock_raw, wh_raw = fetch_data(cur, shop_ids)
    cur.close()
    conn.close()

    # 데이터 정리
    # 예측: (style, color, shop, size) → qty
    pred_map = defaultdict(float)
    pred_sc_shop = defaultdict(float)
    for part, color, shop, size, qty in pred_raw:
        pred_map[(part, color, shop, size)] = float(qty or 0)
        pred_sc_shop[(part, color, shop)] += float(qty or 0)

    # 실판매
    sale_map = defaultdict(float)
    sale_sc_shop = defaultdict(float)
    for prod, color, shop, siz, qty in sales_raw:
        sale_map[(prod, color, shop, siz)] = float(qty or 0)
        sale_sc_shop[(prod, color, shop)] += float(qty or 0)

    # 매장재고
    stock_map = defaultdict(int)
    stock_sc_shop = defaultdict(int)
    for part, color, shop, size, qty in stock_raw:
        stock_map[(part, color, shop, size)] = int(qty or 0)
        stock_sc_shop[(part, color, shop)] += int(qty or 0)

    # 창고재고
    wh_by_sc = defaultdict(lambda: defaultdict(int))
    wh_total = defaultdict(int)
    for part, color, size, qty in wh_raw:
        wh_by_sc[(part, color)][size] = int(qty or 0)
        wh_total[(part, color)] += int(qty or 0)

    # SC별 전체 사이즈 목록
    all_sizes_by_sc = defaultdict(set)
    for part, color, shop, size in pred_map:
        all_sizes_by_sc[(part, color)].add(size)
    for (part, color) in wh_by_sc:
        for sz in wh_by_sc[(part, color)]:
            all_sizes_by_sc[(part, color)].add(sz)
    for part, color, shop, size in stock_map:
        all_sizes_by_sc[(part, color)].add(size)

    # ILP 호출 (SC별)
    print("\nILP 호출 (SC별, 전체 매장)...")
    ilp_results = {}
    for style, color in TARGET_SCS:
        wh_sizes = list(wh_by_sc.get((style, color), {}).items())
        if not wh_sizes or sum(q for _, q in wh_sizes) == 0:
            print(f"  {style}_{color}: AP=0 → 스킵")
            ilp_results[(style, color)] = None
            continue

        sizes = sorted(all_sizes_by_sc.get((style, color), set()))

        target_shops_payload = []
        for shop_data in shops_info:
            shop_id = shop_data["shopCd"]
            fc = [{"sizCd": sz, "qty": round(pred_map.get((style, color, shop_id, sz), 0), 6)} for sz in sizes]
            stk = [{"sizCd": sz, "qty": stock_map.get((style, color, shop_id, sz), 0)} for sz in sizes]
            target_shops_payload.append({
                "shopCd": shop_id,
                "shopNm": shop_data.get("shopNm", ""),
                "adjRank": shop_data.get("adjRank", 999),
                "currentStock": stk,
                "forecast": fc,
            })

        target_shops_payload.sort(key=lambda x: x["adjRank"])
        for i, s in enumerate(target_shops_payload, 1):
            s["adjRank"] = i

        result = call_ilp(style, color, wh_sizes, target_shops_payload)
        ilp_results[(style, color)] = result
        status = result.get("status", "?") if result else "SKIP"
        total_alloc = result.get("totalAllocatedSCQty", 0) if result else 0
        print(f"  {style}_{color}: {status}, AP={sum(q for _,q in wh_sizes)}, 배분={total_alloc}개")
        time.sleep(0.3)

    # 결과 출력
    print("\n\n" + "=" * 80)
    print("[3축 비교] SC별 요약 (배분그룹 292매장 전체)")
    print("=" * 80)

    grand = {"pred": 0, "sale": 0, "ilp": 0, "stock": 0, "wh": 0}

    for style, color in TARGET_SCS:
        wh = wh_total.get((style, color), 0)
        ilp = ilp_results.get((style, color))
        ilp_total = ilp.get("totalAllocatedSCQty", 0) if ilp else 0
        ilp_shops = ilp.get("totalAllocatedShops", 0) if ilp else 0
        ilp_status = ilp.get("status", "N/A") if ilp else "AP=0"

        # 이 SC의 292매장 합산
        total_pred = sum(pred_sc_shop.get((style, color, s), 0) for s in shop_ids)
        total_sale = sum(sale_sc_shop.get((style, color, s), 0) for s in shop_ids)
        total_stock = sum(stock_sc_shop.get((style, color, s), 0) for s in shop_ids)

        # 예측>0 매장, 판매>0 매장, 재고=0 매장 카운트
        shops_with_pred = sum(1 for s in shop_ids if pred_sc_shop.get((style, color, s), 0) > 0.01)
        shops_with_sale = sum(1 for s in shop_ids if sale_sc_shop.get((style, color, s), 0) > 0)
        shops_no_stock = sum(1 for s in shop_ids if stock_sc_shop.get((style, color, s), 0) == 0)

        grand["pred"] += total_pred
        grand["sale"] += total_sale
        grand["ilp"] += ilp_total
        grand["stock"] += total_stock
        grand["wh"] += wh

        # 과소 판단
        flag = ""
        if total_sale > 0 and total_pred < total_sale * 0.3:
            flag = "⚠️ 예측 과소"
        if total_sale > 0 and ilp_total == 0:
            flag += " 🔴 배분 0"

        print(f"\n  {style}_{color}  AP={wh}  |  ILP: {ilp_status} → {ilp_total}개({ilp_shops}매장)")
        print(f"    예측(주합산): {total_pred:>8.1f}  ({shops_with_pred}매장 예측有)")
        print(f"    실판매(주):   {total_sale:>8.0f}  ({shops_with_sale}매장 판매有)")
        print(f"    매장현재고:   {total_stock:>8}  (재고0: {shops_no_stock}매장)")
        if flag:
            print(f"    → {flag}")

        # ILP 배분 상위 매장
        if ilp and ilp.get("shopAllocations"):
            alloc_shops = [(sa["shopCd"], sa.get("shopNm", ""), sa.get("totalAllocSCQty", 0))
                          for sa in ilp["shopAllocations"] if sa.get("totalAllocSCQty", 0) > 0]
            alloc_shops.sort(key=lambda x: -x[2])
            if alloc_shops:
                print(f"    ILP 배분 매장: ", end="")
                for sc, nm, qty in alloc_shops[:8]:
                    print(f"{sc}({nm[:6]})={qty}", end="  ")
                if len(alloc_shops) > 8:
                    print(f"... 외 {len(alloc_shops)-8}곳")
                else:
                    print()

    # 종합
    print(f"\n\n{'='*80}")
    print("[종합 요약]")
    print(f"{'='*80}")
    print(f"  대상: {len(TARGET_SCS)}개 SC × 292매장 (배분그룹 1008 타겟RT)")
    print(f"  총 예측(주):    {grand['pred']:>10.1f}개")
    print(f"  총 실판매(주):  {grand['sale']:>10.0f}개")
    print(f"  총 ILP 배분:    {grand['ilp']:>10}개")
    print(f"  총 매장 현재고: {grand['stock']:>10}개")
    print(f"  총 AP 창고재고: {grand['wh']:>10}개")
    if grand["sale"] > 0:
        print(f"\n  예측/실판매: {grand['pred']/grand['sale']*100:.1f}%")
        print(f"  ILP/실판매:  {grand['ilp']/grand['sale']*100:.1f}%")


if __name__ == "__main__":
    main()
