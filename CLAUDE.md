# CLAUDE.md — AI 컨텍스트 파일

> 이 파일은 Claude Code가 프로젝트를 이해하고 효과적으로 코드를 작성하기 위한 컨텍스트를 제공합니다.

---

## 프로젝트 개요

**KOSPI ETF Sector Analyzer** — 코스피 섹터별 ETF 보유종목과 밸류에이션(PER/PBR)을 한눈에 보여주는 정적 대시보드

- **핵심 가치**: 하나의 페이지에서 모든 KOSPI 섹터 ETF 보유종목의 PER/PBR을 비교
- **타겟 사용자**: 가치투자/퀀트투자 개인 투자자
- **차별점**: 섹터 간 밸류에이션 비교가 가능한 유일한 무료 대시보드
- **배포 방식**: GitHub Pages 정적 사이트 (서버 없음)

---

## 기술 스택

| 분류 | 기술 | 용도 |
|------|------|------|
| 프레임워크 | Next.js 14 (App Router) + TypeScript | SSG 정적 빌드 + GitHub Pages 배포 |
| 스타일링 | TailwindCSS v4 + shadcn/ui + Lucide React | 유틸리티 CSS + UI 컴포넌트 + 아이콘 |
| 차트 | Recharts | 바 차트, 스캐터 플롯, 히트맵 |
| 상태 관리 | Zustand | 필터/검색/UI 상태 |
| 데이터 수집 | Python 3.12 + requests + pandas | KRX 크롤링 + 데이터 정제 |
| CI/CD | GitHub Actions | 자동 데이터 수집 + 빌드/배포 |
| 배포 | GitHub Pages | 무료 정적 호스팅 |
| 테스트 | Vitest + Playwright | 단위 + E2E 테스트 |
| 린트 | ESLint + Prettier | 코드 품질 |

---

## 아키텍처

### 정적 사이트 + 데이터 파이프라인 분리 구조

```
[GitHub Actions Cron 매일 18:00 KST]
    → Python 수집 스크립트 실행
    → KRX 크롤링 (ETF 목록, 보유종목, PER/PBR)
    → JSON 파일 생성 → /public/data/
    → Next.js 빌드 (output: 'export')
    → GitHub Pages 배포
```

- **데이터 레이어**: Python 스크립트가 KRX에서 크롤링 → JSON 파일로 저장
- **프론트엔드**: Next.js가 빌드 시 JSON을 읽어서 정적 HTML 생성
- **런타임 데이터**: 클라이언트에서 `/data/*.json`을 fetch하여 필터/정렬에 사용
- **서버 없음**: 모든 데이터는 정적 JSON, 모든 페이지는 정적 HTML

### KRX 데이터 수집 전략

KRX 데이터시스템은 OTP 기반 POST 방식:

```python
# 1단계: OTP 토큰 생성
POST http://data.krx.co.kr/comm/fileDn/GenerateOTP/generate.cmd
Body: { mktId, searchType, ... name: 'fileDown', url: 'dbms/MDC/STAT/standard/...' }

# 2단계: CSV 다운로드
POST http://data.krx.co.kr/comm/fileDn/download_csv/download.cmd
Body: { code: <OTP 토큰> }
Headers: { Referer: 'http://data.krx.co.kr/...' }
```

수집 대상 3종:

| 데이터 | 엔드포인트 URL | 비고 |
|--------|---------------|------|
| ETF 전종목 시세 | MDCSTAT04301 | mktId=ALL |
| ETF PDF (보유종목) | MDCSTAT04601 | isuCd=종목코드, 개별 호출 |
| 종목별 PER/PBR | MDCSTAT03501 | mktId=STK (KOSPI 전체) |

---

## 디렉토리 구조

