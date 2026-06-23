"""
보충배분-AIA v11 — 메인 화면
Streamlit + AG Grid 기반 보충배분 피벗 테이블

실행 방법:
  cd v11_streamlit
  streamlit run app.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import streamlit as st
import pandas as pd
from st_aggrid import AgGrid, GridOptionsBuilder, GridUpdateMode, JsCode

from config import BRANDS, AP_OPTIONS, SEASONS, SIZES, SHOPS, STYLES, COLORS, VERSION
from data.mock_data import generate_stock_dataframe, generate_ap_stock
from components.simulation import run_ai_simulation
from components.excel_export import create_excel_download


# ============================================================
# 페이지 설정
# ============================================================
st.set_page_config(
    page_title="보충배분-AIA",
    page_icon="📦",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# 커스텀 스타일
st.markdown(f"""
<style>
    /* 메인 배경 */
    .stApp {{ background-color: {COLORS['background']}; }}

    /* 헤더 영역 */
    .main-header {{
        background: linear-gradient(135deg, {COLORS['primary']}, {COLORS['accent']});
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        margin-bottom: 1rem;
    }}
    .main-header h1 {{ color: white; margin: 0; font-size: 1.5rem; }}
    .main-header p {{ color: rgba(255,255,255,0.8); margin: 0.3rem 0 0 0; font-size: 0.85rem; }}

    /* KPI 카드 */
    .kpi-card {{
        background: white;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        text-align: center;
    }}
    .kpi-value {{ font-size: 1.8rem; font-weight: 700; color: {COLORS['primary']}; }}
    .kpi-label {{ font-size: 0.8rem; color: {COLORS['text_light']}; }}
    .kpi-ai {{ color: {COLORS['ai_purple']}; }}

    /* 섹션 구분 */
    .section-title {{
        font-size: 1rem;
        font-weight: 600;
        color: {COLORS['primary']};
        margin: 1rem 0 0.5rem 0;
        padding-bottom: 0.3rem;
        border-bottom: 2px solid {COLORS['accent']};
    }}
</style>
""", unsafe_allow_html=True)


# ============================================================
# 데이터 초기화 (세션에 한 번만 생성)
# ============================================================
if "stock_df" not in st.session_state:
    st.session_state.stock_df = generate_stock_dataframe()
if "ap_stock" not in st.session_state:
    st.session_state.ap_stock = generate_ap_stock()


# ============================================================
# 헤더
# ============================================================
st.markdown(f"""
<div class="main-header">
    <h1>📦 보충배분-AIA</h1>
    <p>AI 기반 보충배분 시뮬레이션 · v{VERSION}</p>
