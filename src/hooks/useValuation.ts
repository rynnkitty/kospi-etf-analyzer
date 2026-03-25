'use client';

/**
 * 개별 종목 PER/PBR 밸류에이션 데이터 로딩 훅
 * - stock-valuation.json을 fetch
 */

import { useState, useEffect } from 'react';
import { fetchJson } from '@/lib/data-loader';
import type { StockValuationData } from '@/types/stock';

interface UseValuationResult {
  valuation: StockValuationData | null;
  isLoading: boolean;
  error: string | null;
}

export function useValuation(): UseValuationResult {
  const [valuation, setValuation] = useState<StockValuationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      const data = await fetchJson<StockValuationData>('/data/stock-valuation.json');

      if (cancelled) return;

      if (!data) {
        setError('밸류에이션 데이터를 불러오지 못했습니다.');
      } else {
        setValuation(data);
      }
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { valuation, isLoading, error };
}
