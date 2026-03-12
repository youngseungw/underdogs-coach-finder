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
  // 단가 정보
  unitPrice?: number;    // 회차(일)당 단가 (원)
  sessions?: number;     // 투입 횟수/일수
  totalAmount?: number;  // 총 지급액 (원) — 수동 입력 or unitPrice × sessions 자동계산
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
  totalBudget?: number;  // 총 사업 예산 (원)
  coaches: ProjectCoach[];
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, { ko: string; color: string }> = {
  planning: { ko: "기획 중", color: "bg-amber-100 text-amber-700" },
  active:   { ko: "진행 중", color: "bg-blue-100 text-blue-700" },
  completed:{ ko: "완료",   color: "bg-green-100 text-green-700" },
};

export function formatKRW(amount: number): string {
  if (amount >= 100000000) {
    const eok = amount / 100000000;
    return eok % 1 === 0 ? `${eok}억원` : `${eok.toFixed(1)}억원`;
  }
  if (amount >= 10000) {
    const man = amount / 10000;
    return man % 1 === 0 ? `${man.toLocaleString()}만원` : `${man.toFixed(1)}만원`;
  }
  return `${amount.toLocaleString()}원`;
}
