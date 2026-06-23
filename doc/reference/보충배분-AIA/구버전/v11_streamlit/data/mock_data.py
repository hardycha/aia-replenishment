"""
보충배분-AIA v11 — Mock 데이터 생성
실제 API 연동 전까지 사용할 가짜 데이터를 만듭니다.

나중에 실제 DB/API로 바꿀 때:
  이 파일의 generate_stock_dataframe() 함수만 교체하면 됩니다.
"""

import random
import pandas as pd
from config import SHOPS, STYLES, SIZES

# 재현 가능한 랜덤 시드 (같은 데이터가 매번 나오도록)
random.seed(42)


def generate_stock_dataframe() -> pd.DataFrame:
    """
    매장 × 스타일 × 컬러 × 사이즈별 재고·예측·배분 데이터를 생성합니다.

    반환 컬럼:
      - shop_id, shop_name, shop_grade  : 매장 정보
      - style_code, style_name, item    : 스타일 정보
      - color                           : 컬러코드
      - size                            : 사이즈
      - stock       : 매장 현재고 (0~17)
      - forecast    : AI 예측 판매량 (1~10)
      - alloc       : 배분 수량 (초기값 = forecast)
    """
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
                        "alloc":      forecast,   # 초기 배분 = 예측값
                    })

    return pd.DataFrame(rows)


def generate_ap_stock() -> pd.DataFrame:
    """
    물류(AP) 재고를 스타일-컬러-사이즈 단위로 생성합니다.

    반환 컬럼:
      - style_code, color, size  : SCS 키
      - ap_stock                 : 물류 재고 (30~149)
    """
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

    return pd.DataFrame(rows)


# ─── 테스트용 ────────────────────────────────────────────────
if __name__ == "__main__":
    df = generate_stock_dataframe()
    ap = generate_ap_stock()
    print(f"매장 재고 데이터: {len(df):,}행  ({df.shop_id.nunique()}매장 × {df.style_code.nunique()}스타일)")
    print(f"물류 재고 데이터: {len(ap):,}행")
    print()
    print("--- 매장 재고 샘플 ---")
    print(df.head(10).to_string(index=False))
    print()
    print("--- 물류 재고 샘플 ---")
    print(ap.head(10).to_string(index=False))
