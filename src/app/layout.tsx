import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { ThemeProvider } from '@/components/common/ThemeProvider';

// ─── 폰트 ─────────────────────────────────────────────────────────────────────

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

// 한글 지원: Noto Sans KR (빌드 시 self-hosted, GitHub Pages 배포 시 정적 서빙)
const notoSansKR = Noto_Sans_KR({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-noto-kr',
  display: 'swap',
});

// ─── 메타데이터 ───────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: 'KOSPI ETF Sector Analyzer',
    template: '%s | KOSPI ETF Analyzer',
  },
  description:
    '코스피 섹터별 ETF 보유종목과 밸류에이션(PER/PBR)을 한눈에 비교하는 무료 대시보드. 가치투자·퀀트투자 개인 투자자를 위한 섹터 간 밸류에이션 비교 도구.',
  keywords: ['KOSPI', 'ETF', 'PER', 'PBR', '밸류에이션', '섹터', '투자', '주식'],
  openGraph: {
    title: 'KOSPI ETF Sector Analyzer',
    description: '코스피 섹터별 ETF 보유종목 PER/PBR 비교 대시보드',
    locale: 'ko_KR',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

// ─── 레이아웃 ─────────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansKR.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased min-h-screen flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="kospi-etf-theme">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
