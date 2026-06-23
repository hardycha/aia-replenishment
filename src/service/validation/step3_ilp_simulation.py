"""Step 3: AIA vs MD 소급 시뮬레이션

W3 (2026-05-11~05-17) + 26S 시즌에 대해:
1. forecast_archive에서 예측치 로드
2. SKU 재고 데이터에서 매장재고/창고재고 구성
3. shop_grp_archive에서 adjRank 매핑
4. ILP 서버 호출 → ILP 배분 결과 획득
5. MD 배분과 ILP 배분 비교 → STR-capped, LSR-stockout, ILP 승률 산출
"""
import json
import os
import sys
import time
import requests
import polars as pl
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DATA_DIR = os.path.join(BASE_DIR, "src", "service", "validation", "data")
AIA_DIR = os.path.join(BASE_DIR, "보충배분-AIA", "aia-replenishment", "src", "data")

ILP_URL = "http://10.81.1.91:8002/optimize"
ILP_TIMEOUT = 120
EXECUTION_DATE = "2026-05-11"  # W3 시작일


def load_forecast():
    """forecast_archive.json 로드 → 26S + 2026-05-11 필터"""
    with open(os.path.join(AIA_DIR, "forecast_archive.json")) as f:
        fc = json.load(f)
    # X_{PART_CD}_{COLOR}_{SESN}_{DATE} 형태의 키만 추출
    result = {}
    for key, val in fc.items():
        if key.startswith("X_") and key.endswith("_26S_2026-05-11"):
            parts = key.split("_")
            # X_DMMT35061_BKS_26S_2026-05-11
            part_cd = parts[1]
            color_cd = parts[2]
            result[(part_cd, color_cd)] = val["forecast"]  # [{shopCd, sizCd, qty}]
    print(f"  Forecast 로드: {len(result)}개 (스타일×컬러)")
    return result


def load_shop_grp():
    """shop_grp_archive.json에서 Discovery 매장별 adjRank 매핑"""
    with open(os.path.join(AIA_DIR, "shop_grp_archive.json")) as f:
        sg = json.load(f)

    # 모든 X 그룹에서 매장별 최소 adjRank 수집
    shop_rank = {}
    for grp_key, grp_val in sg.items():
        if grp_val.get("brandCd") != "X":
            continue
        for shop in grp_val.get("shops", []):
            shop_cd = shop["shopCd"]
            rank = shop.get("adjRank", 999)
            if shop_cd not in shop_rank or rank < shop_rank[shop_cd]:
                shop_rank[shop_cd] = rank

    print(f"  Shop adjRank 매핑: {len(shop_rank)}개 매장")
    return shop_rank


def load_sku_stock():
    """사이즈별 재고 데이터 로드 (batch 1 + batch 2 병합)"""
    all_data = []
    for suffix in ["b1", "b2"]:
        import glob
        import tempfile
        tmpdir = tempfile.gettempdir()
        files = sorted(glob.glob(os.path.join(tmpdir, "dcs-ai-cli", f"stock_sku_w3_{suffix}_*.json")))
        if not files:
            # 프로젝트 데이터 폴더에서 시도
            files = sorted(glob.glob(os.path.join(DATA_DIR, f"stock_sku_w3_{suffix}.json")))
        if files:
            with open(files[-1]) as f:
                raw = json.load(f)
            data = raw["data"] if isinstance(raw, dict) and "data" in raw else raw
            all_data.extend(data)
            print(f"  SKU 재고 {suffix}: {len(data):,}행")

    if not all_data:
        print("  ⚠️ SKU 재고 파일 없음! 단일 파일 시도...")
        files = sorted(glob.glob(os.path.join(DATA_DIR, "stock_sku_w3.json")))
        if files:
            with open(files[-1]) as f:
                raw = json.load(f)
            all_data = raw["data"] if isinstance(raw, dict) and "data" in raw else raw

    print(f"  SKU 재고 총: {len(all_data):,}행")
    return all_data


