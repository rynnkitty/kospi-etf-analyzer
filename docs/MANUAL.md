# MANUAL.md — Claude Code 순차 실행 매뉴얼

> 이 문서는 VSCode에서 Claude Code를 통해 프로젝트를 처음부터 완성까지 구현하는 단계별 프롬프트입니다.
> 각 단계의 프롬프트를 순서대로 Claude Code에 입력하세요. 이전 단계가 완료된 후 다음 단계를 진행합니다.

---

## 사전 준비

Claude Code에 프로젝트 컨텍스트를 로드합니다:

```
이 프로젝트의 CLAUDE.md와 docs/PRD.md를 읽고 프로젝트 전체 구조를 파악해줘.
```

---

## Phase 1: 프로젝트 초기화 + 데이터 파이프라인

### 명령 1-1. 프로젝트 초기화

```
Next.js 14 프로젝트를 초기화해줘.

- create-next-app으로 생성 (App Router, TypeScript, TailwindCSS, ESLint, src/ 디렉토리)
- 추가 패키지 설치: zustand, recharts, lucide-react, @radix-ui/react-slot, class-variance-authority, clsx, tailwind-merge
- shadcn/ui 초기화 (npx shadcn@latest init)
- shadcn/ui 컴포넌트 추가: button, card, badge, input, select, table, tabs, slider, tooltip
- next.config.ts 설정: output 'export', basePath '/kospi-etf-analyzer', images unoptimized
- tailwind.config.ts에서 src/ 경로 설정
- vitest 설정: vitest, @testing-library/react, @testing-library/jest-dom, jsdom
- vitest.config.ts 생성
- tsconfig.json paths 설정 (@/ -> src/)
- .env.example 생성 (NEXT_PUBLIC_BASE_PATH=/kospi-etf-analyzer)
- .gitignore에 /out, /public/data/*.json (gitkeep은 유지), __pycache__ 추가
- package.json scripts: dev, build, lint, test (vitest), test:e2e (playwright)
- CLAUDE.md의 코드 컨벤션을 참고해서 ESLint + Prettier 설정

모든 설정이 완료되면 npm run build가 성공하는지 확인해줘.
```

### 명령 1-2. TypeScript 타입 정의

```
CLAUDE.md의 디렉토리 구조와 docs/PRD.md의 데이터 모델을 참고해서 TypeScript 타입을 정의해줘.

src/types/ 디렉토리에:
1. etf.ts — Sector, ETF, Holding 타입 (etf-list.json, etf-holdings.json 구조)
2. stock.ts — Stock, StockValuation 타입 (stock-valuation.json 구조)  
3. filter.ts — FilterState, SortOption, SortDirection 타입

src/constants/ 디렉토리에:
1. sectors.ts — KOSPI 10개 섹터 분류 상수 (코드, 이름, 색상, 대표 ETF 티커)
   섹터: 에너지, 소재, 산업재, 경기소비재, 필수소비재, 건강관리, 금융, IT, 통신, 유틸리티
2. valuation-thresholds.ts — PER/PBR 등급 기준값 (저평가/적정/고평가 임계값)

모든 타입에 JSDoc 주석을 달아줘.
```

### 명령 1-3. Python 데이터 수집 스크립트

```
KRX 데이터시스템에서 데이터를 크롤링하는 Python 스크립트를 작성해줘.

scripts/ 디렉토리에:

1. config.py
   - KOSPI 섹터별 대표 ETF 티커 매핑 (각 섹터별 2~3개 ETF)
   - 섹터 코드 → 섹터명 매핑
   - KRX API URL 상수
   - 출력 디렉토리 경로 (../public/data/)

2. collect_etf_list.py
   - KRX ETF 전종목 시세 크롤링 (MDCSTAT04301)
   - config.py의 섹터별 ETF 티커 목록을 기준으로 필터링
   - 결과: etf-list.json 생성

3. collect_holdings.py  
   - config.py의 각 ETF에 대해 KRX ETF PDF(보유종목) 크롤링 (MDCSTAT04601)
   - 각 ETF의 상위 20개 보유종목 추출
   - 결과: etf-holdings.json 생성

4. collect_valuation.py
   - KRX 개별종목 PER/PBR/배당수익률 크롤링 (MDCSTAT03501, mktId=STK)
   - KOSPI 전체 종목의 PER, PBR, EPS, BPS, 배당수익률 수집
   - 결과: stock-valuation.json 생성

5. merge_data.py
   - 위 3개 JSON을 읽어서 데이터 무결성 검증
   - etf-holdings의 종목코드가 stock-valuation에 존재하는지 확인
   - metadata.json 생성 (수집 일시, 종목 수, ETF 수)
   - 검증 실패 시 exit code 1 반환

6. requirements.txt
   - requests, pandas, python-dateutil

KRX 크롤링 방식:
- OTP 생성 → CSV 다운로드 (POST 방식)
- User-Agent 헤더 설정
- Referer 헤더: http://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd
- 요청 간 2초 딜레이 (rate limiting)
- 에러 발생 시 3회 재시도
- 모든 스크립트는 독립 실행 가능 (if __name__ == '__main__')
- logging 모듈 사용, INFO 레벨

각 JSON 파일의 스키마는 docs/PRD.md의 3.2절을 정확히 따라줘.
```

