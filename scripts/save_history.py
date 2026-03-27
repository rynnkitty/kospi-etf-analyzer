"""
save_history.py — stock-valuation.json 스냅샷을 종목별 히스토리 파일로 저장

저장 경로: public/data/history/{ticker}.json
파일 형식: {"ticker": "000660", "history": [{"date": "2026-01-01", "close": ..., ...}, ...]}
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone, timedelta

from config import OUTPUT_DIR

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

KST = timezone(timedelta(hours=9))
HISTORY_DIR = os.path.join(OUTPUT_DIR, "history")

FIELDS = ["close", "per", "pbr", "eps", "bps", "roe", "debt_ratio", "market_cap", "dividend_yield"]


def main() -> None:
    logger.info("=== 종목별 히스토리 저장 시작 ===")

    valuation_path = os.path.join(OUTPUT_DIR, "stock-valuation.json")
    if not os.path.exists(valuation_path):
        logger.error("stock-valuation.json 없음 — collect_valuation.py 먼저 실행하세요")
        sys.exit(1)

    with open(valuation_path, encoding="utf-8") as f:
        valuation_data = json.load(f)

    today = datetime.now(KST).strftime("%Y-%m-%d")
    os.makedirs(HISTORY_DIR, exist_ok=True)

    stocks = valuation_data.get("stocks", {})
    updated = 0
    skipped = 0

    for ticker, stock in stocks.items():
        ticker_path = os.path.join(HISTORY_DIR, f"{ticker}.json")

        # 기존 파일 로드 또는 신규 생성
        if os.path.exists(ticker_path):
            with open(ticker_path, encoding="utf-8") as f:
                ticker_data = json.load(f)
        else:
            ticker_data = {"ticker": ticker, "history": []}

        history: list = ticker_data.get("history", [])

        # 오늘 날짜 엔트리 구성
        entry: dict = {"date": today}
        for field in FIELDS:
            entry[field] = stock.get(field)

        # 오늘 날짜가 이미 있으면 덮어쓰기, 없으면 추가
        existing_idx = next((i for i, h in enumerate(history) if h.get("date") == today), -1)
        if existing_idx >= 0:
            history[existing_idx] = entry
            skipped += 1
        else:
            history.append(entry)
            history.sort(key=lambda x: x["date"])
            updated += 1

        ticker_data["history"] = history

        with open(ticker_path, "w", encoding="utf-8") as f:
            json.dump(ticker_data, f, ensure_ascii=False, separators=(",", ":"))

    logger.info(
        "히스토리 업데이트 완료 — 신규: %d종목, 갱신: %d종목, 날짜: %s",
        updated,
        skipped,
        today,
    )
    logger.info("=== 종목별 히스토리 저장 완료 ===")


if __name__ == "__main__":
    main()
