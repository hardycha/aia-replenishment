"""
예측치 배치: Snowflake PRED_SH_SCS_W → forecast_archive.json
SSO(externalbrowser) 인증 — 브라우저 로그인 팝업.

사용법:
  cd aia-replenishment
  SNOWFLAKE_ACCOUNT=cixxjbf-wp67697 SNOWFLAKE_USER=hamin@fnfcorp.com \
  SNOWFLAKE_WAREHOUSE=DEV_WH SNOWFLAKE_DATABASE=FNF SNOWFLAKE_SCHEMA=ML_DIST \
  SNOWFLAKE_ROLE=PU_PI .venv/bin/python scripts/sync_forecast.py

산출:
  src/data/forecast_archive.json — 기존 mock 데이터를 실 예측치로 교체
"""

import json
import os
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import snowflake.connector

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "src" / "data"

# 현재 적재된 METHOD_CD (PI팀 확인: tsb)
METHOD_CD = os.environ.get("FORECAST_METHOD_CD", "tsb")


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


def main():
    print("[sync-forecast] SSO 로그인 — 브라우저가 열립니다...")
    conn = connect()
    cur = conn.cursor()
    print(f"[sync-forecast] 연결 성공! METHOD_CD={METHOD_CD}\n")

    # 최신 PRED_START_DT 1주차만, 매장×사이즈별 예측치
    print("예측치 조회 중 (PRED_SH_SCS_W, 최신 1주차만)...")
    cur.execute(f"""
        SELECT BRD_CD, PART_CD, COLOR_CD, SESN,
               PRED_START_DT, SHOP_ID, SIZE_CD,
               PRED_SH_SCS_NORM_QTY
        FROM FNF.ML_DIST.PRED_SH_SCS_W
        WHERE METHOD_CD = '{METHOD_CD}'
          AND PRED_START_DT = (
            SELECT MAX(PRED_START_DT) FROM FNF.ML_DIST.PRED_SH_SCS_W
            WHERE METHOD_CD = '{METHOD_CD}'
          )
        QUALIFY ROW_NUMBER() OVER (
            PARTITION BY SH_SC_CD, SIZE_CD, PRED_START_DT
            ORDER BY CREATED_AT DESC, EXECUTION_DT DESC
        ) = 1
    """)

    rows = cur.fetchall()
    print(f"  → {len(rows):,}행 조회 완료")

    # forecast_archive.json 구조로 변환
    # 키: {brandCd}_{prodCd}_{colorCd}_{ssnCd}_{forecastStartDate}
    archive = defaultdict(lambda: {"forecastStartDate": None, "forecast": []})

    for brd, part, color, ssn, start_dt, shop, sz, qty in rows:
        start_str = start_dt.strftime("%Y-%m-%d") if hasattr(start_dt, "strftime") else str(start_dt)
        key = f"{brd}_{part}_{color}_{ssn}_{start_str}"
        archive[key]["forecastStartDate"] = start_str
        archive[key]["forecast"].append({
            "shopCd": shop,
            "sizCd": sz,
            "qty": round(float(qty), 4),
        })

    # JSON 저장
    out_path = DATA_DIR / "forecast_archive.json"
    out_data = dict(archive)
    out_data["_meta"] = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "methodCd": METHOD_CD,
        "totalKeys": len(archive),
        "totalRows": len(rows),
    }
    out_path.write_text(
        json.dumps(out_data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    size_mb = out_path.stat().st_size / 1024 / 1024
    print(f"\n✅ forecast_archive.json 생성 완료")
    print(f"   키: {len(archive):,}개, 행: {len(rows):,}개, 크기: {size_mb:.1f}MB")

    cur.close()
    conn.close()
    print("🎉 완료!")


if __name__ == "__main__":
    main()
