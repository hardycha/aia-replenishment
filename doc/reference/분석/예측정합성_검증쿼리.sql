-- =============================================================================
-- 예측 vs 실판매 정합성 검증 쿼리 모음
-- 대상: ML_DIST.PRED_SC_W (SC-Total 모델, lgbm)
-- 비교 주차: 2026-05-04 ~ 2026-05-10 (W = PRED_START_DT)
-- 실판매 정의: 오프라인 매장 채널만
--             = PRCS.DW_SH_SCS_D.SALE_NML_QTY_SH + SALE_RET_QTY_SH
--             ★ 반품은 음수로 저장됨 → 빼지 말고 더해야 함
--             ※ DW_SCS_D.RTL_NET 은 매장(SH)+온라인(ON)+행사 합산이라 사용 안 함.
--               SH 컬럼이 진짜 오프라인 매장 채널 (KG 정의 기준)
--             ※ SH 컬럼에는 단체/소량단체 일부 포함될 수 있음 (SH_NET 컬럼 없음)
--
-- 다른 주차 비교하려면 두 곳의 날짜만 바꾸면 됨:
--   1) pred CTE : PRED_START_DT  (월요일 1개)
--   2) actual CTE: DT BETWEEN ... ~ +6일
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- [쿼리 1] 전체 요약 — 모델 전반 정확도 한눈에
-- ─────────────────────────────────────────────────────────────────────────────
WITH actual AS (
    SELECT
        BRD_CD || '_' || PART_CD || '_' || COLOR_CD AS SC_CD,
        SUM(NVL(SALE_NML_QTY_SH, 0) + NVL(SALE_RET_QTY_SH, 0)) AS ACTUAL_QTY
    FROM FNF.PRCS.DW_SH_SCS_D
    WHERE DT BETWEEN '2026-05-04' AND '2026-05-10'
    GROUP BY 1
),
pred AS (
    SELECT
        SC_CD, BRD_CD, PART_CD, COLOR_CD, SESN, PRED_SC_QTY
    FROM FNF.ML_DIST.PRED_SC_W
    WHERE PRED_START_DT = '2026-05-04'
      AND METHOD_CD    = 'lgbm'
),
joined AS (
    SELECT
        p.SC_CD, p.BRD_CD, p.SESN, p.PART_CD, p.COLOR_CD,
        p.PRED_SC_QTY,
        NVL(a.ACTUAL_QTY, 0)                                  AS ACTUAL_QTY,
        p.PRED_SC_QTY - NVL(a.ACTUAL_QTY, 0)                  AS DIFF,
        ABS(p.PRED_SC_QTY - NVL(a.ACTUAL_QTY, 0))             AS ABS_DIFF
    FROM pred p
    LEFT JOIN actual a ON p.SC_CD = a.SC_CD
)
SELECT
    COUNT(*)                                              AS N_SC,
    SUM(PRED_SC_QTY)                                      AS TOTAL_PRED,
    SUM(ACTUAL_QTY)                                       AS TOTAL_ACTUAL,
    SUM(PRED_SC_QTY) - SUM(ACTUAL_QTY)                    AS TOTAL_DIFF,
    ROUND(SUM(PRED_SC_QTY) / NULLIF(SUM(ACTUAL_QTY),0),3) AS OVERALL_RATIO,
    ROUND(AVG(PRED_SC_QTY), 2)                            AS AVG_PRED,
    ROUND(AVG(ACTUAL_QTY), 2)                             AS AVG_ACTUAL,
    ROUND(MEDIAN(PRED_SC_QTY), 2)                         AS MED_PRED,
    ROUND(MEDIAN(ACTUAL_QTY), 2)                          AS MED_ACTUAL,
    MAX(PRED_SC_QTY)                                      AS MAX_PRED,
    MAX(ACTUAL_QTY)                                       AS MAX_ACTUAL,
    ROUND(AVG(ABS_DIFF), 2)                               AS MAE,
    ROUND(SUM(ABS_DIFF) / NULLIF(SUM(ACTUAL_QTY),0),3)    AS WAPE,
    SUM(CASE WHEN ACTUAL_QTY  = 0 THEN 1 ELSE 0 END)      AS N_NO_ACTUAL,
    SUM(CASE WHEN PRED_SC_QTY = 0 THEN 1 ELSE 0 END)      AS N_ZERO_PRED,
    SUM(CASE WHEN PRED_SC_QTY > ACTUAL_QTY THEN 1 ELSE 0 END) AS N_OVER_PRED,
    SUM(CASE WHEN PRED_SC_QTY < ACTUAL_QTY THEN 1 ELSE 0 END) AS N_UNDER_PRED
FROM joined;


