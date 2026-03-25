'use client';

/**
 * ETF 보유종목 테이블
 * - 모든 컬럼 클릭 정렬 지원
 * - PER/PBR 셀에 ValueBadge 색상 코딩
 */

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { ValueBadge } from '@/components/common/ValueBadge';
import { getPERGrade, getPBRGrade } from '@/constants/valuation-thresholds';
import { formatNumber, formatPercent } from '@/lib/valuation-utils';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface HoldingRow {
  rank: number;
  ticker: string;
  name: string;
  weight: number;
  close: number | null;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  bps: number | null;
  dividend_yield: number | null;
}

type SortKey = 'rank' | 'weight' | 'close' | 'per' | 'pbr' | 'eps' | 'bps' | 'dividend_yield';
type SortDir = 'asc' | 'desc';

interface HoldingsTableProps {
  rows: HoldingRow[];
}

// ─── 컬럼 정의 ────────────────────────────────────────────────────────────────

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'rank', label: '순위' },
  { key: 'weight', label: '비중(%)' },
  { key: 'close', label: '현재가' },
  { key: 'per', label: 'PER' },
  { key: 'pbr', label: 'PBR' },
  { key: 'eps', label: 'EPS' },
  { key: 'bps', label: 'BPS' },
  { key: 'dividend_yield', label: '배당(%)' },
];

// ─── 정렬 헬퍼 ────────────────────────────────────────────────────────────────

function sortRows(rows: HoldingRow[], key: SortKey, dir: SortDir): HoldingRow[] {
  return [...rows].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    const diff = (va as number) - (vb as number);
    return dir === 'asc' ? diff : -diff;
  });
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function HoldingsTable({ rows }: HoldingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => sortRows(rows, sortKey, sortDir), [rows, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ colKey }: { colKey: SortKey }) {
    if (sortKey !== colKey) return <ChevronDown className="w-3 h-3 opacity-20 shrink-0" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 shrink-0" />
    ) : (
      <ChevronDown className="w-3 h-3 shrink-0" />
    );
  }

  return (
    <div className="overflow-x-auto">
    <Table className="min-w-[640px]">
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[140px]">종목명</TableHead>
          <TableHead>코드</TableHead>
          {COLUMNS.map(({ key, label }) => (
            <TableHead
              key={key}
              className="cursor-pointer select-none text-right hover:text-foreground"
              onClick={() => handleSort(key)}
            >
              <span className="inline-flex items-center justify-end gap-0.5">
                {label}
                <SortIcon colKey={key} />
              </span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => (
          <TableRow key={row.ticker}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell className="text-muted-foreground tabular-nums text-xs">
              {row.ticker}
            </TableCell>
            {/* 순위 */}
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {row.rank}
            </TableCell>
            {/* 비중 */}
            <TableCell className="text-right tabular-nums">{row.weight.toFixed(2)}%</TableCell>
            {/* 현재가 */}
            <TableCell className="text-right tabular-nums">
              {row.close !== null ? formatNumber(row.close) : '—'}
            </TableCell>
            {/* PER */}
            <TableCell className="text-right">
              {row.per !== null && row.per > 0 ? (
                <ValueBadge grade={getPERGrade(row.per)} value={row.per} metric="PER" />
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </TableCell>
            {/* PBR */}
            <TableCell className="text-right">
              {row.pbr !== null ? (
                <ValueBadge grade={getPBRGrade(row.pbr)} value={row.pbr} metric="PBR" />
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </TableCell>
            {/* EPS */}
            <TableCell className="text-right tabular-nums">
              {row.eps !== null ? formatNumber(row.eps) : '—'}
            </TableCell>
            {/* BPS */}
            <TableCell className="text-right tabular-nums">
              {row.bps !== null ? formatNumber(row.bps) : '—'}
            </TableCell>
            {/* 배당수익률 */}
            <TableCell className="text-right tabular-nums">
              {row.dividend_yield !== null ? formatPercent(row.dividend_yield) : '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}