def build_ilp_requests(forecast, shop_rank, sku_stock, md_alloc):
    """ILP 요청 페이로드 구성"""
    # SKU 재고를 (PRDT_CD, SHOP_ID) → [{COLOR_CD, SIZE_CD, STOCK_QTY}] 그룹화
    shop_stock_map = defaultdict(list)
    wh_stock_map = defaultdict(list)

    for row in sku_stock:
        prdt_cd = row["PRDT_CD"]
        shop_id = row["SHOP_ID"]
        color_cd = row["COLOR_CD"]
        size_cd = row["SIZE_CD"]
        qty = int(row["STOCK_QTY"])

        # 변경 2026-06-09: SHOP_ID='90019'는 온라인 매장이지 AP가 아님.
        # AP 재고는 DRP API로 별도 조회해야 함. 여기서는 매장 재고만 수집.
        # [ROLLBACK] 이전: if shop_id == "90019": wh_stock_map[...] else: shop_stock_map[...]
        # 오프라인 매장만 매장 재고로 수집 (온라인 매장 제외)
        import sys as _sys
        if not hasattr(build_ilp_requests, '_offline_ids'):
            _sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            from _drp_helpers import load_offline_shop_ids
            build_ilp_requests._offline_ids = load_offline_shop_ids("X")
        if shop_id in build_ilp_requests._offline_ids:
            shop_stock_map[(prdt_cd, shop_id, color_cd)].append({"sizCd": size_cd, "qty": qty})

    # MD 배분의 유니크 (style_cd, color_cd) 조합
    md_style_colors = md_alloc.select(["style_cd", "color_cd"]).unique()

    # AP 창고 재고를 DRP API로 조회 (90019 대체)
    sc_list_for_ap = [(r["style_cd"], r["color_cd"]) for r in md_style_colors.iter_rows(named=True)
                      if (r["style_cd"], r["color_cd"]) in forecast]
    from _drp_helpers import fetch_ap_stock_drp
    print("  AP 창고 재고 조회 (DRP API)...")
    ap_stock_drp = fetch_ap_stock_drp(sc_list_for_ap, brand_cd="X", ssn_cd="26S", ap_cd="U100")
    # wh_stock_map 호환 형태로 변환: (prdt_cd, color_cd) → [{sizCd, qty}]
    for (part_cd, color_cd), stocks in ap_stock_drp.items():
        wh_stock_map[(f"X26S{part_cd}", color_cd)] = stocks

    requests_list = []
    skipped = {"no_forecast": 0, "no_wh_stock": 0}

    for row in md_style_colors.iter_rows(named=True):
        style_cd = row["style_cd"]
        color_cd = row["color_cd"]
        prdt_cd = f"X26S{style_cd}"

        # Forecast 확인
        fc_key = (style_cd, color_cd)
        if fc_key not in forecast:
            skipped["no_forecast"] += 1
            continue

        fc_data = forecast[fc_key]  # [{shopCd, sizCd, qty}]

        # 창고 재고 확인
        wh_key = (prdt_cd, color_cd)
        wh_sizes = wh_stock_map.get(wh_key, [])
        if not wh_sizes:
            skipped["no_wh_stock"] += 1
            continue

        # 대상 매장 구성 (forecast에 있는 매장들)
        # forecast의 shopCd별로 그룹화
        shop_forecasts = defaultdict(list)
        for fc_row in fc_data:
            shop_forecasts[fc_row["shopCd"]].append({
                "sizCd": fc_row["sizCd"],
                "qty": fc_row["qty"]
            })

        target_shops = []
        for shop_cd, fc_sizes in shop_forecasts.items():
            # 매장 현재 재고
            current_stock = shop_stock_map.get((prdt_cd, shop_cd, color_cd), [])

            # adjRank
            adj_rank = shop_rank.get(shop_cd, 999)

            target_shops.append({
                "shopCd": shop_cd,
                "shopNm": "",  # ILP에 필수 아님
                "adjRank": adj_rank,
                "currentStock": current_stock if current_stock else [{"sizCd": s["sizCd"], "qty": 0} for s in fc_sizes],
                "forecast": fc_sizes
            })

        # adjRank로 정렬
        target_shops.sort(key=lambda x: x["adjRank"])
        # adjRank 재할당 (1부터)
        for i, shop in enumerate(target_shops, 1):
            shop["adjRank"] = i

        payload = {
            "brandCd": "X",
            "ssnCd": "26S",
            "prodCd": style_cd,
            "colorCd": color_cd,
            "executionDate": EXECUTION_DATE,
            "warehouseStock": wh_sizes,
            "targetShops": target_shops
        }
        requests_list.append(payload)

    print(f"\n  ILP 요청 구성: {len(requests_list)}건")
    print(f"  스킵: forecast 없음={skipped['no_forecast']}, 창고재고 없음={skipped['no_wh_stock']}")
    return requests_list


