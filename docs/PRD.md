# PRD (Product Requirements Document)

# KOSPI ETF Sector Analyzer — 코스피 섹터별 ETF 보유종목 & 밸류에이션 대시보드

---

## 1. 문제 정의

### 해결하려는 문제

한국 주식시장 투자자가 KOSPI 섹터별 ETF의 구성 종목과 각 종목의 핵심 밸류에이션 지표(PBR, PER)를 파악하려면 여러 사이트(KRX, 네이버 금융, ETF 운용사 사이트 등)를 일일이 방문해야 한다. 이 과정은 반복적이고 시간이 오래 걸리며, 섹터 간 비교가 불가능하다.

### 타겟 사용자

- 가치투자/퀀트투자에 관심 있는 개인 투자자
- 섹터 로테이션 전략을 사용하는 트레이더
- 포트폴리오 구성 시 ETF 보유종목의 밸류에이션을 빠르게 확인하고 싶은 사람

### 핵심 가치

- **원스톱**: 하나의 대시보드에서 모든 KOSPI 섹터 ETF의 보유종목 + PBR/PER 확인
- **자동 갱신**: 매일 장 마감 후 자동으로 데이터를 수집하여 최신 상태 유지
- **무료 & 독립 실행**: 외부 유료 API 없이, 공개 데이터만으로 동작

### 차별점 (기존 솔루션과의 비교)

| 기능 | 네이버 금융 | KRX 데이터 | ETF 운용사 사이트 | **본 프로젝트** |
|------|------------|-----------|------------------|----------------|
| 섹터별 ETF 목록 | △ | ○ | × (자사만) | ○ |
| ETF 보유종목 조회 | ○ (개별) | ○ (개별) | ○ (개별) | ○ (전체 통합) |
| 종목별 PER/PBR | ○ (개별) | ○ (개별) | × | ○ (일괄) |
| 섹터 간 비교 | × | × | × | **○** |
| 자동 갱신 | × | × | × | **○ (GitHub Actions)** |
| 필터/정렬/검색 | × | △ | × | **○** |

---

## 2. 기능 명세

### 2.1 MVP 핵심 기능

#### F1. 섹터별 ETF 목록 표시

- KOSPI 200 기반 섹터 인덱스 ETF를 카테고리별로 표시
- 섹터 분류: 에너지, 소재, 산업재, 경기소비재, 필수소비재, 건강관리, 금융, IT, 통신, 유틸리티
- 각 ETF의 기본 정보: 종목명, 종목코드, 운용사, 순자산, 수익률

#### F2. ETF 상위 보유종목 조회

- 선택한 ETF의 상위 보유종목(Top 10~20) 표시
- 보유 비중(%), 종목코드, 종목명 표시
- 데이터 출처: KRX PDF(Portfolio Deposit File) 크롤링

#### F3. 종목별 PER/PBR 표시

- 각 보유종목의 현재 PER, PBR, EPS, BPS, 배당수익률 표시
- 데이터 출처: KRX 개별종목 PER/PBR/배당수익률 데이터
- 색상 코딩: PER/PBR 수준에 따른 시각적 구분 (저평가/적정/고평가)

#### F4. 섹터 비교 대시보드

- 섹터별 평균 PER/PBR 요약 카드
- 섹터 간 밸류에이션 비교 차트 (바 차트)
- 전체 섹터 히트맵 (PER × PBR 매트릭스)

#### F5. 필터 & 정렬

- PER/PBR 범위 필터 (슬라이더)
- 종목명/코드 검색
- 정렬: PER, PBR, 시가총액, 보유비중 기준

#### F6. 자동 데이터 갱신

- GitHub Actions로 매일 한국시간 18:00 (장 마감 후) 데이터 수집 스크립트 실행
- 수집된 JSON 데이터를 GitHub Pages로 정적 배포

### 2.2 확장 기능 (Phase 2+)

- 종목별 PER/PBR 히스토리 차트 (시계열)
- 포트폴리오 중복 분석 (여러 ETF 선택 시 겹치는 종목 표시)
- 즐겨찾기 / 관심 종목 저장 (localStorage)
- 다크모드

---

## 3. 데이터 모델

