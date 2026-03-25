# PROGRESS.md — 개발 진행 기록

> 이 문서는 개발 과정을 추적하는 기록입니다. 각 Phase/명령 완료 시 업데이트합니다.

---

## 현재 상태: Phase 0 — 기획 완료

| Phase | 상태 | 시작일 | 완료일 | 비고 |
|-------|------|--------|--------|------|
| Phase 0: 기획 | ✅ 완료 | - | - | PRD, CLAUDE.md, MANUAL.md 작성 |
| Phase 1: 초기화 + 데이터 | ⬜ 대기 | | | |
| Phase 2: 프론트엔드 MVP | ⬜ 대기 | | | |
| Phase 3: UX 강화 | ⬜ 대기 | | | |
| Phase 4: 테스트 + CI/CD | ⬜ 대기 | | | |
| Phase 5: 확장 (선택) | ⬜ 대기 | | | |

---

## Phase 0: 기획 (완료)

### 산출물

- [x] `docs/PRD.md` — 상세 기획서
- [x] `CLAUDE.md` — AI 컨텍스트 파일
- [x] `README.md` — 프로젝트 소개
- [x] `MANUAL.md` — Claude Code 실행 매뉴얼
- [x] `PROGRESS.md` — 이 파일
- [x] `ROADMAP.md` — 개발 로드맵

---

## Phase 1: 프로젝트 초기화 + 데이터 파이프라인

### 명령 1-1. 프로젝트 초기화

- [ ] Next.js 14 프로젝트 생성
- [ ] 패키지 설치 (zustand, recharts, shadcn/ui 등)
- [ ] next.config.ts 설정 (SSG + basePath)
- [ ] vitest 설정
- [ ] ESLint + Prettier 설정
- [ ] npm run build 성공 확인

### 명령 1-2. TypeScript 타입 정의

- [ ] src/types/etf.ts
- [ ] src/types/stock.ts
- [ ] src/types/filter.ts
- [ ] src/constants/sectors.ts
- [ ] src/constants/valuation-thresholds.ts

### 명령 1-3. Python 수집 스크립트

- [ ] scripts/config.py
- [ ] scripts/collect_etf_list.py
- [ ] scripts/collect_holdings.py
- [ ] scripts/collect_valuation.py
- [ ] scripts/merge_data.py
- [ ] scripts/requirements.txt

### 명령 1-4. 데이터 수집 테스트

- [ ] etf-list.json 생성 확인
- [ ] etf-holdings.json 생성 확인
- [ ] stock-valuation.json 생성 확인
- [ ] metadata.json 생성 + 검증 통과

---

## Phase 2: 프론트엔드 MVP

### 명령 2-1. 데이터 로딩 레이어

- [ ] src/lib/data-loader.ts
- [ ] src/lib/valuation-utils.ts
- [ ] src/lib/sector-config.ts
- [ ] src/hooks/useEtfData.ts
- [ ] src/hooks/useValuation.ts
- [ ] src/hooks/useFilter.ts
- [ ] src/store/filter-store.ts
- [ ] 단위 테스트

### 명령 2-2. 공통 컴포넌트 + 레이아웃

- [ ] Navbar.tsx
- [ ] Footer.tsx
- [ ] DataLoader.tsx
- [ ] ValueBadge.tsx
- [ ] layout.tsx

### 명령 2-3. 대시보드 페이지

- [ ] SectorCard.tsx
- [ ] SectorCompareChart.tsx
- [ ] ValuationHeatmap.tsx
- [ ] app/page.tsx

### 명령 2-4. 섹터 상세 페이지

- [ ] EtfTable.tsx
- [ ] HoldingsPanel.tsx
- [ ] app/sector/[sectorCode]/page.tsx

### 명령 2-5. ETF 상세 페이지

- [ ] HoldingsTable.tsx
- [ ] ScatterPlot.tsx
- [ ] app/etf/[ticker]/page.tsx

---

## Phase 3: UX 강화

### 명령 3-1. 전체 종목 탐색

- [ ] FilterPanel.tsx
- [ ] StockTable.tsx
- [ ] app/stocks/page.tsx

### 명령 3-2. 반응형 디자인

- [ ] 모바일 레이아웃 최적화
- [ ] 태블릿 레이아웃 최적화
- [ ] 차트 반응형 처리

---

## Phase 4: 테스트 + CI/CD

### 명령 4-1. 단위 테스트

- [ ] valuation-utils.test.ts
- [ ] data-loader.test.ts
- [ ] filter-store.test.ts
- [ ] sector-config.test.ts
- [ ] npm run test 통과

### 명령 4-2. GitHub Actions

- [ ] collect-data.yml
- [ ] deploy.yml
- [ ] 워크플로우 테스트

### 명령 4-3. E2E 테스트

- [ ] dashboard.spec.ts
- [ ] filter.spec.ts
- [ ] npx playwright test 통과

### 명령 4-4. 최종 검증

- [ ] lint 통과
- [ ] 테스트 통과
- [ ] 빌드 성공
- [ ] 전체 페이지 동작 확인

---

## 이슈 / 해결 기록

| 날짜 | 이슈 | 해결 방법 |
|------|------|----------|
| | | |
