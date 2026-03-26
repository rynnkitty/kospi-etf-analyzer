"""
collect_valuation.py — NAVER Finance PER/PBR/배당수익률 스크래핑 → stock-valuation.json 생성

데이터 소스: https://finance.naver.com/item/main.nhn?code={ticker}
per_table 에서 PER, EPS, PBR, BPS, 배당수익률 추출

수집 대상: etf-holdings.json에 등장하는 모든 보유 종목
(etf-holdings.json 이 없으면 KOSPI 전종목 대신 경고 후 빈 파일 생성)
"""

import json
import logging
import os
import re
import time
from datetime import datetime, timezone, timedelta

import requests
from bs4 import BeautifulSoup

# config 임포트 시 SSL 패치 자동 적용
from config import (
    NAVER_STOCK_MAIN,
    NAVER_HEADERS,
    OUTPUT_DIR,
    REQUEST_DELAY_SEC,
    MAX_RETRY,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

KST = timezone(timedelta(hours=9))


def load_holding_tickers() -> list[str]:
    """etf-holdings.json에서 보유종목 티커 목록 추출 (중복 제거)"""
    path = os.path.join(OUTPUT_DIR, "etf-holdings.json")
    if not os.path.exists(path):
        logger.warning("etf-holdings.json 없음 — collect_holdings.py 먼저 실행하세요")
        return []

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    tickers: set[str] = set()
    for etf_info in data.get("holdings", {}).values():
        for holding in etf_info.get("top_holdings", []):
            tickers.add(holding["ticker"])

    logger.info("보유종목 티커 %d개 (중복 제거)", len(tickers))
    return sorted(tickers)


def fetch_stock_page(
    session: requests.Session,
    ticker: str,
    max_retry: int = MAX_RETRY,
) -> BeautifulSoup | None:
    """NAVER Finance 종목 메인 페이지 HTML 가져오기"""
    url = NAVER_STOCK_MAIN.format(code=ticker)
    for attempt in range(1, max_retry + 1):
        try:
            resp = session.get(url, headers=NAVER_HEADERS, timeout=30)
            resp.raise_for_status()
            return BeautifulSoup(resp.content, "html.parser")
        except Exception as exc:
            logger.debug(
                "종목 %s — 시도 %d/%d 실패: %s", ticker, attempt, max_retry, exc
            )
            if attempt < max_retry:
                time.sleep(REQUEST_DELAY_SEC * 2)
    return None


def parse_valuation(soup: BeautifulSoup) -> dict:
    """
    NAVER Finance per_table에서 PER/EPS/PBR/BPS/배당수익률 추출

    per_table 행 구조 예:
      Row 1: PER|EPS(2025.12)  →  17.39배|58,955원
      Row 2: 선행PER|EPS       →  5.00배|186,967원
      Row 3: PBR|BPS(2025.12)  →  5.87배|174,539원
      Row 4: 배당수익률         →  0.29%
    """
    result = {
        "per": None,
        "eps": None,
        "pbr": None,
        "bps": None,
        "dividend_yield": None,
        "close": None,
        "market_cap": None,
    }

    if soup is None:
        return result

    # ── 1) per_table 파싱 ─────────────────────────────
    per_table = soup.find("table", class_="per_table")
    if per_table:
        rows = per_table.find_all("tr")
        for row in rows:
            td = row.find("td")
            if not td:
                continue
            td_text = td.get_text(" ", strip=True)

            # "배" 단위 + "원" 단위 값 파싱 (예: "17.39배|58,955원")
            # 선행PER 행도 같은 패턴이지만 첫 번째 PER 행만 사용
            th = row.find("th")
            th_text = (th.get_text(strip=True) if th else "").upper()

            nums = re.findall(r"[\d,]+(?:\.\d+)?", td_text)
            cleaned = [n.replace(",", "") for n in nums if n]

            if "PBR" in th_text and result["pbr"] is None:
                # PBR|BPS 행
                if len(cleaned) >= 1:
                    result["pbr"] = _to_float(cleaned[0])
                if len(cleaned) >= 2:
                    result["bps"] = _to_int(cleaned[1])
            elif "PER" in th_text and "선행" not in th_text and result["per"] is None:
                # PER|EPS 행 (선행 제외, 첫 번째만)
                if len(cleaned) >= 1:
                    result["per"] = _to_float(cleaned[0])
                if len(cleaned) >= 2:
                    result["eps"] = _to_int(cleaned[1])
            elif "배당" in th_text:
                # 배당수익률 행
                if cleaned:
                    result["dividend_yield"] = _to_float(cleaned[0])

    # ── 2) 현재가 / 시가총액 파싱 (tb_type1 테이블) ────
    # sise 영역 또는 가격 테이블에서 현재가 추출
    price = _parse_current_price(soup)
    if price:
        result["close"] = price

    mktcap = _parse_market_cap(soup)
    if mktcap:
        result["market_cap"] = mktcap

    return result


def _parse_current_price(soup: BeautifulSoup) -> int | None:
    """현재가 추출 — p.no_today > em > span.blind"""
    # 방법 1: NAVER Finance 표준 위치 (p.no_today > span.blind)
    no_today = soup.find("p", class_="no_today")
    if no_today:
        blind = no_today.find("span", class_="blind")
        if blind:
            val = _to_int(blind.get_text(strip=True))
            if val and val > 0:
                return val

    # 방법 2: strong/span with id _nowVal
    for attr in [{"id": "_nowVal"}, {"class": "today_num"}]:
        tag = soup.find(attrs=attr)
        if tag:
            val = _to_int(tag.get_text(strip=True))
            if val and val > 0:
                return val

    return None


def _parse_market_cap(soup: BeautifulSoup) -> int | None:
    """시가총액 추출 (단위: 억원 → 원으로 변환)"""
    # 방법 1: NAVER Finance 표준 — em#_market_sum
    tag = soup.find("em", {"id": "_market_sum"})
    if tag:
        val = _to_int(tag.get_text(strip=True))
        if val and val > 0:
            return val * 100_000_000

    # 방법 2: tb_type1 테이블에서 시가총액 행의 첫 번째 em/span
    for t in soup.find_all("table", class_="tb_type1"):
        for tr in t.find_all("tr"):
            th = tr.find("th")
            td = tr.find("td")
            if th and td and "시가총액" in th.get_text():
                num_tag = td.find("em") or td.find("span", class_="num")
                if num_tag:
                    val = _to_int(num_tag.get_text(strip=True))
                    if val and val > 0:
                        return val * 100_000_000
                # fallback: 셀 내 첫 번째 숫자
                m = re.search(r"([\d,]+)", td.get_text())
                if m:
                    val = _to_int(m.group(1))
                    if val and val > 0:
                        return val * 100_000_000

    # 방법 3: 페이지 전체 텍스트에서 "시가총액 X,XXX 억" 패턴
    full_text = soup.get_text(" ")
    m = re.search(r"시가총액\s+([\d,]+)\s*억", full_text)
    if m:
        val = _to_int(m.group(1))
        if val and val > 0:
            return val * 100_000_000

    return None


def _to_float(val, default=None):
    try:
        s = str(val).replace(",", "").strip()
        if s in ("", "-", "N/A", "nan"):
            return default
        return float(s)
    except (ValueError, TypeError):
        return default


def _to_int(val, default=None):
    try:
        s = str(val).replace(",", "").strip()
        if s in ("", "-", "N/A", "nan"):
            return default
        return int(float(s))
    except (ValueError, TypeError):
        return default


NAVER_MOBILE_FINANCE_URL = "https://m.stock.naver.com/api/stock/{code}/finance/annual"


def fetch_financial_summary(
    session: requests.Session,
    ticker: str,
    max_retry: int = MAX_RETRY,
) -> dict | None:
    """
    NAVER 모바일 재무 API (JSON) 호출.

    반환: API 응답 dict, 실패 시 None
    URL: https://m.stock.naver.com/api/stock/{ticker}/finance/annual
    """
    url = NAVER_MOBILE_FINANCE_URL.format(code=ticker)
    for attempt in range(1, max_retry + 1):
        try:
            resp = session.get(url, headers=NAVER_HEADERS, timeout=30)
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:
            logger.debug(
                "종목 %s finance API 시도 %d/%d 실패: %s", ticker, attempt, max_retry, exc
            )
            if attempt < max_retry:
                time.sleep(REQUEST_DELAY_SEC * 2)
    return None


def parse_financial_summary(api_data: dict | None) -> dict:
    """
    NAVER 모바일 재무 API 응답에서 ROE와 부채비율 추출.

    전략:
      - trTitleList에서 isConsensus=N인 기간 중 가장 최근 key 선택
      - rowList에서 title이 'ROE' / '부채비율'인 행의 해당 기간 값 파싱
    """
    result = {"roe": None, "debt_ratio": None}

    if not api_data:
        return result

    finance_info = api_data.get("financeInfo") or {}

    # ── 1) 최근 확정 실적 기간 key 결정 ───────────────────────────
    period_list = finance_info.get("trTitleList", [])
    actual_keys = [p["key"] for p in period_list if p.get("isConsensus") == "N"]
    if not actual_keys:
        return result
    latest_key = actual_keys[-1]  # 가장 최근 확정 기간

    # ── 2) ROE / 부채비율 행 파싱 ─────────────────────────────────
    for row in finance_info.get("rowList", []):
        title = row.get("title", "")
        val_str = row.get("columns", {}).get(latest_key, {}).get("value", "")
        val = _to_float(str(val_str).replace(",", ""))

        if title == "ROE" and result["roe"] is None:
            result["roe"] = val
        elif title == "부채비율" and result["debt_ratio"] is None:
            result["debt_ratio"] = val

        if result["roe"] is not None and result["debt_ratio"] is not None:
            break

    return result


def save_json(data: dict, filename: str) -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    logger.info("저장 완료: %s", path)


def main() -> None:
    logger.info("=== 종목 밸류에이션 수집 시작 (NAVER Finance 스크래핑) ===")
    try:
        tickers = load_holding_tickers()
        if not tickers:
            logger.error("수집할 종목 없음 — collect_holdings.py를 먼저 실행하세요")
            raise SystemExit(1)

        session = requests.Session()
        stocks_output: dict[str, dict] = {}
        total = len(tickers)
        failed = 0

        for idx, ticker in enumerate(tickers, start=1):
            logger.info("[%d/%d] 종목 %s 밸류에이션 수집 중…", idx, total, ticker)

            soup = fetch_stock_page(session, ticker)
            if soup is None:
                logger.warning("종목 %s 페이지 로드 실패, 건너뜀", ticker)
                failed += 1
                continue

            # 종목명
            title_tag = soup.find("title")
            name = ""
            if title_tag:
                title = title_tag.get_text(strip=True)
                # "KODEX 반도체 : Npay 증권" → "KODEX 반도체"
                name = title.split(":")[0].split("::")[0].strip()

            valuation = parse_valuation(soup)

            # ── 모바일 재무 API: ROE + 부채비율 ──────────────────────────
            time.sleep(REQUEST_DELAY_SEC)
            finance_api_data = fetch_financial_summary(session, ticker)
            fin_data = parse_financial_summary(finance_api_data)
            # ─────────────────────────────────────────────────────────────

            stocks_output[ticker] = {
                "name": name,
                "market": "KOSPI",
                **valuation,
                **fin_data,
            }

            if idx % 10 == 0:
                logger.info("  진행: %d/%d (실패: %d)", idx, total, failed)

            if idx < total:
                time.sleep(REQUEST_DELAY_SEC)

        logger.info(
            "수집 완료: %d개 성공, %d개 실패 (전체 %d개)",
            len(stocks_output), failed, total,
        )

        output = {
            "updated_at": datetime.now(KST).isoformat(timespec="seconds"),
            "stocks": stocks_output,
        }
        save_json(output, "stock-valuation.json")
        logger.info("=== 종목 밸류에이션 수집 완료 ===")

    except SystemExit:
        raise
    except Exception as exc:
        logger.error("수집 실패: %s", exc, exc_info=True)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
