'use client';

import { cn } from '@/lib/utils';
import type { ValuationGrade } from '@/types/stock';
import {
  GRADE_LABEL,
  GRADE_TEXT_COLOR,
  GRADE_BG_COLOR,
} from '@/constants/valuation-thresholds';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface ValueBadgeProps {
  grade: ValuationGrade;
  /** 표시할 수치 (없으면 등급 레이블만 표시) */
  value?: number | null;
  /** 지표명 (e.g. "PER", "PBR") — value와 함께 표시됨 */
  metric?: string;
  className?: string;
}

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const GRADE_TOOLTIP: Record<ValuationGrade, string> = {
  undervalued: 'KOSPI 평균 대비 저평가 구간 (PER < 8 또는 PBR < 0.8)',
  fair: '시장 평균 수준의 적정 밸류에이션',
  overvalued: 'KOSPI 평균 대비 고평가 구간 (PER > 20 또는 PBR > 2.0)',
};

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function ValueBadge({ grade, value, metric, className }: ValueBadgeProps) {
  const displayText =
    value != null
      ? `${metric ? `${metric} ` : ''}${value.toFixed(1)}`
      : GRADE_LABEL[grade];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className={cn(
            'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium tabular-nums cursor-default select-none',
            GRADE_TEXT_COLOR[grade],
            GRADE_BG_COLOR[grade],
            className
          )}
          render={<span />}
        >
          {displayText}
        </TooltipTrigger>
        <TooltipContent side="top">
          <span className="font-medium">{GRADE_LABEL[grade]}</span>
          {' — '}
          {GRADE_TOOLTIP[grade]}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
