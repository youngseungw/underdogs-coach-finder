import { useState, useMemo, useCallback } from "react";
import type { Coach, FilterState } from "@/types/coach";
import { useCoachData } from "@/contexts/CoachDataContext";
import { useProjects } from "@/contexts/ProjectContext";

const initialFilter: FilterState = {
  search: "",
  expertise: [],
  industries: [],
  regions: [],
  roles: [],
  overseas: null,
  resultCount: 50,
  tiers: [],
  categories: [],
  countries: [],
};

// 산업 동의어 맵: 같은 의미의 다른 표기들을 통합 매칭
const INDUSTRY_SYNONYMS: [string[], string[]][] = [
  [["제조", "제조업", "제조/하드웨어", "제조/hw", "하드웨어"], ["제조", "하드웨어", "hw"]],
  [["식품", "농업", "식품/농업", "푸드/농업", "푸드", "식품농업"], ["식품", "농업", "푸드"]],
  [["콘텐츠", "미디어", "콘텐츠/미디어", "콘텐츠/예술"], ["콘텐츠", "미디어", "예술"]],
  [["홈리빙", "펫", "홈리빙/펫", "홈테크/펫테크", "홈테크"], ["홈리빙", "펫", "홈테크"]],
  [["환경", "에너지", "환경/에너지", "환경에너지"], ["환경", "에너지"]],
  [["스포츠", "피트니스", "스포츠/피트니스", "피트니스/스포츠"], ["스포츠", "피트니스"]],
  [["소셜", "복지", "사회/복지", "소셜/지속가능성", "사회복지"], ["소셜", "복지", "지속가능"]],
  [["광고", "마케팅", "광고/마케팅"], ["광고", "마케팅"]],
  [["it", "소프트웨어", "it/소프트웨어"], ["it", "sw", "소프트웨어"]],
];

// 역할 동의어: DB에 "심사/평가" 값이 없으므로 관련 필드에서 텍스트 검색으로 확장
const ROLE_TEXT_KEYWORDS: Record<string, string[]> = {
  "심사/평가": ["심사", "심사위원", "투자/심사", "투자심사", "평가위원", "심사역", "심사 수행"],
};

// 필터 키워드를 동의어 그룹 내 모든 토큰으로 확장
function getIndustryTerms(filter: string): string[] {
  const fl = filter.toLowerCase();
  for (const [triggers, tokens] of INDUSTRY_SYNONYMS) {
    if (triggers.some(t => fl.includes(t) || t.includes(fl))) {
      return tokens;
    }
  }
  return [fl];
}

function matchIndustry(coachIndustries: string[], filterTerms: string[]): boolean {
  const coachLower = coachIndustries.map(s => s.toLowerCase());
  return filterTerms.some(term =>
    coachLower.some(ci => ci.includes(term) || term.includes(ci))
  );
}

