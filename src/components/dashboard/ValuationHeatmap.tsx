'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from 'next-themes';
import { SECTORS } from '@/constants/sectors';
import type { ScatterPoint } from '@/app/page';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface ValuationHeatmapProps {
  data: ScatterPoint[];
}

interface TooltipPayloadItem {
  payload: ScatterPoint;
}

// ─── 커스텀 툴팁 ──────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{p.name}</p>
      <p className="text-muted-foreground">PER: {p.per.toFixed(1)}</p>
      <p className="text-muted-foreground">PBR: {p.pbr.toFixed(2)}</p>
    </div>
  );
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function ValuationHeatmap({ data }: ValuationHeatmapProps) {
  const { resolvedTheme } = useTheme();
  const tickColor = resolvedTheme === 'dark' ? '#9ca3af' : '#6b7280';

  // 섹터별 데이터 분리
  const dataByCode = new Map<string, ScatterPoint[]>();
  for (const p of data) {
    const arr = dataByCode.get(p.sector_code) ?? [];
    arr.push(p);
    dataByCode.set(p.sector_code, arr);
  }

  // market_cap → Z축 크기 (로그 스케일 정규화, null은 0 처리)
  const maxCap = Math.max(...data.map((p) => p.market_cap ?? 0), 1);

  const normalizedData = (points: ScatterPoint[]) =>
    points.map((p) => ({
      ...p,
      z: Math.max(10, ((p.market_cap ?? 0) / maxCap) * 1000),
    }));

  return (
    <div className="h-[260px] sm:h-[360px] lg:h-[420px]">
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="pbr"
          name="PBR"
          type="number"
          domain={['auto', 'auto']}
          tick={{ fontSize: 11, fill: tickColor }}
          label={{ value: 'PBR', position: 'insideBottomRight', offset: -10, style: { fontSize: 11, fill: tickColor } }}
        />
        <YAxis
          dataKey="per"
          name="PER"
          type="number"
          domain={[0, 'auto']}
          tick={{ fontSize: 11, fill: tickColor }}
          label={{ value: 'PER', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: tickColor } }}
        />
        <ZAxis dataKey="z" range={[20, 300]} />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        <Legend />

        {SECTORS.map((sector) => {
          const points = dataByCode.get(sector.code);
          if (!points?.length) return null;
          return (
            <Scatter
              key={sector.code}
              name={sector.name}
              data={normalizedData(points)}
              fill={sector.colorHex}
              fillOpacity={0.7}
            />
          );
        })}
      </ScatterChart>
    </ResponsiveContainer>
    </div>
  );
}
