'use client';

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from 'next-themes';
import { SECTOR_MAP } from '@/constants/sectors';
import type { SectorStats } from '@/app/page';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface SectorCompareChartProps {
  data: SectorStats[];
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function SectorCompareChart({ data }: SectorCompareChartProps) {
  const { resolvedTheme } = useTheme();
  const tickColor = resolvedTheme === 'dark' ? '#9ca3af' : '#6b7280';

  const chartData = data.map((s) => ({
    name: SECTOR_MAP[s.sector_code]?.name ?? s.sector_code,
    per: s.avg_per !== null ? +s.avg_per.toFixed(1) : null,
    pbr: s.avg_pbr !== null ? +s.avg_pbr.toFixed(2) : null,
    colorHex: SECTOR_MAP[s.sector_code]?.colorHex ?? '#888888',
  }));

  return (
    <div className="h-[200px] sm:h-[280px] lg:h-[320px]">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 5, right: 40, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: tickColor }}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={50}
        />
        <YAxis
          yAxisId="left"
          orientation="left"
          tick={{ fontSize: 11, fill: tickColor }}
          label={{ value: 'PER', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: tickColor } }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11, fill: tickColor }}
          label={{ value: 'PBR', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: tickColor } }}
        />
        <Tooltip
          formatter={(value, name) => {
            const num = typeof value === 'number' ? value : null;
            const label = String(name).toUpperCase();
            return [num !== null ? num.toFixed(name === 'pbr' ? 2 : 1) : '-', label];
          }}
        />
        <Legend />

        {/* PER — 섹터 고유 색상 */}
        <Bar yAxisId="left" dataKey="per" name="PER" maxBarSize={32}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.colorHex} />
          ))}
        </Bar>

        {/* PBR — 섹터 고유 색상 (반투명) */}
        <Bar yAxisId="right" dataKey="pbr" name="PBR" maxBarSize={32}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.colorHex} fillOpacity={0.45} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}
