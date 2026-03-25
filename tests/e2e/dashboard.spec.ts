import { test, expect } from '@playwright/test';

// Next.js basePath (/kospi-etf-analyzer) 기준 경로 접두사
const BASE = '/kospi-etf-analyzer';

// 섹터 이름 목록 (SECTORS 상수 기준 10개)
const SECTOR_NAMES = [
  '에너지',
  '소재',
  '산업재',
  '경기소비재',
  '필수소비재',
  '건강관리',
  '금융',
  'IT',
  '통신',
  '유틸리티',
];

test.describe('대시보드', () => {
  test('홈페이지 로딩 — 제목 표시', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await expect(page.locator('h1')).toContainText('KOSPI 섹터 ETF 밸류에이션');
  });

  test('데이터 로딩 후 10개 섹터 카드 렌더링', async ({ page }) => {
    await page.goto(`${BASE}/`);

    // 로딩 인디케이터가 사라질 때까지 대기
    await expect(page.getByText('데이터를 불러오는 중...')).not.toBeVisible({
      timeout: 20_000,
    });

    // 모든 10개 섹터 이름이 카드 타이틀에 표시되어야 함
    // (차트 tspan/legend와 구분: card-title slot으로 스코핑)
    for (const name of SECTOR_NAMES) {
      await expect(page.locator('[data-slot="card-title"]', { hasText: name })).toBeVisible();
    }

    // 섹터별 현황 섹션 헤딩 확인
    await expect(page.getByRole('heading', { name: '섹터별 현황' })).toBeVisible();
  });

  test('섹터 카드 클릭 → 섹터 상세 페이지 이동', async ({ page }) => {
    await page.goto(`${BASE}/`);

    // 데이터 로딩 완료 대기
    await expect(page.getByText('데이터를 불러오는 중...')).not.toBeVisible({
      timeout: 30_000,
    });

    // cursor-pointer 클래스를 가진 카드 중 '에너지' 텍스트를 포함한 첫 번째 카드 클릭
    // (SectorCard는 Card 컴포넌트 = cursor-pointer div로 렌더링)
    const energyCard = page.locator('[class*="cursor-pointer"]').filter({ hasText: '에너지' }).first();
    await expect(energyCard).toBeVisible();
    await energyCard.click();

    // /kospi-etf-analyzer/sector/G10 으로 이동해야 함
    await expect(page).toHaveURL(/\/sector\/G10/, { timeout: 15_000 });
  });

  test('섹터 상세 페이지 — 에너지 섹터명 표시', async ({ page }) => {
    await page.goto(`${BASE}/sector/G10`);

    // h1 안에 "에너지" 텍스트가 포함되어야 함
    await expect(page.locator('h1')).toContainText('에너지', { timeout: 20_000 });
  });

  test('차트 컨테이너 렌더링 확인', async ({ page }) => {
    await page.goto(`${BASE}/`);

    // 데이터 로딩 완료 대기
    await expect(page.getByText('데이터를 불러오는 중...')).not.toBeVisible({
      timeout: 20_000,
    });

    // 섹터별 PER / PBR 비교 차트 섹션 헤딩
    await expect(page.getByRole('heading', { name: '섹터별 PER / PBR 비교' })).toBeVisible();

    // Recharts가 렌더링한 SVG 컨테이너 확인
    const chartContainer = page.locator('.recharts-wrapper').first();
    await expect(chartContainer).toBeVisible();
  });
});