-- ─────────────────────────────────────────────────────────────────────────────
-- [쿼리 2] 실판매 구간별 편차 — 베스트셀러 과소예측 패턴 검증
-- ─────────────────────────────────────────────────────────────────────────────
WITH actual AS (
    SELECT
        BRD_CD || '_' || PART_CD || '_' || COLOR_CD AS SC_CD,
        SUM(NVL(SALE_NML_QTY_SH, 0) + NVL(SALE_RET_QTY_SH, 0)) AS ACTUAL_QTY
    FROM FNF.PRCS.DW_SH_SCS_D
    WHERE DT BETWEEN '2026-05-04' AND '2026-05-10'
    GROUP BY 1
),
pred AS (
    SELECT SC_CD, PART_CD, COLOR_CD, PRED_SC_QTY
    FROM FNF.ML_DIST.PRED_SC_W
    WHERE PRED_START_DT = '2026-05-04' AND METHOD_CD = 'lgbm'
),
joined AS (
    SELECT
        p.PART_CD, p.COLOR_CD,
        p.PRED_SC_QTY        AS PRED,
        NVL(a.ACTUAL_QTY, 0) AS ACTUAL
    FROM pred p
    LEFT JOIN actual a ON p.SC_CD = a.SC_CD
),
bucketed AS (
    SELECT *,
        CASE
            WHEN ACTUAL = 0                  THEN '0_NoSales'
            WHEN ACTUAL BETWEEN 1   AND 10   THEN '01_to_10'
            WHEN ACTUAL BETWEEN 11  AND 30   THEN '11_to_30'
            WHEN ACTUAL BETWEEN 31  AND 60   THEN '31_to_60'
            WHEN ACTUAL BETWEEN 61  AND 100  THEN '61_to_100'
            WHEN ACTUAL BETWEEN 101 AND 200  THEN '101_to_200'
            ELSE '200_plus'
        END AS ACTUAL_BUCKET
    FROM joined
)
SELECT
    ACTUAL_BUCKET,
    COUNT(*)                                          AS N_SC,
    ROUND(SUM(PRED))                                  AS SUM_PRED,
    ROUND(SUM(ACTUAL))                                AS SUM_ACTUAL,
    ROUND(SUM(PRED) / NULLIF(SUM(ACTUAL),0), 3)       AS PRED_ACTUAL_RATIO,
    ROUND(AVG(PRED), 1)                               AS AVG_PRED,
    ROUND(AVG(ACTUAL), 1)                             AS AVG_ACTUAL,
    ROUND(AVG(ABS(PRED - ACTUAL)), 1)                 AS MAE
FROM bucketed
GROUP BY ACTUAL_BUCKET
ORDER BY ACTUAL_BUCKET;


-- ─────────────────────────────────────────────────────────────────────────────
-- [쿼리 3] 케이스별 TOP10 — 베스트셀러 / 과소·과예측 / 정확매칭
-- ─────────────────────────────────────────────────────────────────────────────
WITH actual AS (
    SELECT
        BRD_CD || '_' || PART_CD || '_' || COLOR_CD AS SC_CD,
        SUM(NVL(SALE_NML_QTY_SH, 0) + NVL(SALE_RET_QTY_SH, 0)) AS ACTUAL_QTY
    FROM FNF.PRCS.DW_SH_SCS_D
    WHERE DT BETWEEN '2026-05-04' AND '2026-05-10'
    GROUP BY 1
),
pred AS (
    SELECT SC_CD, PART_CD, COLOR_CD, SESN, PRED_SC_QTY
    FROM FNF.ML_DIST.PRED_SC_W
    WHERE PRED_START_DT = '2026-05-04' AND METHOD_CD = 'lgbm'
),
joined AS (
    SELECT
        p.PART_CD, p.COLOR_CD, p.SESN,
        ROUND(p.PRED_SC_QTY)                                 AS PRED,
        NVL(a.ACTUAL_QTY, 0)                                 AS ACTUAL,
        p.PRED_SC_QTY - NVL(a.ACTUAL_QTY, 0)                 AS DIFF
    FROM pred p
    LEFT JOIN actual a ON p.SC_CD = a.SC_CD
)
-- (A) 실판매 TOP10
SELECT 'A_실판매TOP10' AS CATEGORY, PART_CD, COLOR_CD, SESN, PRED, ACTUAL, ROUND(DIFF) AS DIFF
FROM joined
ORDER BY ACTUAL DESC
LIMIT 10;

-- (B) 가장 큰 과소예측 TOP10  (DIFF가 가장 음수)
WITH actual AS (
    SELECT BRD_CD || '_' || PART_CD || '_' || COLOR_CD AS SC_CD,
           SUM(NVL(SALE_NML_QTY_SH,0) + NVL(SALE_RET_QTY_SH,0)) AS ACTUAL_QTY
    FROM FNF.PRCS.DW_SH_SCS_D
    WHERE DT BETWEEN '2026-05-04' AND '2026-05-10'
    GROUP BY 1
),
pred AS (
    SELECT SC_CD, PART_CD, COLOR_CD, SESN, PRED_SC_QTY
    FROM FNF.ML_DIST.PRED_SC_W
    WHERE PRED_START_DT = '2026-05-04' AND METHOD_CD = 'lgbm'
)
SELECT 'B_과소예측TOP10' AS CATEGORY,
       p.PART_CD, p.COLOR_CD, p.SESN,
       ROUND(p.PRED_SC_QTY) AS PRED,
       NVL(a.ACTUAL_QTY,0)  AS ACTUAL,
       ROUND(p.PRED_SC_QTY - NVL(a.ACTUAL_QTY,0)) AS DIFF
