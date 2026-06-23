-- =============================================================================
-- 주차별 PRED_SC_QTY 단위 비교 쿼리
-- 목적: 2026-05-11 주차 적재 단위가 다른 주차의 1/100 수준인지 확인
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- [쿼리 1] PRED_SC_W — SC-Total 주간 예측 단위 비교 (메인)
-- 주차 × EXECUTION_DT × METHOD × 브랜드 단위로 통계 산출
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    PRED_START_DT,
    EXECUTION_DT,
    METHOD_CD,
    BRD_CD,
    COUNT(*)                       AS n_sc,
    ROUND(SUM(PRED_SC_QTY), 2)     AS sum_qty,
    ROUND(AVG(PRED_SC_QTY), 4)     AS avg_qty,
    ROUND(MIN(PRED_SC_QTY), 4)     AS min_qty,
    ROUND(MEDIAN(PRED_SC_QTY), 4)  AS med_qty,
    ROUND(MAX(PRED_SC_QTY), 2)     AS max_qty,
    -- 분포 카운트: 단위 비교에 결정적
    SUM(CASE WHEN PRED_SC_QTY < 1   THEN 1 ELSE 0 END) AS n_lt_1,
    SUM(CASE WHEN PRED_SC_QTY < 10  THEN 1 ELSE 0 END) AS n_lt_10,
    SUM(CASE WHEN PRED_SC_QTY >= 100 THEN 1 ELSE 0 END) AS n_gte_100
FROM FNF.ML_DIST.PRED_SC_W
GROUP BY 1, 2, 3, 4
ORDER BY PRED_START_DT DESC, EXECUTION_DT DESC, METHOD_CD, BRD_CD;


-- ─────────────────────────────────────────────────────────────────────────────
-- [쿼리 2] PRED_SH_SCS_W — SCS-Shop 분배 결과의 traceability 컬럼 단위 비교
-- 같은 주차의 SC-Total 기준값 + 정규화 결과 + RAW 값을 한 번에 확인
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    PRED_START_DT,
    EXECUTION_DT,
    METHOD_CD,
    BRD_CD,
    COUNT(*)                                  AS n_rows,
    COUNT(DISTINCT SH_SC_CD)                  AS n_sc_shop,
    COUNT(DISTINCT SC_CD)                     AS n_sc,
    -- 최종 분배값 (정규화된 비율)
    ROUND(MAX(PRED_SH_SCS_NORM_QTY), 4)       AS max_scs_norm,
    ROUND(MEDIAN(PRED_SH_SCS_NORM_QTY), 4)    AS med_scs_norm,
    -- 사이즈 분해 전 SH 정규화
    ROUND(MAX(PRED_SH_SC_NORM_QTY), 4)        AS max_sh_norm,
    ROUND(AVG(PO_RATIO), 4)                   AS avg_po_ratio,
    -- traceability: SC-Total 기준값과 RAW값의 최대치
    ROUND(MAX(PRED_SC_QTY), 2)                AS max_sc_qty_trace,
    ROUND(MAX(PRED_SH_SC_RAW_QTY), 2)         AS max_sh_sc_raw_qty
FROM FNF.ML_DIST.PRED_SH_SCS_W
GROUP BY 1, 2, 3, 4
ORDER BY PRED_START_DT DESC, EXECUTION_DT DESC, METHOD_CD, BRD_CD;


-- ─────────────────────────────────────────────────────────────────────────────
-- [쿼리 3] 단일 SC로 주차별 단위 직접 비교
-- 예시: DXRS75063 BKS — 5/4 주차에서 PRED_SC_QTY=203이었던 SC
-- 같은 SC가 다른 주차에 어떤 값으로 적재됐는지 한 번에 본다
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    PRED_START_DT,
    EXECUTION_DT,
    METHOD_CD,
    BRD_CD, PART_CD, COLOR_CD, SESN,
    ROUND(PRED_SC_QTY, 4) AS PRED_SC_QTY
FROM FNF.ML_DIST.PRED_SC_W
WHERE BRD_CD  = 'X'
  AND PART_CD = 'DXRS75063'
  AND COLOR_CD = 'BKS'
ORDER BY PRED_START_DT DESC, EXECUTION_DT DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- [쿼리 4] 5/11 주차 단독 분포 정밀 점검
-- 1300건이 어떤 범위에 깔려있는지 히스토그램 형태로
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    CASE
        WHEN PRED_SC_QTY  = 0              THEN '00_zero'
        WHEN PRED_SC_QTY <= 0.01           THEN '01_le_0.01'
        WHEN PRED_SC_QTY <= 0.1            THEN '02_le_0.1'
        WHEN PRED_SC_QTY <= 1              THEN '03_le_1'
        WHEN PRED_SC_QTY <= 10             THEN '04_le_10'
        WHEN PRED_SC_QTY <= 100            THEN '05_le_100'
        ELSE                                    '06_gt_100'
    END AS BUCKET,
    COUNT(*) AS n_sc,
    ROUND(MIN(PRED_SC_QTY), 4) AS bucket_min,
    ROUND(MAX(PRED_SC_QTY), 4) AS bucket_max
FROM FNF.ML_DIST.PRED_SC_W
WHERE PRED_START_DT = '2026-05-11' AND METHOD_CD = 'lgbm'
GROUP BY 1
ORDER BY 1;
