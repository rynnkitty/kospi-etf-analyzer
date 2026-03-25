import { test, expect } from '@playwright/test';

// Next.js basePath (/kospi-etf-analyzer) 기준 경로 접두사
const BASE = '/kospi-etf-analyzer';

/**
 * 종목 탐색 페이지 E2E 테스트
 *
 * PER 필터 테스트 전략:
 *  - Slider 직접 조작 대신 URL 쿼리 파라미터를 사용 (?per_max=15)
 *  - 페이지가 마운트 시 URL 파라미터를 읽어 필터를 초기화하는 기능 활용
 *
 * 종목 수 파싱:
 *  - data-testid="stock-filtered-count" 속성으로 안정적으로 선택
 */

// 요약 통계 바의 필터링된 종목 수를 읽는 헬퍼
async function getFilteredCount(page: import('@playwright/test').Page): Promise<number> {
  const el = page.locator('[data-testid="stock-filtered-count"]');
  await expect(el).toBeVisible({ timeout: 15_000 });
  const text = await el.textContent();
  return Number(text?.replace(/,/g, '') ?? '0');
}

// 데이터 로딩 완료 헬퍼 (로딩 인디케이터가 사라질 때까지 대기)
async function waitForData(page: import('@playwright/test').Page) {
  await expect(page.getByText('데이터를 불러오는 중...')).not.toBeVisible({
    timeout: 30_000,
  });
}

test.describe('종목 탐색 — 필터', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/stocks`);
    await waitForData(page);
  });

  test('종목 탐색 페이지 접근 — 헤더 및 테이블 표시', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('전체 종목 탐색');

    // 종목 테이블 헤더 행 확인
    await expect(page.getByRole('columnheader', { name: '종목명' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'PER' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'PBR' })).toBeVisible();
  });

  test('PER 범위 필터 적용 — URL 파라미터로 결과 필터링', async ({ page }) => {
    // 전체 종목 수 기록
    const totalCount = await getFilteredCount(page);
    expect(totalCount).toBeGreaterThan(0);

    // PER max = 15 로 필터링 (URL 파라미터 방식)
    await page.goto(`${BASE}/stocks?per_max=15`);
    await waitForData(page);

    const filteredCount = await getFilteredCount(page);

    // 필터 적용 후 종목 수가 전체보다 적거나 같아야 함
    expect(filteredCount).toBeLessThanOrEqual(totalCount);
    // PER 15 이하 종목이 적어도 1개 이상 존재해야 함
    expect(filteredCount).toBeGreaterThan(0);
  });

  test('검색어 입력 → 결과 필터링', async ({ page }) => {
    // 전체 종목 수 기록
    const totalCount = await getFilteredCount(page);
    expect(totalCount).toBeGreaterThan(0);

    // 검색 입력창에 '삼성' 입력
    const searchInput = page.getByPlaceholder('종목명 또는 코드');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('삼성');

    // 디바운스 300ms 대기 후 필터 적용
    await page.waitForTimeout(500);

    const filteredCount = await getFilteredCount(page);

    // 검색 결과가 전체보다 적어야 함 (삼성 관련 종목만 표시)
    expect(filteredCount).toBeLessThan(totalCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test('필터 초기화 버튼 → 전체 종목 복원', async ({ page }) => {
    // 전체 종목 수 기록
    const totalCount = await getFilteredCount(page);
    expect(totalCount).toBeGreaterThan(0);

    // 검색어로 필터링
    const searchInput = page.getByPlaceholder('종목명 또는 코드');
    await searchInput.fill('삼성');
    await page.waitForTimeout(500);

    const filteredCount = await getFilteredCount(page);
    expect(filteredCount).toBeLessThan(totalCount);

    // '필터 초기화' 버튼이 보여야 함 (활성 필터가 있을 때만 렌더링)
    const resetBtn = page.getByRole('button', { name: '필터 초기화' });
    await expect(resetBtn).toBeVisible();

    // 초기화 클릭
    await resetBtn.click();
    await page.waitForTimeout(300);

    const restoredCount = await getFilteredCount(page);

    // 초기화 후 전체 종목 수 복원
    expect(restoredCount).toBeGreaterThanOrEqual(totalCount);

    // 초기화 버튼이 사라져야 함 (활성 필터 없음)
    await expect(resetBtn).not.toBeVisible();
  });

  test('섹터 체크박스 필터 → 선택 섹터 종목만 표시', async ({ page }) => {
    // 전체 종목 수
    const totalCount = await getFilteredCount(page);
    expect(totalCount).toBeGreaterThan(0);

    // FilterPanel의 'IT' 섹터 레이블을 클릭 (SECTORS 배열 순서: index 7 = IT)
    // 데스크탑 FilterPanel의 레이블 클릭
    const itLabel = page.locator('label').filter({ hasText: 'IT' });
    await expect(itLabel).toBeVisible();
    await itLabel.click();
    await page.waitForTimeout(300);

    const filteredCount = await getFilteredCount(page);
    expect(filteredCount).toBeLessThanOrEqual(totalCount);
    expect(filteredCount).toBeGreaterThan(0);
  });
});
