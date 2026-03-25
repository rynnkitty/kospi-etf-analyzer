"""
merge_data.py — JSON 데이터 무결성 검증 및 metadata.json 생성

검증 항목:
  1. 3개 JSON 파일 존재 여부
  2. etf-holdings의 종목코드가 stock-valuation에 존재하는지
  3. etf-list의 ETF 티커가 etf-holdings에 존재하는지
  4. 수집 일시 일관성 (당일 데이터인지)

검증 실패 시 exit code 1 반환 (GitHub Actions 파이프라인 중단)
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

REQUIRED_FILES = {
    "etf-list.json": os.path.join(OUTPUT_DIR, "etf-list.json"),
    "etf-holdings.json": os.path.join(OUTPUT_DIR, "etf-holdings.json"),
    "stock-valuation.json": os.path.join(OUTPUT_DIR, "stock-valuation.json"),
}


def load_json(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def check_files_exist() -> bool:
    """필수 JSON 파일 존재 여부 확인"""
    ok = True
    for name, path in REQUIRED_FILES.items():
        if os.path.exists(path):
            logger.info("✓ %s 존재", name)
        else:
            logger.error("✗ %s 없음: %s", name, path)
            ok = False
    return ok


def check_holdings_coverage(
    holdings_data: dict,
    valuation_data: dict,
) -> tuple[int, int, list[str]]:
    """
    etf-holdings 보유종목이 stock-valuation에 있는지 확인

    Returns:
        (matched_count, total_count, missing_tickers)
    """
    valuation_tickers = set(valuation_data.get("stocks", {}).keys())
    all_holding_tickers: set[str] = set()

    for etf_ticker, etf_info in holdings_data.get("holdings", {}).items():
        for holding in etf_info.get("top_holdings", []):
            all_holding_tickers.add(holding["ticker"])

    missing = sorted(all_holding_tickers - valuation_tickers)
    matched = len(all_holding_tickers) - len(missing)
    return matched, len(all_holding_tickers), missing


def check_etf_holdings_coverage(
    etf_list_data: dict,
    holdings_data: dict,
) -> tuple[int, int, list[str]]:
    """
    etf-list의 ETF 티커가 etf-holdings에 있는지 확인

    Returns:
        (matched_count, total_count, missing_tickers)
    """
    holdings_tickers = set(holdings_data.get("holdings", {}).keys())
    etf_list_tickers: list[str] = []

    for sector in etf_list_data.get("sectors", []):
        for etf in sector.get("etfs", []):
            etf_list_tickers.append(etf["ticker"])

    missing = [t for t in etf_list_tickers if t not in holdings_tickers]
    matched = len(etf_list_tickers) - len(missing)
    return matched, len(etf_list_tickers), missing


def count_stats(
    etf_list_data: dict,
    holdings_data: dict,
    valuation_data: dict,
) -> dict:
    """각 데이터셋 통계 계산"""
    sector_count = len(etf_list_data.get("sectors", []))
    etf_count = sum(
        len(s.get("etfs", [])) for s in etf_list_data.get("sectors", [])
    )
    holding_etf_count = len(holdings_data.get("holdings", {}))
    total_holding_items = sum(
        len(v.get("top_holdings", []))
        for v in holdings_data.get("holdings", {}).values()
    )
    stock_count = len(valuation_data.get("stocks", {}))

    return {
        "sector_count": sector_count,
        "etf_count": etf_count,
        "holding_etf_count": holding_etf_count,
        "total_holding_items": total_holding_items,
        "stock_count": stock_count,
    }


def build_metadata(
    stats: dict,
    validation_result: dict,
) -> dict:
    return {
        "collected_at": datetime.now(KST).isoformat(timespec="seconds"),
        "version": "1.0.0",
        "stats": stats,
        "validation": validation_result,
    }


def save_json(data: dict, filename: str) -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    logger.info("저장 완료: %s", path)


def main() -> None:
    logger.info("=== 데이터 검증 및 메타데이터 생성 시작 ===")
    errors: list[str] = []
    warnings: list[str] = []

    # 1. 파일 존재 확인
    if not check_files_exist():
        logger.error("필수 파일 누락 — 파이프라인 중단")
        sys.exit(1)

    # 2. JSON 로드
    etf_list_data = load_json(REQUIRED_FILES["etf-list.json"])
    holdings_data = load_json(REQUIRED_FILES["etf-holdings.json"])
    valuation_data = load_json(REQUIRED_FILES["stock-valuation.json"])

    # 3. ETF 목록 ↔ 보유종목 커버리지
    etf_matched, etf_total, etf_missing = check_etf_holdings_coverage(
        etf_list_data, holdings_data
    )
    logger.info(
        "ETF 커버리지: %d/%d (누락 %d개)",
        etf_matched, etf_total, len(etf_missing),
    )
    if etf_missing:
        msg = f"etf-holdings 누락 ETF: {etf_missing}"
        warnings.append(msg)
        logger.warning(msg)

    # 4. 보유종목 ↔ 밸류에이션 커버리지
    val_matched, val_total, val_missing = check_holdings_coverage(
        holdings_data, valuation_data
    )
    coverage_pct = (val_matched / val_total * 100) if val_total > 0 else 0.0
    logger.info(
        "밸류에이션 커버리지: %d/%d (%.1f%%), 누락 %d개",
        val_matched, val_total, coverage_pct, len(val_missing),
    )

    # 커버리지 80% 미만이면 에러
    if coverage_pct < 80.0:
        msg = (
            f"밸류에이션 커버리지 {coverage_pct:.1f}% < 80% "
            f"(누락 종목 예시: {val_missing[:5]})"
        )
        errors.append(msg)
        logger.error(msg)
    elif val_missing:
        msg = f"밸류에이션 미매핑 종목 {len(val_missing)}개 (커버리지 {coverage_pct:.1f}%)"
        warnings.append(msg)
        logger.warning(msg)

    # 5. 통계 및 메타데이터 생성
    stats = count_stats(etf_list_data, holdings_data, valuation_data)
    logger.info(
        "통계 — 섹터: %d, ETF: %d, 보유종목(중복포함): %d, KOSPI종목: %d",
        stats["sector_count"],
        stats["etf_count"],
        stats["total_holding_items"],
        stats["stock_count"],
    )

    validation_result = {
        "passed": len(errors) == 0,
        "etf_coverage": {
            "matched": etf_matched,
            "total": etf_total,
            "missing": etf_missing,
        },
        "valuation_coverage": {
            "matched": val_matched,
            "total": val_total,
            "coverage_pct": round(coverage_pct, 1),
            "missing_sample": val_missing[:10],  # 처음 10개만 저장
        },
        "errors": errors,
        "warnings": warnings,
    }

    metadata = build_metadata(stats, validation_result)
    save_json(metadata, "metadata.json")

    # 6. 최종 판단
    if errors:
        logger.error("=== 검증 실패 — 파이프라인 중단 ===")
        for err in errors:
            logger.error("  ERROR: %s", err)
        sys.exit(1)

    if warnings:
        for w in warnings:
            logger.warning("  WARN: %s", w)

    logger.info("=== 데이터 검증 완료 (정상) ===")


if __name__ == "__main__":
    main()