### 명령 1-4. 데이터 수집 테스트

```
Python 데이터 수집 스크립트를 실행해서 테스트해줘.

1. cd scripts && pip install -r requirements.txt
2. python collect_etf_list.py 실행 → etf-list.json 생성 확인
3. python collect_holdings.py 실행 → etf-holdings.json 생성 확인
4. python collect_valuation.py 실행 → stock-valuation.json 생성 확인
5. python merge_data.py 실행 → metadata.json 생성 + 검증 통과 확인

각 JSON 파일의 데이터가 올바른지 확인하고, 문제가 있으면 스크립트를 수정해줘.
데이터가 비어있거나 형식이 맞지 않으면 크롤링 로직을 디버깅해줘.
```

---

## Phase 2: 프론트엔드 MVP

### 명령 2-1. 데이터 로딩 레이어

```
JSON 데이터를 로딩하는 유틸리티와 훅을 작성해줘.

src/lib/ 디렉토리:
1. data-loader.ts
   - fetchJson<T>(path: string): Promise<T> — basePath 고려한 JSON fetch
   - 캐싱: 메모리 캐시 (같은 경로 중복 요청 방지)
   - 에러 핸들링: fetch 실패 시 null 반환 + console.error

2. valuation-utils.ts
   - getPerGrade(per: number): 'low' | 'mid' | 'high' — PER 등급
   - getPbrGrade(pbr: number): 'low' | 'mid' | 'high' — PBR 등급
   - getGradeColor(grade: string): string — 등급별 TailwindCSS 색상 클래스
   - formatNumber(n: number): string — 천 단위 콤마
   - formatPercent(n: number): string — 소수점 2자리 %
   - formatMarketCap(n: number): string — 억/조 단위 변환

3. sector-config.ts
   - getSectorColor(sectorCode: string): string — 섹터별 고유 색상
   - getSectorName(sectorCode: string): string
   - SECTOR_LIST: 전체 섹터 목록

src/hooks/ 디렉토리:
1. useEtfData.ts — etf-list.json + etf-holdings.json 로딩 훅
2. useValuation.ts — stock-valuation.json 로딩 훅
3. useFilter.ts — Zustand filter-store 연동 훅

src/store/filter-store.ts:
- 필터 상태: perRange, pbrRange, searchQuery, selectedSector
- 정렬 상태: sortBy, sortDirection
- actions: setFilter, resetFilter, setSort

단위 테스트도 함께 작성해줘 (tests/unit/valuation-utils.test.ts, filter-store.test.ts).
```

### 명령 2-2. 공통 컴포넌트 + 레이아웃

```
공통 컴포넌트와 루트 레이아웃을 작성해줘.

src/components/common/:
1. Navbar.tsx — 상단 네비게이션 바
   - 로고/프로젝트명: "KOSPI ETF Analyzer"
   - 메뉴: 대시보드, 종목 탐색
   - 반응형: 모바일에서 햄버거 메뉴
   
2. Footer.tsx — 푸터
   - 데이터 출처: KRX 정보데이터시스템
   - 최종 갱신 시각 (metadata.json에서 로드)
   - 면책 조항: "투자 참고용이며, 투자 판단의 책임은 본인에게 있습니다"

3. DataLoader.tsx — 데이터 로딩 래퍼 컴포넌트
   - children을 감싸서 로딩/에러/빈 데이터 상태 처리
   - Skeleton UI 표시

4. ValueBadge.tsx — PER/PBR 등급 배지
   - grade에 따라 색상 변경 (초록/노랑/빨강)
   - 툴팁으로 의미 설명

src/app/layout.tsx:
- 전역 폰트: Pretendard (또는 시스템 폰트 스택 한글 지원)
- Navbar, Footer 배치
- TailwindCSS 글로벌 스타일
- 메타데이터: 제목, 설명, og 태그

반응형 디자인: 모바일 우선, sm/md/lg 브레이크포인트 활용.
디자인은 깔끔하고 데이터 중심적으로, 불필요한 장식 없이.
```

