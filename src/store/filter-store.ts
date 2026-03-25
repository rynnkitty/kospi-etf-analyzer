/**
 * 필터 / 정렬 / 검색 Zustand 스토어
 * - 종목 테이블, 섹터 필터 등 UI 전반의 필터 상태를 중앙 관리
 */

import { create } from 'zustand';
import type { FilterState, RangeFilter, SortOption } from '@/types/filter';
import { DEFAULT_FILTER_STATE } from '@/types/filter';

interface FilterStore extends FilterState {
  /** 단일 필터 필드를 부분 업데이트한다 */
  setFilter: (patch: Partial<FilterState>) => void;
  /** PER 범위만 업데이트한다 */
  setPerRange: (range: RangeFilter) => void;
  /** PBR 범위만 업데이트한다 */
  setPbrRange: (range: RangeFilter) => void;
  /** 선택된 섹터 목록을 교체한다 */
  setSelectedSectors: (sectors: string[]) => void;
  /** 검색어를 업데이트한다 */
  setSearchQuery: (query: string) => void;
  /** 정렬 옵션을 업데이트한다 */
  setSort: (sort: SortOption) => void;
  /** 모든 필터를 기본값으로 초기화한다 */
  resetFilter: () => void;
}

export const useFilterStore = create<FilterStore>((set) => ({
  ...DEFAULT_FILTER_STATE,

  setFilter: (patch) => set((state) => ({ ...state, ...patch })),

  setPerRange: (range) => set({ perRange: range }),

  setPbrRange: (range) => set({ pbrRange: range }),

  setSelectedSectors: (sectors) => set({ selectedSectors: sectors }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSort: (sort) => set({ sort }),

  resetFilter: () => set(DEFAULT_FILTER_STATE),
}));
