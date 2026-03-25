import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatPercent,
  formatMarketCap,
  getGradeColor,
} from '@/lib/valuation-utils';
import { getPERGrade, getPBRGrade } from '@/constants/valuation-thresholds';

// ──────────────────────────────────────────────
// getPERGrade
// ──────────────────────────────────────────────
describe('getPERGrade', () => {
  it('null이면 fair', () => {
    expect(getPERGrade(null)).toBe('fair');
  });

  it('음수 PER(적자 기업)은 fair', () => {
    expect(getPERGrade(-5)).toBe('fair');
  });

  it('0이면 fair', () => {
    expect(getPERGrade(0)).toBe('fair');
  });

  it('PER < 8이면 undervalued', () => {
    expect(getPERGrade(5)).toBe('undervalued');
    expect(getPERGrade(7.9)).toBe('undervalued');
  });

  it('PER = 8이면 fair (경계: 미만 조건)', () => {
    expect(getPERGrade(8)).toBe('fair');
  });

  it('8 ≤ PER ≤ 20이면 fair', () => {
    expect(getPERGrade(12)).toBe('fair');
    expect(getPERGrade(20)).toBe('fair');
  });

  it('PER > 20이면 overvalued', () => {
    expect(getPERGrade(20.1)).toBe('overvalued');
    expect(getPERGrade(50)).toBe('overvalued');
  });
});

// ──────────────────────────────────────────────
// getPBRGrade
// ──────────────────────────────────────────────
describe('getPBRGrade', () => {
  it('null이면 fair', () => {
    expect(getPBRGrade(null)).toBe('fair');
  });

  it('PBR < 0.8이면 undervalued', () => {
    expect(getPBRGrade(0.5)).toBe('undervalued');
    expect(getPBRGrade(0.79)).toBe('undervalued');
  });

  it('PBR = 0.8이면 fair', () => {
    expect(getPBRGrade(0.8)).toBe('fair');
  });

  it('0.8 ≤ PBR ≤ 2.0이면 fair', () => {
    expect(getPBRGrade(1.2)).toBe('fair');
    expect(getPBRGrade(2.0)).toBe('fair');
  });

  it('PBR > 2.0이면 overvalued', () => {
    expect(getPBRGrade(2.1)).toBe('overvalued');
    expect(getPBRGrade(5)).toBe('overvalued');
  });
});

// ──────────────────────────────────────────────
// getGradeColor
// ──────────────────────────────────────────────
describe('getGradeColor', () => {
  it('undervalued — 파란색 클래스 포함', () => {
    const cls = getGradeColor('undervalued');
    expect(cls).toContain('blue');
  });

  it('fair — 회색 클래스 포함', () => {
    const cls = getGradeColor('fair');
    expect(cls).toContain('gray');
  });

  it('overvalued — 빨간색 클래스 포함', () => {
    const cls = getGradeColor('overvalued');
    expect(cls).toContain('red');
  });
});

// ──────────────────────────────────────────────
// formatNumber
// ──────────────────────────────────────────────
describe('formatNumber', () => {
  it('천 단위 콤마', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('세 자리 이하는 콤마 없음', () => {
    expect(formatNumber(999)).toBe('999');
  });

  it('0', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

// ──────────────────────────────────────────────
// formatPercent
// ──────────────────────────────────────────────
describe('formatPercent', () => {
  it('소수점 2자리 % 포맷', () => {
    expect(formatPercent(12.345)).toBe('12.35%');
  });

  it('정수도 소수점 2자리', () => {
    expect(formatPercent(5)).toBe('5.00%');
  });

  it('음수 퍼센트', () => {
    expect(formatPercent(-3.1)).toBe('-3.10%');
  });
});

// ──────────────────────────────────────────────
// formatMarketCap
// ──────────────────────────────────────────────
describe('formatMarketCap', () => {
  it('1조 이상 → X.X조', () => {
    expect(formatMarketCap(1_500_000_000_000)).toBe('1.5조');
  });

  it('정확히 1조', () => {
    expect(formatMarketCap(1_000_000_000_000)).toBe('1.0조');
  });

  it('100억 이상 1조 미만 → XX억', () => {
    expect(formatMarketCap(500_000_000_000)).toBe('5000억');
  });

  it('100억 단위 → 정수 억', () => {
    expect(formatMarketCap(100_000_000_000)).toBe('1000억');
  });

  it('1억 이상 → 억 단위', () => {
    expect(formatMarketCap(5_000_000_000)).toBe('50억');
  });

  it('1억 미만 → 천 단위 숫자', () => {
    expect(formatMarketCap(50_000_000)).toBe('50,000,000');
  });
});
