/**
 * 밸류에이션 관련 유틸리티 함수 모음
 * - 등급 판정은 constants/valuation-thresholds.ts의 기준값을 사용
 * - 숫자 포맷 헬퍼 (천 단위, %, 억/조 단위 등)
 */

export {
  getPERGrade,
  getPBRGrade,
  GRADE_TEXT_COLOR,
  GRADE_BG_COLOR,
  GRADE_LABEL,
} from '@/constants/valuation-thresholds';

import type { ValuationGrade } from '@/types/stock';
import { GRADE_TEXT_COLOR, GRADE_BG_COLOR } from '@/constants/valuation-thresholds';

/**
 * 등급에 해당하는 Tailwind 텍스트 + 배경 색상 클래스를 반환한다.
 * e.g. "text-blue-600 bg-blue-100"
 */
export function getGradeColor(grade: ValuationGrade): string {
  return `${GRADE_TEXT_COLOR[grade]} ${GRADE_BG_COLOR[grade]}`;
}

/**
 * 숫자에 천 단위 콤마를 추가한다.
 * @example formatNumber(1234567) → "1,234,567"
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR');
}

/**
 * 소수점 2자리 퍼센트 문자열로 변환한다.
 * @example formatPercent(12.345) → "12.35%"
 */
export function formatPercent(n: number): string {
  return `${n.toFixed(2)}%`;
}

/**
 * 시가총액(원)을 억/조 단위 문자열로 변환한다.
 * @example formatMarketCap(1_500_000_000_000) → "1.5조"
 * @example formatMarketCap(50_000_000_000) → "500억"
 */
export function formatMarketCap(n: number): string {
  const 조 = 1_000_000_000_000;
  const 억 = 100_000_000;

  if (Math.abs(n) >= 조) {
    return `${(n / 조).toFixed(1)}조`;
  }
  if (Math.abs(n) >= 억) {
    return `${Math.round(n / 억)}억`;
  }
  return formatNumber(n);
}
