"""
보충배분-AIA v11 — AI 배분 시뮬레이션 API
========================================
POST /api/simulate
→ AI 배분 최적화 결과를 JSON으로 반환

★ 배분 로직을 바꾸고 싶으면 run_simulation() 함수를 수정하세요.
★ 현재는 등급 가중치 기반 규칙. 나중에 ILP 최적화로 교체 가능.
========================================
"""

import json
import random
from http.server import BaseHTTPRequestHandler
from api.config import SHOPS, STYLES, SIZES


# ─── Mock 데이터 (data.py와 동일한 시드) ─────────────
random.seed(42)

def _generate():
    rows = []
    ap_stock = {}
    for style in STYLES:
        for color in style["colors"]:
            for size in SIZES:
                scs_key = f"{style['code']}_{color}_{size}"
                ap_stock[scs_key] = 30 + random.randint(0, 119)
                for shop in SHOPS:
                    forecast = random.randint(1, 10)
                    rows.append({
                        "shop_id": shop["id"], "shop_name": shop["name"],
                        "shop_grade": shop["grade"],
                        "style_code": style["code"], "style_name": style["name"],
                        "item": style["item"], "color": color, "size": size,
                        "stock": random.randint(0, 17),
                        "forecast": forecast, "alloc": forecast,
                    })
    return rows, ap_stock


# ─── 시뮬레이션 핵심 로직 ────────────────────────────
def run_simulation(rows, ap_stock):
    """
    AI 배분 시뮬레이션

    규칙:
      1) SCS 단위로 물류재고 확인
      2) 매장 등급 가중치: S=1.5, A=1.2, B=1.0, C=0.8
      3) (예측 - 재고) × 가중치 비율로 물류재고를 나눠 배분
    """
    grade_weights = {"S": 1.5, "A": 1.2, "B": 1.0, "C": 0.8}

    # SCS 그룹별로 묶기
    groups = {}
    for i, r in enumerate(rows):
        key = f"{r['style_code']}_{r['color']}_{r['size']}"
        if key not in groups:
            groups[key] = []
        groups[key].append(i)

    result = [dict(r) for r in rows]  # 복사

    for scs_key, indices in groups.items():
        available = ap_stock.get(scs_key, 0)

        # 가중 수요 계산
        weighted = []
        for idx in indices:
            r = result[idx]
            w = grade_weights.get(r["shop_grade"], 1.0)
            need = max(0, r["forecast"] - r["stock"])
            weighted.append(need * w)

        total_w = sum(weighted)

        # 배분
        if total_w > 0:
            for i, idx in enumerate(indices):
                ratio = weighted[i] / total_w
                alloc = min(int(ratio * available), result[idx]["forecast"])
                result[idx]["alloc"] = max(0, alloc)
        else:
            for idx in indices:
                result[idx]["alloc"] = 0

    return result


# ─── Vercel 핸들러 ───────────────────────────────────
class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        rows, ap_stock = _generate()
        simulated = run_simulation(rows, ap_stock)

        # 매장별 피벗으로 변환
        shops_map = {}
        for r in simulated:
            sid = r["shop_id"]
            if sid not in shops_map:
                shops_map[sid] = {
                    "shop_id": r["shop_id"],
                    "shop_name": r["shop_name"],
                    "shop_grade": r["shop_grade"],
                }
            col_key = f"{r['style_code']}_{r['color']}_{r['size']}"
            shops_map[sid][col_key] = r["alloc"]

        pivot = list(shops_map.values())
        for row in pivot:
            total = sum(v for k, v in row.items()
                        if k not in ("shop_id", "shop_name", "shop_grade"))
            row["합계"] = total

        before_total = sum(r["forecast"] for r in rows)
        after_total = sum(r["alloc"] for r in simulated)

        response = {
            "success": True,
            "before_alloc": before_total,
            "after_alloc": after_total,
            "pivot": pivot,
        }

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(response, ensure_ascii=False).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
