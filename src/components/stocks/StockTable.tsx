'use client';

import { Building2, ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { ValueBadge } from '@/components/common/ValueBadge';
import { SECTOR_MAP } from '@/constants/sectors';
import { KOSDAQ_SECTOR_MAP } from '@/constants/kosdaq-sectors';
import {
  getPERGrade,
  getPBRGrade,
  formatNumber,
  formatMarketCap,
  formatPercent,
} from '@/lib/valuation-utils';
import { cn } from '@/lib/utils';
import type { SortField, SortDirection } from '@/types/filter';
import type { StockValuation } from '@/types/stock';

// ─── 공유 타입 ─────────────────────────────────────────────────────────────────

export interface StockRow {
  ticker: string;
  name: string;
  sectorCodes: string[];
  etfCount: number;
  valuation: StockValuation | null;
  market: 'KOSPI' | 'KOSDAQ';
}

// ─── 내부 헬퍼 ─────────────────────────────────────────────────────────────────

function SortIndicator({
  field,
  sortField,
  direction,
}: {
  field: SortField;
  sortField: SortField;
  direction: SortDirection;
}) {
  if (field !== sortField) {
    return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40 shrink-0" />;
  }
  return direction === 'asc' ? (
    <ChevronUp className="h-3 w-3 shrink-0" />
  ) : (
    <ChevronDown className="h-3 w-3 shrink-0" />
  );
}

function Th({
  field,
  label,
  sortField,
  direction,
  onSort,
  className,
}: {
  field: SortField;
  label: string;
  sortField: SortField;
  direction: SortDirection;
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const isActive = field === sortField;
  return (
    <th
      className={cn(
        'px-3 py-2.5 text-left text-xs font-medium cursor-pointer select-none whitespace-nowrap transition-colors',
        isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
        className
      )}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIndicator field={field} sortField={sortField} direction={direction} />
      </span>
    </th>
  );
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

interface StockTableProps {
  rows: StockRow[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  page: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
}

export function StockTable({
  rows,
  sortField,
  sortDirection,
  onSort,
  page,
  onPageChange,
  pageSize = 50,
}: StockTableProps) {
  const totalPages = Math.ceil(rows.length / pageSize);
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  // 페이지네이션 페이지 번호 목록 (생략 부호 포함)
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
      if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) {
        acc.push('...');
      }
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <Th
                field="name"
                label="종목명"
                sortField={sortField}
                direction={sortDirection}
                onSort={onSort}
                className="min-w-[140px]"
              />
              <Th
                field="ticker"
                label="코드"
                sortField={sortField}
                direction={sortDirection}
                onSort={onSort}
              />
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                섹터
              </th>
              <Th
                field="close"
                label="현재가"
                sortField={sortField}
                direction={sortDirection}
                onSort={onSort}
                className="text-right"
              />
              <Th
                field="market_cap"
                label="시가총액"
                sortField={sortField}
                direction={sortDirection}
                onSort={onSort}
                className="text-right"
              />
              <Th
                field="per"
                label="PER"
                sortField={sortField}
                direction={sortDirection}
                onSort={onSort}
                className="text-right"
              />
              <Th
                field="pbr"
                label="PBR"
                sortField={sortField}
                direction={sortDirection}
                onSort={onSort}
                className="text-right"
              />
              <Th
                field="eps"
                label="EPS"
                sortField={sortField}
                direction={sortDirection}
                onSort={onSort}
                className="text-right"
              />
              <Th
                field="bps"
                label="BPS"
                sortField={sortField}
                direction={sortDirection}
                onSort={onSort}
                className="text-right"
              />
              <Th
                field="dividend_yield"
                label="배당수익률"
                sortField={sortField}
                direction={sortDirection}
                onSort={onSort}
                className="text-right"
              />
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                ETF 수
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="py-16 text-center text-sm text-muted-foreground"
                >
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={row.ticker}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  {/* 종목명 */}
                  <td className="px-3 py-2.5 font-medium">{row.name}</td>

                  {/* 종목코드 */}
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground tabular-nums">
                    {row.ticker}
                  </td>

                  {/* 섹터 배지 */}
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      <span
                        className={
                          row.market === 'KOSDAQ'
                            ? 'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold text-white whitespace-nowrap bg-emerald-600/80'
                            : 'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold text-white whitespace-nowrap bg-blue-600/80'
                        }
                      >
                        {row.market}
                      </span>
                      {row.sectorCodes.map((code) => {
                        const sector = SECTOR_MAP[code] ?? KOSDAQ_SECTOR_MAP[code];
                        if (!sector) return null;
                        return (
                          <span
                            key={code}
                            className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium text-white whitespace-nowrap"
                            style={{ backgroundColor: sector.colorHex + 'cc' }}
                          >
                            {sector.name}
                          </span>
                        );
                      })}
                    </div>
                  </td>

                  {/* 현재가 */}
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                    {row.valuation?.close != null
                      ? `${formatNumber(row.valuation.close)}원`
                      : '—'}
                  </td>

                  {/* 시가총액 */}
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                    {row.valuation?.market_cap != null
                      ? formatMarketCap(row.valuation.market_cap)
                      : '—'}
                  </td>

                  {/* PER */}
                  <td className="px-3 py-2.5 text-right">
                    {row.valuation?.per != null && row.valuation.per > 0 ? (
                      <ValueBadge
                        grade={getPERGrade(row.valuation.per)}
                        value={row.valuation.per}
                        metric="PER"
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* PBR */}
                  <td className="px-3 py-2.5 text-right">
                    {row.valuation?.pbr != null ? (
                      <ValueBadge
                        grade={getPBRGrade(row.valuation.pbr)}
                        value={row.valuation.pbr}
                        metric="PBR"
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* EPS */}
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                    {row.valuation?.eps != null ? formatNumber(row.valuation.eps) : '—'}
                  </td>

                  {/* BPS */}
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                    {row.valuation?.bps != null ? formatNumber(row.valuation.bps) : '—'}
                  </td>

                  {/* 배당수익률 */}
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {row.valuation?.dividend_yield != null
                      ? formatPercent(row.valuation.dividend_yield)
                      : '—'}
                  </td>

                  {/* ETF 수 배지 */}
                  <td className="px-3 py-2.5">
                    {row.etfCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        <Building2 className="h-3 w-3" />
                        {row.etfCount}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── 페이지네이션 ──────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/20">
          <span className="text-xs text-muted-foreground tabular-nums">
            {start + 1}–{Math.min(start + pageSize, rows.length)}{' '}
            <span className="text-muted-foreground/60">/ 총 {rows.length}개</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-md px-2.5 py-1 text-xs border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              이전
            </button>
            {pageNumbers.map((p, idx) =>
              p === '...' ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1 text-xs text-muted-foreground"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p as number)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs border transition-colors',
                    page === p
                      ? 'bg-foreground text-background border-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => onPageChange(page + 1)}
              className="rounded-md px-2.5 py-1 text-xs border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