```
kospi-etf-analyzer/
├── .github/
│   └── workflows/
│       ├── collect-data.yml     # 매일 데이터 수집 워크플로우
│       └── deploy.yml           # 빌드 + GitHub Pages 배포
├── scripts/                     # Python 데이터 수집 스크립트
│   ├── collect_etf_list.py      # ETF 전종목 시세 크롤링
│   ├── collect_holdings.py      # ETF PDF(보유종목) 크롤링
│   ├── collect_valuation.py     # 개별종목 PER/PBR 크롤링
│   ├── merge_data.py            # JSON 통합 및 검증
│   ├── config.py                # 섹터 분류, ETF 티커 매핑
│   └── requirements.txt         # Python 의존성
├── public/
│   └── data/                    # 수집된 JSON 데이터
│       ├── etf-list.json
│       ├── etf-holdings.json
│       ├── stock-valuation.json
│       └── metadata.json
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx           # 루트 레이아웃 (네비게이션, 테마)
│   │   ├── page.tsx             # 홈: 섹터 대시보드
│   │   ├── sector/
│   │   │   └── [sectorCode]/
│   │   │       └── page.tsx     # 섹터 상세 (ETF 목록 + 보유종목)
│   │   ├── etf/
│   │   │   └── [ticker]/
│   │   │       └── page.tsx     # ETF 상세 (보유종목 테이블 + 차트)
│   │   └── stocks/
│   │       └── page.tsx         # 전체 종목 탐색
│   ├── components/
│   │   ├── dashboard/           # 대시보드 전용
│   │   │   ├── SectorCard.tsx   # 섹터 요약 카드
│   │   │   ├── SectorCompareChart.tsx  # 섹터 비교 바 차트
│   │   │   └── ValuationHeatmap.tsx    # PER/PBR 히트맵
│   │   ├── sector/              # 섹터 상세 전용
│   │   │   ├── EtfTable.tsx     # ETF 목록 테이블
│   │   │   └── HoldingsPanel.tsx # 보유종목 패널
│   │   ├── etf/                 # ETF 상세 전용
│   │   │   ├── HoldingsTable.tsx # 보유종목 테이블
│   │   │   └── ScatterPlot.tsx  # PER/PBR 분포 차트
│   │   ├── stocks/              # 전체 종목 전용
│   │   │   ├── StockTable.tsx   # 종목 통합 테이블
│   │   │   └── FilterPanel.tsx  # 필터 패널
│   │   ├── common/              # 공통 컴포넌트
│   │   │   ├── DataLoader.tsx   # JSON 데이터 로딩 + 에러 처리
│   │   │   ├── Navbar.tsx       # 상단 네비게이션
│   │   │   ├── Footer.tsx       # 푸터 (데이터 출처, 갱신 시각)
│   │   │   └── ValueBadge.tsx   # PER/PBR 색상 배지
│   │   └── ui/                  # shadcn/ui 컴포넌트
│   ├── hooks/
│   │   ├── useEtfData.ts        # ETF 데이터 로딩 훅
│   │   ├── useValuation.ts      # 밸류에이션 데이터 로딩 훅
│   │   └── useFilter.ts         # 필터/검색 상태 훅
│   ├── store/
│   │   └── filter-store.ts      # Zustand: 필터/정렬/검색 상태
│   ├── lib/
│   │   ├── data-loader.ts       # JSON fetch + 캐싱 유틸리티
│   │   ├── valuation-utils.ts   # PER/PBR 등급 계산, 색상 매핑
│   │   ├── sector-config.ts     # 섹터 코드/이름/색상 매핑
│   │   └── utils.ts             # 숫자 포맷, 날짜 포맷 등
│   ├── types/
│   │   ├── etf.ts               # ETF, Sector, Holding 타입
│   │   ├── stock.ts             # Stock, Valuation 타입
│   │   └── filter.ts            # Filter, SortOption 타입
│   └── constants/
│       ├── sectors.ts           # KOSPI 섹터 분류 상수
│       └── valuation-thresholds.ts  # PER/PBR 등급 기준값
├── tests/
│   ├── unit/                    # Vitest 단위 테스트
│   │   ├── valuation-utils.test.ts
│   │   ├── data-loader.test.ts
│   │   └── filter-store.test.ts
│   ├── integration/             # 통합 테스트
│   │   └── data-pipeline.test.ts
│   └── e2e/                     # Playwright E2E 테스트
│       ├── dashboard.spec.ts
│       └── filter.spec.ts
├── docs/
│   └── PRD.md                   # 상세 기획서
├── CLAUDE.md                    # 이 파일 (AI 컨텍스트)
├── README.md                    # 프로젝트 소개 + 실행 방법
├── PROGRESS.md                  # 개발 진행 기록
├── ROADMAP.md                   # 개발 로드맵
├── MANUAL.md                    # Claude Code 실행 매뉴얼
├── .env.example                 # 환경 변수 템플릿
├── next.config.ts               # Next.js 설정 (SSG + basePath)
├── tailwind.config.ts           # TailwindCSS 설정
├── tsconfig.json                # TypeScript 설정
├── vitest.config.ts             # Vitest 설정
├── playwright.config.ts         # Playwright 설정
└── package.json
```

