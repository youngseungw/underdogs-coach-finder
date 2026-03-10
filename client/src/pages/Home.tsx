/*
 * Home - Swiss Industrial Dashboard
 * 좌측 필터 + 우측 코치 카드 그리드
 * 티어 기반 UI, 다국어 지원, 신규 등록/수정 기능
 */
import { useState } from "react";
import { useCoachSearch } from "@/hooks/useCoachSearch";
import { useCoachData } from "@/contexts/CoachDataContext";
import FilterPanel from "@/components/FilterPanel";
import CoachCard from "@/components/CoachCard";
import CoachDetailModal from "@/components/CoachDetailModal";
import CoachFormModal from "@/components/CoachFormModal";
import SelectionBar from "@/components/SelectionBar";
import { Button } from "@/components/ui/button";
import { CheckSquare, Users, Search, Plus, Settings2, Sparkles } from "lucide-react";
import type { Coach } from "@/types/coach";
import { AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import AiRecommendModal from "@/components/AiRecommendModal";
import type { AiExtractResult } from "@/lib/aiReason";

export default function Home() {
  const {
    filters,
    updateFilter,
    resetFilters,
    filteredCoaches,
    topCoaches,
    selectedCoaches,
    selectedCoachList,
    toggleCoach,
    selectTopCoaches,
    clearSelection,
    allCoaches,
    stats,
    aiResult,
    applyAiResult,
    clearAiResult,
  } = useCoachSearch();

  const { addCoach, updateCoach, deleteCoach, customDataStats } = useCoachData();
  const { t } = useLanguage();
  const [detailCoach, setDetailCoach] = useState<Coach | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"recommended" | "all">("recommended");
  const [formOpen, setFormOpen] = useState(false);
  const [editCoach, setEditCoach] = useState<Coach | null>(null);

  const displayCoaches =
    viewMode === "recommended"
      ? topCoaches
      : filteredCoaches.map((c) => ({ coach: c, score: 0, matchScore: undefined, aiReason: undefined }));

  const hasActiveFilters =
    filters.expertise.length > 0 ||
    filters.industries.length > 0 ||
    filters.regions.length > 0 ||
    filters.roles.length > 0 ||
    filters.overseas !== null ||
    filters.search !== "" ||
    filters.tiers.length > 0 ||
    filters.categories.length > 0 ||
    filters.countries.length > 0;

  const handleOpenNew = () => {
    setEditCoach(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (coach: Coach) => {
    setEditCoach(coach);
    setFormOpen(true);
  };

  const handleSave = (data: Omit<Coach, "id"> | Partial<Coach>, isNew: boolean) => {
    if (isNew) {
      addCoach(data as Omit<Coach, "id">);
    } else if (editCoach) {
      updateCoach(editCoach.id, data as Partial<Coach>);
    }
  };

  const handleDelete = (id: number) => {
    deleteCoach(id);
  };

  const handleApplyAi = (result: AiExtractResult) => {
    applyAiResult(result);
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* 좌측 필터 패널 */}
      <FilterPanel
        filters={filters}
        updateFilter={updateFilter}
        resetFilters={resetFilters}
        totalCount={allCoaches.length}
        filteredCount={filteredCoaches.length}
        stats={stats}
      />

      {/* 우측 메인 영역 */}
      <main className="flex-1 min-w-0">
        {/* 상단 툴바 */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-border px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* 뷰 모드 토글 */}
              <div className="flex border border-border">
                <button
                  onClick={() => setViewMode("recommended")}
                  className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    viewMode === "recommended"
                      ? "bg-foreground text-white"
                      : "bg-white text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t("recommended")} {filters.resultCount}
                </button>
                <button
                  onClick={() => setViewMode("all")}
                  className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    viewMode === "all"
                      ? "bg-foreground text-white"
                      : "bg-white text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t("all_results")} ({filteredCoaches.length})
                </button>
              </div>

              {/* 추천 코치 일괄 선택 */}
              {viewMode === "recommended" && topCoaches.length > 0 && (
                <Button
                  onClick={selectTopCoaches}
                  variant="outline"
                  className="h-7 px-3 text-[11px] rounded-[2px] border-border hover:bg-primary hover:text-white hover:border-primary"
                >
                  <CheckSquare className="w-3 h-3 mr-1" />
                  {t("select_all")}
                </Button>
              )}

              {/* 활성 필터 표시 */}
              {hasActiveFilters && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Search className="w-3 h-3" />
                  <span>{t("filter_active")}</span>
                </div>
              )}

              {/* AI 추천 적용 중 배지 */}
              {aiResult && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 border border-primary/30 rounded-[2px]">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-primary font-medium truncate max-w-[180px]">
                    {aiResult.summary}
                  </span>
                  <button
                    onClick={clearAiResult}
                    className="text-primary/60 hover:text-primary ml-1 text-[11px] font-bold leading-none"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* 우측: 신규 등록 + 선택 상태 */}
            <div className="flex items-center gap-4">
              {/* 커스텀 데이터 인디케이터 */}
              {(customDataStats.added > 0 || customDataStats.edited > 0) && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted px-2 py-1">
                  <Settings2 className="w-3 h-3" />
                  <span>
                    {customDataStats.added > 0 && `+${customDataStats.added}`}
                    {customDataStats.added > 0 && customDataStats.edited > 0 && " / "}
                    {customDataStats.edited > 0 && `${customDataStats.edited} 수정`}
                  </span>
                </div>
              )}

              {/* 신규 등록 버튼 */}
              <Button
                onClick={handleOpenNew}
                variant="outline"
                className="h-7 px-3 text-[11px] rounded-[2px] border-primary text-primary hover:bg-primary hover:text-white"
              >
                <Plus className="w-3 h-3 mr-1" />
                {t("add_new") || "신규 등록"}
              </Button>

              {/* 선택 상태 */}
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>
                  <span className="font-mono font-semibold text-foreground">
                    {selectedCoaches.size}
                  </span>
                  {t("selected")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 코치 카드 그리드 */}
        <div className="p-6 pb-28">
          {/* 초기 상태: 필터·AI 결과 없는 추천 모드 → 랜딩 안내 */}
          {viewMode === "recommended" && !hasActiveFilters && !aiResult ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 rounded-full bg-violet-50 flex items-center justify-center mb-6">
                <Sparkles className="w-9 h-9 text-violet-500" />
              </div>
              <h2 className="text-[18px] font-bold text-foreground mb-2">
                필요한 코치를 찾아보세요
              </h2>
              <p className="text-[13px] text-muted-foreground mb-8 max-w-xs leading-relaxed">
                좌측 필터로 조건을 설정하거나,<br />
                AI 맞춤 추천으로 자연어로 요청해보세요.
              </p>
              <button
                onClick={() => setAiModalOpen(true)}
                className="flex items-center gap-2 h-10 px-6 rounded-[3px] text-[13px] font-semibold text-white bg-violet-600 hover:bg-violet-700 shadow-sm transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                AI 맞춤 추천 시작하기
              </button>
            </div>
          ) : displayCoaches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-[14px] font-semibold text-foreground mb-1">
                {t("no_results")}
              </p>
              <p className="text-[12px] text-muted-foreground mb-4">
                {t("no_results_sub")}
              </p>
              <Button
                onClick={resetFilters}
                variant="outline"
                className="h-8 px-4 text-[12px] rounded-[2px]"
              >
                {t("reset_filters")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              <AnimatePresence mode="popLayout">
                {displayCoaches.map((item, idx) => (
                  <CoachCard
                    key={item.coach.id}
                    coach={item.coach}
                    score={viewMode === "recommended" ? item.score : undefined}
                    rank={viewMode === "recommended" ? idx + 1 : undefined}
                    isSelected={selectedCoaches.has(item.coach.id)}
                    onToggle={() => toggleCoach(item.coach.id)}
                    onViewDetail={() => setDetailCoach(item.coach)}
                    onEdit={() => handleOpenEdit(item.coach)}
                    aiReason={viewMode === "recommended" ? item.aiReason : undefined}
                    matchScore={viewMode === "recommended" ? item.matchScore : undefined}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      {/* 코치 상세 모달 */}
      <CoachDetailModal
        coach={detailCoach}
        open={!!detailCoach}
        onClose={() => setDetailCoach(null)}
        onEdit={(coach) => {
          setDetailCoach(null);
          handleOpenEdit(coach);
        }}
      />

      {/* 코치 등록/수정 모달 */}
      <CoachFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditCoach(null);
        }}
        coach={editCoach}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      {/* 하단 선택 바 */}
      <SelectionBar
        selectedCoaches={selectedCoachList}
        onRemove={(id) => toggleCoach(id)}
        onClear={clearSelection}
      />

      {/* Floating AI Button */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col items-center gap-2">
        <span className="text-[11px] font-semibold text-violet-600 bg-white border border-violet-200 px-2.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
          AI 맞춤 추천
        </span>
        <button
          onClick={() => setAiModalOpen(true)}
          className="relative w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-700 active:scale-95 text-white shadow-xl flex items-center justify-center transition-all hover:scale-105"
          aria-label="AI 맞춤 추천 열기"
        >
          <span className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-20" />
          <Sparkles className="w-6 h-6 relative z-10" />
        </button>
      </div>

      {/* AI 추천 모달 */}
      <AiRecommendModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onApply={handleApplyAi}
      />
    </div>
  );
}
