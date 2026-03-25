import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // 각 테스트 최대 실행 시간 (dev 서버 컴파일 시간 포함)
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // dev 서버 과부하 방지: 1개 워커로 순차 실행
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    // 각 페이지 이동 후 네트워크 유휴 상태까지 대기
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/kospi-etf-analyzer',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
