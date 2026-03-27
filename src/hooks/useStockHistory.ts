'use client';

import { useState, useEffect } from 'react';

export interface StockSnapshot {
  date: string;
  close: number | null;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  bps: number | null;
  roe: number | null;
  debt_ratio: number | null;
  market_cap: number | null;
  dividend_yield: number | null;
}

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function aggregate(snapshots: StockSnapshot[], period: PeriodType): StockSnapshot[] {
  if (period === 'daily') return snapshots;

  const groups = new Map<string, StockSnapshot[]>();

  for (const snap of snapshots) {
    const date = new Date(snap.date);
    let key: string;

    if (period === 'weekly') {
      const year = date.getFullYear();
      const week = getISOWeek(date);
      key = `${year}-W${String(week).padStart(2, '0')}`;
    } else if (period === 'monthly') {
      key = snap.date.slice(0, 7);
    } else {
      key = snap.date.slice(0, 4);
    }

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(snap);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, group]) => {
      const last = group[group.length - 1];
      return { ...last, date: key };
    });
}

function getCutoffDate(period: PeriodType): Date {
  const today = new Date();
  switch (period) {
    case 'daily':
      return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
    case 'weekly':
      return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 12 * 7);
    case 'monthly': {
      const d = new Date(today);
      d.setMonth(d.getMonth() - 12);
      return d;
    }
    case 'yearly':
    default:
      return new Date('2000-01-01');
  }
}

export function useStockHistory(ticker: string, period: PeriodType) {
  const [history, setHistory] = useState<StockSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
        const res = await fetch(`${basePath}/data/history/${ticker}.json`);
        if (!res.ok) throw new Error('히스토리 데이터를 불러올 수 없습니다');

        const data: { ticker: string; history: StockSnapshot[] } = await res.json();

        const cutoff = getCutoffDate(period);
        const filtered = (data.history ?? [])
          .filter((s) => new Date(s.date) >= cutoff)
          .sort((a, b) => a.date.localeCompare(b.date));

        if (!cancelled) {
          setHistory(aggregate(filtered, period));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ticker, period]);

  return { history, isLoading, error };
}
