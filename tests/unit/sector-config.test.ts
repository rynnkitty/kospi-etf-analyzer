import { describe, it, expect } from 'vitest';
import { SECTOR_LIST, SECTOR_CODES, SECTOR_MAP } from '@/lib/sector-config';
import { getSectorColor, getSectorColorHex, getSectorName } from '@/lib/sector-config';

const VALID_CODES = ['G10', 'G15', 'G20', 'G25', 'G30', 'G35', 'G40', 'G45', 'G50', 'G55'];

describe('SECTOR_LIST / SECTOR_CODES', () => {
  it('10개 섹터가 정의되어 있다', () => {
    expect(SECTOR_LIST).toHaveLength(10);
    expect(SECTOR_CODES).toHaveLength(10);
  });

  it('SECTOR_CODES가 VALID_CODES와 일치한다', () => {
    expect(SECTOR_CODES).toEqual(VALID_CODES);
  });

  it('모든 섹터에 code, name, color, colorHex가 있다', () => {
    for (const sector of SECTOR_LIST) {
      expect(sector.code).toBeTruthy();
      expect(sector.name).toBeTruthy();
      expect(sector.color).toMatch(/^bg-/);
      expect(sector.colorHex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('SECTOR_MAP', () => {
  it('모든 코드에 대해 올바른 섹터를 반환한다', () => {
    for (const code of VALID_CODES) {
      expect(SECTOR_MAP[code]).toBeDefined();
      expect(SECTOR_MAP[code].code).toBe(code);
    }
  });
});

describe('getSectorName', () => {
  it.each([
    ['G10', '에너지'],
    ['G15', '소재'],
    ['G20', '산업재'],
    ['G25', '경기소비재'],
    ['G30', '필수소비재'],
    ['G35', '건강관리'],
    ['G40', '금융'],
    ['G45', 'IT'],
    ['G50', '통신'],
    ['G55', '유틸리티'],
  ])('%s → "%s"', (code, name) => {
    expect(getSectorName(code)).toBe(name);
  });

  it('존재하지 않는 코드는 코드 자체를 반환한다', () => {
    expect(getSectorName('G99')).toBe('G99');
    expect(getSectorName('')).toBe('');
  });
});

describe('getSectorColor', () => {
  it('유효한 섹터 코드에 대해 bg- 클래스를 반환한다', () => {
    for (const code of VALID_CODES) {
      expect(getSectorColor(code)).toMatch(/^bg-/);
    }
  });

  it('존재하지 않는 코드는 fallback bg-gray-400을 반환한다', () => {
    expect(getSectorColor('UNKNOWN')).toBe('bg-gray-400');
    expect(getSectorColor('')).toBe('bg-gray-400');
  });
});

describe('getSectorColorHex', () => {
  it('유효한 섹터 코드에 대해 HEX 색상을 반환한다', () => {
    for (const code of VALID_CODES) {
      expect(getSectorColorHex(code)).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('존재하지 않는 코드는 fallback #9ca3af를 반환한다', () => {
    expect(getSectorColorHex('UNKNOWN')).toBe('#9ca3af');
  });
});
