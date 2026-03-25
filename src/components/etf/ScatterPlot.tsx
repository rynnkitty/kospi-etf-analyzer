'use client';

/**
 * ETF 보유종목 PER/PBR 분포 스캐터 차트
 * - X축: PBR, Y축: PER
 * - 점 크기: 보유 비중 비례
 * - 각 점 위에 종목명 라벨
 * - 저평가/적정/고평가 구간 배경색 표시
 */

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { useTheme } from 'next-themes';
import { PER_THRESHOLDS, PBR_THRESHOLDS } from '@/constants/valuation-thresholds';
import type { HoldingRow } from './HoldingsTable';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface ScatterPoint {
  x: number; // PBR
  y: number; // PER
  z: number; // weight (비중, %)
  name: string;
  ticker: string;
}

interface ScatterPlotProps {
  holdings: HoldingRow[];
}

// ─── 커스텀 도트 + 종목명 라벨 ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot(props: any) {
  const { cx, cy, payload, isDark } = props as { cx: number; cy: number; payload: ScatterPoint; isDark: boolean };
  if (cx === undefined || cy === undefined) return null;
  // 비중 비례 반지름 (최소 4px, 최대 14px)
  const r = Math.max(4, Math.min(14, Math.sqrt(payload.z) * 2.8));
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="#8b5cf6"
        fillOpacity={0.75}
        stroke="#7c3aed"
        strokeWidth={1}
      />
      <text
        x={cx}
        y={cy - r - 4}
        textAnchor="middle"
        fontSize={9}
        fill={isDark ? '#9ca3af' : '#6b7280'}
      >
        {payload.name}
      </text>
    </g>
  );
}

// ─── 커스텀 툴팁 ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ScatterPoint;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md space-y-1">
      <p className="font-semibold">
        {d.name} <span className="text-muted-foreground">({d.ticker})</span>
      </p>
      <p>PBR: <span className="tabular-nums font-medium">{d.x.toFixed(2)}</span></p>
      <p>PER: <span className="tabular-nums font-medium">{d.y.toFixed(1)}</span></p>
      <p>비중: <span className="tabular-nums font-medium">{d.z.toFixed(2)}%</span></p>
    </div>
  );
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function ScatterPlot({ holdings }: ScatterPlotProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const points: ScatterPoint[] = holdings
    .filter((h) => h.per !== null && h.pbr !== null && h.per > 0)
    .map((h) => ({
      x: h.pbr as number,
      y: h.per as number,
      z: h.weight,
      name: h.name,
      ticker: h.ticker,
    }));

  if (points.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        차트에 표시할 PER/PBR 데이터가 없습니다.
      </p>
    );
  }

  return (
    <div className="h-[260px] sm:h-[340px] lg:h-[400px]">
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 24, right: 32, bottom: 32, left: 16 }}>
        {/* ── 배경 구간 ── */}
        {/* 저평가: 하단 좌측 (PBR < 0.8, PER < 8) */}
        <ReferenceArea
          x1={0}
          x2={PBR_THRESHOLDS.UNDERVALUED_MAX}
          y1={0}
          y2={PER_THRESHOLDS.UNDERVALUED_MAX}
          fill={isDark ? '#1e3a5f' : '#bfdbfe'}
          fillOpacity={isDark ? 0.5 : 0.35}
          label={{ value: '저평가', position: 'insideBottomLeft', fontSize: 10, fill: isDark ? '#60a5fa' : '#3b82f6', offset: 6 }}
        />
        {/* 고평가 (고 PBR): 우측 절반 */}
        <ReferenceArea
          x1={PBR_THRESHOLDS.OVERVALUED_MIN}
          fill={isDark ? '#4c1d1d' : '#fee2e2'}
          fillOpacity={isDark ? 0.5 : 0.3}
        />
        {/* 고평가 (고 PER): 상단 절반 */}
        <ReferenceArea
          y1={PER_THRESHOLDS.OVERVALUED_MIN}
          fill={isDark ? '#4c1d1d' : '#fee2e2'}
          fillOpacity={isDark ? 0.5 : 0.3}
          label={{ value: '고평가', position: 'insideTopRight', fontSize: 10, fill: isDark ? '#f87171' : '#ef4444', offset: 6 }}
        />

        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />

        <XAxis
          type="number"
          dataKey="x"
          name="PBR"
          tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
          label={{ value: 'PBR', position: 'insideBottom', offset: -16, fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
          domain={['auto', 'auto']}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="PER"
          tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
          label={{ value: 'PER', angle: -90, position: 'insideLeft', offset: 8, fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
          domain={['auto', 'auto']}
        />

        {/* ── 기준선 ── */}
        <ReferenceLine
          x={PBR_THRESHOLDS.UNDERVALUED_MAX}
          stroke={isDark ? '#64748b' : '#94a3b8'}
          strokeDasharray="4 4"
          strokeWidth={1}
        />
        <ReferenceLine
          x={PBR_THRESHOLDS.OVERVALUED_MIN}
          stroke={isDark ? '#64748b' : '#94a3b8'}
          strokeDasharray="4 4"
          strokeWidth={1}
        />
        <ReferenceLine
          y={PER_THRESHOLDS.UNDERVALUED_MAX}
          stroke={isDark ? '#64748b' : '#94a3b8'}
          strokeDasharray="4 4"
          strokeWidth={1}
        />
        <ReferenceLine
          y={PER_THRESHOLDS.OVERVALUED_MIN}
          stroke={isDark ? '#64748b' : '#94a3b8'}
          strokeDasharray="4 4"
          strokeWidth={1}
        />

        <Tooltip content={<CustomTooltip />} />
        <Scatter data={points} shape={<CustomDot isDark={isDark} />} />
      </ScatterChart>
    </ResponsiveContainer>
    </div>
  );
}