### 명령 2-3. 대시보드 페이지 (홈)

```
홈페이지(대시보드)를 구현해줘. src/app/page.tsx

'use client' 컴포넌트로 구현:

1. 상단: 제목 + 데이터 갱신 시각
2. 섹터 카드 그리드 (components/dashboard/SectorCard.tsx)
   - 10개 섹터를 2열(모바일)/3열(태블릿)/5열(데스크탑) 그리드로 표시
   - 각 카드: 섹터명, ETF 수, 평균 PER, 평균 PBR
   - 카드 클릭 시 /sector/[sectorCode]로 이동
   - PER/PBR에 ValueBadge 적용

3. 섹터 비교 차트 (components/dashboard/SectorCompareChart.tsx)
   - Recharts BarChart: X축 섹터명, Y축 평균 PER (왼쪽), 평균 PBR (오른쪽)
   - 듀얼 Y축 (PER, PBR 스케일이 다르므로)
   - 각 바에 섹터 고유 색상 적용

4. 밸류에이션 히트맵 (components/dashboard/ValuationHeatmap.tsx)
   - Recharts ScatterChart: X축 PBR, Y축 PER
   - 각 점은 ETF 보유종목 (크기 = 시가총액 비례)
   - 섹터별 색상 구분
   - 툴팁으로 종목명, PER, PBR 표시

데이터는 useEtfData + useValuation 훅으로 로드.
섹터별 평균 PER/PBR은 해당 섹터 ETF 보유종목들의 가중평균으로 계산.
```

### 명령 2-4. 섹터 상세 페이지

```
섹터 상세 페이지를 구현해줘. src/app/sector/[sectorCode]/page.tsx

'use client' 컴포넌트:

1. 상단: 섹터명 + 요약 통계 (ETF 수, 평균 PER/PBR, 총 시가총액)

2. ETF 목록 테이블 (components/sector/EtfTable.tsx)
   - 컬럼: ETF명, 종목코드, 운용사, 순자산, 1개월 수익률, 3개월 수익률
   - 행 클릭 시 해당 ETF의 보유종목 패널 토글

3. 보유종목 패널 (components/sector/HoldingsPanel.tsx)
   - ETF 행 클릭 시 아래에 확장되는 패널
   - 보유종목 테이블: 종목명, 종목코드, 비중(%), PER, PBR, EPS, BPS, 배당수익률
   - PER/PBR에 ValueBadge 적용
   - "ETF 상세 보기" 링크 → /etf/[ticker]

동적 라우팅이지만 generateStaticParams로 빌드 시 정적 생성.
constants/sectors.ts의 모든 섹터 코드에 대해 페이지 생성.
```

### 명령 2-5. ETF 상세 페이지

```
ETF 상세 페이지를 구현해줘. src/app/etf/[ticker]/page.tsx

'use client' 컴포넌트:

1. 상단: ETF 기본 정보 카드
   - ETF명, 종목코드, 운용사, 순자산, 수익률
   - 소속 섹터 배지 (클릭 시 섹터 페이지로 이동)

2. 보유종목 테이블 (components/etf/HoldingsTable.tsx)
   - shadcn/ui Table 사용
   - 컬럼: 순위, 종목명, 종목코드, 비중(%), 현재가, PER, PBR, EPS, BPS, 배당수익률
   - PER/PBR에 ValueBadge + 색상 코딩
   - 모든 컬럼 정렬 가능 (헤더 클릭)

3. PER/PBR 분포 차트 (components/etf/ScatterPlot.tsx)
   - Recharts ScatterChart: X축 PBR, Y축 PER
   - 각 점에 종목명 라벨
   - 점 크기 = 보유 비중 비례
   - 영역 구분선: 저평가/적정/고평가 구간 배경색

generateStaticParams로 config.py에 정의된 모든 ETF 티커에 대해 정적 생성.
```

