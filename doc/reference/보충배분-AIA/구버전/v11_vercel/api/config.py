"""
보충배분-AIA v11 — 설정 파일
========================================
★ 매장, 스타일, 사이즈를 바꾸고 싶으면 이 파일만 수정하세요!
★ 수정 후 git push 하면 Vercel에 자동 반영됩니다.
========================================
"""

# ─── 브랜드 ──────────────────────────────────────────
BRANDS = [
    {"code": "X", "name": "Discovery"},
    {"code": "M", "name": "MLB"},
    {"code": "I", "name": "MLB KIDS"},
    {"code": "V", "name": "Duvetica"},
    {"code": "ST", "name": "Sergio Tacchini"},
]

# ─── AP (배분 유형) ──────────────────────────────────
AP_OPTIONS = [
    {"value": "offline_normal", "label": "오프라인 정상"},
    {"value": "online",         "label": "온라인"},
    {"value": "department",     "label": "백화점"},
]

# ─── 시즌 ────────────────────────────────────────────
SEASONS = ["26S", "25F", "25S", "24F"]

# ─── 사이즈 (피벗 테이블 열에 반영됨) ─────────────────
SIZES = ["S", "M", "L", "XL", "XXL"]

# ─── 매장 목록 (32개) ────────────────────────────────
#   grade: S(최상위) / A(상위) / B(중간) / C(일반)
SHOPS = [
    {"id": "S001", "name": "강남점",         "grade": "S"},
    {"id": "S002", "name": "잠실점",         "grade": "S"},
    {"id": "S003", "name": "명동점",         "grade": "S"},
    {"id": "S004", "name": "코엑스점",       "grade": "A"},
    {"id": "S005", "name": "여의도IFC점",    "grade": "A"},
    {"id": "S006", "name": "판교현대점",     "grade": "A"},
    {"id": "S007", "name": "스타필드하남점",  "grade": "A"},
    {"id": "S008", "name": "타임스퀘어점",   "grade": "A"},
    {"id": "S009", "name": "수원AK점",       "grade": "B"},
    {"id": "S010", "name": "대전갤러리아점",  "grade": "B"},
    {"id": "S011", "name": "부산센텀점",     "grade": "B"},
    {"id": "S012", "name": "광주신세계점",   "grade": "B"},
    {"id": "S013", "name": "대구현대점",     "grade": "B"},
    {"id": "S014", "name": "울산현대점",     "grade": "B"},
    {"id": "S015", "name": "인천스퀘어원점",  "grade": "B"},
    {"id": "S016", "name": "청주지웰시티점",  "grade": "C"},
    {"id": "S017", "name": "천안신세계점",   "grade": "C"},
    {"id": "S018", "name": "전주현대점",     "grade": "C"},
    {"id": "S019", "name": "창원NC점",       "grade": "C"},
    {"id": "S020", "name": "김해롯데점",     "grade": "C"},
    {"id": "S021", "name": "제주노형점",     "grade": "C"},
    {"id": "S022", "name": "포항점",         "grade": "C"},
    {"id": "S023", "name": "안양점",         "grade": "C"},
    {"id": "S024", "name": "일산현대점",     "grade": "B"},
    {"id": "S025", "name": "분당AK점",       "grade": "B"},
    {"id": "S026", "name": "동탄롯데점",     "grade": "B"},
    {"id": "S027", "name": "평택점",         "grade": "C"},
    {"id": "S028", "name": "춘천점",         "grade": "C"},
    {"id": "S029", "name": "원주점",         "grade": "C"},
    {"id": "S030", "name": "속초점",         "grade": "C"},
    {"id": "S031", "name": "강릉점",         "grade": "C"},
    {"id": "S032", "name": "세종점",         "grade": "C"},
]

# ─── 스타일 목록 (20개) ──────────────────────────────
#   item: JKT(자켓) TEE(티셔츠) PNT(팬츠) VST(조끼) ACC(용품)
STYLES = [
    {"code": "XJWT7341", "name": "경량 바람막이 JKT",    "item": "JKT", "colors": ["BK", "IV", "NV"]},
    {"code": "XJOT5230", "name": "오버핏 코치 JKT",      "item": "JKT", "colors": ["BK", "KH"]},
    {"code": "XMST3120", "name": "에센셜 반팔 TEE",      "item": "TEE", "colors": ["BK", "IV", "NV", "KH"]},
    {"code": "XMPT4210", "name": "클래식 조거 PNT",      "item": "PNT", "colors": ["BK", "NV"]},
    {"code": "XJVT6310", "name": "경량 다운 VST",        "item": "VST", "colors": ["BK", "IV"]},
    {"code": "XJWT8150", "name": "레트로 윈드 JKT",      "item": "JKT", "colors": ["NV", "KH", "WH"]},
    {"code": "XMST3250", "name": "그래픽 오버핏 TEE",    "item": "TEE", "colors": ["BK", "WH"]},
    {"code": "XMST3380", "name": "쿨링 메쉬 TEE",       "item": "TEE", "colors": ["BK", "GY", "NV"]},
    {"code": "XMPT4320", "name": "카고 와이드 PNT",      "item": "PNT", "colors": ["BK", "KH", "BG"]},
    {"code": "XJOT5440", "name": "MA-1 봄버 JKT",       "item": "JKT", "colors": ["BK", "NV"]},
    {"code": "XMST3510", "name": "빅로고 크롭 TEE",     "item": "TEE", "colors": ["WH", "PK", "IV"]},
    {"code": "XMPT4630", "name": "트레이닝 쇼트 PNT",   "item": "PNT", "colors": ["BK", "GY"]},
    {"code": "XJWT7720", "name": "고어텍스 쉘 JKT",     "item": "JKT", "colors": ["BK", "RD", "NV"]},
    {"code": "XAHT2100", "name": "버킷햇 로고",         "item": "ACC", "colors": ["BK", "IV", "NV"]},
    {"code": "XASG2200", "name": "크로스백 미니",        "item": "ACC", "colors": ["BK", "KH"]},
    {"code": "XMPT4850", "name": "스트레치 슬랙스 PNT",  "item": "PNT", "colors": ["BK", "NV", "BG"]},
    {"code": "XJOT5960", "name": "플리스 집업 JKT",     "item": "JKT", "colors": ["BK", "IV", "GY"]},
    {"code": "XMST3670", "name": "피그먼트 워싱 TEE",   "item": "TEE", "colors": ["BK", "BG", "NV"]},
    {"code": "XMPT4780", "name": "데님 와이드 PNT",     "item": "PNT", "colors": ["LB", "MB"]},
    {"code": "XJVT6490", "name": "패딩 후드 VST",       "item": "VST", "colors": ["BK", "NV", "KH"]},
]

# ─── 디자인 색상 ─────────────────────────────────────
COLORS = {
    "primary":    "#1B3A5C",
    "accent":     "#00A3E0",
    "ai_purple":  "#7C3AED",
    "success":    "#28A745",
    "danger":     "#DC3545",
    "warning":    "#F5A623",
    "background": "#F5F7FA",
}

# ─── 버전 ────────────────────────────────────────────
VERSION = "11.0"
