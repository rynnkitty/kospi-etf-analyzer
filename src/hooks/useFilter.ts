'use client';

/**
 * 필터 상태 접근 훅 — Zustand filter-store의 얇은 래퍼
 * 컴포넌트가 store 구조에 직접 의존하지 않도록 캡슐화한다.
 */

import { useFilterStore } from '@/store/filter-store';
import type { FilterState, RangeFilter, SortField, SortDirection, MarketFilter } from '@/types/filter';

export interface UseFilterResult {
  // 상태
  perRange: FilterState['perRange'];
  pbrRange: FilterState['pbrRange'];
  marketCapRange: FilterState['marketCapRange'];
  selectedSectors: FilterState['selectedSectors'];
  searchQuery: FilterState['searchQuery'];
  sort: FilterState['sort'];
  selectedMarket: FilterState['selectedMarket'];
  // 액션
  setPerRange: (range: RangeFilter) => void;
  setPbrRange: (range: RangeFilter) => void;
  setSelectedSectors: (sectors: string[]) => void;
  setSearchQuery: (query: string) => void;
  setSort: (field: SortField, direction?: SortDirection) => void;
  setSelectedMarket: (market: MarketFilter) => void;
  resetFilter: () => void;
}

export function useFilter(): UseFilterResult {
  const store = useFilterStore();

  return {
    perRange: store.perRange,
    pbrRange: store.pbrRange,
    marketCapRange: store.marketCapRange,
    selectedSectors: store.selectedSectors,
    searchQuery: store.searchQuery,
    sort: store.sort,
    selectedMarket: store.selectedMarket,

    setPerRange: store.setPerRange,
    setPbrRange: store.setPbrRange,
    setSelectedSectors: store.setSelectedSectors,
    setSearchQuery: store.setSearchQuery,
    setSelectedMarket: store.setSelectedMarket,

    setSort: (field, direction) =>
      store.setSort({
        field,
        direction: direction ?? (store.sort.field === field && store.sort.direction === 'asc' ? 'desc' : 'asc'),
      }),

    resetFilter: store.resetFilter,
  };
}
