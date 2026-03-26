# KOSPI ETF Sector Analyzer

코스피 섹터별 ETF 보유종목의 PER·PBR 밸류에이션을 한눈에 비교하는 정적 대시보드입니다.

**[사이트 바로가기 →](https://rynnkitty.github.io/kospi-etf-analyzer)**

---

## 무엇을 보여주나요?

- **섹터별 ETF 목록** — IT·금융·에너지·헬스케어 등 KOSPI 주요 섹터 ETF
- **보유종목 밸류에이션** — ETF가 담고 있는 종목들의 PER·PBR·ROE·부채비율
- **섹터 간 비교 차트** — 어느 섹터가 상대적으로 저평가인지 한눈에 확인
- **상대 저평가 TOP 10** — PER·PBR·ROE·업종 상대 위치를 복합 스코어링하여 가치투자 후보 종목 자동 선별
- **전체 종목 탐색** — 필터·정렬로 KOSPI 전 종목 밸류에이션 검색

---

## 스크린샷

> 대시보드 홈 — 섹터별 밸류에이션 카드 및 상대 저평가 TOP 10

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) + TypeScript |
| 스타일링 | TailwindCSS v4 + shadcn/ui |
| 차트 | Recharts |
| 상태 관리 | Zustand |
| 데이터 수집 | Python 3.12 + requests + pandas |
| 배포 | GitHub Pages (정적 사이트) |
| CI/CD | GitHub Actions (매일 18:00 KST 자동 수집 + 빌드) |

---

## 데이터 출처 및 갱신 주기

- **ETF 목록·보유종목**: KRX 데이터시스템 (data.krx.co.kr)
- **PER·PBR·EPS**: KRX 종목별 시세 데이터
- **ROE·부채비율**: NAVER 금융 (finance.naver.com)
- **갱신**: 매일 오후 6시 (KST) GitHub Actions 자동 실행

---

## 로컬 실행

### 프론트엔드

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # 정적 빌드 (out/ 폴더)
```

### 데이터 수집

```bash
cd scripts
pip install -r requirements.txt

python collect_etf_list.py    # ETF 목록
python collect_holdings.py    # 보유종목
python collect_valuation.py   # PER·PBR·ROE·부채비율
python merge_data.py          # JSON 통합 및 검증
```

수집된 데이터는 `public/data/`에 JSON으로 저장됩니다.

---

## 상대 저평가 TOP 10 스코어링 기준

절대적인 매수 추천이 아닌, 추가 검토 후보 선별 목적입니다.

**KOSPI 필터 조건** (절대 또는 상대 기준 중 하나 충족 + 그레이엄 조건)
- PER 0.5 ~ 15 또는 업종 평균의 70% 이하
- PBR 0.1 ~ 1.0 또는 업종 평균의 70% 이하
- PER × PBR ≤ 22.5 (Benjamin Graham 기준)

**복합 스코어 (낮을수록 상위)**
```
점수 = PER 백분위 × 30% + PBR 백분위 × 25%
       + ROE 백분위 × 25% + 업종 상대 위치 × 20%
       (배당수익률 ≥ 2% 시 -5점 보너스)
```

ROE < 5% 또는 부채비율 > 150% 종목에는 ⚠️ 가치 함정 경고가 표시됩니다.

---

## 면책 조항

본 서비스는 투자 참고용이며, 투자 판단의 책임은 본인에게 있습니다.

---

Made by [kimkitty.net](https://kimkitty.net)
