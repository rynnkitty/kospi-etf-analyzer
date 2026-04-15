'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useStockHistory, type PeriodType, type StockSnapshot } from '@/hooks/useStockHistory';
import { useValuation } from '@/hooks/useValuation';
import { formatNumber, formatMarketCap } from '@/lib/valuation-utils';
import { cn } from '@/lib/utils';

// ─── 지표 정의 ────────────────────────────────────────────────────────────────

interface MetricDef {
  key: keyof Omit<StockSnapshot, 'date'>;
  label: string;
  unit: string;
  color: string;
  format: (v: number) => string;
}

const METRICS: MetricDef[] = [
  { key: 'close', label: '종가', unit: '원', color: '#3b82f6', format: (v) => `${formatNumber(v)}원` },
  { key: 'per', label: 'PER', unit: '배', color: '#8b5cf6', format: (v) => `${v.toFixed(2)}배` },
  { key: 'pbr', label: 'PBR', unit: '배', color: '#06b6d4', format: (v) => `${v.toFixed(2)}배` },
  { key: 'eps', label: 'EPS', unit: '원', color: '#10b981', format: (v) => `${formatNumber(v)}원` },
  { key: 'bps', label: 'BPS', unit: '원', color: '#f59e0b', format: (v) => `${formatNumber(v)}원` },
  { key: 'roe', label: 'ROE', unit: '%', color: '#ef4444', format: (v) => `${v.toFixed(2)}%` },
  { key: 'debt_ratio', label: '부채비율', unit: '%', color: '#f97316', format: (v) => `${v.toFixed(1)}%` },
  { key: 'dividend_yield', label: '배당수익률', unit: '%', color: '#84cc16', format: (v) => `${v.toFixed(2)}%` },
  { key: 'market_cap', label: '시가총액', unit: '원', color: '#6366f1', format: (v) => formatMarketCap(v) },
];

// ─── 기간 버튼 ────────────────────────────────────────────────────────────────

const PERIODS: { value: PeriodType; label: string }[] = [
  { value: 'daily', label: '일' },
  { value: 'weekly', label: '주' },
  { value: 'monthly', label: '월' },
  { value: 'yearly', label: '년' },
];

// ─── 커스텀 툴팁 ──────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  metric: MetricDef;
}) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold text-foreground">{metric.format(val)}</p>
    </div>
  );
}

// ─── 변화율 배지 ──────────────────────────────────────────────────────────────

