/**
 * ETF 상세 페이지 — 정적 생성 (SSG)
 *
 * generateStaticParams: SECTORS 상수의 representativeEtfs로 빌드 타임에 경로 생성.
 * 인터랙티브 콘텐츠는 EtfDetail 클라이언트 컴포넌트에 위임.
 */

import type { Metadata } from 'next';
import { SECTORS } from '@/constants/sectors';
import { EtfDetail } from '@/components/etf/EtfDetail';

// ─── 정적 경로 생성 ────────────────────────────────────────────────────────────

export function generateStaticParams() {
  const tickers = new Set<string>();
  SECTORS.forEach((s) => s.representativeEtfs.forEach((t) => tickers.add(t)));
  return Array.from(tickers).map((ticker) => ({ ticker }));
}

// ─── 메타데이터 ────────────────────────────────────────────────────────────────

export function generateMetadata({
  params,
}: {
  params: { ticker: string };
}): Metadata {
  return { title: `ETF ${params.ticker} — KOSPI ETF Analyzer` };
}

// ─── 페이지 ───────────────────────────────────────────────────────────────────

interface PageProps {
  params: { ticker: string };
}

export default function EtfPage({ params }: PageProps) {
  return <EtfDetail ticker={params.ticker} />;
}