---

## Phase 3: UX 강화 + 검색/필터

### 명령 3-1. 전체 종목 탐색 페이지

```
전체 종목 탐색 페이지를 구현해줘. src/app/stocks/page.tsx

'use client' 컴포넌트:

1. 필터 패널 (components/stocks/FilterPanel.tsx)
   - PER 범위 슬라이더 (0~100, 더블 핸들)
   - PBR 범위 슬라이더 (0~10, 더블 핸들)
   - 섹터 선택 (멀티 셀렉트 체크박스)
   - 종목명/코드 검색 (디바운스 300ms)
   - 필터 초기화 버튼
   - Zustand filter-store와 연동

2. 종목 테이블 (components/stocks/StockTable.tsx)
   - 전체 ETF 보유종목을 중복 제거하여 통합 표시
   - 컬럼: 종목명, 종목코드, 소속 섹터(들), 현재가, 시가총액, PER, PBR, EPS, BPS, 배당수익률
   - 한 종목이 여러 ETF에 포함된 경우 → 소속 ETF 수 배지 표시
   - 모든 컬럼 정렬 가능
   - 가상 스크롤링 (종목이 많으므로 성능 최적화)
   - 또는 페이지네이션 (50개씩)

3. 요약 통계 바
   - 전체 종목 수, 필터 적용 후 종목 수
   - 평균 PER/PBR

필터 적용 시 URL 쿼리 파라미터 동기화 (공유 가능한 필터 링크).
```

### 명령 3-2. 반응형 디자인 최적화

```
전체 페이지의 반응형 디자인을 최적화해줘.

1. 모바일 (< 640px)
   - 테이블 → 카드 형태로 전환 (또는 수평 스크롤)
   - 필터 패널 → 접이식 (Sheet/Drawer)
   - 차트 크기 자동 조절
   - 네비게이션 → 하단 탭 바 또는 햄버거 메뉴

2. 태블릿 (640px ~ 1024px)
   - 2열 그리드
   - 사이드바 필터

3. 데스크탑 (> 1024px)
   - 풀 레이아웃
   - 3~5열 그리드

TailwindCSS 반응형 유틸리티 사용.
모든 페이지에서 테스트하고, 깨지는 레이아웃이 있으면 수정해줘.
```

---

## Phase 4: 테스트 + CI/CD

### 명령 4-1. 단위 테스트 작성

```
핵심 유틸리티와 컴포넌트의 단위 테스트를 작성해줘.

tests/unit/:
1. valuation-utils.test.ts
   - getPerGrade: 경계값 테스트 (0, 10, 20, 50, 100, 음수, NaN)
   - getPbrGrade: 경계값 테스트
   - formatNumber: 정수, 소수, 음수, 0
   - formatMarketCap: 억, 조 단위 변환

2. data-loader.test.ts
   - fetchJson: 정상 응답, 404 에러, 네트워크 에러
   - 캐싱: 같은 경로 2번 호출 시 fetch 1번만 실행

3. filter-store.test.ts
   - setFilter: PER/PBR 범위 설정
   - setSort: 정렬 기준 변경
   - resetFilter: 초기화

4. sector-config.test.ts
   - 모든 섹터 코드에 대해 이름/색상 반환 확인
   - 존재하지 않는 코드 처리

npm run test로 전체 테스트가 통과하는지 확인해줘.
```

### 명령 4-2. GitHub Actions 워크플로우

```
GitHub Actions 워크플로우를 작성해줘.

.github/workflows/collect-data.yml:
- 트리거: schedule (cron: '0 9 * * 1-5' — UTC 09:00 = KST 18:00, 평일만)
- 트리거: workflow_dispatch (수동 실행)
- 작업:
  1. Python 3.12 설정
  2. pip install -r scripts/requirements.txt
  3. python scripts/collect_etf_list.py
  4. python scripts/collect_holdings.py
  5. python scripts/collect_valuation.py
  6. python scripts/merge_data.py
  7. 데이터 변경이 있으면 커밋 + 푸시 (actions/checkout + git config)
  8. deploy 워크플로우 트리거

.github/workflows/deploy.yml:
- 트리거: push to main
- 트리거: workflow_dispatch
- 작업:
  1. Node.js 20 설정
  2. npm ci
  3. npm run lint
  4. npm run test
  5. npm run build
  6. GitHub Pages 배포 (actions/deploy-pages)
- 환경: github-pages
- 권한: pages write, id-token write

두 워크플로우 모두 실패 시 알림 (GitHub 기본 이메일 알림 활용).
collect-data에서 Python 스크립트 실패 시 이전 데이터를 유지하도록 (변경 사항 없으면 커밋 스킵).
```