### 3.1 데이터 수집 파이프라인

```
[GitHub Actions Cron] → [Python 수집 스크립트]
    ├── KRX: 섹터별 ETF 목록 + PDF(보유종목)
    ├── KRX: 개별종목 PER/PBR/배당수익률
    └── 결과 JSON 파일 → /public/data/ 디렉토리에 저장
        ├── etf-list.json        (섹터별 ETF 목록)
        ├── etf-holdings.json    (ETF별 보유종목)
        ├── stock-valuation.json (종목별 PER/PBR)
        └── metadata.json        (수집 일시, 버전)
```

### 3.2 JSON 스키마

#### etf-list.json

```json
{
  "updated_at": "2025-03-25T09:00:00+09:00",
  "sectors": [
    {
      "sector_code": "G10",
      "sector_name": "에너지",
      "etfs": [
        {
          "ticker": "117460",
          "name": "KODEX 에너지화학",
          "provider": "삼성자산운용",
          "nav": 1234567890,
          "return_1m": 2.5,
          "return_3m": -1.2
        }
      ]
    }
  ]
}
```

#### etf-holdings.json

```json
{
  "updated_at": "2025-03-25T09:00:00+09:00",
  "holdings": {
    "117460": {
      "etf_name": "KODEX 에너지화학",
      "top_holdings": [
        {
          "ticker": "096770",
          "name": "SK이노베이션",
          "weight": 25.3
        }
      ]
    }
  }
}
```

#### stock-valuation.json

```json
{
  "updated_at": "2025-03-25T09:00:00+09:00",
  "stocks": {
    "096770": {
      "name": "SK이노베이션",
      "market": "KOSPI",
      "close": 125000,
      "market_cap": 15000000000000,
      "per": 8.5,
      "pbr": 0.65,
      "eps": 14706,
      "bps": 192308,
      "dividend_yield": 3.2
    }
  }
}
```

---

## 4. 기술 아키텍처

### 4.1 전체 구조

