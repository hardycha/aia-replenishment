-- ============================================================
-- 과소 배분 의심 SC × 매장 예측치 점검 쿼리
-- 배분그룹 XSHGR202410080000001381 (매장: 50096, 50137, 50089, 10050)
-- v2 긴급 SC 45개 × 4매장 중 예측치가 0인 87쌍 점검
-- ============================================================

-- [1] 해당 매장×SC의 PRED_SH_SCS_W 예측치 현황
-- → 예측이 실제로 0인지, 적재 자체가 안 됐는지 확인
WITH target_sc AS (
    SELECT column1 AS PART_CD, column2 AS COLOR_CD
    FROM VALUES
        ('DKRS64063', 'MUS'),   -- AP 1721, 부족100%, 4매장 전부 예측0
        ('DKSZ62063', 'LAS'),   -- AP 693, 부족83%, 3매장 예측0
        ('DMWJ31061', 'BKS'),   -- AP 53, 속도+467%, 2매장 예측0
        ('DMTS81063', 'KAD'),   -- AP 15, 부족95%, 1매장 예측0
        ('DXRS7R063', 'BKS'),   -- AP 6, 부족88%
        ('DXRS7R063', 'WHS'),   -- AP 11, 부족79%
        ('DWTR95063', 'KAD'),   -- AP 616, 부족96% (ILP 배분은 됐지만 극소량)
        ('DKRS73063', 'BKS'),   -- AP 259, 부족50% (ILP 배분은 됐지만 극소량)
        ('DMWJ7K063', 'IVD'),   -- AP 40, 부족76%
        ('DWWJR2063', 'DWS'),   -- AP 49, 부족76%
        ('DMWJ3C061', 'BKS'),   -- AP 38, 부족71%
        ('DWRS7F063', 'NYD'),   -- AP 13, 부족70%
        ('DMWJ33061', 'BKS'),   -- AP 69, 부족66%
        ('DWWJ34061', 'BKS'),   -- AP 27, 부족68%
        ('DMRS7E063', 'NYD'),   -- AP 20, 부족77%
        ('DMRS7E063', 'KAS'),   -- AP 15, 부족52%
        ('DWTR43061', 'IVD'),   -- AP 35, 부족48%
        ('DMPT63063', 'BKS'),   -- AP 79, 부족31% (ILP 배분됨, 극소량)
        ('DXRS8B063', 'DGS'),   -- AP 37, 부족47%
        ('DMRL33061', 'IND')    -- AP 19, 부족64%
),
target_shops AS (
    SELECT column1 AS SHOP_ID
    FROM VALUES ('50096'), ('50137'), ('50089'), ('10050')
)
SELECT
    t.PART_CD,
    t.COLOR_CD,
    s.SHOP_ID,
    p.EXECUTION_DT,
    p.PRED_SH_SCS_QTY,
    p.PRED_START_DT,
    p.METHOD_CD,
    CASE
        WHEN p.PRED_SH_SCS_QTY IS NULL THEN '❌ 적재 없음'
        WHEN p.PRED_SH_SCS_QTY <= 0.01 THEN '⚠️ 예측 ≈ 0'
        WHEN p.PRED_SH_SCS_QTY < 1.0 THEN '🟡 예측 < 1'
        ELSE '✅ 예측 있음'
    END AS STATUS
FROM target_sc t
CROSS JOIN target_shops s
LEFT JOIN (
    SELECT BRD_CD, PART_CD, COLOR_CD, SHOP_ID, SIZE_CD,
           PRED_SH_SCS_QTY, EXECUTION_DT, PRED_START_DT, METHOD_CD,
           ROW_NUMBER() OVER (
               PARTITION BY BRD_CD, PART_CD, COLOR_CD, SHOP_ID
               ORDER BY EXECUTION_DT DESC
           ) AS RN
    FROM FNF.ML_DIST.PRED_SH_SCS_W
    WHERE BRD_CD = 'X'
      AND SESN = '26S'
) p ON p.PART_CD = t.PART_CD
   AND p.COLOR_CD = t.COLOR_CD
   AND p.SHOP_ID = s.SHOP_ID
   AND p.RN = 1
ORDER BY t.PART_CD, t.COLOR_CD, s.SHOP_ID
;


-- [2] 동일 SC의 전체 매장 예측 분포 — 0인 매장이 이 4곳만인지, 전체적으로 0인지
SELECT
    t.PART_CD,
    t.COLOR_CD,
    COUNT(DISTINCT p.SHOP_ID) AS 전체_예측_매장수,
    COUNT(DISTINCT CASE WHEN p.PRED_SH_SCS_QTY > 0.01 THEN p.SHOP_ID END) AS 예측_양수_매장수,
    COUNT(DISTINCT CASE WHEN p.PRED_SH_SCS_QTY <= 0.01 OR p.PRED_SH_SCS_QTY IS NULL THEN p.SHOP_ID END) AS 예측_0_매장수,
    ROUND(SUM(p.PRED_SH_SCS_QTY), 1) AS 예측_합계,
    ROUND(AVG(p.PRED_SH_SCS_QTY), 3) AS 예측_평균,
    MAX(p.EXECUTION_DT) AS 최신_EXECUTION_DT
FROM target_sc t
LEFT JOIN (
    SELECT BRD_CD, PART_CD, COLOR_CD, SHOP_ID, SIZE_CD,
           PRED_SH_SCS_QTY, EXECUTION_DT,
           ROW_NUMBER() OVER (
               PARTITION BY BRD_CD, PART_CD, COLOR_CD, SHOP_ID
               ORDER BY EXECUTION_DT DESC
           ) AS RN
    FROM FNF.ML_DIST.PRED_SH_SCS_W
    WHERE BRD_CD = 'X'
      AND SESN = '26S'
) p ON p.PART_CD = t.PART_CD
   AND p.COLOR_CD = t.COLOR_CD
   AND p.RN = 1
GROUP BY t.PART_CD, t.COLOR_CD
ORDER BY 예측_0_매장수 DESC
;


-- [3] 해당 4매장의 현재 재고 (실제로 부족한지 확인)
SELECT
    t.PART_CD,
    t.COLOR_CD,
    s.SHOP_ID,
    COALESCE(stk.SHOP_STOCK, 0) AS 매장_현재고,
    CASE
        WHEN COALESCE(stk.SHOP_STOCK, 0) = 0 THEN '🔴 재고 0'
        WHEN COALESCE(stk.SHOP_STOCK, 0) <= 3 THEN '🟡 재고 ≤ 3'
        ELSE '✅ 재고 있음'
    END AS 재고_상태
FROM target_sc t
CROSS JOIN target_shops s
LEFT JOIN (
    SELECT SUBSTR(PRDT_CD, 5) AS PART_CD, COLOR_CD, SHOP_ID,
           SUM(SH_STOCK_QTY) AS SHOP_STOCK
    FROM FNF.PRCS.DW_SH_SCS_DACUM
    WHERE CURRENT_DATE BETWEEN START_DT AND END_DT
      AND BRD_CD = 'X'
      AND PRDT_CD LIKE 'X26S%'
      AND SHOP_ID IN ('50096', '50137', '50089', '10050')
    GROUP BY SUBSTR(PRDT_CD, 5), COLOR_CD, SHOP_ID
) stk ON stk.PART_CD = t.PART_CD
     AND stk.COLOR_CD = t.COLOR_CD
     AND stk.SHOP_ID = s.SHOP_ID
ORDER BY t.PART_CD, t.COLOR_CD, s.SHOP_ID
;
