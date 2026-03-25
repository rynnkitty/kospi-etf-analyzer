/**
 * ETF 및 섹터 관련 타입 정의
 * 데이터 출처: KRX 데이터시스템 (etf-list.json, etf-holdings.json)
 */

/** KRX ETF 개별 종목 정보 */
export interface ETF {
  /** 종목 코드 (6자리, e.g. "117460") */
  ticker: string;
  /** 종목명 (e.g. "KODEX 에너지화학") */
  name: string;
  /** 운용사 (e.g. "삼성자산운용") */
  provider: string;
  /** 순자산총액 (원) */
  nav: number;
  /** 1개월 수익률 (%) — NAVER Finance API 미제공 시 null */
  return_1m: number | null;
  /** 3개월 수익률 (%) */
  return_3m: number | null;
}

/** 섹터별 ETF 그룹 */
export interface Sector {
  /** GICS 섹터 코드 (e.g. "G10") */
  sector_code: string;
  /** 섹터명 (e.g. "에너지") */
  sector_name: string;
  /** 해당 섹터 ETF 목록 */
  etfs: ETF[];
}

/** etf-list.json 루트 구조 */
export interface EtfListData {
  /** 데이터 수집 일시 (ISO 8601) */
  updated_at: string;
  /** 섹터별 ETF 목록 */
  sectors: Sector[];
}

/** ETF PDF(Portfolio Deposit File) 보유 종목 항목 */
export interface Holding {
  /** 보유 종목 코드 (6자리) */
  ticker: string;
  /** 보유 종목명 */
  name: string;
  /** 편입 비중 (%) */
  weight: number;
}

/** 특정 ETF의 보유종목 정보 */
export interface EtfHolding {
  /** ETF 종목명 */
  etf_name: string;
  /** 상위 보유종목 목록 (Top 10~20) */
  top_holdings: Holding[];
}

/** etf-holdings.json 루트 구조 */
export interface EtfHoldingsData {
  /** 데이터 수집 일시 (ISO 8601) */
  updated_at: string;
  /**
   * ETF 티커를 키로 하는 보유종목 맵
   * @example { "117460": { etf_name: "KODEX 에너지화학", top_holdings: [...] } }
   */
  holdings: Record<string, EtfHolding>;
}
