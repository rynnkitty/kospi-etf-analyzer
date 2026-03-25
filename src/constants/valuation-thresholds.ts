/**
 * PER / PBR 밸류에이션 등급 기준값
 *
 * 기준 근거:
 * - KOSPI 장기 평균 PER ~10~12배, PBR ~1.0~1.2배를 참고
 * - 저평가: 시장 평균 대비 현저히 낮음 (가치투자 매수 관심 구간)
 * - 적정:   시장 평균 수준 (밸류에이션 중립)
 * - 고평가: 시장 평균 대비 현저히 높음 (모멘텀 or 거품 가능성)
 *
 * 섹터별 특성(성장주 IT vs. 가치주 금융 등)이 다르므로
 * 섹터 비교 시에는 섹터 내 상대 등급도 함께 활용한다.
 */

import type { ValuationGrade } from '../types/stock';

/** PER 등급 기준값 */
export const PER_THRESHOLDS = {
  /**
   * 저평가 상한선: PER이 이 값 미만이면 'undervalued'
   * (단, 음수 PER은 적자 기업이므로 별도 처리 필요)
   */
  UNDERVALUED_MAX: 8,
  /**
   * 고평가 하한선: PER이 이 값 초과이면 'overvalued'
   */
  OVERVALUED_MIN: 20,
} as const;

/** PBR 등급 기준값 */
export const PBR_THRESHOLDS = {
  /** 저평가 상한선: PBR이 이 값 미만이면 'undervalued' */
  UNDERVALUED_MAX: 0.8,
  /** 고평가 하한선: PBR이 이 값 초과이면 'overvalued' */
  OVERVALUED_MIN: 2.0,
} as const;

/**
 * PER 값을 받아 밸류에이션 등급을 반환한다.
 *
 * @param per - PER 값 (null 또는 음수이면 'fair' 반환)
 * @returns ValuationGrade
 */
export function getPERGrade(per: number | null): ValuationGrade {
  if (per === null || per <= 0) return 'fair';
  if (per < PER_THRESHOLDS.UNDERVALUED_MAX) return 'undervalued';
  if (per > PER_THRESHOLDS.OVERVALUED_MIN) return 'overvalued';
  return 'fair';
}

/**
 * PBR 값을 받아 밸류에이션 등급을 반환한다.
 *
 * @param pbr - PBR 값 (null이면 'fair' 반환)
 * @returns ValuationGrade
 */
export function getPBRGrade(pbr: number | null): ValuationGrade {
  if (pbr === null) return 'fair';
  if (pbr < PBR_THRESHOLDS.UNDERVALUED_MAX) return 'undervalued';
  if (pbr > PBR_THRESHOLDS.OVERVALUED_MIN) return 'overvalued';
  return 'fair';
}

/** 등급별 Tailwind 텍스트 색상 클래스 */
export const GRADE_TEXT_COLOR: Record<ValuationGrade, string> = {
  undervalued: 'text-blue-600',
  fair: 'text-gray-600',
  overvalued: 'text-red-500',
};

/** 등급별 Tailwind 배경 색상 클래스 (배지용) */
export const GRADE_BG_COLOR: Record<ValuationGrade, string> = {
  undervalued: 'bg-blue-100',
  fair: 'bg-gray-100',
  overvalued: 'bg-red-100',
};

/** 등급별 한국어 레이블 */
export const GRADE_LABEL: Record<ValuationGrade, string> = {
  undervalued: '저평가',
  fair: '적정',
  overvalued: '고평가',
};