function ChangeBadge({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null || previous === 0) return <span className="text-muted-foreground">—</span>;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.01) return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" /> 0.00%
    </span>
  );
  return pct > 0 ? (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-500">
      <TrendingUp className="h-3 w-3" /> +{pct.toFixed(2)}%
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-blue-500">
      <TrendingDown className="h-3 w-3" /> {pct.toFixed(2)}%
    </span>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function StockDetailClient({ ticker }: { ticker: string }) {
  const router = useRouter();

  const PAGE_SIZE = 20;

  const [period, setPeriod] = useState<PeriodType>('daily');
  const [selectedMetric, setSelectedMetric] = useState<MetricDef>(METRICS[0]);
  const [page, setPage] = useState(0);

  const { history, isLoading, error } = useStockHistory(ticker, period);
  const { valuation } = useValuation();

  // 기간 변경 시 페이지 초기화
  useEffect(() => { setPage(0); }, [period]);

  // 최신 종목 정보
  const stockInfo = valuation?.stocks?.[ticker];
  const stockName = stockInfo?.name ?? ticker;

  // 차트 데이터 (선택된 지표만)
  const chartData = useMemo(
    () =>
      history
        .map((snap) => ({
          date: snap.date,
          value: snap[selectedMetric.key] as number | null,
        }))
        .filter((d) => d.value !== null),
    [history, selectedMetric]
  );

  // 최신/직전 값 (변화율 계산용)
  const latest = chartData[chartData.length - 1]?.value ?? null;
  const previous = chartData[chartData.length - 2]?.value ?? null;

  // 테이블용: 최신순 정렬 + 페이지네이션
  const reversedHistory = useMemo(() => [...history].reverse(), [history]);
  const totalPages = Math.ceil(reversedHistory.length / PAGE_SIZE);
  const pagedHistory = useMemo(
    () => reversedHistory.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [reversedHistory, page, PAGE_SIZE]
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">

        {/* ── 헤더 ── */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-md p-1.5 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold leading-tight">{stockName}</h1>
            <p className="text-xs text-muted-foreground font-mono">{ticker}</p>
          </div>
          {stockInfo && (
            <span className={cn(
              'ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium text-white',
              stockInfo.market === 'KOSDAQ' ? 'bg-emerald-600' : 'bg-blue-600'
            )}>
              {stockInfo.market}
            </span>
          )}
        </div>

        {/* ── 기간 선택 버튼 ── */}
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors border',
                period === p.value
                  ? 'bg-foreground text-background border-foreground'
                  : 'hover:bg-muted border-border text-muted-foreground'
              )}
            >
              {p.label}
            </button>
          ))}
          <span className="ml-auto self-center text-xs text-muted-foreground">
            {period === 'daily' && '최근 30일'}
            {period === 'weekly' && '최근 12주'}
            {period === 'monthly' && '최근 12개월'}
            {period === 'yearly' && '전체 기간'}
          </span>
        </div>

        {/* ── 지표 선택 탭 ── */}
        <div className="flex flex-wrap gap-2">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setSelectedMetric(m)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors border',
                selectedMetric.key === m.key
                  ? 'text-white border-transparent'
                  : 'hover:bg-muted border-border text-muted-foreground'
              )}
              style={selectedMetric.key === m.key ? { backgroundColor: m.color } : {}}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* ── 로딩 / 에러 / 데이터 없음 ── */}
        {isLoading && (
          <div className="flex h-64 items-center justify-center rounded-xl border bg-card">
            <p className="text-sm text-muted-foreground animate-pulse">데이터 로딩 중...</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="flex h-64 items-center justify-center rounded-xl border bg-card">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!isLoading && !error && chartData.length === 0 && (
          <div className="flex h-64 items-center justify-center rounded-xl border bg-card">
            <p className="text-sm text-muted-foreground">이 기간의 히스토리 데이터가 없습니다.</p>
          </div>
        )}

        {!isLoading && !error && chartData.length > 0 && (
          <>
            {/* ── 현재값 + 변화율 요약 ── */}
            <div className="rounded-xl border bg-card px-5 py-4 flex items-center gap-6">
              <div>
                <p className="text-xs text-muted-foreground">{selectedMetric.label}</p>
                <p className="text-2xl font-bold tabular-nums">
                  {latest != null ? selectedMetric.format(latest) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">전기 대비</p>
                <ChangeBadge current={latest} previous={previous} />
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground">데이터 포인트</p>
                <p className="text-sm font-medium">{chartData.length}개</p>
              </div>
            </div>

            {/* ── 라인 차트 ── */}
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground">
                {selectedMetric.label} 추이
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tickFormatter={(v: number) => {
                      if (selectedMetric.key === 'market_cap') return formatMarketCap(v);
                      if (selectedMetric.key === 'close' || selectedMetric.key === 'eps' || selectedMetric.key === 'bps') return formatNumber(v);
                      return v.toFixed(1);
                    }}
                  />
                  <Tooltip content={<CustomTooltip metric={selectedMetric} />} />
                  {(selectedMetric.key === 'per' || selectedMetric.key === 'pbr') && (
                    <ReferenceLine
                      y={selectedMetric.key === 'per' ? 15 : 1}
                      stroke={selectedMetric.color}
                      strokeDasharray="4 2"
                      strokeOpacity={0.4}
                      label={{ value: selectedMetric.key === 'per' ? 'PER 15' : 'PBR 1', fontSize: 9, fill: selectedMetric.color }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={selectedMetric.color}
                    strokeWidth={2}
                    dot={chartData.length <= 30 ? { r: 3, fill: selectedMetric.color } : false}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* ── 히스토리 테이블 ── */}
            <div className="rounded-xl border bg-card overflow-hidden">
              {/* 헤더 */}
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <h3 className="text-sm font-semibold">기간별 데이터</h3>
                <span className="text-xs text-muted-foreground">
                  전체 {reversedHistory.length}개
                  {totalPages > 1 && ` · ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, reversedHistory.length)}번째`}
                </span>
              </div>

              {/* 가로 스크롤 테이블 */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="sticky left-0 z-10 bg-muted/20 px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap border-r border-border">
                        날짜
                      </th>
                      {METRICS.map((m) => (
                        <th
                          key={m.key}
                          className={cn(
                            'px-3 py-2.5 text-right font-medium whitespace-nowrap',
                            selectedMetric.key === m.key
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          )}
                          style={selectedMetric.key === m.key ? { color: m.color } : {}}
                        >
                          {m.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedHistory.map((snap, idx) => {
                      const prevSnap = reversedHistory[page * PAGE_SIZE + idx + 1] ?? null;
                      return (
                        <tr
                          key={snap.date}
                          className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                        >
                          <td className="sticky left-0 z-10 bg-card px-4 py-2.5 font-mono text-muted-foreground whitespace-nowrap border-r border-border/50">
                            {snap.date}
                          </td>
                          {METRICS.map((m) => {
                            const val = snap[m.key] as number | null;
                            const prevVal = prevSnap ? (prevSnap[m.key] as number | null) : null;
                            return (
                              <td
                                key={m.key}
                                className={cn(
                                  'px-3 py-2.5 text-right whitespace-nowrap align-top',
                                  selectedMetric.key === m.key && 'bg-muted/10'
                                )}
                              >
                                <div className="font-semibold tabular-nums text-foreground">
                                  {val != null ? m.format(val) : <span className="text-muted-foreground/40">—</span>}
                                </div>
                                {val != null && prevVal != null && (
                                  <ChangeBadge current={val} previous={prevVal} />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t flex items-center justify-between bg-muted/10">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
                  >
                    <ChevronLeft className="h-3 w-3" /> 이전
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={cn(
                          'w-7 h-7 rounded text-xs font-medium transition-colors',
                          i === page
                            ? 'bg-foreground text-background'
                            : 'hover:bg-muted text-muted-foreground'
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page === totalPages - 1}
                    className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
                  >
                    다음 <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── 면책 고지 ── */}
        <p className="text-xs text-muted-foreground text-center pb-4">
          * 데이터는 매일 KST 18:00 기준으로 자동 수집됩니다. 투자 결정 전 직접 확인하세요.
        </p>
      </div>
    </div>
  );
}
