"""
일배치: Snowflake → JSON 아카이빙 스크립트
SSO(externalbrowser) 인증 사용 — 브라우저 로그인 팝업이 뜹니다.

사용법:
  PYTHONPATH=. .venv/bin/python scripts/sync_snowflake.py

환경변수:
  SNOWFLAKE_ACCOUNT   (예: cixxjbf-wp67697)
  SNOWFLAKE_USER      (예: hamin@fnfcorp.com)
  SNOWFLAKE_WAREHOUSE (예: DEV_WH)
  SNOWFLAKE_DATABASE  (기본 FNF)
  SNOWFLAKE_SCHEMA    (기본 PRCS)
  SNOWFLAKE_ROLE      (기본 PU_PI)

산출 파일:
  src/data/brand_archive.json
  src/data/ssn_archive.json
  src/data/category_tree_archive.json
  src/data/product_tree_archive.json   (sc_archive.json 대체)
  src/data/shop_grp_archive.json
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import snowflake.connector

# ── 경로 ──
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "src" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

BRANDS = ("M", "X", "V", "ST", "I")

# DW_ITEM ITEM_NM 이 영문인 항목 → 한글 매핑
ITEM_NM_KO = {
    # 대분류 (LVL=1)
    "ACC": "용품",
    # 중분류 (LVL=2)
    "Outer": "아우터",
    "Inner": "이너",
    "Bottom": "하의",
    "Headwear": "모자",
    "Bag": "가방",
    "Shoes": "신발",
    "Wear_etc": "의류기타",
    "Acc_etc": "용품기타",
}


def connect():
    return snowflake.connector.connect(
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        user=os.environ["SNOWFLAKE_USER"],
        authenticator="externalbrowser",
        warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE", "DEV_WH"),
        database=os.environ.get("SNOWFLAKE_DATABASE", "FNF"),
        schema=os.environ.get("SNOWFLAKE_SCHEMA", "PRCS"),
        role=os.environ.get("SNOWFLAKE_ROLE", "PU_PI"),
    )


def write_json(name, data):
    path = DATA_DIR / name
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    size = path.stat().st_size
    print(f"  ✅ {name} ({size:,} bytes)")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def main():
    print("[sync-snowflake] SSO 로그인 — 브라우저가 열립니다...")
    conn = connect()
    cur = conn.cursor()
    print("[sync-snowflake] 연결 성공!\n")

    brand_in = ",".join(f"'{b}'" for b in BRANDS)

    # ════════════════════════════════════════════
    # 1. brand_archive.json
    # ════════════════════════════════════════════
    print("1/5 브랜드 목록...")
    cur.execute(f"SELECT BRD_CD, BRD_NM FROM FNF.PRCS.DW_BRD WHERE USE_YN='Y' AND BRD_CD IN ({brand_in}) ORDER BY BRD_CD")
    brands = [{"brandCd": r[0], "brandNm": r[1]} for r in cur.fetchall()]
    write_json("brand_archive.json", {"items": brands, "generatedAt": now_iso()})

    # ════════════════════════════════════════════
    # 2. ssn_archive.json
    # ════════════════════════════════════════════
    print("2/5 시즌 목록...")
    cur.execute(f"SELECT DISTINCT SESN FROM FNF.PRCS.DW_PRDT WHERE BRD_CD IN ({brand_in}) AND SESN IS NOT NULL ORDER BY SESN DESC")
    seasons = [{"ssnCd": r[0]} for r in cur.fetchall()]
    write_json("ssn_archive.json", {"items": seasons, "generatedAt": now_iso()})

    # ════════════════════════════════════════════
    # 3. category_tree_archive.json
    # ════════════════════════════════════════════
    print("3/5 분류 트리...")
    cur.execute("SELECT LVL, ITEM, PARENT_ITEM, ITEM_NM FROM FNF.PRCS.DW_ITEM WHERE USE_YN = true AND LVL IN ('1','2','3') ORDER BY LVL, ITEM")
    cat_rows = cur.fetchall()

    name_map = {}  # code → name (한글화 적용)
    tree = {}  # 대분류 → {name, children: {중분류 → {name, children: [아이템]}}}

    for lvl, item, parent, name in cat_rows:
        # 영문 ITEM_NM → 한글 변환
        name_ko = ITEM_NM_KO.get(name, name)
        name_map[item] = name_ko
        if lvl == "1":
            tree.setdefault(item, {"name": name_ko, "code": item, "children": {}})
        elif lvl == "2":
            if parent in tree:
                tree[parent]["children"].setdefault(item, {"name": name_ko, "code": item, "children": []})
        elif lvl == "3":
            for cat1 in tree.values():
                if parent in cat1["children"]:
                    cat1["children"][parent]["children"].append({"code": item, "name": name_ko})

    write_json("category_tree_archive.json", {"tree": tree, "nameMap": name_map, "generatedAt": now_iso()})

    # ════════════════════════════════════════════
    # 4. product_tree_archive.json (sc_archive 대체)
    # ════════════════════════════════════════════
    print("4/5 상품 트리 (전량 — 시간이 걸릴 수 있습니다)...")
    cur.execute(f"""
        SELECT DISTINCT
            p.BRD_CD, p.SESN,
            p.PARENT_PRDT_KIND_CD, p.PRDT_KIND_CD, p.ITEM,
            p.PRDT_CD, p.PRDT_NM,
            sc.COLOR_CD
        FROM FNF.PRCS.DW_PRDT p
        JOIN (SELECT DISTINCT BRD_CD, PRDT_CD, COLOR_CD FROM FNF.PRCS.DW_PRDT_SC) sc
          ON p.BRD_CD = sc.BRD_CD AND p.PRDT_CD = sc.PRDT_CD
        WHERE p.BRD_CD IN ({brand_in})
        ORDER BY p.BRD_CD, p.SESN DESC, p.PRDT_CD, sc.COLOR_CD
    """)

    prod_items = []
    for brd, sesn, pKind, kind, item, prodCd, prodNm, colorCd in cur.fetchall():
        prod_items.append({
            "brandCd": brd,
            "ssnCd": sesn,
            "prodCd": prodCd,
            "prodNm": prodNm,
            "colorCd": colorCd,
            "category1": name_map.get(pKind, pKind or ""),
            "category1Cd": pKind or "",
            "category2": name_map.get(kind, kind or ""),
            "category2Cd": kind or "",
            "category3": name_map.get(item, item or ""),
            "category3Cd": item or "",
        })

    unique_styles = len(set(p["prodCd"] for p in prod_items))
    print(f"  → {len(prod_items):,}행 ({unique_styles:,}개 스타일 × 컬러)")
    write_json("product_tree_archive.json", {"items": prod_items, "generatedAt": now_iso()})

    # ════════════════════════════════════════════
    # 5. shop_grp_archive.json
    # ════════════════════════════════════════════
    print("5/5 배분그룹 트리...")
    cur.execute(f"""
        SELECT g.SHOP_GRP_CD, g.SHOP_GRP_NM, g.BRD_CD
        FROM FNF.PRCS.DW_SHOP_GRP g
        WHERE g.SHOP_GRP_TYPE = 'ALOC' AND g.BRD_CD IN ({brand_in})
        ORDER BY g.BRD_CD, g.SHOP_GRP_NM
    """)
    grp_rows = cur.fetchall()

    cur.execute(f"""
        SELECT d.SHOP_GRP_CD, d.BRD_CD, d.SHOP_ID, d.SHOP_RANK, sh.SHOP_NM_SHORT
        FROM FNF.PRCS.DW_SHOP_GRP_DTL d
        LEFT JOIN FNF.PRCS.DW_SHOP sh ON d.BRD_CD = sh.BRD_CD AND d.SHOP_ID = sh.SHOP_ID
        WHERE d.SHOP_GRP_CD IN (
            SELECT SHOP_GRP_CD FROM FNF.PRCS.DW_SHOP_GRP
            WHERE SHOP_GRP_TYPE = 'ALOC' AND BRD_CD IN ({brand_in})
        )
        ORDER BY d.SHOP_GRP_CD, d.SHOP_RANK NULLS LAST
    """)
    detail_rows = cur.fetchall()

    # 그룹별 매장
    detail_map = {}
    for grpCd, _, shopId, shopRank, shopNm in detail_rows:
        detail_map.setdefault(grpCd, []).append({
            "shopCd": shopId,
            "shopNm": shopNm or shopId,
            "adjRank": int(shopRank) if shopRank else 999,
        })

    shop_grp_archive = {}
    for grpCd, grpNm, brdCd in grp_rows:
        shops = sorted(detail_map.get(grpCd, []), key=lambda s: s["adjRank"])
        shop_grp_archive[grpCd] = {
            "shopGrpNo": grpCd,
            "shopGrpNm": grpNm,
            "brandCd": brdCd,
            "shopCnt": len(shops),
            "shops": shops,
        }

    write_json("shop_grp_archive.json", json.loads(json.dumps(shop_grp_archive, ensure_ascii=False)))
    print(f"  → {len(shop_grp_archive)}개 배분그룹, {len(detail_rows):,}개 매장")

    # ════════════════════════════════════════════
    # 6. brand_shops_archive.json (브랜드별 전체 영업 매장)
    # ════════════════════════════════════════════
    print("6/6 브랜드별 오프라인 매장...")
    cur.execute(f"""
        SELECT BRD_CD, SHOP_ID, SHOP_NM_SHORT, ANAL_REGION
        FROM FNF.PRCS.DW_SHOP
        WHERE BRD_CD IN ({brand_in})
          AND ANAL_CNTRY = 'KO'
          AND CLOSE_DT IS NULL
          AND ANLYS_ON_OFF_CLS_CD = 'F'
          AND SHOP_TYPE = 'A'
          AND MNG_TYPE = 'A'
          AND (SHOP_NM_SHORT NOT LIKE '%(상-사)%' OR SHOP_NM_SHORT IS NULL)
        ORDER BY BRD_CD, SHOP_ID
    """)
    all_shop_rows = cur.fetchall()

    brand_shops = {}
    for brdCd, shopId, shopNm, region in all_shop_rows:
        brand_shops.setdefault(brdCd, []).append({
            "shopCd": shopId,
            "shopNm": shopNm or shopId,
            "region": region or "",
        })

    write_json("brand_shops_archive.json", {"shops": brand_shops, "generatedAt": now_iso()})
    for brd in sorted(brand_shops):
        print(f"  {brd}: {len(brand_shops[brd])}개 매장")

    cur.close()
    conn.close()
    print("\n🎉 완료!")


if __name__ == "__main__":
    main()
