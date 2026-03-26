/**
 * 개별 종목 밸류에이션 관련 타입 정의
 * 데이터 출처: KRX 개별종목 PER/PBR/배당수익률 (stock-valuation.json)
 */

/** 상장 시장 구분 */
export type Market = 'KOSPI' | 'KOSDAQ';

/** PER/PBR 밸류에이션 등급 */
export type ValuationGrade = 'undervalued' | 'fair' | 'overvalued';

/** 개별 종목의 밸류에이션 지표 */
export interface StockValuation {
  /** 종목명 */
  name: string;
  /** 상장 시장 */
  market: Market;
  /** 종가 (원) */
  close: number;
  /** 시가총액 (원) — 파싱 실패 시 null */
  market_cap: number | null;
  /**
   * 주가수익비율 (Price-to-Earnings Ratio)
   * 음수 또는 null 이면 적자 또는 산출 불가
   */
  per: number | null;
  /**
   * 주가순자산비율 (Price-to-Book Ratio)
   * null 이면 산출 불가
   */
  pbr: number | null;
  /** 주당순이익 (Earnings Per Share, 원) */
  eps: number | null;
  /** 주당순자산 (Book value Per Share, 원) */
  bps: number | null;
  /** 배당수익률 (%) */
  dividend_yield: number | null;
  /** 자기자본이익률 (Return on Equity, %) — null이면 데이터 없음 (ETF 등) */
  roe: number | null;
  /** 부채비율 (Debt-to-Equity Ratio, %) — null이면 데이터 없음 */
  debt_ratio: number | null;
}

/** stock-valuation.json 루트 구조 */
export interface StockValuationData {
  /** 데이터 수집 일시 (ISO 8601) */
  updated_at: string;
  /**
   * 종목 코드를 키로 하는 밸류에이션 맵
   * @example { "096770": { name: "SK이노베이션", per: 8.5, pbr: 0.65, ... } }
   */
  stocks: Record<string, StockValuation>;
}

/** 보유종목 + 밸류에이션을 합친 enriched 타입 (UI 렌더링용) */
export interface StockWithValuation {
  /** 종목 코드 */
  ticker: string;
  /** 종목명 */
  name: string;
  /** 편입 ETF 티커 */
  etf_ticker: string;
  /** 편입 ETF명 */
  etf_name: string;
  /** 섹터 코드 */
  sector_code: string;
  /** 편입 비중 (%) */
  weight: number;
  /** 밸류에이션 지표 (KRX 데이터 없으면 null) */
  valuation: StockValuation | null;
}
