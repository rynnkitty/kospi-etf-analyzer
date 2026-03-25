/**
 * KOSPI 200 GICS 섹터 분류 상수
 * 10개 섹터, 각 섹터의 코드·이름·테마 색상·대표 ETF 티커를 정의
 */

export interface SectorConfig {
  /** GICS 섹터 코드 (e.g. "G10") */
  code: string;
  /** 한국어 섹터명 */
  name: string;
  /** 영문 섹터명 */
  nameEn: string;
  /**
   * 차트/배지에 사용할 Tailwind 색상 클래스 (bg-*)
   * TailwindCSS v4 기준 safe-list에 포함 필요
   */
  color: string;
  /** 히트맵/차트용 HEX 색상 */
  colorHex: string;
  /** 대표 ETF 티커 목록 (시가총액 상위 ETF 우선) */
  representativeEtfs: string[];
}

/** KOSPI 200 GICS 10개 섹터 설정 */
export const SECTORS: SectorConfig[] = [
  {
    code: 'G10',
    name: '에너지',
    nameEn: 'Energy',
    color: 'bg-orange-500',
    colorHex: '#f97316',
    representativeEtfs: ['117460', '139230'],
  },
  {
    code: 'G15',
    name: '소재',
    nameEn: 'Materials',
    color: 'bg-yellow-500',
    colorHex: '#eab308',
    representativeEtfs: ['139220', '091160'],
  },
  {
    code: 'G20',
    name: '산업재',
    nameEn: 'Industrials',
    color: 'bg-sky-500',
    colorHex: '#0ea5e9',
    representativeEtfs: ['139240', '104530'],
  },
  {
    code: 'G25',
    name: '경기소비재',
    nameEn: 'Consumer Discretionary',
    color: 'bg-pink-500',
    colorHex: '#ec4899',
    representativeEtfs: ['228810', '139250'],
  },
  {
    code: 'G30',
    name: '필수소비재',
    nameEn: 'Consumer Staples',
    color: 'bg-lime-500',
    colorHex: '#84cc16',
    representativeEtfs: ['139260', '228800'],
  },
  {
    code: 'G35',
    name: '건강관리',
    nameEn: 'Health Care',
    color: 'bg-emerald-500',
    colorHex: '#10b981',
    representativeEtfs: ['143860', '227540'],
  },
  {
    code: 'G40',
    name: '금융',
    nameEn: 'Financials',
    color: 'bg-blue-500',
    colorHex: '#3b82f6',
    representativeEtfs: ['139270', '091170'],
  },
  {
    code: 'G45',
    name: 'IT',
    nameEn: 'Information Technology',
    color: 'bg-violet-500',
    colorHex: '#8b5cf6',
    representativeEtfs: ['139280', '091180'],
  },
  {
    code: 'G50',
    name: '통신',
    nameEn: 'Communication Services',
    color: 'bg-indigo-500',
    colorHex: '#6366f1',
    representativeEtfs: ['139290', '228820'],
  },
  {
    code: 'G55',
    name: '유틸리티',
    nameEn: 'Utilities',
    color: 'bg-teal-500',
    colorHex: '#14b8a6',
    representativeEtfs: ['139300', '228830'],
  },
];

/** 섹터 코드 → SectorConfig 빠른 조회 맵 */
export const SECTOR_MAP: Record<string, SectorConfig> = Object.fromEntries(
  SECTORS.map((s) => [s.code, s])
);

/** 섹터 코드 목록 (순서 고정) */
export const SECTOR_CODES = SECTORS.map((s) => s.code);