---

## 코드 컨벤션

### 일반

- **언어**: TypeScript strict 모드
- **린트**: ESLint + Prettier
- **네이밍**: 컴포넌트 PascalCase, 함수/변수 camelCase, 상수 UPPER_SNAKE_CASE
- **파일명**: 컴포넌트 PascalCase.tsx, 유틸/훅 kebab-case.ts

### 컴포넌트 구조

- 서버 컴포넌트 기본, 클라이언트 상태 필요 시 `'use client'` 명시
- props 타입은 컴포넌트 파일 상단에 `interface` 또는 `type`으로 정의
- UI 로직과 비즈니스 로직 분리: 훅에서 데이터/로직 처리, 컴포넌트는 렌더링만

### 상태 관리

- Zustand 스토어는 `store/` 디렉토리에 기능별 분리
- JSON 데이터는 커스텀 훅 (`useEtfData`, `useValuation`)에서 fetch + 캐싱
- 필터/정렬/검색 상태만 Zustand로 관리

### 데이터 흐름

```
JSON 파일 → useEtfData/useValuation 훅 → 컴포넌트 props → 렌더링
                                            ↕
                              Zustand (filter-store) → 필터/정렬 적용
```

### Python 스크립트 컨벤션

- `scripts/` 디렉토리에 기능별 분리
- 각 스크립트는 독립 실행 가능 (`if __name__ == '__main__':`)
- 에러 발생 시 exit code 1 반환 (GitHub Actions 실패 감지)
- 로깅: `logging` 모듈 사용, INFO 레벨 기본

### Git 컨벤션

- **브랜치명**: 영어 (`feature/dashboard-ui`, `fix/krx-crawler`)
- **커밋 메시지**: 한국어, **왜(why) 중심** 작성
- `git add`는 명시적 파일 지정 (`.` 또는 `-A` 지양)

#### 커밋 메시지 형식

```text
<타입>: <변경 내용 요약>

<변경 이유 및 기술적 결정 배경 (선택, 2~3문장)>
```

**타입**: `feat` / `fix` / `refactor` / `test` / `docs` / `chore` / `data`

---

## 환경 변수

```env
# GitHub Pages
NEXT_PUBLIC_BASE_PATH=/kospi-etf-analyzer  # GitHub Pages 서브경로

# 데이터 수집 (GitHub Actions 시크릿으로 관리 — 현재는 불필요)
# KRX 공개 데이터는 인증 없이 접근 가능
```

---

## 개발 명령어

```bash
# 프론트엔드
npm run dev        # 개발 서버 (http://localhost:3000)
npm run build      # 프로덕션 빌드 (정적 HTML 내보내기)
npm run lint       # ESLint 검사
npm run test       # Vitest 단위 테스트
npm run test:e2e   # Playwright E2E 테스트

# 데이터 수집
cd scripts
pip install -r requirements.txt
python collect_etf_list.py       # ETF 목록 수집
python collect_holdings.py       # 보유종목 수집
python collect_valuation.py      # PER/PBR 수집
python merge_data.py             # JSON 통합 + 검증
```

---

## 주요 문서

| 문서 | 경로 | 설명 |
|------|------|------|
| 상세 PRD | `docs/PRD.md` | 문제 정의, 기능 명세, 데이터 모델, 아키텍처 |
| README | `README.md` | 프로젝트 소개, 기술 스택, 실행 방법, 배포 |
| 실행 매뉴얼 | `MANUAL.md` | Claude Code에서 순차 실행할 프롬프트 목록 |
| 진행 기록 | `PROGRESS.md` | Phase별 개발 진행 상황 추적 |
| 로드맵 | `ROADMAP.md` | 4주 4 Phase 개발 계획 |
