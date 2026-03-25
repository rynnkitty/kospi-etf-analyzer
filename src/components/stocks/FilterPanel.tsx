'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useFilter } from '@/hooks/useFilter';
import { SECTORS } from '@/constants/sectors';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  className?: string;
}

export function FilterPanel({ className }: FilterPanelProps) {
  const {
    perRange,
    pbrRange,
    selectedSectors,
    searchQuery,
    setPerRange,
    setPbrRange,
    setSelectedSectors,
    setSearchQuery,
    resetFilter,
  } = useFilter();

  // 로컬 검색어 → 300ms 디바운스 후 store 반영
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSearchQuery(localSearch), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [localSearch, setSearchQuery]);

  // 외부(초기화 버튼 등)에서 searchQuery가 바뀌면 로컬도 동기화
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const perValues: [number, number] = [perRange.min ?? 0, perRange.max ?? 100];
  const pbrValues: [number, number] = [pbrRange.min ?? 0, pbrRange.max ?? 10];

  const handlePerChange = (value: number | readonly number[]) => {
    if (typeof value === 'number') return;
    const min = value[0] ?? 0;
    const max = value[1] ?? 100;
    setPerRange({ min: min === 0 ? null : min, max: max === 100 ? null : max });
  };

  const handlePbrChange = (value: number | readonly number[]) => {
    if (typeof value === 'number') return;
    const min = value[0] ?? 0;
    const max = value[1] ?? 10;
    setPbrRange({ min: min === 0 ? null : min, max: max === 10 ? null : max });
  };

  const toggleSector = (code: string) => {
    if (selectedSectors.includes(code)) {
      setSelectedSectors(selectedSectors.filter((s) => s !== code));
    } else {
      setSelectedSectors([...selectedSectors, code]);
    }
  };

  const hasActiveFilters =
    perRange.min !== null ||
    perRange.max !== null ||
    pbrRange.min !== null ||
    pbrRange.max !== null ||
    selectedSectors.length > 0 ||
    searchQuery !== '';

  return (
    <aside className={cn('rounded-xl border bg-card p-4 space-y-5', className)}>
      {/* ── 검색 ──────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          종목 검색
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="종목명 또는 코드"
            className="w-full rounded-md border bg-background pl-8 pr-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* ── PER 슬라이더 ──────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            PER 범위
          </p>
          <span className="text-xs tabular-nums text-foreground font-medium">
            {perValues[0]} ~ {perValues[1] === 100 ? '∞' : perValues[1]}
          </span>
        </div>
        <Slider
          value={perValues}
          min={0}
          max={100}
          step={1}
          onValueChange={handlePerChange}
        />
      </div>

      {/* ── PBR 슬라이더 ──────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            PBR 범위
          </p>
          <span className="text-xs tabular-nums text-foreground font-medium">
            {pbrValues[0].toFixed(1)} ~ {pbrValues[1] === 10 ? '∞' : pbrValues[1].toFixed(1)}
          </span>
        </div>
        <Slider
          value={pbrValues}
          min={0}
          max={10}
          step={0.1}
          onValueChange={handlePbrChange}
        />
      </div>

      {/* ── 섹터 선택 ─────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            섹터 선택
          </p>
          {selectedSectors.length > 0 && (
            <span className="text-xs text-blue-600 font-medium">
              {selectedSectors.length}개 선택
            </span>
          )}
        </div>
        <div className="space-y-0.5">
          {SECTORS.map((sector) => {
            const checked = selectedSectors.includes(sector.code);
            return (
              <label
                key={sector.code}
                className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/60 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSector(sector.code)}
                  className="rounded border-border accent-blue-600 shrink-0"
                />
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: sector.colorHex }}
                />
                <span className="text-sm leading-none">{sector.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* ── 초기화 버튼 ───────────────────────────────────── */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={resetFilter}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          필터 초기화
        </button>
      )}
    </aside>
  );
}
