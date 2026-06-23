"""
AI 재고 브리핑 배치: Snowflake 데이터 → briefing_archive.json
SSO(externalbrowser) 인증 — 브라우저 로그인 팝업.

설계 문서: /오프라인_재고운용_자동화_설계.md §3, §4

사용법:
  cd aia-replenishment
  SNOWFLAKE_ACCOUNT=cixxjbf-wp67697 SNOWFLAKE_USER=hamin@fnfcorp.com \
  SNOWFLAKE_WAREHOUSE=DEV_WH SNOWFLAKE_DATABASE=FNF SNOWFLAKE_SCHEMA=ML_DIST \
  SNOWFLAKE_ROLE=PU_PI .venv/bin/python scripts/scoring_engine.py

산출:
  src/data/briefing_archive.json — 화면 0 AI 재고 브리핑 데이터
"""

import json
import math
import os
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import snowflake.connector

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "src" / "data"

# ══════ v2 파라미터 (설계서 §3-2, 2026-06-10 전환) ══════
# 매장 부족 판정: 매장 재고주수 < 이 값이면 "부족"
SHOP_SHORTAGE_WEEKS = 3.0
# SC 분류: 부족매장 비율 >= 이 값이면 needs_action
SHORTAGE_RATIO_THRESHOLD = 0.30
# 급상승 판정: 속도 >= 이 값 AND 평균 재고주수 3~5주
VELOCITY_SURGE_PCT = 40
SURGE_COVERAGE_MIN = 3.0
SURGE_COVERAGE_MAX = 5.0
# AP 압박 기준 (priority score용)
AP_PRESSURE_WEEKS = 3.0
# Step 0: 미입고(initial) 필터 — 매장 재고 ≈ 0 + 최근 판매 0
INITIAL_AVG_INV_WEEKS_MAX = 0.5  # 평균 재고주수 이하면 "미입고"
INITIAL_VELOCITY_FLOOR = -90     # 속도 이 값 이하도 "미입고" 허용

# ══════ v1 레거시 (compute_rt_score에서 참조) ══════
COVERAGE_TARGET_WEEKS = 2.0
CV_SATURATION = 1.5
MIN_DONOR_STOCK = 2.0


def connect():
    return snowflake.connector.connect(
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        user=os.environ["SNOWFLAKE_USER"],
        authenticator="externalbrowser",
        warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE", "DEV_WH"),
        database=os.environ.get("SNOWFLAKE_DATABASE", "FNF"),
        schema=os.environ.get("SNOWFLAKE_SCHEMA", "ML_DIST"),
        role=os.environ.get("SNOWFLAKE_ROLE", "PU_PI"),
    )


def build_ai_reason(
    coverage_weeks: float,
    broken_shops: int,
    broken_sizes: list[str],
    velocity_change_pct: float,
    ap_stock: int,
    signal_type: str,
) -> str:
    """수치 기반 한국어 안내 — 설계서 §4-3 (Phase 1 룰 기반, LLM 없음)."""
    size_str = "·".join(broken_sizes) if broken_sizes else ""

    if signal_type == "urgent":
        parts = []
        if broken_shops > 0 and size_str:
            parts.append(f"상위 {broken_shops}개 매장 {size_str} 사이즈 소진")
        elif broken_shops > 0:
            parts.append(f"상위 {broken_shops}개 매장 재고 부족")
        parts.append(f"AP {ap_stock}개 기준 {coverage_weeks:.1f}주 커버")
        if velocity_change_pct >= 10:
            parts.append(f"판매속도 +{velocity_change_pct:.0f}% 상승 중")
        return ". ".join(parts) + "."

    if signal_type == "rt":
        return (
            f"AP 부족({ap_stock}개). 하위 매장 과잉 재고 — "
            f"상위 {broken_shops}개 매장으로 RT 권장."
        )

    if signal_type == "trend":
        return f"판매속도 전주比 +{velocity_change_pct:.0f}% 가속. 선제 배분으로 결품 예방."

    return "안정"


