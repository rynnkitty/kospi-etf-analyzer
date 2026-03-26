'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { fetchJson } from '@/lib/data-loader';

interface MetadataJson {
  updated_at: string;
}

function formatKstDateTime(isoString: string): string {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Seoul',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function Footer() {
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<MetadataJson>('/data/metadata.json').then((data) => {
      if (data?.updated_at) setUpdatedAt(data.updated_at);
    });
  }, []);

  return (
    <footer className="mt-auto border-t border-border bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          {/* 데이터 출처 + 갱신 시각 */}
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-1">
              <span>데이터 출처:</span>
              <a
                href="http://data.krx.co.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-foreground transition-colors"
              >
                KRX 정보데이터시스템
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </p>
            {updatedAt && (
              <p className="text-xs">최종 갱신: {formatKstDateTime(updatedAt)} (KST)</p>
            )}
          </div>

          {/* 면책 조항 + 링크 */}
          <div className="flex flex-col gap-1 sm:items-end">
            <p className="text-xs text-muted-foreground leading-relaxed sm:text-right sm:max-w-none whitespace-nowrap">
              본 서비스는 투자 참고용이며, 투자 판단의 책임은 본인에게 있습니다.
            </p>
          </div>
        </div>

        {/* 하단 링크 행 */}
        <div className="mt-3 border-t border-border/50 pt-3 flex justify-end">
          <a
            href="https://kimkitty.net"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            kimkitty.net
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>
      </div>
    </footer>
  );
}
