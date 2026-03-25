"""
collect_etf_list.py — NAVER Finance ETF 목록 수집 → etf-list.json 생성

데이터 소스: NAVER Finance ETF 목록 API + FinanceDataReader
"""

import json
import logging
import os
import time
from datetime import datetime, timezone, timedelta

import requests

# config 임포트 시 SSL 패치 자동 적용
from config import (
    NAVER_ETF_LIST_API,
    NAVER_HEADERS,
    OUTPUT_DIR,
    SECTORS,
    SECTOR_ETFS,
    REQUEST_DELAY_SEC,
    MAX_RETRY,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

KST = timezone(timedelta(hours=9))


def fetch_naver_etf_list(max_retry: int = MAX_RETRY) -> dict[str, dict]:
    """
    NAVER Finance ETF 목록 API에서 전체 ETF 정보 수집

    Returns:
        {ticker: {name, nav, return_1m(추정), market_cap}} dict
    """
    session = requests.Session()
    for attempt in range(1, max_retry + 1):
        try:
            resp = session.get(NAVER_ETF_LIST_API, headers=NAVER_HEADERS, timeout=30)
            resp.raise_for_status()

            # API 응답: EUC-KR 인코딩 JSON
            content = resp.content.decode("euc-kr", errors="replace")
            data = json.loads(content)

            etf_items = data.get("result", {}).get("etfItemList", [])
            logger.info("NAVER ETF 목록 %d개 수신", len(etf_items))

            result: dict[str, dict] = {}
            for item in etf_items:
                ticker = str(item.get("itemcode", "")).zfill(6)
                if not ticker:
                    continue
                result[ticker] = {
                    "name": item.get("itemname", ""),
                    "nav": item.get("nav"),
                    "market_cap": item.get("marketSum"),
                    "change_rate": item.get("changeRate"),
                    "three_month_earn_rate": item.get("threeMonthEarnRate"),
                }
            return result

        except Exception as exc:
            logger.warning("시도 %d/%d 실패: %s", attempt, max_retry, exc)
            if attempt < max_retry:
                time.sleep(REQUEST_DELAY_SEC * 2)
            else:
                raise
    raise RuntimeError("NAVER ETF 목록 수집 실패")


def infer_provider(name: str) -> str:
    """ETF 이름에서 운용사 추정"""
    mapping = {
        "KODEX": "삼성자산운용",
        "TIGER": "미래에셋자산운용",
        "ARIRANG": "한화자산운용",
        "KBSTAR": "KB자산운용",
        "HANARO": "NH아문디자산운용",
        "KOSEF": "키움투자자산운용",
        "SOL": "신한자산운용",
        "ACE": "한국투자신탁운용",
        "PLUS": "우리자산운용",
        "FOCUS": "교보악사자산운용",
    }
    name_upper = name.upper()
    for brand, provider in mapping.items():
        if name_upper.startswith(brand):
            return provider
    return "기타"


def build_output(etf_map: dict[str, dict]) -> dict:
    """NAVER ETF 데이터 + config 섹터 매핑 → etf-list.json 스키마"""
    sectors_output = []
    matched_total = 0

    for sector_code, sector_name in SECTORS.items():
        etf_tickers = SECTOR_ETFS.get(sector_code, [])
        etfs_output = []

        for ticker in etf_tickers:
            if ticker not in etf_map:
                logger.warning(
                    "섹터 %s(%s): ETF %s — NAVER 목록에서 찾을 수 없음",
                    sector_code, sector_name, ticker,
                )
                continue

            info = etf_map[ticker]
            name = info["name"]
            etfs_output.append({
                "ticker": ticker,
                "name": name,
                "provider": infer_provider(name),
                "nav": info.get("nav"),
                "return_1m": None,          # NAVER API는 1개월 수익률 미제공
                "return_3m": info.get("three_month_earn_rate"),
            })
            matched_total += 1

        sectors_output.append({
            "sector_code": sector_code,
            "sector_name": sector_name,
            "etfs": etfs_output,
        })

    logger.info("섹터 %d개, ETF %d개 매핑 완료", len(sectors_output), matched_total)
    return {
        "updated_at": datetime.now(KST).isoformat(timespec="seconds"),
        "sectors": sectors_output,
    }


def save_json(data: dict, filename: str) -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    logger.info("저장 완료: %s", path)


def main() -> None:
    logger.info("=== ETF 목록 수집 시작 (NAVER Finance) ===")
    try:
        etf_map = fetch_naver_etf_list()
        output = build_output(etf_map)

        # 수집 결과 요약
        total_etfs = sum(len(s["etfs"]) for s in output["sectors"])
        logger.info("수집 ETF 수: %d / 전체 설정 %d", total_etfs, len(
            set(t for tl in SECTOR_ETFS.values() for t in tl)
        ))

        save_json(output, "etf-list.json")
        logger.info("=== ETF 목록 수집 완료 ===")
    except Exception as exc:
        logger.error("수집 실패: %s", exc, exc_info=True)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
