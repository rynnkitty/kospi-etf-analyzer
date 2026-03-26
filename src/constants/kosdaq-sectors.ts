/**
 * KOSDAQ 섹터 ETF 분류 상수
 * KOSDAQ150 기반 5개 섹터
 */

import type { SectorConfig } from './sectors';

export const KOSDAQ_SECTORS: SectorConfig[] = [
  {
    code: 'KQ_IT',
    name: 'IT',
    nameEn: 'Information Technology',
    color: 'bg-violet-500',
    colorHex: '#8b5cf6',
    representativeEtfs: ['315960'],
  },
  {
    code: 'KQ_BIO',
    name: '바이오/헬스케어',
    nameEn: 'Bio / Health Care',
    color: 'bg-emerald-500',
    colorHex: '#10b981',
    representativeEtfs: ['315930', '289070'],
  },
  {
    code: 'KQ_MEDIA',
    name: '미디어/엔터',
    nameEn: 'Media / Entertainment',
    color: 'bg-pink-500',
    colorHex: '#ec4899',
    representativeEtfs: ['315940'],
  },
  {
    code: 'KQ_CONSUMER',
    name: '소비재',
    nameEn: 'Consumer',
    color: 'bg-orange-500',
    colorHex: '#f97316',
    representativeEtfs: ['315950'],
  },
  {
    code: 'KQ_BROAD',
    name: 'KOSDAQ 150',
    nameEn: 'KOSDAQ 150',
    color: 'bg-blue-500',
    colorHex: '#3b82f6',
    representativeEtfs: ['229200', '232080', '261240'],
  },
];

export const KOSDAQ_SECTOR_MAP: Record<string, SectorConfig> = Object.fromEntries(
  KOSDAQ_SECTORS.map((s) => [s.code, s])
);

export const KOSDAQ_SECTOR_CODES = KOSDAQ_SECTORS.map((s) => s.code);
