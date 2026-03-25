'use client';

/**
 * 섹터 상세 페이지 클라이언트 컴포넌트
 * - 섹터명 + 요약 통계 (ETF 수, 평균 PER/PBR, 총 순자산)
 * - EtfTable + HoldingsPanel 토글 관리
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useEtfData } from '@/hooks/useEtfData';
import { useValuation } from '@/hooks/useValuation';
import { SECTOR_MAP } from '@/constants/sectors';
import { EtfTable } from './EtfTable';
import { DataLoader } from '@/components/common/DataLoader';
import { formatMarketCap } from '@/lib/valuation-utils';
import type { EtfListData, EtfHoldingsData } from '@/types/etf';
import type { StockValuationData } from '@/types/stock';

// ─── 요약 통계 계산 ────────────────────────────────────────────────────────────

interface SectorSummary {
  etfCount: number;
  avgPer: number | null;
  avgPbr: number | null;
  totalNav: number;
}

function computeSummary(
  sectorCode: string,
  etfList: EtfListData,
  holdings: EtfHoldingsData,
  valuation: StockValuationData
): SectorSummary {
  const sectorData = etfList.sectors.find((s) => s.sector_code === sectorCode);
  if (!sectorData) return { etfCount: 0, avgPer: null, avgPbr: null, totalNav: 0 };

  const etfs = sectorData.etfs;
  const totalNav = etfs.reduce((sum, e) => sum + e.nav, 0);

  const items: { weight: number; per: number; pbr: number }[] = [];
  for (const etf of etfs) {
    const etfHolding = holdings.holdings[etf.ticker];
    if (!etfHolding) continue;
    for (const h of etfHolding.top_holdings) {
      const stock = valuation.stocks[h.ticker];
      if (stock?.per && stock.per > 0 && stock.pbr !== null) {
        items.push({ weight: h.weight, per: stock.per, pbr: stock.pbr as number });
      }
    }
  }

  if (items.length === 0) {
    return { etfCount: etfs.length, avgPer: null, avgPbr: null, totalNav };
  }

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const avgPer = items.reduce((s, i) => s + i.per * i.weight, 0) / totalWeight;
  const avgPbr = items.reduce((s, i) => s + i.pbr * i.weight, 0) / totalWeight;

  return { etfCount: etfs.length, avgPer, avgPbr, totalNav };
}

// ─── 요약 카드 ─────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────────────

interface SectorDetailProps {
  sectorCode: string;
}

export function SectorDetail({ sectorCode }: SectorDetailProps) {
  const { etfList, holdings, isLoading: etfLoading, error: etfError } = useEtfData();
  const { valuation, isLoading: valLoading, error: valError } = useValuation();

  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  const isLoading = etfLoading || valLoading;
  const error = etfError ?? valError;

  const sector = SECTOR_MAP[sectorCode];

  const sectorEtfs = useMemo(() => {
    if (!etfList) return [];
    return etfList.sectors.find((s) => s.sector_code === sectorCode)?.etfs ?? [];
  }, [etfList, sectorCode]);

  const summary = useMemo<SectorSummary | null>(() => {
    if (!etfList || !holdings || !valuation) return null;
    return computeSummary(sectorCode, etfList, holdings, valuation);
  }, [sectorCode, etfList, holdings, valuation]);

  function handleToggle(ticker: string) {
    setExpandedTicker((prev) => (prev === ticker ? null : ticker));
  }

  // 알 수 없는 섹터 코드 처리
  if (!sector) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        알 수 없는 섹터 코드입니다: {sectorCode}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* ── 뒤로가기 + 섹터 헤더 ─────────────────────────────────── */}
      <section>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          전체 섹터
        </Link>

        <div className="flex items-center gap-3">
          <span
            className={`inline-block w-3 h-3 rounded-full ${sector.color}`}
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold tracking-tight">
            {sector.name}
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {sector.nameEn}
            </span>
          </h1>
        </div>
      </section>

      {/* ── 요약 통계 카드 ─────────────────────────────────────────── */}
      {!isLoading && !error && summary && (
        <section>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="ETF 수" value={`${summary.etfCount}개`} />
            <StatCard
              label="평균 PER (가중)"
              value={summary.avgPer != null ? summary.avgPer.toFixed(1) + '배' : '—'}
            />
            <StatCard
              label="평균 PBR (가중)"
              value={summary.avgPbr != null ? summary.avgPbr.toFixed(2) + '배' : '—'}
            />
            <StatCard label="총 순자산" value={formatMarketCap(summary.totalNav)} />
          </div>
        </section>
      )}

      {/* ── ETF 목록 테이블 ────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold mb-4">ETF 목록</h2>
        <p className="text-xs text-muted-foreground mb-3">
          행을 클릭하면 해당 ETF의 보유종목이 표시됩니다.
        </p>
        <DataLoader
          isLoading={isLoading}
          error={error}
          isEmpty={!isLoading && !error && sectorEtfs.length === 0}
          emptyMessage="이 섹터에 수집된 ETF 데이터가 없습니다."
          skeletonRows={4}
        >
          <EtfTable
            etfs={sectorEtfs}
            holdings={holdings}
            valuation={valuation}
            expandedTicker={expandedTicker}
            onToggle={handleToggle}
          />
        </DataLoader>
      </section>
    </div>
  );
}
