'use client';

/**
 * 섹터 내 ETF 목록 테이블
 * - 컬럼: ETF명, 종목코드, 운용사, 순자산, 1개월 수익률, 3개월 수익률
 * - 행 클릭으로 보유종목 패널 토글
 */

import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ETF, EtfHoldingsData } from '@/types/etf';
import type { StockValuationData } from '@/types/stock';
import { HoldingsPanel } from './HoldingsPanel';
import { formatMarketCap } from '@/lib/valuation-utils';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface EtfTableProps {
  etfs: ETF[];
  holdings: EtfHoldingsData | null;
  valuation: StockValuationData | null;
  expandedTicker: string | null;
  onToggle: (ticker: string) => void;
}

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function ReturnCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground tabular-nums">—</span>;
  const positive = value > 0;
  const negative = value < 0;
  return (
    <span
      className={
        positive
          ? 'text-rose-500 font-medium tabular-nums'
          : negative
            ? 'text-blue-500 font-medium tabular-nums'
            : 'text-muted-foreground tabular-nums'
      }
    >
      {positive ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function EtfTable({ etfs, holdings, valuation, expandedTicker, onToggle }: EtfTableProps) {
  if (etfs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-5 py-12 text-center text-sm text-muted-foreground">
        이 섹터에 ETF 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[520px]">
        <thead>
          <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium w-8" />
            <th className="px-4 py-3 font-medium">ETF명</th>
            <th className="px-4 py-3 font-medium hidden sm:table-cell">종목코드</th>
            <th className="px-4 py-3 font-medium hidden md:table-cell">운용사</th>
            <th className="px-4 py-3 font-medium text-right">순자산</th>
            <th className="px-4 py-3 font-medium text-right">1개월</th>
            <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">3개월</th>
          </tr>
        </thead>
        <tbody>
          {etfs.map((etf) => {
            const isExpanded = expandedTicker === etf.ticker;
            const etfHolding = holdings?.holdings[etf.ticker];

            return (
              <>
                <tr
                  key={etf.ticker}
                  onClick={() => onToggle(etf.ticker)}
                  className="border-t cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  {/* 확장 아이콘 */}
                  <td className="px-4 py-3 text-muted-foreground">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{etf.name}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums hidden sm:table-cell">{etf.ticker}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{etf.provider}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMarketCap(etf.nav)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ReturnCell value={etf.return_1m} />
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <ReturnCell value={etf.return_3m} />
                  </td>
                </tr>

                {/* 보유종목 패널 */}
                {isExpanded && (
                  <tr key={`${etf.ticker}-holdings`}>
                    <td colSpan={7} className="p-0">
                      <HoldingsPanel
                        etfTicker={etf.ticker}
                        etfName={etf.name}
                        holdings={etfHolding?.top_holdings ?? []}
                        valuation={valuation}
                      />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