def call_ilp(requests_list):
    """ILP 서버 호출"""
    results = []
    errors = []

    print(f"\n  ILP 서버 호출 시작 ({len(requests_list)}건)...")
    for i, payload in enumerate(requests_list):
        style_color = f"{payload['prodCd']}_{payload['colorCd']}"
        try:
            resp = requests.post(
                ILP_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=ILP_TIMEOUT
            )
            if resp.status_code == 200:
                result = resp.json()
                result["_input_prodCd"] = payload["prodCd"]
                result["_input_colorCd"] = payload["colorCd"]
                results.append(result)
                status = result.get("status", "UNKNOWN")
                if (i + 1) % 10 == 0 or i == 0:
                    print(f"    [{i+1}/{len(requests_list)}] {style_color}: {status}")
            else:
                errors.append({"style_color": style_color, "status_code": resp.status_code, "text": resp.text[:200]})
                print(f"    [{i+1}] {style_color}: HTTP {resp.status_code}")
        except requests.exceptions.Timeout:
            errors.append({"style_color": style_color, "error": "timeout"})
            print(f"    [{i+1}] {style_color}: TIMEOUT")
        except Exception as e:
            errors.append({"style_color": style_color, "error": str(e)})
            print(f"    [{i+1}] {style_color}: ERROR {e}")

        # rate limiting
        time.sleep(0.1)

    print(f"\n  완료: 성공 {len(results)}, 실패 {len(errors)}")
    return results, errors