FROM pred p
LEFT JOIN actual a ON p.SC_CD = a.SC_CD
WHERE NVL(a.ACTUAL_QTY,0) > 0
ORDER BY DIFF ASC
LIMIT 10;

-- (C) 가장 큰 과예측 TOP10  (DIFF가 가장 양수)
WITH actual AS (
    SELECT BRD_CD || '_' || PART_CD || '_' || COLOR_CD AS SC_CD,
           SUM(NVL(SALE_NML_QTY_SH,0) + NVL(SALE_RET_QTY_SH,0)) AS ACTUAL_QTY
    FROM FNF.PRCS.DW_SH_SCS_D
    WHERE DT BETWEEN '2026-05-04' AND '2026-05-10'
    GROUP BY 1
),
pred AS (
    SELECT SC_CD, PART_CD, COLOR_CD, SESN, PRED_SC_QTY
    FROM FNF.ML_DIST.PRED_SC_W
    WHERE PRED_START_DT = '2026-05-04' AND METHOD_CD = 'lgbm'
)
SELECT 'C_과예측TOP10' AS CATEGORY,
       p.PART_CD, p.COLOR_CD, p.SESN,
       ROUND(p.PRED_SC_QTY) AS PRED,
       NVL(a.ACTUAL_QTY,0)  AS ACTUAL,
       ROUND(p.PRED_SC_QTY - NVL(a.ACTUAL_QTY,0)) AS DIFF
FROM pred p
LEFT JOIN actual a ON p.SC_CD = a.SC_CD
ORDER BY (p.PRED_SC_QTY - NVL(a.ACTUAL_QTY,0)) DESC
LIMIT 10;

-- (D) 거의 정확한 매칭 TOP10 (실판매 >= 10인 SC 중)
WITH actual AS (
    SELECT BRD_CD || '_' || PART_CD || '_' || COLOR_CD AS SC_CD,
           SUM(NVL(SALE_NML_QTY_SH,0) + NVL(SALE_RET_QTY_SH,0)) AS ACTUAL_QTY
    FROM FNF.PRCS.DW_SH_SCS_D
    WHERE DT BETWEEN '2026-05-04' AND '2026-05-10'
    GROUP BY 1
),
pred AS (
    SELECT SC_CD, PART_CD, COLOR_CD, SESN, PRED_SC_QTY
    FROM FNF.ML_DIST.PRED_SC_W
    WHERE PRED_START_DT = '2026-05-04' AND METHOD_CD = 'lgbm'
)
SELECT 'D_정확매칭TOP10' AS CATEGORY,
       p.PART_CD, p.COLOR_CD, p.SESN,
       ROUND(p.PRED_SC_QTY) AS PRED,
       NVL(a.ACTUAL_QTY,0)  AS ACTUAL,
       ROUND(p.PRED_SC_QTY - NVL(a.ACTUAL_QTY,0)) AS DIFF
FROM pred p
LEFT JOIN actual a ON p.SC_CD = a.SC_CD
WHERE NVL(a.ACTUAL_QTY,0) >= 10
ORDER BY ABS(p.PRED_SC_QTY - NVL(a.ACTUAL_QTY,0)) ASC
LIMIT 10;


-- ─────────────────────────────────────────────────────────────────────────────
-- [쿼리 4] SC 단위 raw 결과 — 엑셀 받아서 직접 필터/피벗 돌릴 때
-- ─────────────────────────────────────────────────────────────────────────────
WITH actual AS (
    SELECT
        BRD_CD || '_' || PART_CD || '_' || COLOR_CD AS SC_CD,
        SUM(NVL(SALE_NML_QTY_SH, 0) + NVL(SALE_RET_QTY_SH, 0)) AS ACTUAL_QTY
    FROM FNF.PRCS.DW_SH_SCS_D
    WHERE DT BETWEEN '2026-05-04' AND '2026-05-10'
    GROUP BY 1
),
pred AS (
    SELECT SC_CD, BRD_CD, PART_CD, COLOR_CD, SESN, PRED_SC_QTY
    FROM FNF.ML_DIST.PRED_SC_W
    WHERE PRED_START_DT = '2026-05-04' AND METHOD_CD = 'lgbm'
)
SELECT
    p.BRD_CD, p.SESN, p.PART_CD, p.COLOR_CD,
    ROUND(p.PRED_SC_QTY, 2)                              AS PRED,
    NVL(a.ACTUAL_QTY, 0)                                 AS ACTUAL,
    ROUND(p.PRED_SC_QTY - NVL(a.ACTUAL_QTY, 0), 2)       AS DIFF,
    CASE WHEN NVL(a.ACTUAL_QTY, 0) = 0 THEN NULL
         ELSE ROUND((p.PRED_SC_QTY - a.ACTUAL_QTY) / a.ACTUAL_QTY, 3)
    END                                                  AS PCT_DIFF
FROM pred p
LEFT JOIN actual a ON p.SC_CD = a.SC_CD
ORDER BY ACTUAL DESC;
