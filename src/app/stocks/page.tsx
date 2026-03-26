'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Filter, X } from 'lucide-react';
import { useEtfData } from '@/hooks/useEtfData';
import { useKosdaqEtfData } from '@/hooks/useKosdaqEtfData';
import { useValuation } from '@/hooks/useValuation';
import { useFilter } from '@/hooks/useFilter';
import { FilterPanel } from '@/components/stocks/FilterPanel';
import { StockTable } from '@/components/stocks/StockTable';
import type { StockRow } from '@/components/stocks/StockTable';
import type { SortField } from '@/types/filter';
import type { MarketFilter } from '@/types/filter';

const PAGE_SIZE = 50;

// ─── 데이터 처리 ──────────────────────────────────────────────────────────────

function buildStockRows(
  kospiSectors: { sector_code: string; etfs: { ticker: string }[] }[],
  kosdaqSectors: { sector_code: string; etfs: { ticker: string }[] }[],
  holdingsMap: Record<string, { top_holdings: { ticker: string; name: string }[] }>,
  valuationStocks: Record<string, import('@/types/stock').StockValuation>
): StockRow[] {
  // ETF 티커 → { 섹터코드, 시장 } 매핑
  const etfMetaMap: Record<string, { sectorCode: string; market: 'KOSPI' | 'KOSDAQ' }> = {};
  for (const sector of kospiSectors) {
    for (const etf of sector.etfs) {
      etfMetaMap[etf.ticker] = { sectorCode: sector.sector_code, market: 'KOSPI' };
    }
  }
  for (const sector of kosdaqSectors) {
    for (const etf of sector.etfs) {
      etfMetaMap[etf.ticker] = { sectorCode: sector.sector_code, market: 'KOSDAQ' };
    }
  }

  // 종목 코드 기준 중복 제거 + 소속 섹터/ETF 집계
  const stockMap = new Map<
    string,
    { name: string; sectorCodes: Set<string>; etfTickers: Set<string>; market: 'KOSPI' | 'KOSDAQ' }
  >();

  for (const [etfTicker, etfHolding] of Object.entries(holdingsMap)) {
    const meta = etfMetaMap[etfTicker];
    if (!meta) continue;
    for (const holding of etfHolding.top_holdings) {
      if (!stockMap.has(holding.ticker)) {
        stockMap.set(holding.ticker, {
          name: holding.name,
          sectorCodes: new Set(),
          etfTickers: new Set(),
          market: meta.market,
        });
      }
      const entry = stockMap.get(holding.ticker)!;
      entry.sectorCodes.add(meta.sectorCode);
      entry.etfTickers.add(etfTicker);
    }
  }

  return Array.from(stockMap.entries()).map(([ticker, info]) => ({
    ticker,
    name: info.name,
    sectorCodes: Array.from(info.sectorCodes),
    etfCount: info.etfTickers.size,
    valuation: valuationStocks[ticker] ?? null,
    market: info.market,
  }));
}

// ─── 메인 콘텐츠 (useSearchParams 사용 → Suspense 필요) ─────────────────────

function StocksPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { etfList, holdings, isLoading: etfLoading, error: etfError } = useEtfData();
  const { etfList: kosdaqEtfList, isLoading: kosdaqLoading, error: kosdaqError } = useKosdaqEtfData();
  const { valuation, isLoading: valLoading, error: valError } = useValuation();

  const {
    perRange,
    pbrRange,
    selectedSectors,
    searchQuery,
    sort,
    selectedMarket,
    setPerRange,
    setPbrRange,
    setSelectedSectors,
    setSearchQuery,
    setSort,
    setSelectedMarket,
  } = useFilter();

  const [page, setPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // 모바일 필터 열릴 때 body 스크롤 잠금
  useEffect(() => {
    if (mobileFilterOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileFilterOpen]);

  const activeFilterCount = [
    perRange.min !== null || perRange.max !== null,
    pbrRange.min !== null || pbrRange.max !== null,
    selectedSectors.length > 0,
    searchQuery !== '',
    selectedMarket !== 'all',
  ].filter(Boolean).length;

  // ── URL → 필터 초기화 (마운트 시 1회) ─────────────────────────────────────
  useEffect(() => {
    const perMin = searchParams.get('per_min');
    const perMax = searchParams.get('per_max');
    const pbrMin = searchParams.get('pbr_min');
    const pbrMax = searchParams.get('pbr_max');
    const sectors = searchParams.get('sectors');
    const q = searchParams.get('q');
    const p = searchParams.get('page');

    if (perMin || perMax) {
      setPerRange({
        min: perMin ? Number(perMin) : null,
        max: perMax ? Number(perMax) : null,
      });
    }
    if (pbrMin || pbrMax) {
      setPbrRange({
        min: pbrMin ? Number(pbrMin) : null,
        max: pbrMax ? Number(pbrMax) : null,
      });
    }
    if (sectors) setSelectedSectors(sectors.split(',').filter(Boolean));
    if (q) setSearchQuery(q);
    if (p) setPage(Math.max(1, Number(p)));
    const m = searchParams.get('market');
    if (m === 'kospi' || m === 'kosdaq') setSelectedMarket(m as MarketFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 필터 변경 → URL 동기화 ────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (perRange.min !== null) params.set('per_min', String(perRange.min));
    if (perRange.max !== null) params.set('per_max', String(perRange.max));
    if (pbrRange.min !== null) params.set('pbr_min', String(pbrRange.min));
    if (pbrRange.max !== null) params.set('pbr_max', String(pbrRange.max));
    if (selectedSectors.length > 0) params.set('sectors', selectedSectors.join(','));
    if (searchQuery) params.set('q', searchQuery);
    if (selectedMarket !== 'all') params.set('market', selectedMarket);
    if (page > 1) params.set('page', String(page));

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [perRange, pbrRange, selectedSectors, searchQuery, selectedMarket, page, pathname, router]);

  // 필터 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setPage(1);
  }, [perRange, pbrRange, selectedSectors, searchQuery, selectedMarket]);

  const isLoading = etfLoading || kosdaqLoading || valLoading;
  const error = etfError ?? kosdaqError ?? valError;

  // ── 전체 종목 행 생성 ─────────────────────────────────────────────────────
  const allRows = useMemo<StockRow[]>(() => {
    if (!etfList || !holdings || !valuation) return [];
    const kosdaqSectors = kosdaqEtfList?.sectors ?? [];
    return buildStockRows(etfList.sectors, kosdaqSectors, holdings.holdings, valuation.stocks);
  }, [etfList, kosdaqEtfList, holdings, valuation]);

  // ── 필터 적용 ─────────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      // 시장 필터
      if (selectedMarket === 'kospi' && row.market !== 'KOSPI') return false;
      if (selectedMarket === 'kosdaq' && row.market !== 'KOSDAQ') return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!row.name.toLowerCase().includes(q) && !row.ticker.includes(q)) return false;
      }

      if (selectedSectors.length > 0) {
        if (!row.sectorCodes.some((code) => selectedSectors.includes(code))) return false;
      }

      const per = row.valuation?.per ?? null;
      if (perRange.min !== null && (per === null || per < perRange.min)) return false;
      if (perRange.max !== null && (per === null || per > perRange.max)) return false;

      const pbr = row.valuation?.pbr ?? null;
      if (pbrRange.min !== null && (pbr === null || pbr < pbrRange.min)) return false;
      if (pbrRange.max !== null && (pbr === null || pbr > pbrRange.max)) return false;

      return true;
    });
  }, [allRows, searchQuery, selectedSectors, perRange, pbrRange, selectedMarket]);

  // ── 정렬 적용 ─────────────────────────────────────────────────────────────
  const sortedRows = useMemo(() => {
    const dir = sort.direction === 'asc' ? 1 : -1;

    return [...filteredRows].sort((a, b) => {
      switch (sort.field) {
        case 'name':
          return dir * a.name.localeCompare(b.name, 'ko');
        case 'ticker':
          return dir * a.ticker.localeCompare(b.ticker);
        case 'per': {
          const pa = a.valuation?.per ?? (dir > 0 ? Infinity : -Infinity);
          const pb = b.valuation?.per ?? (dir > 0 ? Infinity : -Infinity);
          return dir * (pa - pb);
        }
        case 'pbr': {
          const pa = a.valuation?.pbr ?? (dir > 0 ? Infinity : -Infinity);
          const pb = b.valuation?.pbr ?? (dir > 0 ? Infinity : -Infinity);
          return dir * (pa - pb);
        }
        case 'eps': {
          const pa = a.valuation?.eps ?? (dir > 0 ? -Infinity : Infinity);
          const pb = b.valuation?.eps ?? (dir > 0 ? -Infinity : Infinity);
          return dir * (pa - pb);
        }
        case 'bps': {
          const pa = a.valuation?.bps ?? (dir > 0 ? -Infinity : Infinity);
          const pb = b.valuation?.bps ?? (dir > 0 ? -Infinity : Infinity);
          return dir * (pa - pb);
        }
        case 'dividend_yield': {
          const pa = a.valuation?.dividend_yield ?? (dir > 0 ? -Infinity : Infinity);
          const pb = b.valuation?.dividend_yield ?? (dir > 0 ? -Infinity : Infinity);
          return dir * (pa - pb);
        }
        case 'market_cap': {
          const pa = a.valuation?.market_cap ?? 0;
          const pb = b.valuation?.market_cap ?? 0;
          return dir * (pa - pb);
        }
        case 'close': {
          const pa = a.valuation?.close ?? 0;
          const pb = b.valuation?.close ?? 0;
          return dir * (pa - pb);
        }
        default:
          return 0;
      }
    });
  }, [filteredRows, sort]);

  // ── 요약 통계 ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const withPer = filteredRows.filter((r) => r.valuation?.per != null && r.valuation.per > 0);
    const withPbr = filteredRows.filter((r) => r.valuation?.pbr != null);
    const avgPer =
      withPer.length > 0
        ? withPer.reduce((s, r) => s + r.valuation!.per!, 0) / withPer.length
        : null;
    const avgPbr =
      withPbr.length > 0
        ? withPbr.reduce((s, r) => s + r.valuation!.pbr!, 0) / withPbr.length
        : null;
    return {
      total: allRows.length,
      filtered: filteredRows.length,
      avgPer,
      avgPbr,
    };
  }, [allRows, filteredRows]);

  const handleSort = (field: SortField) => {
    setSort(field);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ── 헤더 ──────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">전체 종목 탐색</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          KOSPI · KOSDAQ 섹터 ETF 보유종목을 통합하여 PER/PBR 기반으로 검색·필터링합니다.
        </p>
      </div>

      {/* ── 로딩 / 에러 ───────────────────────────────────── */}
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

      {/* ── 본문 ──────────────────────────────────────────── */}
      {!isLoading && !error && (
        <>
          {/* ── 모바일 필터 드로어 ────────────────────────── */}
          {mobileFilterOpen && (
            <>
              {/* 백드롭 */}
              <div
                className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                onClick={() => setMobileFilterOpen(false)}
                aria-hidden="true"
              />
              {/* 패널 */}
              <div
                role="dialog"
                aria-modal="true"
                aria-label="필터"
                className="fixed inset-y-0 right-0 z-50 w-4/5 max-w-sm overflow-y-auto bg-background shadow-2xl lg:hidden"
              >
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <span className="text-sm font-semibold">필터</span>
                  <button
                    type="button"
                    aria-label="필터 닫기"
                    onClick={() => setMobileFilterOpen(false)}
                    className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-4">
                  <FilterPanel />
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            {/* 필터 패널 — 데스크탑 사이드바 */}
            <div className="hidden lg:block w-56 xl:w-60 shrink-0">
              <FilterPanel />
            </div>

            {/* 오른쪽: 요약 통계 + 테이블 */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* 요약 통계 바 + 모바일 필터 버튼 */}
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                  <span className="text-muted-foreground">
                    <span
                      data-testid="stock-filtered-count"
                      className="font-semibold text-foreground tabular-nums"
                    >
                      {stats.filtered.toLocaleString()}
                    </span>
                    {stats.filtered !== stats.total && (
                      <span className="text-muted-foreground/60">
                        {' '}/ {stats.total.toLocaleString()}
                      </span>
                    )}
                    <span className="ml-1">종목</span>
                  </span>
                  {stats.avgPer !== null && (
                    <span className="text-muted-foreground hidden sm:inline">
                      평균 PER{' '}
                      <span className="font-semibold text-foreground tabular-nums">
                        {stats.avgPer.toFixed(1)}
                      </span>
                    </span>
                  )}
                  {stats.avgPbr !== null && (
                    <span className="text-muted-foreground hidden sm:inline">
                      평균 PBR{' '}
                      <span className="font-semibold text-foreground tabular-nums">
                        {stats.avgPbr.toFixed(2)}
                      </span>
                    </span>
                  )}
                </div>

                {/* 모바일 필터 버튼 */}
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(true)}
                  className="lg:hidden flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                >
                  <Filter className="h-3.5 w-3.5" />
                  필터
                  {activeFilterCount > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {/* 종목 테이블 */}
              <StockTable
                rows={sortedRows}
                sortField={sort.field}
                sortDirection={sort.direction}
                onSort={handleSort}
                page={page}
                onPageChange={setPage}
                pageSize={PAGE_SIZE}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── 페이지 (Suspense 래퍼) ───────────────────────────────────────────────────

export default function StocksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          로딩 중...
        </div>
      }
    >
      <StocksPageContent />
    </Suspense>
  );
}
