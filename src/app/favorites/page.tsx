'use client';

import { Suspense, useMemo, useState } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { useEtfData } from '@/hooks/useEtfData';
import { useKosdaqEtfData } from '@/hooks/useKosdaqEtfData';
import { useValuation } from '@/hooks/useValuation';
import { useFilter } from '@/hooks/useFilter';
import { StockTable } from '@/components/stocks/StockTable';
import type { StockRow } from '@/components/stocks/StockTable';
import { useFavoritesStore } from '@/store/favorites-store';
import type { SortField } from '@/types/filter';

function buildStockRows(
  kospiSectors: { sector_code: string; etfs: { ticker: string }[] }[],
  kosdaqSectors: { sector_code: string; etfs: { ticker: string }[] }[],
  holdingsMap: Record<string, { top_holdings: { ticker: string; name: string }[] }>,
  valuationStocks: Record<string, import('@/types/stock').StockValuation>
): StockRow[] {
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

function FavoritesContent() {
  const { etfList, holdings, isLoading: etfLoading, error: etfError } = useEtfData();
  const { etfList: kosdaqEtfList, isLoading: kosdaqLoading, error: kosdaqError } = useKosdaqEtfData();
  const { valuation, isLoading: valLoading, error: valError } = useValuation();
  const { favorites, clear } = useFavoritesStore();
  const { sort, setSort } = useFilter();
  const [page, setPage] = useState(1);

  const isLoading = etfLoading || kosdaqLoading || valLoading;
  const error = etfError ?? kosdaqError ?? valError;

  const allRows = useMemo<StockRow[]>(() => {
    if (!etfList || !holdings || !valuation) return [];
    const kosdaqSectors = kosdaqEtfList?.sectors ?? [];
    return buildStockRows(etfList.sectors, kosdaqSectors, holdings.holdings, valuation.stocks);
  }, [etfList, kosdaqEtfList, holdings, valuation]);

  const favoriteRows = useMemo(
    () => allRows.filter((row) => favorites.includes(row.ticker)),
    [allRows, favorites]
  );

  const sortedRows = useMemo(() => {
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...favoriteRows].sort((a, b) => {
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
  }, [favoriteRows, sort]);

  const handleSort = (field: SortField) => setSort(field);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
            즐겨찾기
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            저장한 종목의 PER/PBR 밸류에이션을 한눈에 확인합니다.
          </p>
        </div>
        {favorites.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            전체 삭제
          </button>
        )}
      </div>

      {/* 로딩 / 에러 */}
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

      {/* 즐겨찾기 없음 */}
      {!isLoading && !error && favorites.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
          <Star className="h-12 w-12 text-muted-foreground/20" />
          <p className="text-sm">즐겨찾기한 종목이 없습니다.</p>
          <p className="text-xs text-muted-foreground/60">
            종목 탐색 페이지에서 ★ 아이콘을 클릭해 추가하세요.
          </p>
        </div>
      )}

      {/* 테이블 */}
      {!isLoading && !error && favorites.length > 0 && (
        <>
          <div className="mb-3 rounded-lg border bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{sortedRows.length}</span>
            개 종목
          </div>
          <StockTable
            rows={sortedRows}
            sortField={sort.field}
            sortDirection={sort.direction}
            onSort={handleSort}
            page={page}
            onPageChange={setPage}
            pageSize={50}
          />
        </>
      )}
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          로딩 중...
        </div>
      }
    >
      <FavoritesContent />
    </Suspense>
  );
}
