/**
 * JSON 데이터 fetch 유틸리티
 * - GitHub Pages basePath(/kospi-etf-analyzer)를 자동으로 고려
 * - 메모리 캐시로 중복 요청 방지
 */

const BASE_PATH =
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '')
    : '';

/** 메모리 캐시 (경로 → 파싱된 데이터) */
const cache = new Map<string, unknown>();

/**
 * 지정 경로의 JSON 파일을 fetch하여 파싱된 객체를 반환한다.
 * basePath가 자동으로 앞에 붙는다 (e.g. /kospi-etf-analyzer/data/etf-list.json).
 *
 * @param path - 절대 경로 (e.g. "/data/etf-list.json")
 * @returns 파싱된 데이터, 실패 시 null
 */
export async function fetchJson<T>(path: string): Promise<T | null> {
  if (cache.has(path)) return cache.get(path) as T;

  try {
    const url = `${BASE_PATH}${path}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} — ${url}`);
    }
    const data = (await res.json()) as T;
    cache.set(path, data);
    return data;
  } catch (err) {
    console.error('[data-loader] fetchJson 실패:', path, err);
    return null;
  }
}

/** 테스트 등에서 캐시를 초기화할 때 사용 */
export function clearCache(): void {
  cache.clear();
}
