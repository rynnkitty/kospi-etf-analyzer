/**
 * 섹터 상세 페이지 — 정적 생성 (SSG)
 *
 * Next.js App Router에서 generateStaticParams는 서버 컴포넌트에서만 동작하므로,
 * 이 파일은 서버 컴포넌트(no 'use client')로 유지하고
 * 인터랙티브 콘텐츠는 SectorDetail 클라이언트 컴포넌트에 위임합니다.
 */

import type { Metadata } from 'next';
import { SECTOR_CODES, SECTOR_MAP } from '@/constants/sectors';
import { SectorDetail } from '@/components/sector/SectorDetail';

// ─── 정적 경로 생성 ────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return SECTOR_CODES.map((code) => ({ sectorCode: code }));
}

// ─── 메타데이터 ────────────────────────────────────────────────────────────────

export function generateMetadata({
  params,
}: {
  params: { sectorCode: string };
}): Metadata {
  const sector = SECTOR_MAP[params.sectorCode];
  const title = sector
    ? `${sector.name} (${sector.nameEn}) — KOSPI ETF Analyzer`
    : 'KOSPI ETF Analyzer';
  return { title };
}

// ─── 페이지 ───────────────────────────────────────────────────────────────────

interface PageProps {
  params: { sectorCode: string };
}

export default function SectorPage({ params }: PageProps) {
  return <SectorDetail sectorCode={params.sectorCode} />;
}
