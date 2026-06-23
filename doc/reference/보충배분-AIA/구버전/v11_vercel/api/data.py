"""
보충배분-AIA v11 — 데이터 API
========================================
GET /api/data?style=전체&color=전체&grade=전체&view=shop
→ 피벗 테이블 데이터를 JSON으로 반환

★ Mock 데이터 로직을 바꾸고 싶으면 generate_data() 함수를 수정하세요.
★ 나중에 실제 DB 연동 시 generate_data()만 교체하면 됩니다.
========================================
"""

import json
import random
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# 같은 폴더의 config.py 에서 설정 가져오기
from api.config import SHOPS, STYLES, SIZES, BRANDS, AP_OPTIONS, SEASONS, VERSION


# ─── Mock 데이터 생성 ────────────────────────────────
random.seed(42)

def generate_data():
    """매장 × 스타일 × 컬러 × 사이즈별 데이터 생성"""
    rows = []
    for shop in SHOPS:
        for style in STYLES:
            for color in style["colors"]:
                for size in SIZES:
                    forecast = random.randint(1, 10)
                    rows.append({
                        "shop_id":    shop["id"],
                        "shop_name":  shop["name"],
                        "shop_grade": shop["grade"],
                        "style_code": style["code"],
                        "style_name": style["name"],
                        "item":       style["item"],
                        "color":      color,
                        "size":       size,
                        "stock":      random.randint(0, 17),
                        "forecast":   forecast,
                        "alloc":      forecast,
                    })
    return rows


def generate_ap_stock():
    """물류(AP) 재고 생성"""
    rows = []
    for style in STYLES:
        for color in style["colors"]:
            for size in SIZES:
                rows.append({
                    "style_code": style["code"],
                    "color":      color,
                    "size":       size,
                    "ap_stock":   30 + random.randint(0, 119),
                })
    return rows


# ─── 필터링 ──────────────────────────────────────────
def filter_data(rows, style="전체", color="전체", grade="전체"):
    result = rows
    if style != "전체":
        result = [r for r in result if r["style_code"] == style]
    if color != "전체":
        result = [r for r in result if r["color"] == color]
    if grade != "전체":
        result = [r for r in result if r["shop_grade"] == grade]
    return result


# ─── 피벗 변환 ───────────────────────────────────────
def pivot_by_shop(rows):
    """매장별 보기: 행=매장, 열=스타일_컬러_사이즈"""
    shops_map = {}
    for r in rows:
        sid = r["shop_id"]
        if sid not in shops_map:
            shops_map[sid] = {
                "shop_id": r["shop_id"],
                "shop_name": r["shop_name"],
                "shop_grade": r["shop_grade"],
            }
        col_key = f"{r['style_code']}_{r['color']}_{r['size']}"
        shops_map[sid][col_key] = r["alloc"]

    result = list(shops_map.values())
    # 합계 계산
    for row in result:
        total = sum(v for k, v in row.items() if k not in ("shop_id", "shop_name", "shop_grade"))
        row["합계"] = total
    return result


def pivot_by_style(rows):
    """스타일별 보기: 행=스타일_컬러, 열=매장_사이즈"""
    style_map = {}
    for r in rows:
        row_key = f"{r['style_code']}_{r['color']}"
        if row_key not in style_map:
            style_map[row_key] = {
                "style_code": r["style_code"],
                "style_name": r["style_name"],
                "color": r["color"],
            }
        col_key = f"{r['shop_name']}_{r['size']}"
        style_map[row_key][col_key] = r["alloc"]

    result = list(style_map.values())
    for row in result:
        total = sum(v for k, v in row.items() if k not in ("style_code", "style_name", "color"))
        row["합계"] = total
    return result


# ─── Vercel 핸들러 ───────────────────────────────────
class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        style = params.get("style", ["전체"])[0]
        color = params.get("color", ["전체"])[0]
        grade = params.get("grade", ["전체"])[0]
        view  = params.get("view", ["shop"])[0]

        all_rows = generate_data()
        filtered = filter_data(all_rows, style, color, grade)

        if view == "style":
            pivot = pivot_by_style(filtered)
        else:
            pivot = pivot_by_shop(filtered)

        # 메타 정보
        all_colors = sorted(set(c for s in STYLES for c in s["colors"]))

        response = {
            "version": VERSION,
            "view": view,
            "total_rows": len(filtered),
            "pivot": pivot,
            "meta": {
                "brands": BRANDS,
                "ap_options": AP_OPTIONS,
                "seasons": SEASONS,
                "sizes": SIZES,
                "styles": [{"code": s["code"], "name": s["name"]} for s in STYLES],
                "colors": all_colors,
                "grades": ["전체", "S", "A", "B", "C"],
            },
        }

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(response, ensure_ascii=False).encode("utf-8"))
