"""DRP API + 오프라인 매장 필터 공용 헬퍼
validation 스크립트에서 SHOP_ID='90019' 하드코딩을 대체하기 위한 모듈.

변경 이력:
  2026-06-09: 최초 작성. 90019(온라인 매장)를 AP 창고로 오인하던 문제 해소.

사용법:
  from _drp_helpers import load_offline_shop_ids, fetch_ap_stock_drp
"""
import json
import os
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


def _find_env_local() -> Path | None:
    """aia-replenishment/.env.local 파일 탐색"""
    candidates = [
        Path(__file__).parent.parent.parent / "service" / "보충배분-AIA" / "aia-replenishment" / ".env.local",
        Path(__file__).parent.parent / "보충배분-AIA" / "aia-replenishment" / ".env.local",
    ]
    # BASE_DIR 기준 탐색도 추가
    base = Path(__file__).parent.parent.parent.parent
    candidates.append(base / "src" / "service" / "보충배분-AIA" / "aia-replenishment" / ".env.local")
    candidates.append(base / "보충배분-AIA" / "aia-replenishment" / ".env.local")
    for p in candidates:
        if p.exists():
            return p
    return None


def load_drp_config() -> tuple[str, str]:
    """DRP API 설정 로드. 환경변수 우선, 없으면 .env.local."""
    drp_base = os.environ.get("DRP_API_BASE", "")
    drp_key = os.environ.get("DRP_API_KEY", "")
    if not drp_base:
        env_local = _find_env_local()
        if env_local:
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
    return drp_base, drp_key


def fetch_ap_stock_drp(
    sc_list: list[tuple[str, str]],
    brand_cd: str = "X",
    ssn_cd: str = "26S",
    ap_cd: str = "U100",
    max_workers: int = 20,
) -> dict[tuple[str, str], list[dict]]:
    """DRP API로 SC 목록의 AP 재고 사이즈별 조회.

    Returns:
        {(part_cd, color_cd): [{"sizCd": "95", "qty": 240}, ...]}
    """
    drp_base, drp_key = load_drp_config()
    if not drp_base:
        print("  ⚠️ DRP_API_BASE 미설정 — AP 재고 조회 불가")
        return {}

    def _fetch_one(part_cd: str, color_cd: str):
        params = urllib.parse.urlencode({
            "brandCd": brand_cd, "prodCd": part_cd,
            "colorCd": color_cd, "apCd": ap_cd, "ssnCd": ssn_cd,
        })
        url = f"{drp_base}/api-gateway/ilp/ap-stk?{params}"
        req = urllib.request.Request(url)
        if drp_key:
            req.add_header("x-api-key", drp_key)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                body = json.loads(resp.read())
                data = body.get("data", body)
                return (part_cd, color_cd, data.get("stocks", []))
        except Exception:
            return (part_cd, color_cd, [])

    result = {}
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futs = {pool.submit(_fetch_one, p, c): (p, c) for p, c in sc_list}
        done = 0
        for fut in as_completed(futs):
            p, c, stocks = fut.result()
            if stocks:
                result[(p, c)] = stocks
            done += 1
            if done % 50 == 0 and len(sc_list) > 50:
                print(f"    AP 재고 조회: {done}/{len(sc_list)}...")

    print(f"  AP 재고 조회 완료: {len(sc_list)}개 SC, 재고有 {len(result)}개 (apCd={ap_cd})")
    return result


def ap_stock_total(stocks: list[dict]) -> int:
    """사이즈별 stocks → 합계"""
    return sum(s.get("qty", 0) for s in stocks)


def load_offline_shop_ids(brand_cd: str = "X") -> set[str]:
    """brand_shops_archive.json에서 오프라인 매장 ID set 로드.
    이 파일은 sync_snowflake.py에서 ANLYS_ON_OFF_CLS_CD='F' 조건으로 생성됨.
    """
    candidates = [
        Path(__file__).parent.parent.parent / "service" / "보충배분-AIA" / "aia-replenishment" / "src" / "data" / "brand_shops_archive.json",
    ]
    base = Path(__file__).parent.parent.parent.parent
    candidates.append(base / "src" / "service" / "보충배분-AIA" / "aia-replenishment" / "src" / "data" / "brand_shops_archive.json")
    candidates.append(base / "보충배분-AIA" / "aia-replenishment" / "src" / "data" / "brand_shops_archive.json")

    for p in candidates:
        if p.exists():
            with open(p) as f:
                data = json.load(f)
            shops = data.get("shops", {}).get(brand_cd, [])
            ids = {s["shopCd"] for s in shops}
            print(f"  오프라인 매장 로드: {len(ids)}개 ({brand_cd}, {p.name})")
            return ids

    print("  ⚠️ brand_shops_archive.json 미발견 — 오프라인 필터 불가")
    return set()


def is_offline_shop(shop_id: str, offline_ids: set[str]) -> bool:
    """매장이 오프라인인지 확인"""
    return shop_id in offline_ids
