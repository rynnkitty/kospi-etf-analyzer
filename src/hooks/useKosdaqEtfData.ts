'use client';

/**
 * KOSDAQ ETF 목록 + 보유종목 데이터 로딩 훅
 * - kosdaq-etf-list.json, etf-holdings.json을 병렬로 fetch
 */

import { useState, useEffect } from 'react';
import { fetchJson } from '@/lib/data-loader';
import type { EtfListData, EtfHoldingsData } from '@/types/etf';

interface UseKosdaqEtfDataResult {
  etfList: EtfListData | null;
  holdings: EtfHoldingsData | null;
  isLoading: boolean;
  error: string | null;
}

export function useKosdaqEtfData(): UseKosdaqEtfDataResult {
  const [etfList, setEtfList] = useState<EtfListData | null>(null);
  const [holdings, setHoldings] = useState<EtfHoldingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      const [listData, holdingsData] = await Promise.all([
        fetchJson<EtfListData>('/data/kosdaq-etf-list.json'),
        fetchJson<EtfHoldingsData>('/data/etf-holdings.json'),
      ]);

      if (cancelled) return;

      if (!listData || !holdingsData) {
        setError('KOSDAQ ETF 데이터를 불러오지 못했습니다.');
      } else {
        setEtfList(listData);
        setHoldings(holdingsData);
      }
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { etfList, holdings, isLoading, error };
}
