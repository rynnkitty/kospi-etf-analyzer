import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchJson, clearCache } from '@/lib/data-loader';

beforeEach(() => {
  clearCache();
  vi.restoreAllMocks();
});

describe('fetchJson — 정상 응답', () => {
  it('JSON 데이터를 파싱하여 반환한다', async () => {
    const mockData = { items: [1, 2, 3] };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      })
    );

    const result = await fetchJson<typeof mockData>('/data/test.json');
    expect(result).toEqual(mockData);
  });
});

describe('fetchJson — 에러 처리', () => {
  it('404 응답이면 null을 반환한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })
    );

    const result = await fetchJson('/data/not-found.json');
    expect(result).toBeNull();
  });

  it('네트워크 에러가 발생하면 null을 반환한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error'))
    );

    const result = await fetchJson('/data/error.json');
    expect(result).toBeNull();
  });
});

describe('fetchJson — 캐싱', () => {
  it('같은 경로를 2번 호출해도 fetch는 1번만 실행된다', async () => {
    const mockData = { cached: true };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });
    vi.stubGlobal('fetch', mockFetch);

    const first = await fetchJson('/data/cache-test.json');
    const second = await fetchJson('/data/cache-test.json');

    expect(first).toEqual(mockData);
    expect(second).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('clearCache 후 재호출하면 fetch가 다시 실행된다', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ v: 1 }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchJson('/data/reset.json');
    clearCache();
    await fetchJson('/data/reset.json');

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('서로 다른 경로는 각각 fetch를 호출한다', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchJson('/data/a.json');
    await fetchJson('/data/b.json');

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
