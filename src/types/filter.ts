/**
 * 필터 / 정렬 / 검색 상태 관련 타입 정의
 * Zustand filter-store에서 사용
 */

/** 정렬 방향 */
export type SortDirection = 'asc' | 'desc';

/** 종목 테이블 정렬 기준 필드 */
export type SortField =
  | 'name'
  | 'ticker'
  | 'per'
  | 'pbr'
  | 'eps'
  | 'bps'
  | 'dividend_yield'
  | 'market_cap'
  | 'weight'
  | 'close';

/** 정렬 옵션 */
export interface SortOption {
  /** 정렬 기준 필드 */
  field: SortField;
  /** 정렬 방향 */
  direction: SortDirection;
}

/** 수치 범위 필터 */
export interface RangeFilter {
  /** 최솟값 (null이면 제한 없음) */
  min: number | null;
  /** 최댓값 (null이면 제한 없음) */
  max: number | null;
}

/** 전체 필터 상태 (Zustand store 스키마) */
export interface FilterState {
  /** PER 범위 필터 */
  perRange: RangeFilter;
  /** PBR 범위 필터 */
  pbrRange: RangeFilter;
  /** 시가총액 범위 필터 (원) */
  marketCapRange: RangeFilter;
  /**
   * 활성화된 섹터 코드 목록
   * 빈 배열이면 전체 섹터 표시
   */
  selectedSectors: string[];
  /** 종목명 또는 종목코드 검색어 */
  searchQuery: string;
  /** 현재 정렬 옵션 */
  sort: SortOption;
}

/** FilterState의 기본값 */
export const DEFAULT_FILTER_STATE: FilterState = {
  perRange: { min: null, max: null },
  pbrRange: { min: null, max: null },
  marketCapRange: { min: null, max: null },
  selectedSectors: [],
  searchQuery: '',
  sort: { field: 'market_cap', direction: 'desc' },
};
