import { cn } from '@/lib/utils';

// ─── Skeleton ────────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

// ─── DataLoader ───────────────────────────────────────────────────────────────

interface DataLoaderProps {
  isLoading: boolean;
  error?: string | null;
  /** true이면 빈 데이터 상태 표시 */
  isEmpty?: boolean;
  emptyMessage?: string;
  /** 로딩 중 표시할 스켈레톤 행 수 */
  skeletonRows?: number;
  className?: string;
  children: React.ReactNode;
}

export function DataLoader({
  isLoading,
  error,
  isEmpty = false,
  emptyMessage = '데이터가 없습니다.',
  skeletonRows = 5,
  className,
  children,
}: DataLoaderProps) {
  if (isLoading) {
    return (
      <div className={cn('space-y-2.5', className)} aria-busy="true" aria-label="로딩 중">
        {/* 헤더 스켈레톤 */}
        <Skeleton className="h-9 w-full" />
        {/* 행 스켈레톤 */}
        {Array.from({ length: skeletonRows }, (_, i) => (
          <Skeleton
            key={i}
            className={cn('h-10 w-full', i % 2 === 0 ? 'opacity-100' : 'opacity-70')}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className={cn(
          'rounded-lg border border-destructive/20 bg-destructive/5 px-5 py-6 text-center',
          className
        )}
      >
        <p className="text-sm font-medium text-destructive">데이터를 불러오지 못했습니다</p>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        className={cn(
          'rounded-lg border border-dashed border-border px-5 py-12 text-center',
          className
        )}
      >
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}
