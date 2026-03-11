export interface ProjectCoachEvaluation {
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  evaluatedAt: string;
}

export interface ProjectCoach {
  coachId: number;
  coachName: string;
  coachTier: number;
  coachCategory: string;
  taskSummary: string;
  evaluation?: ProjectCoachEvaluation;
}

export type ProjectStatus = "planning" | "active" | "completed";

export interface Project {
  id: number;
  name: string;
  client?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: ProjectStatus;
  createdAt: string;
  coaches: ProjectCoach[];
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, { ko: string; color: string }> = {
  planning: { ko: "기획 중", color: "bg-amber-100 text-amber-700" },
  active:   { ko: "진행 중", color: "bg-blue-100 text-blue-700" },
  completed:{ ko: "완료",   color: "bg-green-100 text-green-700" },
};