export function useCoachSearch() {
  const { allCoaches: allCoachesData } = useCoachData();
  const { projects } = useProjects();
  const [filters, setFilters] = useState<FilterState>(initialFilter);
  const [selectedCoaches, setSelectedCoaches] = useState<Set<number>>(new Set());
  const [aiRecommendedCoaches, setAiRecommendedCoaches] = useState<{coach: Coach, score: number}[]>([]);

  // 동일 이름이 tier 1/2와 tier 3에 모두 존재하면 tier 3 제거
  const allCoaches = useMemo(() => {
    const tier12Names = new Set(
      allCoachesData.filter(c => c.tier <= 2).map(c => c.name)
    );
    return allCoachesData.filter(c => c.tier <= 2 || !tier12Names.has(c.name));
  }, [allCoachesData]);

  // 진행 중 사업에 투입된 코치 → { coachId: [사업명, ...] }
  const coachAvailability = useMemo(() => {
    const map: Record<number, string[]> = {};
    projects
      .filter(p => p.status === "active")
      .forEach(p => {
        p.coaches.forEach(pc => {
          if (!map[pc.coachId]) map[pc.coachId] = [];
          map[pc.coachId].push(p.name);
        });
      });
    return map;
  }, [projects]);

  // 코치별 평균 평점 { coachId: avgRating }
  const coachAvgRatings = useMemo(() => {
    const sums: Record<number, { sum: number; count: number }> = {};
    projects.forEach(p => {
      p.coaches.forEach(pc => {
        if (pc.evaluation?.rating) {
          if (!sums[pc.coachId]) sums[pc.coachId] = { sum: 0, count: 0 };
          sums[pc.coachId].sum += pc.evaluation.rating;
          sums[pc.coachId].count += 1;
        }
      });
    });
    const avg: Record<number, number> = {};
    Object.entries(sums).forEach(([id, { sum, count }]) => {
      avg[Number(id)] = sum / count;
    });
    return avg;
  }, [projects]);

  const stats = useMemo(() => {
    const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    const catCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    allCoaches.forEach((c) => {
      tierCounts[c.tier] = (tierCounts[c.tier] || 0) + 1;
      catCounts[c.category] = (catCounts[c.category] || 0) + 1;
      countryCounts[c.country] = (countryCounts[c.country] || 0) + 1;
    });
    return { tierCounts, catCounts, countryCounts, total: allCoaches.length };
  }, [allCoaches]);

  const filteredCoaches = useMemo(() => {
    return allCoaches.filter((coach) => {
      // 키워드 검색: 모든 텍스트 필드 포함
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
          coach.main_field || "",
          coach.country || "",
          ...coach.expertise,
          ...coach.industries,
          ...coach.regions,
          ...coach.roles,
        ].join(" ").toLowerCase();
        if (!searchFields.includes(q)) return false;
      }

      if (filters.tiers.length > 0 && !filters.tiers.includes(coach.tier)) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(coach.category)) return false;
      if (filters.countries.length > 0 && !filters.countries.includes(coach.country)) return false;

      if (filters.expertise.length > 0) {
        const coachExp = [...coach.expertise, coach.main_field || ""].map(s => s.toLowerCase());
        if (!filters.expertise.some(e =>
          coachExp.some(ce => ce.includes(e.toLowerCase()) || e.toLowerCase().includes(ce))
        )) return false;
      }

      // 산업 필터: 동의어 포함 매칭
      if (filters.industries.length > 0) {
        const matched = filters.industries.some(fi => {
          const terms = getIndustryTerms(fi);
          return matchIndustry(coach.industries, terms);
        });
        if (!matched) return false;
      }

      if (filters.regions.length > 0) {
        const coachReg = coach.regions.map(s => s.toLowerCase());
        if (!filters.regions.some(r =>
          coachReg.some(cr => cr.includes(r.toLowerCase()) || r.toLowerCase().includes(cr))
        )) return false;
      }

      // 역할 필터: roles 배열 + 심사/평가 등은 expertise/텍스트 필드까지 확장
      if (filters.roles.length > 0) {
        const coachRoles = coach.roles.map(s => s.toLowerCase());
        const coachExp = coach.expertise.map(s => s.toLowerCase());
        const coachText = [
          coach.current_work || "",
          coach.underdogs_history || "",
          coach.career_history || "",
        ].join(" ").toLowerCase();

        const matched = filters.roles.some(r => {
          const rl = r.toLowerCase();
          if (coachRoles.some(cr => cr.includes(rl) || rl.includes(cr))) return true;
          // 텍스트 키워드 확장 (심사/평가 등)
          const textKws = ROLE_TEXT_KEYWORDS[r];
          if (textKws) {
            return textKws.some(kw => {
              const kl = kw.toLowerCase();
              return coachExp.some(ce => ce.includes(kl)) || coachText.includes(kl);
            });
          }
          return false;
        });
        if (!matched) return false;
      }

      if (filters.overseas !== null && coach.overseas !== filters.overseas) return false;

      return true;
    });
  }, [allCoaches, filters]);

  const rankedCoaches = useMemo(() => {
    return filteredCoaches
      .map((coach) => {
        let score = 0;
        if (coach.tier === 1) score += 10;
        else if (coach.tier === 2) score += 5;
        else score += 1;
        filters.expertise.forEach((e) => {
          const el = e.toLowerCase();
          if (coach.expertise.some(ce => ce.toLowerCase().includes(el) || el.includes(ce.toLowerCase()))) score += 3;
          if ((coach.main_field || "").toLowerCase().includes(el)) score += 2;
        });
        filters.industries.forEach((i) => {
          const terms = getIndustryTerms(i);
          if (matchIndustry(coach.industries, terms)) score += 2;
        });
        filters.regions.forEach((r) => {
          if (coach.regions.some(cr => cr.includes(r) || r.includes(cr))) score += 1;
        });
        filters.roles.forEach((r) => {
          if (coach.roles.some(cr => cr.includes(r) || r.includes(cr))) score += 2;
        });
        if (coach.photo_url) score += 0.5;
        score += Math.min(coach.career_years / 10, 1);
        if (coach.career_history) score += 1;
        if (coach.has_startup) score += 0.5;
        // 평점 보너스: 평점 × 3 (5점 만점 → 최대 +15)
        const avgRating = coachAvgRatings[coach.id];
        if (avgRating !== undefined) score += avgRating * 3;
        // 투입 중이면 소폭 감점 (단, 평점 4점 이상이면 감점 없음)
        const activeProjs = coachAvailability[coach.id];
        if (activeProjs?.length && (!avgRating || avgRating < 4)) score -= 2;
        return { coach, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [filteredCoaches, filters]);

  const topCoaches = useMemo(() => {
    if (aiRecommendedCoaches.length > 0) {
      // AI 추천 결과를 현재 필터 범위로 제한 (Filtered RAG)
      const filteredIds = new Set(filteredCoaches.map(c => c.id));
      const intersected = aiRecommendedCoaches.filter(({ coach }) => filteredIds.has(coach.id));
      // AI가 활성화된 경우 서버가 결정한 개수를 그대로 사용 (resultCount 제한 없음)
      // 필터로 AI 결과가 모두 제거되면 rankedCoaches로 폴백
      return intersected.length > 0 ? intersected : rankedCoaches.slice(0, filters.resultCount);
    }
    return rankedCoaches.slice(0, filters.resultCount);
  }, [rankedCoaches, filteredCoaches, filters.resultCount, aiRecommendedCoaches]);

  const setAiRecommendations = useCallback((recommendations: any[]) => {
    const newAiCoaches: {coach: Coach, score: number}[] = [];
    recommendations.forEach(r => {
      const dbCoach = allCoaches.find(c => c.id === r.metadata?.id || c.name === r.metadata?.name);
      if (dbCoach) newAiCoaches.push({ coach: dbCoach, score: r.score });
    });
    setAiRecommendedCoaches(newAiCoaches);
  }, [allCoaches]);

  const toggleCoach = useCallback((coachId: number) => {
    setSelectedCoaches((prev) => {
      const next = new Set(prev);
      if (next.has(coachId)) next.delete(coachId);
      else next.add(coachId);
      return next;
    });
  }, []);

  const selectTopCoaches = useCallback(() => {
    setSelectedCoaches(new Set(topCoaches.map((r) => r.coach.id)));
  }, [topCoaches]);

  const clearSelection = useCallback(() => setSelectedCoaches(new Set()), []);

  const updateFilter = useCallback((key: keyof FilterState, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilter);
    setAiRecommendedCoaches([]);
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
    stats,
    setAiRecommendations,
    aiRecommendedCoaches,
    coachAvailability,
    coachAvgRatings,
  };
}
