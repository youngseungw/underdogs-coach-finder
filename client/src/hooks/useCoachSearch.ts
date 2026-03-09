import { useState, useMemo, useCallback } from "react";
import type { Coach, FilterState } from "@/types/coach";
import coachesData from "@/data/coaches.json";

const initialFilter: FilterState = {
  search: "",
  expertise: [],
  industries: [],
  regions: [],
  roles: [],
  overseas: null,
  resultCount: 5,
};

export function useCoachSearch() {
  const [filters, setFilters] = useState<FilterState>(initialFilter);
  const [selectedCoaches, setSelectedCoaches] = useState<Set<number>>(new Set());

  const allCoaches = useMemo(() => coachesData as Coach[], []);

  const filteredCoaches = useMemo(() => {
    return allCoaches.filter((coach) => {
      // 텍스트 검색 (이름, 소속, 소개, 경력, 현재 업무)
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const searchFields = [
          coach.name,
          coach.organization,
          coach.intro,
          coach.career_history,
          coach.current_work,
          coach.education,
          coach.underdogs_history,
          coach.tools_skills,
          ...coach.expertise,
          ...coach.industries,
        ].join(" ").toLowerCase();
        if (!searchFields.includes(q)) return false;
      }

      // 전문성 필터
      if (filters.expertise.length > 0) {
        if (!filters.expertise.some((e) => coach.expertise.includes(e))) return false;
      }

      // 업종 필터
      if (filters.industries.length > 0) {
        if (!filters.industries.some((i) => coach.industries.includes(i))) return false;
      }

      // 지역 필터
      if (filters.regions.length > 0) {
        if (!filters.regions.some((r) => coach.regions.includes(r))) return false;
      }

      // 역할 필터
      if (filters.roles.length > 0) {
        if (!filters.roles.some((r) => coach.roles.includes(r))) return false;
      }

      // 해외 코칭 필터
      if (filters.overseas !== null) {
        if (coach.overseas !== filters.overseas) return false;
      }

      return true;
    });
  }, [allCoaches, filters]);

  // 추천 코치 (필터 매칭 점수 기반 정렬)
  const rankedCoaches = useMemo(() => {
    return filteredCoaches
      .map((coach) => {
        let score = 0;
        // 전문성 매칭 점수
        filters.expertise.forEach((e) => {
          if (coach.expertise.includes(e)) score += 3;
        });
        // 업종 매칭 점수
        filters.industries.forEach((i) => {
          if (coach.industries.includes(i)) score += 2;
        });
        // 지역 매칭 점수
        filters.regions.forEach((r) => {
          if (coach.regions.includes(r)) score += 1;
        });
        // 역할 매칭 점수
        filters.roles.forEach((r) => {
          if (coach.roles.includes(r)) score += 2;
        });
        // 사진이 있으면 가산점
        if (coach.photo_url) score += 0.5;
        // 경력 연수 가산점
        score += Math.min(coach.career_years / 10, 1);
        return { coach, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [filteredCoaches, filters]);

  const topCoaches = useMemo(() => {
    return rankedCoaches.slice(0, filters.resultCount);
  }, [rankedCoaches, filters.resultCount]);

  const toggleCoach = useCallback((coachId: number) => {
    setSelectedCoaches((prev) => {
      const next = new Set(prev);
      if (next.has(coachId)) {
        next.delete(coachId);
      } else {
        next.add(coachId);
      }
      return next;
    });
  }, []);

  const selectTopCoaches = useCallback(() => {
    setSelectedCoaches(new Set(topCoaches.map((r) => r.coach.id)));
  }, [topCoaches]);

  const clearSelection = useCallback(() => {
    setSelectedCoaches(new Set());
  }, []);

  const updateFilter = useCallback((key: keyof FilterState, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilter);
  }, []);

  const selectedCoachList = useMemo(() => {
    return allCoaches.filter((c) => selectedCoaches.has(c.id));
  }, [allCoaches, selectedCoaches]);

  return {
    filters,
    updateFilter,
    resetFilters,
    filteredCoaches,
    rankedCoaches,
    topCoaches,
    selectedCoaches,
    selectedCoachList,
    toggleCoach,
    selectTopCoaches,
    clearSelection,
    allCoaches,
  };
}