</div>
""", unsafe_allow_html=True)


# ============================================================
# 조회 조건 (필터바)
# ============================================================
st.markdown('<div class="section-title">🔍 조회 조건</div>', unsafe_allow_html=True)

col1, col2, col3, col4, col5, col6 = st.columns(6)

with col1:
    brand = st.selectbox("브랜드", [f"{b['code']}-{b['name']}" for b in BRANDS], index=0)
with col2:
    ap = st.selectbox("AP", [a["label"] for a in AP_OPTIONS], index=0)
with col3:
    season = st.selectbox("시즌", SEASONS, index=0)
with col4:
    style_options = ["전체"] + [f"{s['code']} {s['name']}" for s in STYLES]
    selected_style = st.selectbox("스타일", style_options, index=0)
with col5:
    all_colors = sorted(set(c for s in STYLES for c in s["colors"]))
    selected_color = st.selectbox("컬러", ["전체"] + all_colors, index=0)
with col6:
    grade_options = ["전체", "S", "A", "B", "C"]
    selected_grade = st.selectbox("매장등급", grade_options, index=0)


# ============================================================
# 데이터 필터링
# ============================================================
df = st.session_state.stock_df.copy()

if selected_style != "전체":
    style_code = selected_style.split(" ")[0]
    df = df[df["style_code"] == style_code]

if selected_color != "전체":
    df = df[df["color"] == selected_color]

if selected_grade != "전체":
    df = df[df["shop_grade"] == selected_grade]


# ============================================================
# KPI 요약 패널
# ============================================================
st.markdown('<div class="section-title">📊 배분 현황 요약</div>', unsafe_allow_html=True)

total_scs = df.groupby(["style_code", "color", "size"]).ngroups
total_alloc = int(df["alloc"].sum())
total_stock = int(df["stock"].sum())
total_forecast = int(df["forecast"].sum())
shops_with_alloc = df[df["alloc"] > 0]["shop_id"].nunique()

k1, k2, k3, k4, k5 = st.columns(5)

with k1:
    st.markdown(f"""
    <div class="kpi-card">
        <div class="kpi-value">{total_scs:,}</div>
        <div class="kpi-label">SCS 수</div>
    </div>
    """, unsafe_allow_html=True)
with k2:
    st.markdown(f"""
    <div class="kpi-card">
        <div class="kpi-value kpi-ai">{total_alloc:,}</div>
        <div class="kpi-label">총 배분 수량</div>
    </div>
    """, unsafe_allow_html=True)
with k3:
    st.markdown(f"""
    <div class="kpi-card">
        <div class="kpi-value">{total_stock:,}</div>
        <div class="kpi-label">매장 현재고</div>
    </div>
    """, unsafe_allow_html=True)
with k4:
    st.markdown(f"""
    <div class="kpi-card">
        <div class="kpi-value">{total_forecast:,}</div>
        <div class="kpi-label">예측 판매량</div>
    </div>
    """, unsafe_allow_html=True)
with k5:
    st.markdown(f"""
    <div class="kpi-card">
        <div class="kpi-value">{shops_with_alloc}</div>
        <div class="kpi-label">배분 매장 수</div>
    </div>
    """, unsafe_allow_html=True)


# ============================================================
# 액션 버튼
# ============================================================
st.markdown("---")
btn_col1, btn_col2, btn_col3 = st.columns([1, 1, 4])

with btn_col1:
    if st.button("🤖 AI 배분 시뮬레이션", type="primary", use_container_width=True):
        with st.spinner("AI 배분 최적화 중..."):
            result = run_ai_simulation(
                st.session_state.stock_df,
                st.session_state.ap_stock,
            )
            st.session_state.stock_df = result
            st.success("✅ AI 배분 시뮬레이션 완료!")
            st.rerun()

with btn_col2:
    excel_bytes = create_excel_download(df)
    st.download_button(
        label="📥 엑셀 다운로드",
        data=excel_bytes,
        file_name="보충배분_AIA_결과.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        use_container_width=True,
    )


# ============================================================
# 뷰 모드 토글
# ============================================================
st.markdown('<div class="section-title">📋 배분 상세 테이블</div>', unsafe_allow_html=True)

view_mode = st.radio(
    "보기 방식",
    ["매장별 보기", "스타일별 보기"],
    horizontal=True,
    label_visibility="collapsed",
)


# ============================================================
# 피벗 테이블 생성
# ============================================================
if view_mode == "매장별 보기":
    # 행: 매장,  열: 스타일-컬러-사이즈별 배분 수량
    pivot_df = pd.pivot_table(
        df,
        values="alloc",
        index=["shop_id", "shop_name", "shop_grade"],
        columns=["style_code", "color", "size"],
        aggfunc="sum",
        fill_value=0,
    )
    # 멀티인덱스 열 → 단일 문자열 (예: "XJWT7341_BK_M")
    pivot_df.columns = [f"{s}_{c}_{z}" for s, c, z in pivot_df.columns]
    pivot_df = pivot_df.reset_index()
    pivot_df["합계"] = pivot_df.select_dtypes(include="number").sum(axis=1)

else:
    # 행: 스타일-컬러,  열: 매장별 사이즈 배분 수량
    pivot_df = pd.pivot_table(
        df,
        values="alloc",
        index=["style_code", "style_name", "color"],
        columns=["shop_name", "size"],
        aggfunc="sum",
        fill_value=0,
    )
    pivot_df.columns = [f"{shop}_{sz}" for shop, sz in pivot_df.columns]
    pivot_df = pivot_df.reset_index()
    pivot_df["합계"] = pivot_df.select_dtypes(include="number").sum(axis=1)


# ============================================================
# AG Grid 설정
# ============================================================
gb = GridOptionsBuilder.from_dataframe(pivot_df)

# 기본 설정: 모든 숫자 셀 편집 가능
gb.configure_default_column(
    editable=True,
    sortable=True,
    filter=True,
    resizable=True,
    min_column_width=60,
)

# 고정 열 (인덱스 열은 편집 불가)
if view_mode == "매장별 보기":
    gb.configure_column("shop_id", header_name="매장코드", pinned="left", editable=False, width=90)
    gb.configure_column("shop_name", header_name="매장명", pinned="left", editable=False, width=120)
    gb.configure_column("shop_grade", header_name="등급", pinned="left", editable=False, width=60)
else:
    gb.configure_column("style_code", header_name="스타일", pinned="left", editable=False, width=110)
    gb.configure_column("style_name", header_name="스타일명", pinned="left", editable=False, width=150)
    gb.configure_column("color", header_name="컬러", pinned="left", editable=False, width=60)

gb.configure_column("합계", header_name="합계", pinned="right", editable=False, width=80,
                     cellStyle={"fontWeight": "bold", "backgroundColor": "#EBF5FB"})

# 셀 편집 설정
gb.configure_grid_options(
    enableRangeSelection=True,           # 범위 선택 (드래그)
    enableRangeHandle=True,              # Fill 핸들 (드래그로 채우기)
    clipboardDelimiter="\t",             # 탭 구분 복붙
    suppressCopyRowsToClipboard=True,    # 셀 단위 복사
    undoRedoCellEditing=True,            # Ctrl+Z 실행취소
    undoRedoCellEditingLimit=20,         # 실행취소 20단계
    rowSelection="multiple",             # 다중 행 선택
    suppressRowClickSelection=True,      # 행 클릭 선택 방지 (셀 선택 우선)
    enterNavigatesVertically=True,       # Enter로 아래 이동
    enterNavigatesVerticallyAfterEdit=True,
)

grid_options = gb.build()


# ============================================================
# AG Grid 렌더링
# ============================================================
st.caption(f"💡 셀을 클릭해서 직접 수정 | Ctrl+C/V 복사·붙여넣기 | 드래그로 범위 선택 | Ctrl+Z 되돌리기")

grid_response = AgGrid(
    pivot_df,
    gridOptions=grid_options,
    update_mode=GridUpdateMode.VALUE_CHANGED,
    allow_unsafe_jscode=True,
    height=500,
    theme="streamlit",
    fit_columns_on_grid_load=False,
)

# 편집된 데이터 반영
if grid_response.data is not None:
    edited_pivot = grid_response.data
    # TODO: 피벗 → 원본 df로 역변환하여 session_state에 반영
    # (현재는 피벗 테이블 단위로 편집됨)


# ============================================================
# 하단 정보
# ============================================================
st.markdown("---")
st.caption(
    f"보충배분-AIA v{VERSION} · "
    f"데이터: {len(df):,}행 · "
    f"매장 {df['shop_id'].nunique()}개 · "
    f"스타일 {df['style_code'].nunique()}개 · "
    f"사이즈 {len(SIZES)}개"
)
