'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CategoryTree, StyleCatalogItem } from '@/lib/types';

export interface ProductTreeData {
  styles: StyleCatalogItem[];
  categoryTree: CategoryTree;
  seasonOptions: string[];
}

const EMPTY: ProductTreeData = { styles: [], categoryTree: {}, seasonOptions: [] };

/**
 * product-tree lazy-loading hook.
 * - enabled=false(화면0)이면 fetch하지 않음 → 8MB+ 네트워크 요청 절약
 * - brandCd가 동일하면 캐시 가드로 재호출 스킵
 * - enabled가 true로 바뀌는 순간(화면A 진입) 자동 fetch
 */
export function useProductTree(brandCd: string, enabled: boolean) {
  const [data, setData] = useState<ProductTreeData>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const cachedBrandRef = useRef<string>('');

  const fetchTree = useCallback(async (brand: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/product-tree?brandCd=${brand}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ProductTreeData = await res.json();
      setData(json);
      cachedBrandRef.current = brand;
    } catch {
      // 실패 시 기존 데이터 유지, 재시도 가능하도록 캐시 미갱신
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (brandCd === cachedBrandRef.current && data.styles.length > 0) return;
    fetchTree(brandCd);
  }, [brandCd, enabled, fetchTree, data.styles.length]);

  return { data, isLoading };
}
