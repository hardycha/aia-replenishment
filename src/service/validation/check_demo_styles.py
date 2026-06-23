"""시연용 스타일 후보 분석: 현재 재고 기준 ILP 배분 가능성 확인"""
import json
import glob
import os
import tempfile
import requests
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
AIA_DIR = os.path.join(BASE_DIR, "보충배분-AIA", "aia-replenishment", "src", "data")

# 현재 재고 로드
tmpdir = tempfile.gettempdir()
files = sorted(glob.glob(os.path.join(tmpdir, "dcs-ai-cli", "current_stock_demo_*.json")))
with open(files[-1]) as f:
    raw = json.load(f)
stock_data = raw["data"]

# forecast 로드
with open(os.path.join(AIA_DIR, "forecast_archive.json")) as f:
    fc = json.load(f)

# shop_grp에서 adjRank
with open(os.path.join(AIA_DIR, "shop_grp_archive.json")) as f:
    sg = json.load(f)
shop_rank = {}
for grp_val in sg.values():
    if isinstance(grp_val, dict) and grp_val.get("brandCd") == "X":
        for shop in grp_val.get("shops", []):
            r = shop.get("adjRank", 999)
            if shop["shopCd"] not in shop_rank or r < shop_rank[shop["shopCd"]]:
                shop_rank[shop["shopCd"]] = r

top_styles = ["DWPT74063","DMRS73063","DMWJ7M063","DXTR7A063","DMRS63063","DXRS75063","DXTB7A063","DMTS71063"]

# 재고 매핑
stock_map = defaultdict(int)
for r in stock_data:
    stock_map[(r["PRDT_CD"], r["SHOP_ID"], r["COLOR_CD"], r["SIZE_CD"])] = int(r["STOCK_QTY"])

shop_stock_total = defaultdict(int)
for (prdt, shop, color, size), qty in stock_map.items():
    shop_stock_total[(prdt[4:], shop, color)] += qty

print(f"재고 데이터: {len(stock_data):,}행\n")

# 스타일별 분석
results = []
for key, val in fc.items():
    if not key.startswith("X_") or key == "_meta":
        continue
    parts = key.split("_")
    if len(parts) < 5 or parts[3] != "26S":
        continue
    style, color = parts[1], parts[2]
    if style not in top_styles:
        continue

    forecasts = val["forecast"]
    fc_by_shop = defaultdict(float)
    for r in forecasts:
        fc_by_shop[r["shopCd"]] += r["qty"]

    zero_stock_shops = 0
    for shop_cd in fc_by_shop:
        s = shop_stock_total.get((style, shop_cd, color), 0)
        if s == 0:
            zero_stock_shops += 1

    # 변경 2026-06-09: 90019는 온라인 매장. AP 재고는 별도 DRP API로 조회 필요.
    # [ROLLBACK] 이전: wh_stock = shop_stock_total.get((style, "90019", color), 0)
    wh_stock = 0  # AP 재고는 DRP API에서 별도 조회 — 아래 ILP 테스트에서 처리

    results.append({
        "style": style, "color": color,
        "fc_shops": len(fc_by_shop),
        "zero_stock": zero_stock_shops,
        "zero_pct": zero_stock_shops / len(fc_by_shop) * 100 if fc_by_shop else 0,
        "wh_stock": wh_stock,
        "fc_total": sum(fc_by_shop.values()),
    })

results.sort(key=lambda x: (-x["zero_stock"], -x["wh_stock"]))
print(f'{"스타일":>12} {"컬러":>5} {"FC매장":>6} {"재고0":>5} {"비율":>6} {"창고":>6} {"예측합":>7}')
print("-" * 55)
for r in results[:25]:
    print(f'{r["style"]:>12} {r["color"]:>5} {r["fc_shops"]:>6} {r["zero_stock"]:>5} {r["zero_pct"]:>5.1f}% {r["wh_stock"]:>6} {r["fc_total"]:>7.4f}')

# 상위 3개에 대해 ILP 직접 호출 테스트
print("\n\n=== ILP 직접 호출 테스트 ===")
ILP_URL = "http://10.81.1.91:8002/optimize"

for r in results[:5]:
    style, color = r["style"], r["color"]
    if r["wh_stock"] == 0:
        print(f"\n{style}_{color}: 창고재고 0 → 스킵")
        continue

    key = f"X_{style}_{color}_26S_{fc.get('_meta', {}).get('generatedAt', '2026-05-25')[:10]}"
    # 정확한 키 찾기
    matching_keys = [k for k in fc.keys() if f"X_{style}_{color}_26S_" in k]
    if not matching_keys:
        print(f"\n{style}_{color}: forecast 없음 → 스킵")
        continue

    entry = fc[matching_keys[0]]
    fc_data = entry["forecast"]

    # 창고 재고 (DRP API로 조회)
    # 변경 2026-06-09: 90019는 온라인 매장. AP 재고는 DRP API로 조회.
    # [ROLLBACK] 이전: for ... if shop == "90019": wh_sizes.append(...)
    from _drp_helpers import fetch_ap_stock_drp, load_drp_config
    _drp_base, _ = load_drp_config()
    if _drp_base:
        _ap = fetch_ap_stock_drp([(style, color)], brand_cd="X", ssn_cd="26S", ap_cd="U100")
        wh_sizes = _ap.get((style, color), [])
    else:
        wh_sizes = []

    # 대상 매장 구성
    fc_by_shop_size = defaultdict(list)
    for row in fc_data:
        fc_by_shop_size[row["shopCd"]].append({"sizCd": row["sizCd"], "qty": row["qty"]})

    target_shops = []
    for shop_cd, fc_sizes in fc_by_shop_size.items():
        current = []
        for (prdt, sh, clr, sz), qty in stock_map.items():
            if prdt == f"X26S{style}" and sh == shop_cd and clr == color:
                current.append({"sizCd": sz, "qty": qty})
        if not current:
            current = [{"sizCd": s["sizCd"], "qty": 0} for s in fc_sizes]

        adj = shop_rank.get(shop_cd, 999)
        target_shops.append({
            "shopCd": shop_cd, "shopNm": "", "adjRank": adj,
            "currentStock": current, "forecast": fc_sizes,
        })

    target_shops.sort(key=lambda x: x["adjRank"])
    for i, s in enumerate(target_shops, 1):
        s["adjRank"] = i

    payload = {
        "brandCd": "X", "ssnCd": "26S", "prodCd": style, "colorCd": color,
        "executionDate": "2026-05-27",
        "warehouseStock": wh_sizes, "targetShops": target_shops,
    }

    try:
        resp = requests.post(ILP_URL, json=payload, timeout=120)
        result = resp.json()
        total_alloc = result.get("totalAllocatedSCQty", 0)
        alloc_shops = result.get("totalAllocatedShops", 0)
        status = result.get("status", "?")
        print(f"\n{style}_{color}: {status}, 배분 {total_alloc}개 → {alloc_shops}개 매장")
        print(f"  재고0 매장: {r['zero_stock']}, 창고: {r['wh_stock']}, 대상매장: {len(target_shops)}")
    except Exception as e:
        print(f"\n{style}_{color}: 에러 {e}")
