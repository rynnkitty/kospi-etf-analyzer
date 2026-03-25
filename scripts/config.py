# config.py — 데이터 수집 설정 및 섹터/ETF 매핑
import os
import ssl
import urllib3

# ──────────────────────────────────────────────
# SSL 검증 비활성화 패치 (기업 네트워크 SSL 인스펙션 우회)
# GitHub Actions 환경에서는 불필요하지만 로컬 개발 환경 호환을 위해 적용
# ──────────────────────────────────────────────
def apply_ssl_patch():
    """모든 requests/urllib 호출에 SSL 검증 비활성화 적용"""
    ssl._create_default_https_context = ssl._create_unverified_context
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    import requests
    from requests.adapters import HTTPAdapter

    class NoSSLAdapter(HTTPAdapter):
        def send(self, request, **kwargs):
            kwargs["verify"] = False
            return super().send(request, **kwargs)

    _orig_init = requests.Session.__init__

    def _patched_init(self, *args, **kwargs):
        _orig_init(self, *args, **kwargs)
        self.mount("https://", NoSSLAdapter())
        self.mount("http://", NoSSLAdapter())
        self.verify = False

    requests.Session.__init__ = _patched_init

    # requests.get / requests.post 직접 호출 패치 (pykrx 등 내부 사용)
    _orig_get = requests.get
    _orig_post = requests.post

    def _patched_get(url, **kw):
        kw["verify"] = False
        return _orig_get(url, **kw)

    def _patched_post(url, **kw):
        kw["verify"] = False
        return _orig_post(url, **kw)

    requests.get = _patched_get
    requests.post = _patched_post


# 패치 즉시 적용 (다른 모듈 import 전에)
apply_ssl_patch()

# ──────────────────────────────────────────────
# NAVER Finance URL 상수
# ──────────────────────────────────────────────
NAVER_STOCK_MAIN = "https://finance.naver.com/item/main.nhn?code={code}"
NAVER_ETF_LIST_API = "https://finance.naver.com/api/sise/etfItemList.nhn"

NAVER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Referer": "https://finance.naver.com/",
}

# ──────────────────────────────────────────────
# 출력 디렉토리
# ──────────────────────────────────────────────
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(SCRIPTS_DIR, "..", "public", "data")

# ──────────────────────────────────────────────
# KOSPI 섹터 코드 → 섹터명 매핑 (GICS 기반)
# ──────────────────────────────────────────────
SECTORS = {
    "G10": "에너지",
    "G15": "소재",
    "G20": "산업재",
    "G25": "경기소비재",
    "G30": "필수소비재",
    "G35": "건강관리",
    "G40": "금융",
    "G45": "IT",
    "G50": "통신서비스",
    "G55": "유틸리티",
}

# ──────────────────────────────────────────────
# 섹터별 대표 ETF 티커 매핑
# 각 섹터별 2~3개 ETF (KRX 종목코드 6자리)
#
# 선정 기준:
#   - KRX에서 실제 거래되는 섹터 인덱스 ETF
#   - 순자산(AUM) 상위 종목 우선
#   - NAVER Finance에서 구성종목 조회 가능한 ETF
# ──────────────────────────────────────────────
SECTOR_ETFS: dict[str, list[str]] = {
    "G10": [  # 에너지/화학
        "117460",   # KODEX 에너지화학   (333억)
        "139250",   # TIGER 200 에너지화학 (307억)
    ],
    "G15": [  # 소재/철강
        "117680",   # KODEX 철강         (259억)
        "139240",   # TIGER 200 철강소재  (74억)
    ],
    "G20": [  # 산업재/건설/기계
        "117700",   # KODEX 건설         (937억)
        "102960",   # KODEX 기계장비     (196억)
    ],
    "G25": [  # 경기소비재
        "091180",   # KODEX 자동차       (5453억)
        "139290",   # TIGER 200 경기소비재 (85억)
    ],
    "G30": [  # 필수소비재
        "266410",   # KODEX 필수소비재   (148억)
        "227560",   # TIGER 200 생활소비재 (45억)
    ],
    "G35": [  # 건강관리/바이오
        "143860",   # TIGER 헬스케어     (2068억)
        "244580",   # KODEX 바이오       (2847억)
    ],
    "G40": [  # 금융/은행/증권
        "091170",   # KODEX 은행         (4721억)
        "102970",   # KODEX 증권         (10119억)
        "139270",   # TIGER 200 금융     (441억)
    ],
    "G45": [  # IT/반도체
        "396500",   # TIGER 반도체TOP10  (88046억)
        "091160",   # KODEX 반도체       (41470억)
        "139260",   # TIGER 200 IT       (9554억)
    ],
    "G50": [  # 통신서비스
        "315270",   # TIGER 200 커뮤니케이션서비스 (66억)
    ],
    "G55": [  # 유틸리티 (국내 순수 유틸리티 ETF 상장폐지로 빈 섹터)
        # 139300 TIGER 200 유틸리티: 상장폐지
    ],
}

# 모든 ETF 티커 (중복 제거, 편의용)
ALL_ETF_TICKERS: list[str] = sorted(
    set(ticker for tickers in SECTOR_ETFS.values() for ticker in tickers)
)

# ──────────────────────────────────────────────
# 크롤링 파라미터
# ──────────────────────────────────────────────
REQUEST_DELAY_SEC = 1.0     # 요청 간 딜레이 (초)
MAX_RETRY = 3               # 최대 재시도 횟수
HOLDINGS_TOP_N = 20         # ETF별 상위 보유종목 수
