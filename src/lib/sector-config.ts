/**
 * 섹터 설정 접근 유틸리티
 * - 상수는 constants/sectors.ts에 정의, 여기서는 편의 함수만 제공
 */

export { SECTORS as SECTOR_LIST, SECTOR_MAP, SECTOR_CODES } from '@/constants/sectors';

import { SECTOR_MAP } from '@/constants/sectors';

/**
 * 섹터 코드에 해당하는 TailwindCSS 배경 색상 클래스를 반환한다.
 * 알 수 없는 코드면 'bg-gray-400' 반환.
 */
export function getSectorColor(sectorCode: string): string {
  return SECTOR_MAP[sectorCode]?.color ?? 'bg-gray-400';
}

/**
 * 섹터 코드에 해당하는 HEX 색상을 반환한다.
 * 차트/히트맵 렌더러용.
 */
export function getSectorColorHex(sectorCode: string): string {
  return SECTOR_MAP[sectorCode]?.colorHex ?? '#9ca3af';
}

/**
 * 섹터 코드에 해당하는 한국어 섹터명을 반환한다.
 * 알 수 없는 코드면 코드 자체를 반환.
 */
export function getSectorName(sectorCode: string): string {
  return SECTOR_MAP[sectorCode]?.name ?? sectorCode;
}
