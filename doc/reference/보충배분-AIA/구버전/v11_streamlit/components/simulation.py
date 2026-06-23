"""
보충배분-AIA v11 — AI 배분 시뮬레이션

현재는 간단한 규칙 기반 로직.
나중에 실제 ILP 최적화 API로 교체 가능.
"""

import pandas as pd


def run_ai_simulation(df: pd.DataFrame, ap_stock: pd.DataFrame) -> pd.DataFrame:
    """
    AI 배분 시뮬레이션을 실행합니다.

    로직:
      1) SCS(스타일-컬러-사이즈) 단위로 물류재고 확인
      2) 매장 등급에 따라 가중치 부여 (S=1.5, A=1.2, B=1.0, C=0.8)
      3) 예측 판매량 × 등급 가중치로 배분 비율 계산
      4) 물류재고 범위 내에서 배분 수량 결정

    인자:
      df       — 매장별 재고/예측 데이터 (alloc 열을 덮어씁니다)
      ap_stock — 물류 재고 (style_code, color, size, ap_stock)

    반환:
      배분 수량(alloc)이 업데이트된 DataFrame
    """
    # 등급별 가중치
    grade_weights = {"S": 1.5, "A": 1.2, "B": 1.0, "C": 0.8}

    result = df.copy()

    # SCS 그룹별로 배분
    for (style, color, size), group in result.groupby(["style_code", "color", "size"]):
        # 해당 SCS의 물류 재고 조회
        ap_row = ap_stock[
            (ap_stock["style_code"] == style) &
            (ap_stock["color"] == color) &
            (ap_stock["size"] == size)
        ]
        available = int(ap_row["ap_stock"].iloc[0]) if len(ap_row) > 0 else 0

        # 가중 예측 수요 계산
        indices = group.index
        weighted_demands = []
        for idx in indices:
            row = result.loc[idx]
            weight = grade_weights.get(row["shop_grade"], 1.0)
            need = max(0, row["forecast"] - row["stock"])  # 재고 부족분
            weighted_demands.append(need * weight)

        total_weighted = sum(weighted_demands)

        # 배분 수량 결정
        if total_weighted > 0:
            for i, idx in enumerate(indices):
                ratio = weighted_demands[i] / total_weighted
                alloc_qty = min(int(ratio * available), result.loc[idx, "forecast"])
                result.loc[idx, "alloc"] = max(0, alloc_qty)
        else:
            result.loc[indices, "alloc"] = 0

    return result
