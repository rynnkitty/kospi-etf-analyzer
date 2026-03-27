import fs from 'fs';
import path from 'path';
import StockDetailClient from './StockDetailClient';

// SSG: 빌드 시점에 stock-valuation.json에서 모든 티커를 읽어 정적 경로 생성
export async function generateStaticParams() {
  const dataPath = path.join(process.cwd(), 'public', 'data', 'stock-valuation.json');
  if (!fs.existsSync(dataPath)) return [];

  const raw = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(raw) as { stocks?: Record<string, unknown> };
  const tickers = Object.keys(data.stocks ?? {});

  return tickers.map((ticker) => ({ ticker }));
}

export default function StockDetailPage({ params }: { params: { ticker: string } }) {
  return <StockDetailClient ticker={params.ticker} />;
}
