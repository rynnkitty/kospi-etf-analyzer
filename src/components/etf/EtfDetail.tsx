'use client';

/**
 * ETF 상세 페이지 클라이언트 컴포넌트
 * - ETF 기본 정보 카드 (운용사, 순자산, 수익률, 섹터 배지)
 * - 보유종목 테이블 (HoldingsTable)
 * - PER/PBR 분포 차트 (ScatterPlot)
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useEtfData } from '@/hooks/useEtfData';
import { useValuation } from '@/hooks/useValuation';
import { SECTOR_MAP } from '@/constants/sectors';
import { DataLoader } from '@/components/common/DataLoader';
import { HoldingsTable } from './HoldingsTable';
import { ScatterPlot } from './ScatterPlot';
import { formatMarketCap, formatPercent } from '@/lib/valuation-utils';
import type { ETF } from '@/types/etf';
import type { HoldingRow } from './HoldingsTable';

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────────────

interface EtfDetailProps {
  ticker: string;
}

export function EtfDetail({ ticker }: EtfDetailProps) {
  const { etfList, holdings, isLoading: etfLoading, error: etfError } = useEtfData();
  const { valuation, isLoading: valLoading, error: valError } = useValuation();

  const isLoading = etfLoading || valLoading;
  const error = etfError ?? valError;

  // ETF 정보와 소속 섹터 코드 탐색
  const { etf, sectorCode } = useMemo<{ etf: ETF | null; sectorCode: string | null }>(() => {
    if (!etfList) return { etf: null, sectorCode: null };
    for (const sector of etfList.sectors) {
      const found = sector.etfs.find((e) => e.ticker === ticker);
      if (found) return { etf: found, sectorCode: sector.sector_code };
    }
    return { etf: null, sectorCode: null };
  }, [etfList, ticker]);

  // 보유종목 + 밸류에이션 enriched 행 목록
  const holdingRows = useMemo<HoldingRow[]>(() => {
    if (!holdings || !valuation) return [];
    const etfHolding = holdings.holdings[ticker];
    if (!etfHolding) return [];

    return etfHolding.top_holdings.map((h, i) => {
      const stock = valuation.stocks[h.ticker] ?? null;
      return {
        rank: i + 1,
        ticker: h.ticker,
        name: h.name,
        weight: h.weight,
        close: stock?.close ?? null,
        per: stock?.per ?? null,
        pbr: stock?.pbr ?? null,
        eps: stock?.eps ?? null,
        bps: stock?.bps ?? null,
        dividend_yield: stock?.dividend_yield ?? null,
      };
    });
  }, [holdings, valuation, ticker]);

  // ETF명: etf-holdings.json 우선, 없으면 etf-list.json, 없으면 티커
  const etfName = useMemo(() => {
    if (holdings?.holdings[ticker]?.etf_name) return holdings.holdings[ticker].etf_name;
    if (etf?.name) return etf.name;
    return ticker;
  }, [holdings, etf, ticker]);

  const sector = sectorCode ? SECTOR_MAP[sectorCode] : null;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* ── 뒤로가기 ──────────────────────────────────────────────── */}
      <Link
        href={sector && sectorCode ? `/sector/${sectorCode}` : '/'}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        {sector ? `${sector.name} 섹터` : '전체 섹터'}
      </Link>

      {/* ── ETF 기본 정보 카드 ────────────────────────────────────── */}
      <section>
        <DataLoader isLoading={isLoading} error={error} skeletonRows={2}>
          <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
            {/* ETF명 + 섹터 배지 */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground tabular-nums mb-1">{ticker}</p>
                <h1 className="text-2xl font-bold tracking-tight">{etfName}</h1>
              </div>
              {sector && sectorCode && (
                <Link
                  href={`/sector/${sectorCode}`}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white ${sector.color} hover:opacity-80 transition-opacity`}
                >
                  <span className="w-2 h-2 rounded-full bg-white/50 shrink-0" aria-hidden="true" />
                  {sector.name}
                </Link>
              )}
            </div>

            {/* 운용사 / 순자산 / 수익률 */}
            {etf && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-3 border-t">
                <StatItem label="운용사" value={etf.provider} />
                <StatItem label="순자산" value={formatMarketCap(etf.nav)} />
                <StatItem
                  label="1개월 수익률"
                  value={
                    etf.return_1m !== null ? (
                      <span className={etf.return_1m >= 0 ? 'text-red-500' : 'text-blue-500'}>
                        {etf.return_1m >= 0 ? '+' : ''}
                        {formatPercent(etf.return_1m)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )
                  }
                />
                <StatItem
                  label="3개월 수익률"
                  value={
                    etf.return_3m !== null ? (
                      <span className={etf.return_3m >= 0 ? 'text-red-500' : 'text-blue-500'}>
                        {etf.return_3m >= 0 ? '+' : ''}
                        {formatPercent(etf.return_3m)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )
                  }
                />
              </div>
            )}
          </div>
        </DataLoader>
      </section>

      {/* ── 보유종목 테이블 ───────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold mb-4">보유종목</h2>
        <DataLoader
          isLoading={isLoading}
          error={error}
          isEmpty={!isLoading && !error && holdingRows.length === 0}
          emptyMessage="보유종목 데이터가 없습니다."
          skeletonRows={10}
        >
          <HoldingsTable rows={holdingRows} />
        </DataLoader>
      </section>

      {/* ── PER/PBR 분포 차트 ─────────────────────────────────────── */}
      {!isLoading && !error && holdingRows.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-2">PER / PBR 분포</h2>
          <p className="text-xs text-muted-foreground mb-4">
            X축 PBR · Y축 PER · 점 크기 = 보유 비중 | 파란 영역: 저평가, 붉은 영역: 고평가
          </p>
          <div className="rounded-xl border bg-card p-4">
            <ScatterPlot holdings={holdingRows} />
          </div>
        </section>
      )}
    </div>
  );
}

// ─── StatItem ─────────────────────────────────────────────────────────────────

function StatItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}
