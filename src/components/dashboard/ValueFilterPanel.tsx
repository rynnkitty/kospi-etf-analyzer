'use client';

import { useMemo, useState } from 'react';
import type { ScatterPoint } from '@/app/page';
import { ValueBadge } from '@/components/common/ValueBadge';
import { getPERGrade, getPBRGrade } from '@/lib/valuation-utils';
import { SECTOR_MAP } from '@/constants/sectors';
import { KOSDAQ_SECTOR_MAP } from '@/constants/kosdaq-sectors';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface ValueCandidate {
  rank: number;
  ticker: string;
  name: string;
  sector_code: string;
  per: number;
  pbr: number;
  graham: number;   // PER × PBR
  score: number;    // 복합 점수 (낮을수록 좋음)
  close: number;
  dividend_yield: number | null;
  roe: number | null;
  debt_ratio: number | null;
}

interface ValueFilterPanelProps {
  points: ScatterPoint[];
  /** kosdaq: 절대 기준 없이 상대 순위로 TOP 10 선정 */
  variant?: 'kospi' | 'kosdaq';
}

// ─── 필터 기준 상수 ───────────────────────────────────────────────────────────

const KOSPI_FILTER = {
  PER_MIN: 0.5,
  PER_MAX: 10,
  PBR_MIN: 0.1,
  PBR_MAX: 1.0,
  GRAHAM_MAX: 22.5,   // Benjamin Graham: PER × PBR ≤ 22.5
} as const;

const TOP_N = 10;

// ─── 필터링 + 스코어링 함수 ───────────────────────────────────────────────────

function computeKospiCandidates(points: ScatterPoint[]): ValueCandidate[] {
  // 유효한 종목 (PER > 0, PBR > 0)
  const valid = points.filter((p) => p.per > 0 && p.pbr > 0);

  // 전체 종목 기준 백분위 계산용 정렬
  const perSorted = [...valid].sort((a, b) => a.per - b.per);
  const pbrSorted = [...valid].sort((a, b) => a.pbr - b.pbr);
  const total = valid.length;

  const perRankMap = new Map<string, number>();
  const pbrRankMap = new Map<string, number>();
  perSorted.forEach((p, i) => perRankMap.set(p.ticker, (i / (total - 1)) * 100));
  pbrSorted.forEach((p, i) => pbrRankMap.set(p.ticker, (i / (total - 1)) * 100));

  // 필터링
  const filtered = valid.filter(
    (p) =>
      p.per > KOSPI_FILTER.PER_MIN &&
      p.per < KOSPI_FILTER.PER_MAX &&
      p.pbr > KOSPI_FILTER.PBR_MIN &&
      p.pbr < KOSPI_FILTER.PBR_MAX &&
      p.per * p.pbr <= KOSPI_FILTER.GRAHAM_MAX
  );

  // 복합 점수 계산 (PER 백분위 50% + PBR 백분위 50%)
  const candidates: ValueCandidate[] = filtered.map((p) => ({
    rank: 0,
    ticker: p.ticker,
    name: p.name,
    sector_code: p.sector_code,
    per: p.per,
    pbr: p.pbr,
    graham: parseFloat((p.per * p.pbr).toFixed(2)),
    score: 0.5 * (perRankMap.get(p.ticker) ?? 50) + 0.5 * (pbrRankMap.get(p.ticker) ?? 50),
    close: p.close,
    dividend_yield: p.dividend_yield,
    roe: p.roe,
    debt_ratio: p.debt_ratio,
  }));

  // 점수 오름차순 정렬 → TOP N
  candidates.sort((a, b) => a.score - b.score);
  const top = candidates.slice(0, TOP_N);
  top.forEach((c, i) => { c.rank = i + 1; });

  return top;
}

