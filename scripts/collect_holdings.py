"""
collect_holdings.py — NAVER Finance ETF 보유종목 HTML 스크래핑 → etf-holdings.json 생성

데이터 소스: https://finance.naver.com/item/main.nhn?code={ticker}
tb_type1 테이블 중 구성비중(%) 컬럼이 있는 테이블에서 상위 N개 추출
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
    SECTOR_ETFS,
    KOSDAQ_SECTOR_ETFS,
    REQUEST_DELAY_SEC,
    MAX_RETRY,
    HOLDINGS_TOP_N,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

KST = timezone(timedelta(hours=9))


def fetch_holdings_page(
    session: requests.Session,
    ticker: str,
    max_retry: int = MAX_RETRY,
) -> BeautifulSoup | None:
    """NAVER Finance ETF 메인 페이지 HTML 가져오기"""
    url = NAVER_STOCK_MAIN.format(code=ticker)
    for attempt in range(1, max_retry + 1):
        try:
            resp = session.get(url, headers=NAVER_HEADERS, timeout=30)
            resp.raise_for_status()
            return BeautifulSoup(resp.content, "html.parser")
        except Exception as exc:
            logger.warning(
                "ETF %s — 시도 %d/%d 실패: %s", ticker, attempt, max_retry, exc
            )
            if attempt < max_retry:
                time.sleep(REQUEST_DELAY_SEC * 2)
    logger.error("ETF %s — 페이지 로드 최대 재시도 초과", ticker)
    return None


def parse_holdings(soup: BeautifulSoup, top_n: int = HOLDINGS_TOP_N) -> list[dict]:
    """
    NAVER Finance ETF 메인 페이지에서 구성종목 추출

    대상 테이블: tb_type1 중 '구성비중(%)' 컬럼이 있는 테이블
    각 행의 첫 번째 <a href> 에서 종목코드 추출
    """
    if soup is None:
        return []

    tables = soup.find_all("table", class_="tb_type1")
    target_table = None

    for table in tables:
        headers_text = " ".join(
            th.get_text(strip=True) for th in table.find_all("th")
        )
        # 구성비중 또는 % 가 헤더에 있는 테이블
        if "비중" in headers_text or "%" in headers_text:
            target_table = table
            break

    if target_table is None:
        logger.debug("구성종목 테이블 없음")
        return []

    results: list[dict] = []
    rows = target_table.find_all("tr")

    for row in rows:
        cells = row.find_all("td")
        if not cells:
            continue

        # 첫 번째 셀에서 종목코드(링크) 추출
        first_cell = cells[0]
        link = first_cell.find("a", href=True)
        if not link:
            continue

        href = link.get("href", "")
        code_match = re.search(r"code=(\d{6})", href)
        if not code_match:
            continue

        holding_ticker = code_match.group(1)
        holding_name = link.get_text(strip=True)

        # 구성비중 추출 (% 포함 또는 세 번째 셀)
        weight = None
        for cell in cells[1:4]:
            cell_text = cell.get_text(strip=True).replace(",", "").replace("%", "")
            try:
                val = float(cell_text)
                # 비중은 0~100 범위
                if 0 < val < 100:
                    weight = val
                    break
            except ValueError:
                continue

        if not holding_ticker or not holding_name:
            continue

        results.append({
            "ticker": holding_ticker,
            "name": holding_name,
            "weight": weight,
        })

        if len(results) >= top_n:
            break

    return results


def load_etf_name_map() -> dict[str, str]:
    """etf-list.json + kosdaq-etf-list.json에서 {ticker: name} 맵 로드"""
    result: dict[str, str] = {}
    for filename in ("etf-list.json", "kosdaq-etf-list.json"):
        path = os.path.join(OUTPUT_DIR, filename)
        if not os.path.exists(path):
            logger.warning("%s 없음 — ETF 이름을 티커로 대체합니다", filename)
            continue
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        for sector in data.get("sectors", []):
            for etf in sector.get("etfs", []):
                result[etf["ticker"]] = etf["name"]
    return result


def save_json(data: dict, filename: str) -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    logger.info("저장 완료: %s", path)


def main() -> None:
    logger.info("=== ETF 보유종목 수집 시작 (NAVER Finance 스크래핑) ===")
    try:
        etf_name_map = load_etf_name_map()
        session = requests.Session()
        holdings_output: dict[str, dict] = {}

        # KOSPI + KOSDAQ ETF 통합 수집
        all_tickers = sorted(
            set(t for tickers in SECTOR_ETFS.values() for t in tickers)
            | set(t for tickers in KOSDAQ_SECTOR_ETFS.values() for t in tickers)
        )
        total = len(all_tickers)

        for idx, ticker in enumerate(all_tickers, start=1):
            etf_name = etf_name_map.get(ticker, ticker)
            logger.info(
                "[%d/%d] ETF %s (%s) 보유종목 수집 중…",
                idx, total, ticker, etf_name,
            )

            soup = fetch_holdings_page(session, ticker)
            top_holdings = parse_holdings(soup)

            holdings_output[ticker] = {
                "etf_name": etf_name,
                "top_holdings": top_holdings,
            }
            logger.info("  → 보유종목 %d개 수집", len(top_holdings))

            if idx < total:
                time.sleep(REQUEST_DELAY_SEC)

        output = {
            "updated_at": datetime.now(KST).isoformat(timespec="seconds"),
            "holdings": holdings_output,
        }
        save_json(output, "etf-holdings.json")
        logger.info("=== ETF 보유종목 수집 완료 ===")

    except Exception as exc:
        logger.error("수집 실패: %s", exc, exc_info=True)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
