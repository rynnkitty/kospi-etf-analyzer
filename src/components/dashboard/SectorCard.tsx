'use client';

import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ValueBadge } from '@/components/common/ValueBadge';
import { getPERGrade, getPBRGrade } from '@/lib/valuation-utils';
import { SECTOR_MAP } from '@/constants/sectors';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface SectorCardProps {
  sectorCode: string;
  etfCount: number;
  avgPer: number | null;
  avgPbr: number | null;
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function SectorCard({ sectorCode, etfCount, avgPer, avgPbr }: SectorCardProps) {
  const router = useRouter();
  const sector = SECTOR_MAP[sectorCode];
  if (!sector) return null;

  return (
    <Card
      className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-shadow"
      onClick={() => router.push(`/sector/${sectorCode}`)}
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: sector.colorHex }}
          />
          <CardTitle className="text-sm truncate">{sector.name}</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground truncate">{sector.nameEn}</p>
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        <p className="text-xs text-muted-foreground">ETF {etfCount}종</p>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-8 shrink-0">PER</span>
          {avgPer !== null ? (
            <ValueBadge grade={getPERGrade(avgPer)} value={avgPer} metric="PER" />
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-8 shrink-0">PBR</span>
          {avgPbr !== null ? (
            <ValueBadge grade={getPBRGrade(avgPbr)} value={avgPbr} metric="PBR" />
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