/** KOSDAQ: 절대 기준 없이 PER·PBR 상대 백분위 기준으로 TOP N 선정 */
function computeKosdaqCandidates(points: ScatterPoint[]): ValueCandidate[] {
  // 유효한 종목 (PER > 0, PBR > 0)
  const valid = points.filter((p) => p.per > 0 && p.pbr > 0);
  if (valid.length === 0) return [];

  const total = valid.length;
  const perSorted = [...valid].sort((a, b) => a.per - b.per);
  const pbrSorted = [...valid].sort((a, b) => a.pbr - b.pbr);

  const perRankMap = new Map<string, number>();
  const pbrRankMap = new Map<string, number>();
  perSorted.forEach((p, i) => perRankMap.set(p.ticker, total > 1 ? (i / (total - 1)) * 100 : 0));
  pbrSorted.forEach((p, i) => pbrRankMap.set(p.ticker, total > 1 ? (i / (total - 1)) * 100 : 0));

  const candidates: ValueCandidate[] = valid.map((p) => ({
    rank: 0,
    ticker: p.ticker,
    name: p.name,
    sector_code: p.sector_code,
    per: p.per,
    pbr: p.pbr,
    graham: parseFloat((p.per * p.pbr).toFixed(2)),
    score: 0.5 * (perRankMap.get(p.ticker) ?? 50) + 0.5 * (pbrRankMap.get(p.ticker) ?? 50),
    close: p.close,
    dividend_yield: p.dividend_yield,
    roe: p.roe,
    debt_ratio: p.debt_ratio,
  }));

  candidates.sort((a, b) => a.score - b.score);
  const top = candidates.slice(0, TOP_N);
  top.forEach((c, i) => { c.rank = i + 1; });

  return top;
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function ValueFilterPanel({ points, variant = 'kospi' }: ValueFilterPanelProps) {
  const [showInfo, setShowInfo] = useState(false);

  const candidates = useMemo(
    () => variant === 'kosdaq' ? computeKosdaqCandidates(points) : computeKospiCandidates(points),
    [points, variant]
  );

  if (candidates.length === 0) {
    return null;
  }

  const isKosdaq = variant === 'kosdaq';

  return (
    <section>
      {/* 헤더 */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            {isKosdaq ? '상대 저평가 TOP' : '가치주 후보 TOP'} {TOP_N}
            <span className={
              isKosdaq
                ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'
                : 'rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700'
            }>
              {isKosdaq ? '상대 순위' : '자동 필터'}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isKosdaq
              ? 'KOSDAQ 종목 내 상대적으로 PER·PBR이 낮은 상위 ' + TOP_N + '개 (성장주 특성상 절대 기준 미적용)'
              : 'PER 0.5–10 · PBR 0.1–1.0 · 그레이엄 조건(PER×PBR ≤ 22.5) 동시 충족 종목 · 복합점수 기준 상위 ' + TOP_N + '개'
            }
          </p>
        </div>
        <button
          onClick={() => setShowInfo((v) => !v)}
          className="shrink-0 rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          {showInfo ? '설명 닫기' : '기준 보기'}
        </button>
      </div>

      {/* 기준 설명 패널 */}
      {showInfo && (
        <div className="mb-4 rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
          {isKosdaq ? (
            <>
              <p><span className="font-medium text-foreground">상대 순위</span> — KOSDAQ 바이오·미디어는 성장주 특성상 PER·PBR 절대값이 높습니다. 이 목록은 절대 가치주 기준 대신, 동일 KOSDAQ 보유종목 내에서 상대적으로 PER·PBR이 낮은 종목을 선별합니다.</p>
              <p><span className="font-medium text-foreground">복합점수</span> — PER·PBR 각 50% 가중 백분위 합산, 낮을수록 상대적으로 저평가</p>
            </>
          ) : (
            <>
              <p><span className="font-medium text-foreground">저PER</span> — 0.5 &lt; PER &lt; 10: 수익 대비 저평가</p>
              <p><span className="font-medium text-foreground">저PBR</span> — 0.1 &lt; PBR &lt; 1.0: 자산 대비 저평가 (장부가 이하)</p>
              <p><span className="font-medium text-foreground">그레이엄 조건</span> — PER × PBR ≤ 22.5: 두 지표 동시 고려 (벤자민 그레이엄 기준)</p>
              <p><span className="font-medium text-foreground">복합점수</span> — PER·PBR 각 50% 가중 백분위 합산, 낮을수록 더 저평가</p>
            </>
          )}
        </div>
      )}

      {/* 테이블 */}
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-8">#</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">종목명</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">섹터</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">현재가</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">PER</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">PBR</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">PER×PBR</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">ROE</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">부채비율</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">배당률</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">복합점수</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => {
              const sector = SECTOR_MAP[c.sector_code] ?? KOSDAQ_SECTOR_MAP[c.sector_code];
              return (
                <tr key={c.ticker} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  {/* 순위 */}
                  <td className="px-3 py-2.5">
                    <span
                      className={
                        c.rank <= 3
                          ? 'inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold bg-blue-600 text-white'
                          : 'text-xs text-muted-foreground'
                      }
                    >
                      {c.rank}
                    </span>
                  </td>

                  {/* 종목명 */}
                  <td className="px-3 py-2.5">
                    <p className="font-medium leading-tight">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.ticker}</p>
                  </td>

                  {/* 섹터 */}
                  <td className="px-3 py-2.5">
                    {sector ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: sector.colorHex }}
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{sector.name}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>

                  {/* 현재가 */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-xs tabular-nums">
                      {c.close.toLocaleString('ko-KR')}원
                    </span>
                  </td>

                  {/* PER */}
                  <td className="px-3 py-2.5 text-right">
                    <ValueBadge grade={getPERGrade(c.per)} value={c.per} metric="PER" />
                  </td>

                  {/* PBR */}
                  <td className="px-3 py-2.5 text-right">
                    <ValueBadge grade={getPBRGrade(c.pbr)} value={c.pbr} metric="PBR" />
                  </td>

                  {/* 그레이엄 수 */}
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={
                        c.graham <= 10
                          ? 'text-xs font-semibold text-blue-600'
                          : c.graham <= 22.5
                          ? 'text-xs text-emerald-600'
                          : 'text-xs text-muted-foreground'
                      }
                    >
                      {c.graham.toFixed(1)}
                    </span>
                  </td>

                  {/* ROE */}
                  <td className="px-3 py-2.5 text-right">
                    {c.roe != null ? (
                      <span
                        className={
                          c.roe >= 15
                            ? 'text-xs font-medium text-emerald-600'
                            : c.roe >= 8
                            ? 'text-xs text-foreground'
                            : 'text-xs text-muted-foreground'
                        }
                      >
                        {c.roe.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>

                  {/* 부채비율 */}
                  <td className="px-3 py-2.5 text-right">
                    {c.debt_ratio != null ? (
                      <span
                        className={
                          c.debt_ratio > 200
                            ? 'text-xs font-medium text-red-500'
                            : c.debt_ratio > 100
                            ? 'text-xs text-amber-600'
                            : 'text-xs text-muted-foreground'
                        }
                      >
                        {c.debt_ratio.toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>

                  {/* 배당률 */}
                  <td className="px-3 py-2.5 text-right">
                    {c.dividend_yield != null && c.dividend_yield > 0 ? (
                      <span
                        className={
                          c.dividend_yield >= 2
                            ? 'text-xs font-medium text-emerald-600'
                            : 'text-xs text-muted-foreground'
                        }
                      >
                        {c.dividend_yield.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>

                  {/* 복합점수 */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {c.score.toFixed(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        * 이 목록은 단순 수치 필터링 결과입니다. 투자 결정 전 재무제표, 사업성, 거래량 등을 반드시 직접 확인하세요.
      </p>
    </section>
  );
}
