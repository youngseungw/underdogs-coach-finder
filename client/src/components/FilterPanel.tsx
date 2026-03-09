/*
 * FilterPanel - Swiss Industrial Design
 * 좌측 고정 필터 패널. 1px 구분선, 그레이스케일 기반.
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import type { FilterState } from "@/types/coach";
import {
  EXPERTISE_OPTIONS,
  INDUSTRY_OPTIONS,
  REGION_OPTIONS,
  ROLE_OPTIONS,
} from "@/types/coach";

interface FilterPanelProps {
  filters: FilterState;
  updateFilter: (key: keyof FilterState, value: unknown) => void;
  resetFilters: () => void;
  totalCount: number;
  filteredCount: number;
}

function FilterSection({
  title,
  options,
  selected,
  onChange,
  defaultOpen = false,
}: {
  title: string;
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 px-4 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="text-[13px] font-semibold tracking-tight text-foreground">
          {title}
          {selected.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-4 h-4 text-[10px] font-mono bg-primary text-white rounded-full">
              {selected.length}
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-0.5">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-start gap-2.5 py-1.5 cursor-pointer group rounded-[2px] hover:bg-muted/30 px-1 -mx-1"
            >
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={() => toggle(opt)}
                className="mt-0.5 rounded-[2px] border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-[12px] leading-snug text-muted-foreground group-hover:text-foreground transition-colors">
                {opt}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FilterPanel({
  filters,
  updateFilter,
  resetFilters,
  totalCount,
  filteredCount,
}: FilterPanelProps) {
  return (
    <div className="w-[300px] flex-shrink-0 border-r border-border bg-white h-screen flex flex-col sticky top-0">
      {/* 헤더 */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-primary" />
            <h1 className="text-[15px] font-bold tracking-tight text-foreground">
              코치 검색
            </h1>
          </div>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            초기화
          </button>
        </div>

        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            placeholder="이름, 소속, 키워드 검색"
            className="pl-8 h-8 text-[12px] bg-muted/50 border-0 rounded-[3px] placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        {/* 결과 카운터 */}
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="font-mono text-[24px] font-bold text-foreground leading-none tracking-tighter">
            {filteredCount}
          </span>
          <span className="text-[11px] text-muted-foreground">
            / {totalCount}명
          </span>
        </div>
      </div>

      {/* 필터 섹션 */}
      <ScrollArea className="flex-1">
        <FilterSection
          title="전문분야"
          options={EXPERTISE_OPTIONS}
          selected={filters.expertise}
          onChange={(val) => updateFilter("expertise", val)}
          defaultOpen={true}
        />
        <FilterSection
          title="경험 업종"
          options={INDUSTRY_OPTIONS}
          selected={filters.industries}
          onChange={(val) => updateFilter("industries", val)}
        />
        <FilterSection
          title="코칭 가능 지역"
          options={REGION_OPTIONS}
          selected={filters.regions}
          onChange={(val) => updateFilter("regions", val)}
        />
        <FilterSection
          title="역할"
          options={ROLE_OPTIONS}
          selected={filters.roles}
          onChange={(val) => updateFilter("roles", val)}
          defaultOpen={true}
        />

        {/* 해외 코칭 */}
        <div className="border-b border-border px-4 py-3">
          <span className="text-[13px] font-semibold tracking-tight text-foreground block mb-2">
            해외 코칭
          </span>
          <div className="flex gap-1.5">
            {[
              { label: "전체", value: null },
              { label: "가능", value: true },
              { label: "불가", value: false },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => updateFilter("overseas", opt.value)}
                className={`px-3 py-1.5 text-[11px] rounded-[2px] border transition-all ${
                  filters.overseas === opt.value
                    ? "bg-foreground text-white border-foreground"
                    : "bg-white text-muted-foreground border-border hover:border-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 추천 인원 수 */}
        <div className="px-4 py-3 border-b border-border">
          <span className="text-[13px] font-semibold tracking-tight text-foreground block mb-2">
            추천 인원 수
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {[3, 5, 7, 10, 15, 20].map((n) => (
              <button
                key={n}
                onClick={() => updateFilter("resultCount", n)}
                className={`w-9 h-7 text-[12px] font-mono rounded-[2px] border transition-all ${
                  filters.resultCount === n
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-muted-foreground border-border hover:border-primary"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="h-4" />
      </ScrollArea>
    </div>
  );
}
