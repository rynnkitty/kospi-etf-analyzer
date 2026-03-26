/**
 * KOSDAQ 섹터 ETF 분류 상수
 * KOSDAQ150 기반 5개 섹터
 */

import type { SectorConfig } from './sectors';

export const KOSDAQ_SECTORS: SectorConfig[] = [
  {
    code: 'KQ_BIO',
    name: '바이오/헬스케어',
    nameEn: 'Bio / Health Care',
    color: 'bg-emerald-500',
    colorHex: '#10b981',
    representativeEtfs: ['261070'],
  },
  {
    code: 'KQ_MEDIA',
    name: '미디어/엔터',
    nameEn: 'Media / Entertainment',
    color: 'bg-pink-500',
    colorHex: '#ec4899',
    representativeEtfs: ['228810'],
  },
  {
    code: 'KQ_BROAD',
    name: 'KOSDAQ 150',
    nameEn: 'KOSDAQ 150',
    color: 'bg-blue-500',
    colorHex: '#3b82f6',
    representativeEtfs: ['229200', '232080'],
  },
];

export const KOSDAQ_SECTOR_MAP: Record<string, SectorConfig> = Object.fromEntries(
  KOSDAQ_SECTORS.map((s) => [s.code, s])
);

export const KOSDAQ_SECTOR_CODES = KOSDAQ_SECTORS.map((s) => s.code);
