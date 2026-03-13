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
  payRole?: string;      // 역할: 코칭/강의/운영
  payGrade?: string;     // 등급: 특별지급/메인/보조/교육생
  payUnit?: string;      // 단위: 일/시간/월/회
  payRatio?: number;     // 비율 (%) 기본 100
  unitPrice?: number;    // 회차(일)당 단가 (원)
  sessions?: number;     // 투입 횟수/일수
  totalAmount?: number;  // 총 지급액 (원)
  evaluation?: ProjectCoachEvaluation;
}

// 단가 기준표 (공유된 시트 기준)
export const RATE_TABLE: Record<string, Record<string, Record<string, number>>> = {
  코칭: {
    특별지급: { 일: 300000, 시간: 85000 },
    메인:     { 일: 550000, 시간: 70000 },
    보조:     { 일: 400000, 시간: 50000 },
    교육생:   { 일: 160000, 시간: 20000 },
  },
  강의: {
    특별지급: { 일: 500000, 시간: 200000 },
    메인:     { 일: 650000, 시간: 80000 },
    보조:     { 일: 350000, 시간: 40000 },
    교육생:   { 일: 0,      시간: 0 },
  },
  운영: {
    특별지급: { 시간: 50000,  일: 400000,  월: 8000000  },
    메인:     { 시간: 28000,  일: 224000,  월: 4480000  },
    보조:     { 시간: 15000,  일: 120000,  월: 2400000  },
    교육생:   { 시간: 12500,  일: 100000,  월: 100000   },
  },
};

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