```
┌─────────────────────────────────────────────────┐
│                  GitHub Repository                │
│                                                   │
│  ┌──────────────┐    ┌──────────────────────────┐│
│  │ Python 수집기 │    │  Next.js 프론트엔드       ││
│  │ /scripts/     │    │  /src/                    ││
│  │               │    │                           ││
│  │ • KRX 크롤러  │    │  • 대시보드 페이지        ││
│  │ • 데이터 파싱  │    │  • 섹터별 ETF 목록        ││
│  │ • JSON 생성   │    │  • ETF 상세 (보유종목)    ││
│  └──────┬───────┘    │  • 종목 밸류에이션 테이블  ││
│         │            └──────────┬───────────────┘│
│         ▼                       │                 │
│  ┌──────────────┐              │                 │
│  │ /public/data/ │◄─────────────┘                 │
│  │ (JSON 파일)   │   fetch()로 로드               │
│  └──────────────┘                                │
│                                                   │
│  ┌──────────────────────────────────────────────┐│
│  │ GitHub Actions                                ││
│  │ • 매일 18:00 KST: Python 수집 → JSON 갱신     ││
│  │ • Push 시: Next.js 빌드 → GitHub Pages 배포    ││
│  └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

### 4.2 기술 스택

| 분류 | 기술 | 선택 이유 |
|------|------|----------|
| 프레임워크 | Next.js 14 (App Router) + TypeScript | SSG로 정적 빌드, GitHub Pages 배포 최적 |
| 스타일링 | TailwindCSS v4 + shadcn/ui | 빠른 UI 개발, 일관된 디자인 시스템 |
| 차트 | Recharts | React 네이티브, 가볍고 선언적 |
| 상태 관리 | Zustand | 필터/검색 상태, 가볍고 보일러플레이트 적음 |
| 데이터 수집 | Python 3.12 + requests + pandas | KRX 크롤링에 최적, pandas로 데이터 정제 |
| CI/CD | GitHub Actions | 자동 데이터 수집 + 정적 사이트 빌드/배포 |
| 배포 | GitHub Pages | 무료, 정적 사이트에 최적, 별도 서버 불필요 |
| 테스트 | Vitest + Playwright | 단위 테스트 + E2E 테스트 |
| 린트 | ESLint + Prettier | 코드 품질 일관성 |

### 4.3 Next.js 정적 내보내기 설정

```typescript
// next.config.ts
const nextConfig = {
  output: 'export',           // 정적 HTML 내보내기
  basePath: '/kospi-etf-analyzer',  // GitHub Pages 서브경로
  images: { unoptimized: true },    // 정적 빌드 시 이미지 최적화 비활성화
};
```

### 4.4 데이터 수집 전략 (KRX 크롤링)

KRX 데이터시스템(`data.krx.co.kr`)은 OTP 기반 POST 요청으로 데이터를 제공한다.

```python
# 수집 흐름
1. OTP 생성: POST /comm/fileDn/GenerateOTP/generate.cmd
2. CSV 다운로드: POST /comm/fileDn/download_csv/download.cmd
3. pandas로 파싱 → JSON 변환
```

수집 대상 3종:

| 데이터 | KRX 메뉴 | 파라미터 |
|--------|---------|---------|
| ETF 전종목 시세 | MDC/STAT/standard/MDCSTAT04301 | mktId=ALL |
| ETF PDF (보유종목) | MDC/STAT/standard/MDCSTAT04601 | isuCd=ETF종목코드 |
| 개별종목 PER/PBR | MDC/STAT/standard/MDCSTAT03501 | mktId=STK (KOSPI) |

---

## 5. 페이지 구성

### P1. 홈 / 대시보드 (`/`)

- 섹터별 요약 카드 (10개 섹터)
- 각 카드: 섹터명, 대표 ETF 수, 평균 PER/PBR, 전일 대비 변동
- 섹터 밸류에이션 비교 바 차트
- 데이터 최종 갱신 시각

### P2. 섹터 상세 (`/sector/[sectorCode]`)

- 해당 섹터 ETF 목록 테이블
- ETF 클릭 시 보유종목 패널 오픈
- 보유종목별 PER/PBR 인라인 표시

### P3. ETF 상세 (`/etf/[ticker]`)

- ETF 기본 정보 (종목명, 운용사, 순자산, 수익률)
- 상위 보유종목 테이블 (비중, PER, PBR, EPS, BPS, 배당수익률)
- 보유종목 PER/PBR 분포 차트 (스캐터 플롯)

### P4. 전체 종목 탐색 (`/stocks`)

- 전체 ETF 보유 종목 통합 테이블
- 필터: PER 범위, PBR 범위, 섹터, 시가총액
- 정렬: 모든 컬럼 기준
- 검색: 종목명/코드

---

## 6. 비기능 요구사항

- **성능**: 정적 사이트이므로 초기 로딩 < 2초, JSON 데이터 로딩 < 1초
- **반응형**: 모바일/태블릿/데스크탑 모두 지원 (TailwindCSS breakpoints)
- **접근성**: ARIA 라벨, 키보드 네비게이션 지원
- **SEO**: 정적 HTML 내보내기로 검색엔진 크롤링 가능
- **데이터 신뢰성**: 수집 실패 시 이전 데이터 유지 (GitHub Actions에서 검증)

---

## 7. 개발 로드맵

### Phase 1: 데이터 파이프라인 (Week 1)

- Python 수집 스크립트 개발
- KRX 크롤링 (ETF 목록, PDF, PER/PBR)
- JSON 파일 생성 및 검증
- GitHub Actions 스케줄 설정

### Phase 2: 프론트엔드 MVP (Week 2)

- Next.js 프로젝트 설정 (SSG + GitHub Pages)
- 대시보드 페이지 (섹터 카드, 비교 차트)
- 섹터 상세 페이지 (ETF 목록 + 보유종목)
- ETF 상세 페이지 (보유종목 테이블)

### Phase 3: UX & 품질 (Week 3)

- 필터/정렬/검색 기능
- 전체 종목 탐색 페이지
- 반응형 디자인 최적화
- 테스트 작성 (단위 + E2E)
- CI/CD 파이프라인 완성

### Phase 4: 확장 (Week 4+)

- PER/PBR 히스토리 차트
- 포트폴리오 중복 분석
- 다크모드
- 성능 최적화