### 명령 4-3. E2E 테스트

```
Playwright E2E 테스트를 작성해줘.

playwright.config.ts:
- baseURL: http://localhost:3000
- 브라우저: chromium만 (CI 속도 최적화)
- webServer: npm run dev

tests/e2e/:
1. dashboard.spec.ts
   - 홈페이지 로딩 확인
   - 10개 섹터 카드 렌더링 확인
   - 섹터 카드 클릭 → 섹터 상세 페이지 이동 확인
   - 차트 렌더링 확인

2. filter.spec.ts
   - 종목 탐색 페이지 접근
   - PER 범위 필터 적용 → 결과 필터링 확인
   - 검색어 입력 → 결과 필터링 확인
   - 필터 초기화 → 전체 종목 표시 확인

npx playwright test로 E2E 테스트가 통과하는지 확인해줘.
```

### 명령 4-4. 최종 검증 + 빌드 테스트

```
최종 검증을 해줘.

1. npm run lint — 린트 에러 0개 확인
2. npm run test — 단위 테스트 전체 통과 확인
3. npm run build — 정적 빌드 성공 확인 (out/ 디렉토리 생성)
4. npx serve out/ — 빌드 결과물 로컬 서빙 테스트
5. 모든 페이지 정상 동작 확인:
   - / (대시보드)
   - /sector/G10 (섹터 상세)
   - /etf/117460 (ETF 상세)
   - /stocks (종목 탐색)
6. JSON 데이터 로딩 정상 확인
7. 필터/정렬 동작 확인

문제가 있으면 수정하고, 모든 것이 정상이면 최종 확인 메시지를 출력해줘.
```

---

## Phase 5 (선택): 확장 기능

### 명령 5-1. 다크모드

```
다크모드를 구현해줘.

- next-themes 패키지 설치
- ThemeProvider 추가 (layout.tsx)
- 테마 토글 버튼 (Navbar 오른쪽)
- TailwindCSS dark: 프리픽스 활용
- 차트 색상도 다크모드 대응
- localStorage에 테마 설정 저장
```

### 명령 5-2. 포트폴리오 중복 분석

```
여러 ETF를 선택해서 보유종목 중복을 분석하는 기능을 추가해줘.

- /compare 페이지 추가
- ETF 다중 선택 (최대 5개)
- 벤 다이어그램 또는 교집합 테이블로 중복 종목 표시
- 중복 종목의 합산 비중 계산
```

---

## 트러블슈팅 가이드

### KRX 크롤링 실패 시

```
KRX 크롤링이 실패하고 있어. 다음을 확인해줘:
1. KRX OTP 생성 URL과 파라미터가 변경되었는지 확인
2. User-Agent, Referer 헤더가 올바른지 확인
3. 요청 간 딜레이가 충분한지 확인 (2초 이상)
4. KRX 서버 점검 시간(보통 새벽)이 아닌지 확인
5. 디버깅을 위해 응답 상태 코드와 내용을 로깅해줘
```

### 빌드 실패 시

```
npm run build가 실패하고 있어. 다음을 확인해줘:
1. TypeScript 타입 에러가 없는지 확인
2. dynamic import나 서버 전용 코드가 없는지 확인 (output: 'export')
3. Image 컴포넌트 사용 시 unoptimized 설정 확인
4. generateStaticParams가 올바르게 설정되었는지 확인
5. 에러 메시지를 읽고 수정해줘
```

### GitHub Pages 404 에러 시

```
GitHub Pages 배포 후 404 에러가 발생해. 다음을 확인해줘:
1. basePath가 레포지토리 이름과 일치하는지 확인
2. next.config.ts의 output이 'export'인지 확인
3. .nojekyll 파일이 out/ 루트에 있는지 확인
4. GitHub Pages 설정에서 Source가 GitHub Actions인지 확인
```
