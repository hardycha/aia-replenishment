"""
보충배분-AIA v11 — 엑셀 다운로드

배분 결과를 엑셀 파일로 변환합니다.
AP → 매장 형식으로 다운로드.
"""

import io
import pandas as pd


def create_excel_download(df: pd.DataFrame) -> bytes:
    """
    배분 데이터를 엑셀 파일(바이트)로 변환합니다.

    시트 구성:
      - '배분현황': 전체 배분 데이터 (필터/정렬 가능하게)
      - '피벗_매장별': 매장별 피벗 요약
      - '피벗_스타일별': 스타일별 피벗 요약

    인자:
      df — alloc 열이 포함된 배분 데이터

    반환:
      엑셀 파일 바이트 (st.download_button에 넘기면 됨)
    """
    output = io.BytesIO()

    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        # 시트 1: 전체 배분 데이터
        export_df = df[[
            "shop_id", "shop_name", "shop_grade",
            "style_code", "style_name", "item",
            "color", "size",
            "stock", "forecast", "alloc"
        ]].copy()
        export_df.columns = [
            "매장코드", "매장명", "등급",
            "스타일", "스타일명", "아이템",
            "컬러", "사이즈",
            "매장재고", "예측수량", "배분수량"
        ]
        export_df.to_excel(writer, sheet_name="배분현황", index=False)

        # 시트 2: 매장별 피벗
        pivot_shop = pd.pivot_table(
            df,
            values="alloc",
            index=["shop_name", "shop_grade"],
            columns="size",
            aggfunc="sum",
            fill_value=0,
        )
        pivot_shop.to_excel(writer, sheet_name="피벗_매장별")

        # 시트 3: 스타일별 피벗
        pivot_style = pd.pivot_table(
            df,
            values="alloc",
            index=["style_code", "style_name", "color"],
            columns="size",
            aggfunc="sum",
            fill_value=0,
        )
        pivot_style.to_excel(writer, sheet_name="피벗_스타일별")

    return output.getvalue()
