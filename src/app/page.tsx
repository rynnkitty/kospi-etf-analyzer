'use client';

import { useMemo } from 'react';
import { useEtfData } from '@/hooks/useEtfData';
import { useValuation } from '@/hooks/useValuation';
import { SECTORS, SECTOR_MAP } from '@/constants/sectors';
import { SectorCard } from '@/components/dashboard/SectorCard';
import { SectorCompareChart } from '@/components/dashboard/SectorCompareChart';
import { ValuationHeatmap } from '@/components/dashboard/ValuationHeatmap';
import { ValueFilterPanel } from '@/components/dashboard/ValueFilterPanel';
import type { EtfListData, EtfHoldingsData } from '@/types/etf';
import type { StockValuationData } from '@/types/stock';

// ─── 공유 타입 (차트 컴포넌트가 import) ──────────────────────────────────────

export interface SectorStats {
  sector_code: string;
  etf_count: number;
  avg_per: number | null;
  avg_pbr: number | null;
}

export interface ScatterPoint {
  ticker: string;
  name: string;
  sector_code: string;
  per: number;
  pbr: number;
  market_cap: number | null;
  dividend_yield: number | null;
}

// ─── 계산 함수 ────────────────────────────────────────────────────────────────

function computeSectorStats(
  etfList: EtfListData,
  holdings: EtfHoldingsData,
  valuation: StockValuationData
): SectorStats[] {
  const sectorDataMap = new Map(etfList.sectors.map((s) => [s.sector_code, s]));

  return SECTORS.map((config) => {
    const sectorData = sectorDataMap.get(config.code);
    if (!sectorData) {
      return { sector_code: config.code, etf_count: 0, avg_per: null, avg_pbr: null };
    }

    const items: { weight: number; per: number; pbr: number }[] = [];

    for (const etf of sectorData.etfs) {
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
      return { sector_code: config.code, etf_count: sectorData.etfs.length, avg_per: null, avg_pbr: null };
    }

    const totalWeight = items.reduce((s, i) => s + i.weight, 0);
    const avg_per = items.reduce((s, i) => s + i.per * i.weight, 0) / totalWeight;
    const avg_pbr = items.reduce((s, i) => s + i.pbr * i.weight, 0) / totalWeight;

    return { sector_code: config.code, etf_count: sectorData.etfs.length, avg_per, avg_pbr };
  });
}

function computeScatterPoints(
  etfList: EtfListData,
  holdings: EtfHoldingsData,
  valuation: StockValuationData
): ScatterPoint[] {
  const seen = new Set<string>();
  const points: ScatterPoint[] = [];

  for (const sector of etfList.sectors) {
    for (const etf of sector.etfs) {
      const etfHolding = holdings.holdings[etf.ticker];
      if (!etfHolding) continue;
      for (const h of etfHolding.top_holdings) {
        if (seen.has(h.ticker)) continue;
        const stock = valuation.stocks[h.ticker];
        if (stock?.per && stock.per > 0 && stock.pbr !== null && stock.pbr! > 0) {
          seen.add(h.ticker);
          points.push({
            ticker: h.ticker,
            name: stock.name,
            sector_code: sector.sector_code,
            per: stock.per,
            pbr: stock.pbr as number,
            market_cap: stock.market_cap,
            dividend_yield: stock.dividend_yield ?? null,
          });
        }
      }
    }
  }

  return points;
}

// ─── 페이지 ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { etfList, holdings, isLoading: etfLoading, error: etfError } = useEtfData();
  const { valuation, isLoading: valLoading, error: valError } = useValuation();

  const isLoading = etfLoading || valLoading;
  const error = etfError ?? valError;

  const sectorStats = useMemo(() => {
    if (!etfList || !holdings || !valuation) return null;
    return computeSectorStats(etfList, holdings, valuation);
  }, [etfList, holdings, valuation]);

  const scatterPoints = useMemo(() => {
    if (!etfList || !holdings || !valuation) return null;
    return computeScatterPoints(etfList, holdings, valuation);
  }, [etfList, holdings, valuation]);

  const updatedAt = etfList?.updated_at ?? null;

  return (
    <div className="container mx-auto px-4 py-8 space-y-10">
      {/* ── 헤더 ─────────────────────────────────────────────────── */}
      <section>
        <h1 className="text-2xl font-bold tracking-tight">KOSPI 섹터 ETF 밸류에이션</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          코스피 10개 섹터 ETF의 보유종목 가중평균 PER/PBR을 한눈에 비교합니다.
        </p>
        {updatedAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            데이터 갱신:{' '}
            {new Date(updatedAt).toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </section>

      {/* ── 로딩 / 에러 상태 ──────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          데이터를 불러오는 중...
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── 가치주 후보 필터 ──────────────────────────────────────── */}
      {!isLoading && !error && scatterPoints && scatterPoints.length > 0 && (
        <ValueFilterPanel points={scatterPoints} />
      )}

      {/* ── 섹터 카드 그리드 ──────────────────────────────────────── */}
      {!isLoading && !error && sectorStats && (
        <section>
          <h2 className="mb-4 text-base font-semibold">섹터별 현황</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {sectorStats.map((stats) => {
              const config = SECTOR_MAP[stats.sector_code];
              if (!config) return null;
              return (
                <SectorCard
                  key={stats.sector_code}
                  sectorCode={stats.sector_code}
                  etfCount={stats.etf_count}
                  avgPer={stats.avg_per}
                  avgPbr={stats.avg_pbr}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ── 섹터 비교 차트 ────────────────────────────────────────── */}
      {!isLoading && !error && sectorStats && (
        <section>
          <h2 className="mb-4 text-base font-semibold">섹터별 PER / PBR 비교</h2>
          <div className="rounded-xl border bg-card p-4">
            <SectorCompareChart data={sectorStats} />
          </div>
        </section>
      )}

      {/* ── 밸류에이션 스캐터 플롯 ───────────────────────────────── */}
      {!isLoading && !error && scatterPoints && scatterPoints.length > 0 && (
        <section>
          <h2 className="mb-1 text-base font-semibold">PBR vs PER 분포</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            점 크기 = 시가총액 비례 · 색상 = 섹터 구분
          </p>
          <div className="rounded-xl border bg-card p-4">
            <ValuationHeatmap data={scatterPoints} />
          </div>
        </section>
      )}

      {/* 데이터 없음 안내 (로드 성공했으나 scatter 데이터 없음) */}
      {!isLoading && !error && scatterPoints?.length === 0 && (
        <div className="rounded-lg border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          아직 수집된 보유종목 데이터가 없습니다. GitHub Actions 데이터 수집 워크플로우를 실행해 주세요.
        </div>
      )}
    </div>
  );
}
