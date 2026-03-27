'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  graham: number;       // PER × PBR
  score: number;        // 복합 점수 (낮을수록 좋음)
  close: number;
  dividend_yield: number | null;
  roe: number | null;
  debt_ratio: number | null;
  warnings: string[];   // 가치 함정 경고 항목 ('ROE' | '부채')
}

interface ValueFilterPanelProps {
  points: ScatterPoint[];
  /** kosdaq: 절대 기준 없이 상대 순위로 TOP 10 선정 */
  variant?: 'kospi' | 'kosdaq';
}

// ─── 필터 기준 상수 ───────────────────────────────────────────────────────────

const KOSPI_FILTER = {
  PER_MIN: 0.5,
  PER_MAX: 15,          // 기획서 기준: PER < 15
  PBR_MIN: 0.1,
  PBR_MAX: 1.0,
  GRAHAM_MAX: 22.5,     // Benjamin Graham: PER × PBR ≤ 22.5
  SECTOR_RATIO: 0.70,   // 업종 평균의 70% 이하 = 상대 저평가
} as const;

const WEIGHTS = { PER: 0.30, PBR: 0.25, ROE: 0.25, SECTOR: 0.20 } as const;

const TOP_N = 10;

// ─── 필터링 + 스코어링 함수 ───────────────────────────────────────────────────