def compare_md_vs_ilp(md_alloc, ilp_results):
    """MD 배분 vs ILP 배분 비교"""
    print("\n" + "=" * 70)
    print("[비교 분석] MD vs ILP")
    print("=" * 70)

    # ILP 결과를 (style_cd, color_cd, shop_cd, size_cd) → alloc_qty 매핑
    ilp_alloc_map = {}
    ilp_style_shop_total = defaultdict(int)

    for result in ilp_results:
        if result.get("status") != "OPTIMAL":
            continue
        style_cd = result["_input_prodCd"]
        color_cd = result["_input_colorCd"]

        for shop_alloc in result.get("shopAllocations", []):
            shop_cd = shop_alloc["shopCd"]
            for alloc in shop_alloc.get("allocations", []):
                size_cd = alloc["sizCd"]
                alloc_qty = alloc.get("allocQty", 0)
                ilp_alloc_map[(style_cd, color_cd, shop_cd, size_cd)] = alloc_qty
                ilp_style_shop_total[(style_cd, shop_cd)] += alloc_qty

    # MD 배분을 (style_cd, shop_cd) → total_qty 매핑
    md_style_shop = md_alloc.group_by(["style_cd", "shop_id"]).agg(
        pl.col("alloc_qty").sum().alias("md_qty")
    )

    # 매칭되는 페어 비교
    comparison = []
    for row in md_style_shop.iter_rows(named=True):
        style_cd = row["style_cd"]
        shop_id = row["shop_id"]
        md_qty = row["md_qty"]
        ilp_qty = ilp_style_shop_total.get((style_cd, shop_id), 0)
        comparison.append({
            "style_cd": style_cd,
            "shop_id": shop_id,
            "md_qty": md_qty,
            "ilp_qty": ilp_qty,
            "diff": ilp_qty - md_qty
        })

    comp_df = pl.DataFrame(comparison)

    # 기본 통계
    both_nonzero = comp_df.filter((pl.col("md_qty") > 0) & (pl.col("ilp_qty") > 0))
    md_only = comp_df.filter((pl.col("md_qty") > 0) & (pl.col("ilp_qty") == 0))
    ilp_only = comp_df.filter((pl.col("md_qty") == 0) & (pl.col("ilp_qty") > 0))

    print(f"\n  총 비교 대상: {len(comp_df):,}쌍")
    print(f"  MD+ILP 모두 배분: {len(both_nonzero):,}쌍")
    print(f"  MD만 배분: {len(md_only):,}쌍")
    print(f"  ILP만 배분: {len(ilp_only):,}쌍 (ILP가 MD보다 넓게 배분)")

    if len(both_nonzero) > 0:
        print(f"\n  [MD+ILP 모두 배분한 매장]")
        print(f"    MD 평균 배분: {both_nonzero['md_qty'].mean():.1f}")
        print(f"    ILP 평균 배분: {both_nonzero['ilp_qty'].mean():.1f}")
        print(f"    차이(ILP-MD) 평균: {both_nonzero['diff'].mean():.1f}")

    # ILP 승률 (격차 큰 케이스)
    # 실판매 데이터가 없으므로 forecast를 프록시로 사용
    print(f"\n  총 MD 배분수량: {comp_df['md_qty'].sum():,}")
    print(f"  총 ILP 배분수량: {comp_df['ilp_qty'].sum():,}")

    # 결과 저장
    comp_df.write_parquet(os.path.join(DATA_DIR, "md_vs_ilp_comparison.parquet"))

    # ILP 결과 raw 저장
    with open(os.path.join(DATA_DIR, "ilp_results_w3.json"), "w") as f:
        json.dump(ilp_results, f, ensure_ascii=False, default=str)

    print(f"\n✅ 저장: md_vs_ilp_comparison.parquet, ilp_results_w3.json")
    return comp_df


def main():
    print("=" * 70)
    print("[Step 3] AIA vs MD 소급 시뮬레이션 — W3 + 26S")
    print("=" * 70)

    # 데이터 로드
    print("\n[데이터 로드]")
    forecast = load_forecast()
    shop_rank = load_shop_grp()
    sku_stock = load_sku_stock()

    # MD 배분 (W3, 26S만)
    alloc = pl.read_parquet(os.path.join(DATA_DIR, "md_alloc_raw.parquet"))
    md_alloc = alloc.filter(
        (pl.col("week") == "W3") & (pl.col("sesn") == "26S") &
        (pl.col("style_cd") != "") & (pl.col("shop_id") != "") &
        pl.col("shop_id").is_not_null()
    )
    print(f"  MD 배분 (W3+26S): {len(md_alloc):,}행")

    # ILP 요청 구성
    print("\n[ILP 요청 구성]")
    requests_list = build_ilp_requests(forecast, shop_rank, sku_stock, md_alloc)

    if not requests_list:
        print("  ❌ ILP 요청 0건 — 데이터 매칭 실패")
        return

    # ILP 서버 호출
    print("\n[ILP 서버 호출]")
    ilp_results, errors = call_ilp(requests_list)

    if not ilp_results:
        print("  ❌ ILP 결과 0건")
        return

    # 비교 분석
    comp_df = compare_md_vs_ilp(md_alloc, ilp_results)

    # OPTIMAL 비율
    optimal = [r for r in ilp_results if r.get("status") == "OPTIMAL"]
    infeasible = [r for r in ilp_results if r.get("status") == "INFEASIBLE"]
    print(f"\n[ILP 상태]")
    print(f"  OPTIMAL: {len(optimal)}")
    print(f"  INFEASIBLE: {len(infeasible)}")
    print(f"  기타: {len(ilp_results) - len(optimal) - len(infeasible)}")


if __name__ == "__main__":
    main()