def compute_rt_score(
    shop_stocks: list[float],
    ap_stock: float,
    weekly_forecast: float,
) -> float:
    """설계서 §3-3: SC 레벨 RT 필요도 점수."""
    if not shop_stocks or sum(shop_stocks) == 0:
        return 0.0

    n = len(shop_stocks)
    mean_stock = sum(shop_stocks) / n

    # ① AP 부족도
    ap_coverage = ap_stock / (weekly_forecast + 0.01)
    ap_shortage = max(0.0, 1.0 - ap_coverage / COVERAGE_TARGET_WEEKS)

    # ② 매장 간 불균등도 (CV)
    std_stock = (sum((s - mean_stock) ** 2 for s in shop_stocks) / n) ** 0.5
    cv = std_stock / (mean_stock + 0.01)
    distribution_imbalance = min(1.0, cv / CV_SATURATION)

    # ③ donor 존재 여부
    donor_exists = any(s >= MIN_DONOR_STOCK for s in shop_stocks)
    if not donor_exists:
        return 0.0

    return round(ap_shortage * distribution_imbalance, 3)


def main():
    print("[scoring-engine] SSO 로그인 — 브라우저가 열립니다...")
    conn = connect()
    cur = conn.cursor()
    print("[scoring-engine] 연결 성공!\n")

    # ──────────────────────────────────────────────
    # 1. SC별 주간 예측 (PRED_SC_W — 최신 EXECUTION_DT)
    # ──────────────────────────────────────────────
    print("1/4 SC별 주간 예측 조회 (PRED_SC_W)...")
    cur.execute("""
        SELECT BRD_CD, PART_CD, COLOR_CD, SESN, PRED_SC_QTY
        FROM FNF.ML_DIST.PRED_SC_W
        WHERE BRD_CD = 'X' AND SESN = '26S'
        QUALIFY ROW_NUMBER() OVER (
            PARTITION BY BRD_CD, PART_CD, COLOR_CD, SESN
            ORDER BY EXECUTION_DT DESC
        ) = 1
    """)
    pred_rows = cur.fetchall()
    print(f"  → {len(pred_rows):,}행")

    # sc_key = (PART_CD, COLOR_CD) → weekly_forecast (SC-Total)
    weekly_forecast_map: dict[tuple[str, str], float] = {}
    for brd, part, color, sesn, qty in pred_rows:
        weekly_forecast_map[(part, color)] = float(qty)

    # ──────────────────────────────────────────────
    # 1.5 매장별 SC 주간 예측 (PRED_SH_SC_W — v2 핵심)
    #     shortage_ratio 계산에 사용
    # ──────────────────────────────────────────────
    print("1.5/5 매장별 SC 주간 예측 조회 (PRED_SH_SC_W)...")
    cur.execute("""
        SELECT PART_CD, COLOR_CD, SHOP_ID, PRED_SH_SC_QTY
        FROM FNF.ML_DIST.PRED_SH_SC_W
        WHERE BRD_CD = 'X' AND SESN = '26S'
        QUALIFY ROW_NUMBER() OVER (
            PARTITION BY PART_CD, COLOR_CD, SHOP_ID
            ORDER BY EXECUTION_DT DESC
        ) = 1
    """)
    shop_pred_rows = cur.fetchall()
    print(f"  → {len(shop_pred_rows):,}행")

    # (part_cd, color_cd, shop_id) → weekly_shop_forecast
    shop_forecast_map: dict[tuple[str, str, str], float] = {}
    for part, color, shop, qty in shop_pred_rows:
        shop_forecast_map[(part, color, shop)] = float(qty)

    # ──────────────────────────────────────────────
    # 2. AP 창고 재고 (DRP API — apCd별 조회)
    #    변경 2026-06-09: DCS AI WH_STOCK_QTY(전 AP 합산) → DRP API apCd=U100
    #    이유: WH_STOCK_QTY는 S200+U100+U200+U300+U400 전부 합산.
    #          보충배분 대상 AP는 U100(오프라인 정상)만 해당.
    # ──────────────────────────────────────────────
    # [ROLLBACK] 이전 코드 — DCS AI WH_STOCK_QTY (전 AP 합산)
    # import subprocess, tempfile, glob as glob_mod
    # today_str = datetime.now().strftime("%Y-%m-%d")
    # ap_body = json.dumps({
    #     "selectors_product": [{"system_field_name": "PRDT_CD"}, {"system_field_name": "SESN"}],
    #     "selectors_sku": [{"system_field_name": "COLOR_CD"}],
    #     "metrics": [{"system_field_name": "WH_STOCK_QTY"}],
    #     "filters_product": [
    #         {"system_code": "X", "system_field_name": "BRD_CD"},
    #         {"system_code": "26S", "system_field_name": "SESN"},
    #     ],
    #     "end_dt": today_str,
    #     "order_by_clauses": [{"system_field_name": "WH_STOCK_QTY", "direction": "DESC"}],
    #     "meta_info": {"data_size_only": False, "data_type": "list", "requested_record_rows": 20000},
    # })
    # ap_result = subprocess.run(
    #     ["dcs-ai-cli", "fetch", "--endpoint", "/api/v1/hq/stock/product_stock",
    #      "--method", "POST", "--body", ap_body, "--name", "scoring_ap_stock"],
    #     capture_output=True, text=True, timeout=120,
    # )
    # tmpdir = tempfile.gettempdir()
    # ap_files = sorted(glob_mod.glob(os.path.join(tmpdir, "dcs-ai-cli", "scoring_ap_stock_*.json")))
    # with open(ap_files[-1]) as f: ap_raw = json.load(f)
    # ap_data = ap_raw["data"]
    # ap_stock_map = {}
    # for row in ap_data:
    #     ap_stock_map[(row["PRDT_CD"][4:], row["COLOR_CD"])] = int(row["WH_STOCK_QTY"])
    # [/ROLLBACK]

    from concurrent.futures import ThreadPoolExecutor, as_completed
    import urllib.request
    import urllib.parse

    AP_CD = os.environ.get("SCORING_AP_CD", "U100")
    BRD_CD = "X"
    SSN_CD = "26S"

    # DRP API 설정 (.env.local → 환경변수 순서로 로드)
    drp_base = os.environ.get("DRP_API_BASE", "")
    drp_key = os.environ.get("DRP_API_KEY", "")
    if not drp_base:
        env_local = SCRIPT_DIR.parent / ".env.local"
        if env_local.exists():
            for line in env_local.read_text().splitlines():
                line = line.strip()
                if line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip()
                if k == "DRP_API_BASE" and not drp_base:
                    drp_base = v
                elif k == "DRP_API_KEY" and not drp_key:
                    drp_key = v

    print(f"2/4 AP 창고 재고 조회 (DRP API, apCd={AP_CD})...")
    ap_stock_map: dict[tuple[str, str], int] = {}

    if not drp_base:
        print("  ⚠️ DRP_API_BASE 미설정 — AP 재고 전부 0으로 처리")
    else:
        sc_keys_for_ap = list(weekly_forecast_map.keys())

        def _fetch_ap(part_cd: str, color_cd: str) -> tuple[str, str, int]:
            params = urllib.parse.urlencode({
                "brandCd": BRD_CD, "prodCd": part_cd,
                "colorCd": color_cd, "apCd": AP_CD, "ssnCd": SSN_CD,
            })
            url = f"{drp_base}/api-gateway/ilp/ap-stk?{params}"
            req = urllib.request.Request(url)
            if drp_key:
                req.add_header("x-api-key", drp_key)
            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    body = json.loads(resp.read())
                    data = body.get("data", body)
                    stocks = data.get("stocks", [])
                    return (part_cd, color_cd, sum(s.get("qty", 0) for s in stocks))
            except Exception:
                return (part_cd, color_cd, 0)

        with ThreadPoolExecutor(max_workers=20) as pool:
            futs = {pool.submit(_fetch_ap, p, c): (p, c) for p, c in sc_keys_for_ap}
            done = 0
            for fut in as_completed(futs):
                p, c, qty = fut.result()
                if qty > 0:
                    ap_stock_map[(p, c)] = qty
                done += 1
                if done % 200 == 0:
                    print(f"  → {done}/{len(sc_keys_for_ap)} SC 조회...")

        ap_with_stock = sum(1 for v in ap_stock_map.values() if v > 0)
        print(f"  → {len(sc_keys_for_ap)}개 SC 완료, AP 재고有: {ap_with_stock}개 (apCd={AP_CD})")

    # ──────────────────────────────────────────────
    # 3. 매장별 SC 재고 (사이즈 합산, 오프라인 매장만)
    #    변경 2026-06-09: SHOP_ID != '90019' 하드코딩 →
    #    DW_SHOP JOIN + ANLYS_ON_OFF_CLS_CD = 'F' (오프라인)
    # ──────────────────────────────────────────────
    # [ROLLBACK] 이전 코드: SHOP_ID != '90019' 하드코딩
    # cur.execute("""
    #     SELECT PRDT_CD, COLOR_CD, SHOP_ID, SUM(SH_STOCK_QTY) as SHOP_STOCK
    #     FROM FNF.PRCS.DW_SH_SCS_DACUM
    #     WHERE CURRENT_DATE BETWEEN START_DT AND END_DT
    #       AND BRD_CD = 'X' AND SHOP_ID != '90019' AND PRDT_CD LIKE 'X26S%'
    #     GROUP BY PRDT_CD, COLOR_CD, SHOP_ID
    # """)
    # [/ROLLBACK]
    print("3/4 매장별 재고 조회 (오프라인 매장만)...")
    cur.execute("""
        SELECT d.PRDT_CD, d.COLOR_CD, d.SHOP_ID, SUM(d.SH_STOCK_QTY) as SHOP_STOCK
        FROM FNF.PRCS.DW_SH_SCS_DACUM d
        JOIN FNF.PRCS.DW_SHOP s
          ON d.BRD_CD = s.BRD_CD AND d.SHOP_ID = s.SHOP_ID
        WHERE CURRENT_DATE BETWEEN d.START_DT AND d.END_DT
          AND d.BRD_CD = 'X'
          AND d.PRDT_CD LIKE 'X26S%'
          AND s.ANLYS_ON_OFF_CLS_CD = 'F'
          AND s.ANAL_CNTRY = 'KO'
        GROUP BY d.PRDT_CD, d.COLOR_CD, d.SHOP_ID
    """)
    shop_rows = cur.fetchall()
    print(f"  → {len(shop_rows):,}행")

    # (part_cd, color_cd) → { shop_id: stock }
    shop_stock_map: dict[tuple[str, str], dict[str, int]] = defaultdict(dict)
    # 사이즈 결품 감지용: (part_cd, color_cd, shop_id) → set of sizes with stock
    shop_size_map: dict[tuple[str, str, str], int] = defaultdict(int)

    for prdt_cd, color, shop_id, stock in shop_rows:
        part_cd = prdt_cd[4:]
        shop_stock_map[(part_cd, color)][shop_id] = int(stock)
        shop_size_map[(part_cd, color, shop_id)] += 1

    # ──────────────────────────────────────────────
    # 4. 판매 속도 변화 (최근 2주 vs 전전 2주)
    # ──────────────────────────────────────────────
    print("4/4 판매 속도 변화 조회...")
    cur.execute("""
        WITH daily AS (
            SELECT PROD_CD, COLOR_CD, TO_DATE(STD_DE) AS SALE_DT,
                   SUM(NOR_SALE_QTY) - SUM(RTN_SALE_QTY) AS NET_SALE
            FROM FNF.SERP.BIM_SHOP_DD_STK
            WHERE BRAND_CD = 'X'
              AND TO_DATE(STD_DE) >= DATEADD('week', -4, CURRENT_DATE)
              AND PROD_CD IN (SELECT DISTINCT SUBSTR(PRDT_CD, 5)
                              FROM FNF.PRCS.DW_SH_SCS_DACUM
                              WHERE PRDT_CD LIKE 'X26S%'
                                AND CURRENT_DATE BETWEEN START_DT AND END_DT)
            GROUP BY PROD_CD, COLOR_CD, TO_DATE(STD_DE)
        )
        SELECT PROD_CD, COLOR_CD,
               SUM(CASE WHEN SALE_DT >= DATEADD('week', -2, CURRENT_DATE) THEN NET_SALE ELSE 0 END) AS RECENT_2W,
               SUM(CASE WHEN SALE_DT < DATEADD('week', -2, CURRENT_DATE) THEN NET_SALE ELSE 0 END) AS PREV_2W
        FROM daily
        GROUP BY PROD_CD, COLOR_CD
    """)
    velocity_rows = cur.fetchall()
    print(f"  → {len(velocity_rows):,}행")

    # (part_cd, color_cd) → velocity_change_pct
    velocity_map: dict[tuple[str, str], float] = {}
    for prod_cd, color, recent, prev in velocity_rows:
        # BIM_SHOP_DD_STK의 PROD_CD = PART_CD (X26S 접두어 없음)
        part_cd = prod_cd
        recent_val = float(recent or 0)
        prev_val = float(prev or 0)
        if prev_val > 0:
            change_pct = ((recent_val - prev_val) / prev_val) * 100
        elif recent_val > 0:
            change_pct = 100.0  # 이전 판매 0 → 신규 판매 발생
        else:
            change_pct = 0.0
        velocity_map[(part_cd, color)] = round(change_pct, 1)

    cur.close()
    conn.close()
    print("\n[scoring-engine] Snowflake 연결 종료. 점수 계산 시작...\n")

    # ──────────────────────────────────────────────
    # 5. SC별 점수 계산
    # ──────────────────────────────────────────────

    # 스타일 이름 매핑 (product_tree_X.json)
    prod_name_map: dict[tuple[str, str], tuple[str, str]] = {}  # (part, color) → (name, category)
    pt_path = DATA_DIR / "product_tree_X.json"
    if pt_path.exists():
        with open(pt_path) as f:
            pt = json.load(f)
        for item in pt.get("items", []):
            if item.get("ssnCd") == "26S":
                # prodCd = X26SDMTS71063 → part_cd = DMTS71063
                part = item["prodCd"][4:] if item["prodCd"].startswith("X26S") else item["prodCd"]
                prod_name_map[(part, item["colorCd"])] = (
                    item.get("prodNm", ""),
                    item.get("category3", item.get("category2", "")),
                )

    # adjRank 기반 상위 매장 (shop_grp_archive.json)
    top_shops: set[str] = set()
    sg_path = DATA_DIR / "shop_grp_archive.json"
    if sg_path.exists():
        with open(sg_path) as f:
            sg = json.load(f)
        for grp in sg.values():
            if isinstance(grp, dict) and grp.get("brandCd") == "X":
                for shop in grp.get("shops", []):
                    if shop.get("adjRank", 999) <= 30:  # 상위 30등 이내
                        top_shops.add(shop["shopCd"])

    sc_list = []
    all_sc_keys = set(weekly_forecast_map.keys()) | set(shop_stock_map.keys())

    for part_cd, color_cd in all_sc_keys:
        wf = weekly_forecast_map.get((part_cd, color_cd), 0.0)
        ap = ap_stock_map.get((part_cd, color_cd), 0)
        shops = shop_stock_map.get((part_cd, color_cd), {})
        vel_pct = velocity_map.get((part_cd, color_cd), 0.0)

        if wf <= 0 and not shops:
            continue  # 예측도 재고도 없으면 스킵

        # ── v2: shortage_ratio 계산 (설계서 §3-2) ──
        # 매장별 재고주수 = 매장현재고 / PRED_SH_SC_QTY
        # 부족 = 재고주수 < 3주
        total_shops_with_forecast = 0
        shortage_count = 0
        coverage_weeks_list: list[float] = []

        for shop_id, stock in shops.items():
            shop_fc = shop_forecast_map.get((part_cd, color_cd, shop_id), 0.0)
            if shop_fc > 0.01:
                total_shops_with_forecast += 1
                shop_cov = stock / shop_fc
                coverage_weeks_list.append(shop_cov)
                if shop_cov < SHOP_SHORTAGE_WEEKS:
                    shortage_count += 1
            elif stock == 0:
                # 예측 없고 재고 0 — 부족으로 카운트
                total_shops_with_forecast += 1
                shortage_count += 1
                coverage_weeks_list.append(0.0)

        shortage_ratio = shortage_count / max(total_shops_with_forecast, 1)
        avg_coverage = sum(coverage_weeks_list) / max(len(coverage_weeks_list), 1)

        # AP 커버주수 (priority score용)
        ap_coverage_weeks = ap / (wf + 0.01)
        ap_pressure = max(0.0, min(1.0, 1.0 - ap_coverage_weeks / AP_PRESSURE_WEEKS))

        # velocity_signal
        velocity_signal = min(1.0, max(0.0, vel_pct / 50.0))

        # ── v2 Priority Score: 0.50 shortage + 0.30 velocity + 0.20 ap_pressure ──
        priority_score = round(
            0.50 * shortage_ratio + 0.30 * velocity_signal + 0.20 * ap_pressure, 3
        )

        # 부족 매장 리스트 (재고 0인 곳)
        broken_shop_ids = [s for s, stk in shops.items() if stk == 0]
        broken_shops = len(broken_shop_ids)
        broken_sizes: list[str] = []

        # ── v2 분류 (설계서 §3-2) ──
        # Step 0: 미입고(initial) — 매장 재고 ≈ 0 + AP에 재고 있음 → 초도 배분 필요
        total_shop_stock = sum(shops.values()) if shops else 0
        is_initial = (
            avg_coverage <= INITIAL_AVG_INV_WEEKS_MAX
            and total_shop_stock <= 2  # 전 매장 재고 합이 거의 0
            and ap > 0                 # AP에 줄 재고는 있음
            and vel_pct >= INITIAL_VELOCITY_FLOOR
        )

        if is_initial:
            signal_type = "initial"
        # Step 1: shortage_ratio >= 30%?
        elif shortage_ratio >= SHORTAGE_RATIO_THRESHOLD:
            if ap > 0:
                signal_type = "urgent"
            else:
                signal_type = "rt"
        # Step 2: 급상승?
        elif vel_pct >= VELOCITY_SURGE_PCT and SURGE_COVERAGE_MIN <= avg_coverage <= SURGE_COVERAGE_MAX:
            signal_type = "trend"
        else:
            signal_type = "normal"

        # ai_reason
        ai_reason = build_ai_reason(
            ap_coverage_weeks, broken_shops, broken_sizes, vel_pct, ap, signal_type
        )

        name_info = prod_name_map.get((part_cd, color_cd), ("", ""))

        sc_list.append({
            "sc_cd": f"X_{part_cd}_{color_cd}",
            "prod_cd": part_cd,
            "color_cd": color_cd,
            "prod_nm": name_info[0],
            "category": name_info[1],
            "priority_score": priority_score,
            "priority_axes": {
                "shortage_ratio": round(shortage_ratio, 3),
                "velocity_signal": round(velocity_signal, 3),
                "ap_pressure": round(ap_pressure, 3),
            },
            "signal_type": signal_type,
            "ap_stock": ap,
            "weekly_forecast": round(wf, 1),
            "coverage_weeks": round(ap_coverage_weeks, 2),
            "broken_shops": broken_shops,
            "broken_sizes": broken_sizes,
            "velocity_change_pct": vel_pct,
            "ai_reason": ai_reason,
            "shortage_ratio": round(shortage_ratio, 3),
            "avg_shop_coverage": round(avg_coverage, 2),
            "top_shops_to_replenish": broken_shop_ids[:5],
        })

    # priority_score 내림차순 정렬
    sc_list.sort(key=lambda x: -x["priority_score"])

    # 카운트 집계
    urgent_count = sum(1 for s in sc_list if s["signal_type"] == "urgent")
    rt_count = sum(1 for s in sc_list if s["signal_type"] == "rt")
    trend_count = sum(1 for s in sc_list if s["signal_type"] == "trend")
    initial_count = sum(1 for s in sc_list if s["signal_type"] == "initial")
    normal_count = sum(1 for s in sc_list if s["signal_type"] == "normal")
    total_sc = len(sc_list)
    action_count = urgent_count + rt_count + trend_count + initial_count

    narrative = (
        f"Discovery 26S · {total_sc}개 SC 분석 완료. "
        f"{action_count}개 SC에서 즉각 조치 필요 신호 감지."
    )

    print(f"총 SC: {total_sc}")
    print(f"  🔴 긴급 보충: {urgent_count}")
    print(f"  🔄 RT 대상: {rt_count}")
    print(f"  📈 급상승: {trend_count}")
    print(f"  🆕 초도 배분: {initial_count}")
    print(f"  ⚪ 정상: {normal_count}")

    # ──────────────────────────────────────────────
    # 6. briefing_archive.json 저장
    # ──────────────────────────────────────────────
    output = {
        "X_26S": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "brand_cd": "X",
            "ssn_cd": "26S",
            "summary": {
                "total_sc": total_sc,
                "urgent_count": urgent_count,
                "rt_count": rt_count,
                "trend_count": trend_count,
                "initial_count": initial_count,
                "normal_count": normal_count,
                "narrative": narrative,
            },
            "sc_list": sc_list,
        },
    }

    out_path = DATA_DIR / "briefing_archive.json"
    out_path.write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    size_mb = out_path.stat().st_size / 1024 / 1024
    print(f"\n✅ briefing_archive.json 생성 완료")
    print(f"   SC: {total_sc}개, 크기: {size_mb:.1f}MB")
    print("🎉 완료!")


if __name__ == "__main__":
    main()
