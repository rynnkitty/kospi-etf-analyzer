import { describe, it, expect, beforeEach } from 'vitest';
import { useFilterStore } from '@/store/filter-store';
import { DEFAULT_FILTER_STATE } from '@/types/filter';

/** 각 테스트 전에 스토어를 기본값으로 초기화 */
beforeEach(() => {
  useFilterStore.getState().resetFilter();
});

describe('filter-store 초기 상태', () => {
  it('기본 필터 상태와 일치', () => {
    const state = useFilterStore.getState();
    expect(state.perRange).toEqual(DEFAULT_FILTER_STATE.perRange);
    expect(state.pbrRange).toEqual(DEFAULT_FILTER_STATE.pbrRange);
    expect(state.marketCapRange).toEqual(DEFAULT_FILTER_STATE.marketCapRange);
    expect(state.selectedSectors).toEqual([]);
    expect(state.searchQuery).toBe('');
    expect(state.sort).toEqual({ field: 'market_cap', direction: 'desc' });
  });
});

describe('setPerRange', () => {
  it('PER 범위를 업데이트한다', () => {
    useFilterStore.getState().setPerRange({ min: 5, max: 15 });
    expect(useFilterStore.getState().perRange).toEqual({ min: 5, max: 15 });
  });

  it('한쪽 null도 허용', () => {
    useFilterStore.getState().setPerRange({ min: null, max: 10 });
    expect(useFilterStore.getState().perRange).toEqual({ min: null, max: 10 });
  });
});

describe('setPbrRange', () => {
  it('PBR 범위를 업데이트한다', () => {
    useFilterStore.getState().setPbrRange({ min: 0.5, max: 2.0 });
    expect(useFilterStore.getState().pbrRange).toEqual({ min: 0.5, max: 2.0 });
  });
});

describe('setSelectedSectors', () => {
  it('섹터 목록을 교체한다', () => {
    useFilterStore.getState().setSelectedSectors(['G10', 'G45']);
    expect(useFilterStore.getState().selectedSectors).toEqual(['G10', 'G45']);
  });

  it('빈 배열로 초기화', () => {
    useFilterStore.getState().setSelectedSectors(['G10']);
    useFilterStore.getState().setSelectedSectors([]);
    expect(useFilterStore.getState().selectedSectors).toEqual([]);
  });
});

describe('setSearchQuery', () => {
  it('검색어를 업데이트한다', () => {
    useFilterStore.getState().setSearchQuery('삼성');
    expect(useFilterStore.getState().searchQuery).toBe('삼성');
  });

  it('빈 문자열로 초기화', () => {
    useFilterStore.getState().setSearchQuery('삼성');
    useFilterStore.getState().setSearchQuery('');
    expect(useFilterStore.getState().searchQuery).toBe('');
  });
});

describe('setSort', () => {
  it('정렬 옵션을 교체한다', () => {
    useFilterStore.getState().setSort({ field: 'per', direction: 'asc' });
    expect(useFilterStore.getState().sort).toEqual({ field: 'per', direction: 'asc' });
  });
});

describe('setFilter (부분 업데이트)', () => {
  it('여러 필드를 한 번에 업데이트한다', () => {
    useFilterStore.getState().setFilter({
      searchQuery: '현대',
      selectedSectors: ['G20'],
    });
    const state = useFilterStore.getState();
    expect(state.searchQuery).toBe('현대');
    expect(state.selectedSectors).toEqual(['G20']);
    // 나머지 필드는 기본값 유지
    expect(state.perRange).toEqual(DEFAULT_FILTER_STATE.perRange);
  });
});

describe('resetFilter', () => {
  it('모든 필터를 기본값으로 초기화한다', () => {
    const store = useFilterStore.getState();
    store.setPerRange({ min: 1, max: 10 });
    store.setSearchQuery('검색어');
    store.setSelectedSectors(['G10', 'G45']);
    store.setSort({ field: 'per', direction: 'asc' });

    store.resetFilter();

    const reset = useFilterStore.getState();
    expect(reset.perRange).toEqual(DEFAULT_FILTER_STATE.perRange);
    expect(reset.searchQuery).toBe('');
    expect(reset.selectedSectors).toEqual([]);
    expect(reset.sort).toEqual(DEFAULT_FILTER_STATE.sort);
  });
});