function computeKospiCandidates(points: ScatterPoint[]): ValueCandidate[] {
  // 유효한 종목 (PER > 0, PBR > 0)
  const valid = points.filter((p) => p.per > 0 && p.pbr > 0);
  if (valid.length === 0) return [];

  const total = valid.length;

  // ── 전체 백분위 계산 (낮을수록 낮은 값) ──────────────────────────────────
  const perSorted = [...valid].sort((a, b) => a.per - b.per);
  const pbrSorted = [...valid].sort((a, b) => a.pbr - b.pbr);
  // ROE는 높을수록 좋으므로 내림차순 → 높은 종목 = 낮은 인덱스 = 낮은 백분위(고득점)
  const roeSorted = [...valid]
    .filter((p) => p.roe != null)
    .sort((a, b) => (b.roe as number) - (a.roe as number));
  const roeTotal = roeSorted.length;

  const perRankMap = new Map<string, number>();
  const pbrRankMap = new Map<string, number>();
  const roeRankMap = new Map<string, number>();

  perSorted.forEach((p, i) => perRankMap.set(p.ticker, total > 1 ? (i / (total - 1)) * 100 : 0));
  pbrSorted.forEach((p, i) => pbrRankMap.set(p.ticker, total > 1 ? (i / (total - 1)) * 100 : 0));
  roeSorted.forEach((p, i) => roeRankMap.set(p.ticker, roeTotal > 1 ? (i / (roeTotal - 1)) * 100 : 0));

  // ── 업종 평균 PER/PBR 계산 ────────────────────────────────────────────────
  const sectorGroups = new Map<string, { perSum: number; pbrSum: number; count: number }>();
  for (const p of valid) {
    const g = sectorGroups.get(p.sector_code) ?? { perSum: 0, pbrSum: 0, count: 0 };
    g.perSum += p.per;
    g.pbrSum += p.pbr;
    g.count += 1;
    sectorGroups.set(p.sector_code, g);
  }
  const sectorAvg = new Map<string, { per: number; pbr: number }>();
  sectorGroups.forEach((g, code) => {
    sectorAvg.set(code, { per: g.perSum / g.count, pbr: g.pbrSum / g.count });
  });

  // ── 2단계: 핵심 필터링 (절대 기준 OR 상대 기준) + 3단계: 그레이엄 ──────────
  const filtered = valid.filter((p) => {
    const avg = sectorAvg.get(p.sector_code);
    const absOk =
      p.per > KOSPI_FILTER.PER_MIN &&
      p.per < KOSPI_FILTER.PER_MAX &&
      p.pbr > KOSPI_FILTER.PBR_MIN &&
      p.pbr < KOSPI_FILTER.PBR_MAX;
    const relOk =
      avg != null &&
      (p.per <= avg.per * KOSPI_FILTER.SECTOR_RATIO ||
        p.pbr <= avg.pbr * KOSPI_FILTER.SECTOR_RATIO);
    const grahamOk = p.per * p.pbr <= KOSPI_FILTER.GRAHAM_MAX;
    return (absOk || relOk) && grahamOk;
  });

  // ── 4단계: 복합 스코어링 ──────────────────────────────────────────────────
  // S_SECTOR = 1 - (기업_PER/업종평균_PER + 기업_PBR/업종평균_PBR) / 4  (1에 가까울수록 저평가)
  // 최종 score는 낮을수록 좋음 → S_SECTOR는 (1 - S_SECTOR) 로 변환하여 합산
  const candidates: ValueCandidate[] = filtered.map((p) => {
    const perRank = perRankMap.get(p.ticker) ?? 50;
    const pbrRank = pbrRankMap.get(p.ticker) ?? 50;
    const roeRank = p.roe != null ? (roeRankMap.get(p.ticker) ?? 50) : 50;
    const avg = sectorAvg.get(p.sector_code);
    const sectorScore = avg
      ? 1 - (p.per / avg.per + p.pbr / avg.pbr) / 4
      : 0.5;
    const sectorRank = (1 - sectorScore) * 100; // 낮을수록 더 저평가

    let score =
      WEIGHTS.PER * perRank +
      WEIGHTS.PBR * pbrRank +
      WEIGHTS.ROE * roeRank +
      WEIGHTS.SECTOR * sectorRank;

    // 배당수익률 ≥ 2% → 가점 (점수 차감)
    if (p.dividend_yield != null && p.dividend_yield >= 2) {
      score -= 5;
    }

    const warnings: string[] = [];
    if (p.roe != null && p.roe < 5) warnings.push('ROE');
    if (p.debt_ratio != null && p.debt_ratio > 150) warnings.push('부채');

    return {
      rank: 0,
      ticker: p.ticker,
      name: p.name,
      sector_code: p.sector_code,
      per: p.per,
      pbr: p.pbr,
      graham: parseFloat((p.per * p.pbr).toFixed(2)),
      score,
      close: p.close,
      dividend_yield: p.dividend_yield,
      roe: p.roe,
      debt_ratio: p.debt_ratio,
      warnings,
    };
  });

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

  const candidates: ValueCandidate[] = valid.map((p) => {
    const score = 0.5 * (perRankMap.get(p.ticker) ?? 50) + 0.5 * (pbrRankMap.get(p.ticker) ?? 50);
    const warnings: string[] = [];
    if (p.roe != null && p.roe < 5) warnings.push('ROE');
    if (p.debt_ratio != null && p.debt_ratio > 150) warnings.push('부채');
    return {
      rank: 0,
      ticker: p.ticker,
      name: p.name,
      sector_code: p.sector_code,
      per: p.per,
      pbr: p.pbr,
      graham: parseFloat((p.per * p.pbr).toFixed(2)),
      score,
      close: p.close,
      dividend_yield: p.dividend_yield,
      roe: p.roe,
      debt_ratio: p.debt_ratio,
      warnings,
    };
  });

  candidates.sort((a, b) => a.score - b.score);
  const top = candidates.slice(0, TOP_N);
  top.forEach((c, i) => { c.rank = i + 1; });

  return top;
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function ValueFilterPanel({ points, variant = 'kospi' }: ValueFilterPanelProps) {
  const router = useRouter();
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
              : '절대(PER 0.5–15·PBR 0.1–1.0) 또는 업종 상대 저평가 + 그레이엄(PER×PBR ≤ 22.5) · 복합점수 상위 ' + TOP_N + '개'
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
              <p><span className="font-medium text-foreground">가치 함정 경고</span> — ⚠️ ROE &lt; 5% 또는 부채비율 &gt; 150% 시 경고 표시 (제외하지 않음)</p>
            </>
          ) : (
            <>
              <p><span className="font-medium text-foreground">핵심 필터</span> — <b>절대 기준</b>(PER 0.5–15 · PBR 0.1–1.0) <b>또는 상대 기준</b>(업종 평균 PER·PBR의 70% 이하) 중 하나 이상 충족</p>
              <p><span className="font-medium text-foreground">그레이엄 조건</span> — PER × PBR ≤ 22.5: 두 지표 동시 고려 (벤자민 그레이엄 기준)</p>
              <p><span className="font-medium text-foreground">복합점수</span> — PER 30% + PBR 25% + ROE 25% + 섹터상대 20% 가중 백분위 합산, 낮을수록 저평가</p>
              <p><span className="font-medium text-foreground">배당 가점</span> — 배당수익률 ≥ 2% 시 점수 차감 (우대)</p>
              <p><span className="font-medium text-foreground">가치 함정 경고</span> — ⚠️ ROE &lt; 5% 또는 부채비율 &gt; 150% 시 경고 표시 (제외하지 않음)</p>
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
              <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">경고</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => {
              const sector = SECTOR_MAP[c.sector_code] ?? KOSDAQ_SECTOR_MAP[c.sector_code];
              return (
                <tr key={c.ticker} onClick={() => router.push(`/stocks/${c.ticker}`)} className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer">
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

                  {/* 경고 */}
                  <td className="px-3 py-2.5 text-center">
                    {c.warnings.length > 0 ? (
                      <span
                        title={
                          c.warnings.includes('ROE') && c.warnings.includes('부채')
                            ? 'ROE < 5% · 부채비율 > 150%'
                            : c.warnings.includes('ROE')
                            ? 'ROE < 5% — 수익성 주의'
                            : '부채비율 > 150% — 재무 건전성 주의'
                        }
                        className="text-xs text-amber-500 cursor-help"
                      >
                        ⚠️
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
