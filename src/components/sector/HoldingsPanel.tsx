'use client';

/**
 * ETF 보유종목 확장 패널
 * - ETF 행 클릭 시 토글 표시
 * - 종목명/코드, 비중, PER, PBR, EPS, BPS, 배당수익률
 * - PER/PBR에 ValueBadge 적용
 */

import Link from 'next/link';
import type { Holding } from '@/types/etf';
import type { StockValuationData } from '@/types/stock';
import { ValueBadge } from '@/components/common/ValueBadge';
import { getPERGrade, getPBRGrade } from '@/lib/valuation-utils';
import { formatNumber } from '@/lib/valuation-utils';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface HoldingsPanelProps {
  etfTicker: string;
  etfName: string;
  holdings: Holding[];
  valuation: StockValuationData | null;
}

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function fmt(value: number | null, digits = 2): string {
  if (value === null) return '—';
  return value.toFixed(digits);
}

function fmtNum(value: number | null): string {
  if (value === null) return '—';
  return formatNumber(Math.round(value));
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function HoldingsPanel({ etfTicker, etfName, holdings, valuation }: HoldingsPanelProps) {
  if (holdings.length === 0) {
    return (
      <div className="bg-muted/30 px-6 py-4 text-sm text-muted-foreground text-center">
        보유종목 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-muted/20 border-t">
      {/* 패널 헤더 */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30">
        <p className="text-sm font-medium">
          <span className="text-muted-foreground mr-1">보유종목 TOP{holdings.length}</span>
          {etfName}
        </p>
        <Link
          href={`/etf/${etfTicker}`}
          className="text-xs text-primary hover:underline font-medium"
        >
          ETF 상세 보기 →
        </Link>
      </div>

      {/* 보유종목 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b">
              <th className="px-4 py-2 font-medium">종목명</th>
              <th className="px-4 py-2 font-medium">종목코드</th>
              <th className="px-4 py-2 font-medium text-right">비중(%)</th>
              <th className="px-4 py-2 font-medium text-center">PER</th>
              <th className="px-4 py-2 font-medium text-center">PBR</th>
              <th className="px-4 py-2 font-medium text-right">EPS</th>
              <th className="px-4 py-2 font-medium text-right">BPS</th>
              <th className="px-4 py-2 font-medium text-right">배당수익률</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => {
              const stock = valuation?.stocks[holding.ticker] ?? null;
              return (
                <tr
                  key={holding.ticker}
                  className="border-b last:border-b-0 hover:bg-muted/40 transition-colors"
                >
                  <td className="px-4 py-2 font-medium">{holding.name}</td>
                  <td className="px-4 py-2 text-muted-foreground tabular-nums">
                    {holding.ticker}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {holding.weight.toFixed(2)}%
                  </td>
                  <td className="px-4 py-2 text-center">
                    {stock ? (
                      <ValueBadge
                        grade={getPERGrade(stock.per)}
                        value={stock.per}
                        metric="PER"
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {stock ? (
                      <ValueBadge
                        grade={getPBRGrade(stock.pbr)}
                        value={stock.pbr}
                        metric="PBR"
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground text-xs">
                    {fmtNum(stock?.eps ?? null)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground text-xs">
                    {fmtNum(stock?.bps ?? null)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground text-xs">
                    {stock?.dividend_yield != null ? `${fmt(stock.dividend_yield)}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
