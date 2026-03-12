/*
 * ProjectsPage - 사업 관리 & 코치 평가 & 단가 관리 시스템
 */
import { useState, useMemo } from "react";
import { useProjects } from "@/contexts/ProjectContext";
import { useCoachData } from "@/contexts/CoachDataContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { TIER_SHORT } from "@/types/coach";
import type { Project, ProjectStatus, ProjectCoachEvaluation } from "@/types/project";
import { PROJECT_STATUS_LABELS, formatKRW } from "@/types/project";
import {
  Plus, Star, ChevronRight, Users, ClipboardList, Calendar, Building2,
  CheckCircle2, ArrowLeft, Search, Save, X, BarChart3, TrendingUp, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button" onClick={() => onChange?.(s)}
          className={"transition-colors " + (onChange ? "cursor-pointer" : "cursor-default")}>
          <Star className="w-4 h-4" fill={s <= value ? "#FBBF24" : "none"} stroke={s <= value ? "#FBBF24" : "#D1D5DB"} />
        </button>
      ))}
    </div>
  );
}

function ProjectFormModal({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Project }) {
  const { addProject, updateProject } = useProjects();
  const [name, setName] = useState(initial?.name || "");
  const [client, setClient] = useState(initial?.client || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [startDate, setStartDate] = useState(initial?.startDate || "");
  const [endDate, setEndDate] = useState(initial?.endDate || "");
  const [status, setStatus] = useState<ProjectStatus>(initial?.status || "planning");
  const [totalBudget, setTotalBudget] = useState(initial?.totalBudget ? String(initial.totalBudget) : "");

  const handleSave = () => {
    if (!name.trim()) { toast.error("사업명을 입력하세요."); return; }
    const budget = totalBudget ? Number(totalBudget.replace(/,/g, "")) : undefined;
    if (initial) {
      updateProject(initial.id, { name, client, description, startDate, endDate, status, totalBudget: budget });
      toast.success("사업 정보가 수정되었습니다.");
    } else {
      addProject({ name, client, description, startDate, endDate, status, totalBudget: budget });
      toast.success("사업이 등록되었습니다.");
    }
    onClose();
  };

  const inputCls = "w-full border border-border px-3 py-2 text-[13px] rounded-[2px] focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px] rounded-[4px]">
        <DialogHeader>
          <DialogTitle>{initial ? "사업 수정" : "새 사업 등록"}</DialogTitle>
          <DialogDescription className="sr-only">사업 정보를 입력합니다</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <label className={labelCls}>사업명 *</label>
            <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="예: 하나유니버시티 2026 창업지원 사업" />
          </div>
          <div>
            <label className={labelCls}>발주처</label>
            <input className={inputCls} value={client} onChange={e => setClient(e.target.value)} placeholder="예: 하나은행" />
          </div>
          <div>
            <label className={labelCls}>사업 개요</label>
            <textarea className={inputCls + " resize-none"} rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="사업 목적, 대상, 규모 등" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>시작일</label>
              <input type="date" className={inputCls} value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>종료일</label>
              <input type="date" className={inputCls} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>총 사업 예산 (원)</label>
            <input className={inputCls} value={totalBudget} onChange={e => setTotalBudget(e.target.value)}
              placeholder="예: 50000000 (5천만원)" type="number" min="0" />
          </div>
          <div>
            <label className={labelCls}>상태</label>
            <div className="flex gap-2">
              {(["planning", "active", "completed"] as ProjectStatus[]).map(s => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={"px-3 py-1.5 text-[11px] font-medium border rounded-[2px] transition-colors " +
                    (status === s ? PROJECT_STATUS_LABELS[s].color + " border-current" : "border-border text-muted-foreground hover:border-gray-400")}>
                  {PROJECT_STATUS_LABELS[s].ko}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-[12px] h-8 rounded-[2px]">취소</Button>
          <Button onClick={handleSave} className="text-[12px] h-8 rounded-[2px]">저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddCoachModal({ open, onClose, projectId, existingCoachIds }: {
  open: boolean; onClose: () => void; projectId: number; existingCoachIds: number[];
}) {
  const { allCoaches } = useCoachData();
  const { addCoachToProject } = useProjects();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return allCoaches.slice(0, 30);
    const q = search.toLowerCase();
    return allCoaches.filter(c =>
      [c.name, c.organization, c.main_field || "", ...c.expertise].join(" ").toLowerCase().includes(q)
    ).slice(0, 30);
  }, [allCoaches, search]);

  const handleAdd = (coachId: number) => {
    const coach = allCoaches.find(c => c.id === coachId);
    if (!coach) return;
    addCoachToProject(projectId, { coachId: coach.id, coachName: coach.name, coachTier: coach.tier, coachCategory: coach.category, taskSummary: "" });
    toast.success(coach.name + " 코치가 투입되었습니다.");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px] rounded-[4px]">
        <DialogHeader>
          <DialogTitle>코치 투입</DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">이 사업에 투입할 코치를 검색하여 추가하세요.</DialogDescription>
        </DialogHeader>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input className="w-full border border-border pl-8 pr-3 py-2 text-[13px] rounded-[2px] focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="이름, 소속, 전문분야 검색..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
        </div>
        <div className="max-h-[320px] overflow-y-auto space-y-1">
          {filtered.map(coach => {
            const isAdded = existingCoachIds.includes(coach.id);
            return (
              <div key={coach.id} className="flex items-center justify-between px-3 py-2 border border-border hover:bg-muted/40 rounded-[2px]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold">{coach.name}</span>
                    <span className={"text-[9px] px-1.5 py-[1px] font-mono font-semibold text-white " +
                      (coach.tier === 1 ? "bg-primary" : coach.tier === 2 ? "bg-foreground" : "bg-muted-foreground")}>
                      {TIER_SHORT[coach.tier]}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{coach.organization} · {coach.main_field || coach.expertise[0] || "-"}</p>
                </div>
                <Button size="sm" variant={isAdded ? "secondary" : "outline"} disabled={isAdded}
                  onClick={() => !isAdded && handleAdd(coach.id)} className="text-[11px] h-7 rounded-[2px] ml-2 flex-shrink-0">
                  {isAdded ? "투입됨" : "+ 추가"}
                </Button>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-8 text-[13px] text-muted-foreground">검색 결과가 없습니다.</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-[12px] h-8 rounded-[2px]">닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EvaluationModal({ open, onClose, projectId, coachId, coachName, initial }: {
  open: boolean; onClose: () => void; projectId: number; coachId: number; coachName: string; initial?: ProjectCoachEvaluation;
}) {
  const { saveEvaluation } = useProjects();
  const [rating, setRating] = useState<number>(initial?.rating || 0);
  const [comment, setComment] = useState(initial?.comment || "");
  const LABELS = ["", "매우 불만족", "불만족", "보통", "만족", "매우 만족"];

  const handleSave = () => {
    if (rating === 0) { toast.error("별점을 선택해주세요."); return; }
    saveEvaluation(projectId, coachId, { rating: rating as 1 | 2 | 3 | 4 | 5, comment, evaluatedAt: new Date().toISOString() });
    toast.success("평가가 저장되었습니다.");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[440px] rounded-[4px]">
        <DialogHeader>
          <DialogTitle>코치 평가 — {coachName}</DialogTitle>
          <DialogDescription className="sr-only">평가 입력</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">종합 평점</label>
            <StarRating value={rating} onChange={setRating} />
            <p className="text-[11px] text-muted-foreground mt-1">{LABELS[rating] || "별점을 선택하세요"}</p>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">상세 평가</label>
            <textarea className="w-full border border-border px-3 py-2 text-[13px] rounded-[2px] focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              rows={4} value={comment} onChange={e => setComment(e.target.value)}
              placeholder="코치의 전문성, 소통, 성과 등을 자유롭게 기록해 주세요..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-[12px] h-8 rounded-[2px]">취소</Button>
          <Button onClick={handleSave} className="text-[12px] h-8 rounded-[2px]">평가 저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectDetail({ project, onBack }: { project: Project; onBack: () => void }) {
  const { removeCoachFromProject, updateCoachTask, updateCoachPayment, deleteProject } = useProjects();
  const [addCoachOpen, setAddCoachOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [evalTarget, setEvalTarget] = useState<{ coachId: number; coachName: string; initial?: ProjectCoachEvaluation } | null>(null);
  const [taskDrafts, setTaskDrafts] = useState<Record<number, string>>({});
  const [paymentDrafts, setPaymentDrafts] = useState<Record<number, { unitPrice: string; sessions: string; totalAmount: string }>>({});

  const handleTaskSave = (coachId: number) => {
    const draft = taskDrafts[coachId];
    if (draft !== undefined) {
      updateCoachTask(project.id, coachId, draft);
      setTaskDrafts(prev => { const n = { ...prev }; delete n[coachId]; return n; });
      toast.success("과업 내용이 저장되었습니다.");
    }
  };

  const getPaymentDraft = (coachId: number, pc: { unitPrice?: number; sessions?: number; totalAmount?: number }) => {
    return paymentDrafts[coachId] ?? {
      unitPrice: pc.unitPrice != null ? String(pc.unitPrice) : "",
      sessions: pc.sessions != null ? String(pc.sessions) : "",
      totalAmount: pc.totalAmount != null ? String(pc.totalAmount) : "",
    };
  };

  const handlePaymentChange = (coachId: number, field: "unitPrice" | "sessions" | "totalAmount", val: string, pc: { unitPrice?: number; sessions?: number; totalAmount?: number }) => {
    const current = getPaymentDraft(coachId, pc);
    const updated = { ...current, [field]: val };
    // 단가 × 횟수 자동계산 (totalAmount가 비어있을 때)
    if ((field === "unitPrice" || field === "sessions") && !current.totalAmount) {
      const u = parseFloat(field === "unitPrice" ? val : updated.unitPrice) || 0;
      const s = parseFloat(field === "sessions" ? val : updated.sessions) || 0;
      if (u > 0 && s > 0) updated.totalAmount = String(u * s);
    }
    setPaymentDrafts(prev => ({ ...prev, [coachId]: updated }));
  };

  const handlePaymentSave = (coachId: number, pc: { unitPrice?: number; sessions?: number; totalAmount?: number }) => {
    const draft = getPaymentDraft(coachId, pc);
    updateCoachPayment(project.id, coachId, {
      unitPrice: draft.unitPrice ? Number(draft.unitPrice) : undefined,
      sessions: draft.sessions ? Number(draft.sessions) : undefined,
      totalAmount: draft.totalAmount ? Number(draft.totalAmount) : undefined,
    });
    setPaymentDrafts(prev => { const n = { ...prev }; delete n[coachId]; return n; });
    toast.success("단가 정보가 저장되었습니다.");
  };

  const handleDelete = () => {
    if (confirm("이 사업을 삭제하시겠습니까?")) { deleteProject(project.id); onBack(); }
  };

  const statusInfo = PROJECT_STATUS_LABELS[project.status];
  const evaluatedCount = project.coaches.filter(c => c.evaluation).length;
  const totalPayout = project.coaches.reduce((sum, c) => sum + (c.totalAmount || 0), 0);

  return (
    <div className="flex-1 min-w-0">
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> 목록
            </button>
            <span className="w-px h-4 bg-border" />
            <span className={"px-2 py-[2px] text-[10px] font-semibold rounded-[2px] " + statusInfo.color}>{statusInfo.ko}</span>
            <h1 className="text-[15px] font-bold">{project.name}</h1>
            {project.client && <span className="text-[12px] text-muted-foreground">/ {project.client}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="h-7 text-[11px] rounded-[2px]">수정</Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="h-7 text-[11px] rounded-[2px] text-red-500 border-red-200 hover:bg-red-50">삭제</Button>
            <Button size="sm" onClick={() => setAddCoachOpen(true)} className="h-7 text-[11px] rounded-[2px] gap-1">
              <Plus className="w-3 h-3" /> 코치 투입
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* 사업 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 border border-border">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">기간</p>
            <p className="text-[13px] font-medium">{project.startDate || "-"} ~ {project.endDate || "-"}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">투입 코치</p>
            <p className="text-[13px] font-mono font-bold text-primary">{project.coaches.length}명</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">평가 완료</p>
            <p className="text-[13px] font-mono font-bold text-green-600">{evaluatedCount} / {project.coaches.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">코치 총 지급액</p>
            <p className={"text-[13px] font-mono font-bold " + (totalPayout > 0 ? "text-primary" : "text-muted-foreground")}>
              {totalPayout > 0 ? formatKRW(totalPayout) : "-"}
            </p>
            {project.totalBudget && totalPayout > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                예산 {formatKRW(project.totalBudget)} 중 {Math.round(totalPayout / project.totalBudget * 100)}%
              </p>
            )}
          </div>
          {project.description && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">사업 개요</p>
              <p className="text-[13px] text-foreground/80">{project.description}</p>
            </div>
          )}
        </div>

        {project.coaches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border">
            <Users className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-[14px] font-semibold mb-1">투입된 코치가 없습니다</p>
            <Button size="sm" onClick={() => setAddCoachOpen(true)} className="text-[12px] h-8 rounded-[2px] mt-2">
              <Plus className="w-3 h-3 mr-1" /> 코치 투입하기
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {project.coaches.map((pc) => {
              const taskDraft = taskDrafts[pc.coachId];
              const currentTask = taskDraft !== undefined ? taskDraft : pc.taskSummary;
              const isTaskDirty = taskDraft !== undefined && taskDraft !== pc.taskSummary;
              const payDraft = getPaymentDraft(pc.coachId, pc);
              const isPayDirty = paymentDrafts[pc.coachId] !== undefined;
              const calcTotal = (parseFloat(payDraft.unitPrice) || 0) * (parseFloat(payDraft.sessions) || 0);

              return (
                <div key={pc.coachId} className="border border-border bg-white">
                  {/* 코치 헤더 */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-2">
                      <span className={"text-[9px] px-1.5 py-[1px] font-mono font-semibold text-white " +
                        (pc.coachTier === 1 ? "bg-primary" : pc.coachTier === 2 ? "bg-foreground" : "bg-muted-foreground")}>
                        {TIER_SHORT[pc.coachTier] || ("T" + pc.coachTier)}
                      </span>
                      <span className="text-[14px] font-bold">{pc.coachName}</span>
                      <span className="text-[11px] text-muted-foreground">{pc.coachCategory}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pc.evaluation && (
                        <div className="flex items-center gap-1.5">
                          <StarRating value={pc.evaluation.rating} />
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        </div>
                      )}
                      <Button size="sm" variant="outline"
                        onClick={() => setEvalTarget({ coachId: pc.coachId, coachName: pc.coachName, initial: pc.evaluation })}
                        className="h-7 text-[11px] rounded-[2px] gap-1">
                        <Star className="w-3 h-3" />{pc.evaluation ? "평가 수정" : "평가 작성"}
                      </Button>
                      <button onClick={() => { if (confirm(pc.coachName + " 코치를 제외하시겠습니까?")) removeCoachFromProject(project.id, pc.coachId); }}
                        className="text-muted-foreground hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* 단가 섹션 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          <Wallet className="w-3 h-3" /> 단가 & 지급액
                        </label>
                        {isPayDirty && (
                          <button onClick={() => handlePaymentSave(pc.coachId, pc)} className="flex items-center gap-1 text-[11px] text-primary font-medium">
                            <Save className="w-3 h-3" /> 저장
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground mb-1 block">회차 단가 (원)</label>
                          <input
                            type="number" min="0"
                            className="w-full border border-border px-2 py-1.5 text-[12px] rounded-[2px] focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="예: 300000"
                            value={payDraft.unitPrice}
                            onChange={e => handlePaymentChange(pc.coachId, "unitPrice", e.target.value, pc)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground mb-1 block">투입 횟수</label>
                          <input
                            type="number" min="0"
                            className="w-full border border-border px-2 py-1.5 text-[12px] rounded-[2px] focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="예: 5"
                            value={payDraft.sessions}
                            onChange={e => handlePaymentChange(pc.coachId, "sessions", e.target.value, pc)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                            총 지급액 (원)
                            {calcTotal > 0 && !payDraft.totalAmount && (
                              <span className="text-primary font-mono">= {formatKRW(calcTotal)}</span>
                            )}
                          </label>
                          <input
                            type="number" min="0"
                            className="w-full border border-border px-2 py-1.5 text-[12px] rounded-[2px] focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder={calcTotal > 0 ? String(calcTotal) : "직접 입력"}
                            value={payDraft.totalAmount}
                            onChange={e => handlePaymentChange(pc.coachId, "totalAmount", e.target.value, pc)}
                          />
                        </div>
                      </div>
                      {(pc.totalAmount || pc.unitPrice) && !isPayDirty && (
                        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                          {pc.unitPrice && <span>단가 {formatKRW(pc.unitPrice)}</span>}
                          {pc.sessions && <span>× {pc.sessions}회</span>}
                          {pc.totalAmount && <span className="font-semibold text-foreground">= {formatKRW(pc.totalAmount)}</span>}
                        </div>
                      )}
                    </div>

                    {/* 과업 내용 */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          <ClipboardList className="w-3 h-3" /> 수행 과업 내용
                        </label>
                        {isTaskDirty && (
                          <button onClick={() => handleTaskSave(pc.coachId)} className="flex items-center gap-1 text-[11px] text-primary font-medium">
                            <Save className="w-3 h-3" /> 저장
                          </button>
                        )}
                      </div>
                      <textarea className="w-full border border-border px-3 py-2 text-[12px] rounded-[2px] focus:outline-none focus:ring-1 focus:ring-primary resize-none bg-white"
                        rows={3} value={currentTask}
                        onChange={e => setTaskDrafts(prev => ({ ...prev, [pc.coachId]: e.target.value }))}
                        placeholder="이 코치가 수행한 과업 내용을 요약하여 기록하세요. (예: 비즈니스 모델 검증 코칭 3회, 피칭 피드백 2회)" />
                      {pc.evaluation?.comment && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-100 rounded-[2px]">
                          <p className="text-[10px] font-semibold text-amber-700 mb-0.5">평가 코멘트</p>
                          <p className="text-[12px] text-amber-800">{pc.evaluation.comment}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddCoachModal open={addCoachOpen} onClose={() => setAddCoachOpen(false)} projectId={project.id} existingCoachIds={project.coaches.map(c => c.coachId)} />
      {editOpen && <ProjectFormModal open={editOpen} onClose={() => setEditOpen(false)} initial={project} />}
      {evalTarget && <EvaluationModal open={!!evalTarget} onClose={() => setEvalTarget(null)} projectId={project.id} coachId={evalTarget.coachId} coachName={evalTarget.coachName} initial={evalTarget.initial} />}
    </div>
  );
}

// ─── 코치 현황 대시보드 ───────────────────────────────────────────
interface CoachStat {
  coachId: number;
  coachName: string;
  coachTier: number;
  coachCategory: string;
  projectCount: number;
  totalSessions: number;
  totalPayout: number;
  avgRating: number | null;
  ratingCount: number;
  projects: string[];
}

function CoachDashboard({ projects }: { projects: Project[] }) {
  const [sort, setSort] = useState<"payout" | "rating" | "sessions">("payout");
  const [search, setSearch] = useState("");

  const stats = useMemo<CoachStat[]>(() => {
    const map = new Map<number, CoachStat>();
    for (const project of projects) {
      for (const pc of project.coaches) {
        if (!map.has(pc.coachId)) {
          map.set(pc.coachId, {
            coachId: pc.coachId,
            coachName: pc.coachName,
            coachTier: pc.coachTier,
            coachCategory: pc.coachCategory,
            projectCount: 0,
            totalSessions: 0,
            totalPayout: 0,
            avgRating: null,
            ratingCount: 0,
            projects: [],
          });
        }
        const s = map.get(pc.coachId)!;
        s.projectCount += 1;
        s.totalSessions += pc.sessions || 0;
        s.totalPayout += pc.totalAmount || 0;
        s.projects.push(project.name);
        if (pc.evaluation) {
          const prev = s.avgRating ?? 0;
          s.avgRating = (prev * s.ratingCount + pc.evaluation.rating) / (s.ratingCount + 1);
          s.ratingCount += 1;
        }
      }
    }
    return Array.from(map.values());
  }, [projects]);

  const filtered = useMemo(() => {
    let list = stats;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.coachName.toLowerCase().includes(q) || s.coachCategory.toLowerCase().includes(q));
    }
    if (sort === "payout") return [...list].sort((a, b) => b.totalPayout - a.totalPayout);
    if (sort === "rating") return [...list].sort((a, b) => (b.avgRating ?? -1) - (a.avgRating ?? -1));
    return [...list].sort((a, b) => b.totalSessions - a.totalSessions);
  }, [stats, sort, search]);

  const totalPayoutAll = stats.reduce((s, c) => s + c.totalPayout, 0);
  const avgRatingAll = stats.filter(c => c.avgRating !== null).reduce((s, c, _, a) => s + (c.avgRating! / a.length), 0);

  return (
    <div className="p-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 border border-border bg-muted/20">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">투입 코치 수</p>
          <p className="text-[22px] font-mono font-bold text-primary">{stats.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">전체 사업 합산</p>
        </div>
        <div className="p-4 border border-border bg-muted/20">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">총 지급액 합계</p>
          <p className="text-[22px] font-mono font-bold text-primary">{totalPayoutAll > 0 ? formatKRW(totalPayoutAll) : "-"}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">단가 입력된 항목 기준</p>
        </div>
        <div className="p-4 border border-border bg-muted/20">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">평균 평점</p>
          <p className="text-[22px] font-mono font-bold text-primary">
            {avgRatingAll > 0 ? avgRatingAll.toFixed(1) : "-"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">평가 완료 코치 기준</p>
        </div>
      </div>

      {/* 필터 & 정렬 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input className="w-full border border-border pl-8 pr-3 py-2 text-[13px] rounded-[2px] focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="코치 이름 검색..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {(["payout", "rating", "sessions"] as const).map(s => (
            <button key={s} onClick={() => setSort(s)}
              className={"px-3 py-1.5 text-[11px] font-medium border rounded-[2px] transition-colors " +
                (sort === s ? "bg-foreground text-white border-foreground" : "border-border text-muted-foreground hover:border-gray-400")}>
              {s === "payout" ? "지급액순" : s === "rating" ? "평점순" : "횟수순"}
            </button>
          ))}
        </div>
      </div>

      {/* 코치 목록 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border">
          <BarChart3 className="w-10 h-10 text-muted-foreground mb-4" />
          <p className="text-[15px] font-bold mb-1">아직 투입된 코치가 없습니다</p>
          <p className="text-[13px] text-muted-foreground">사업에 코치를 투입하면 여기서 현황을 확인할 수 있습니다.</p>
        </div>
      ) : (
        <div className="border border-border overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">코치</th>
                <th className="text-center px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">참여 사업</th>
                <th className="text-center px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">총 횟수</th>
                <th className="text-right px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">총 지급액</th>
                <th className="text-center px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">평균 평점</th>
                <th className="text-left px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">참여 사업 목록</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.coachId} className={"border-b border-border last:border-0 hover:bg-muted/20 " + (i % 2 === 0 ? "" : "bg-muted/10")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={"text-[9px] px-1.5 py-[1px] font-mono font-semibold text-white flex-shrink-0 " +
                        (s.coachTier === 1 ? "bg-primary" : s.coachTier === 2 ? "bg-foreground" : "bg-muted-foreground")}>
                        {TIER_SHORT[s.coachTier]}
                      </span>
                      <div>
                        <p className="font-semibold text-[13px]">{s.coachName}</p>
                        <p className="text-[10px] text-muted-foreground">{s.coachCategory}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-primary">{s.projectCount}</td>
                  <td className="px-3 py-3 text-center font-mono">{s.totalSessions > 0 ? s.totalSessions + "회" : "-"}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    {s.totalPayout > 0 ? <span className="text-primary">{formatKRW(s.totalPayout)}</span> : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {s.avgRating !== null ? (
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-3 h-3" fill="#FBBF24" stroke="#FBBF24" />
                        <span className="font-mono font-bold">{s.avgRating.toFixed(1)}</span>
                        <span className="text-muted-foreground text-[10px]">({s.ratingCount})</span>
                      </div>
                    ) : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.projects.slice(0, 3).map((name, idx) => (
                        <span key={idx} className="px-1.5 py-[2px] text-[10px] border border-border text-muted-foreground truncate max-w-[120px]">{name}</span>
                      ))}
                      {s.projects.length > 3 && <span className="text-[10px] text-muted-foreground">+{s.projects.length - 3}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function ProjectsPage() {
  const { projects } = useProjects();
  const { logout, user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"projects" | "coaches">("projects");

  const selectedProject = projects.find(p => p.id === selectedId);

  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(p => [p.name, p.client || "", p.description || ""].join(" ").toLowerCase().includes(q));
  }, [projects, search]);

  if (selectedProject) {
    return <div className="flex min-h-screen bg-white"><ProjectDetail project={selectedProject} onBack={() => setSelectedId(null)} /></div>;
  }

  return (
    <div className="flex min-h-screen bg-white">
      <div className="flex-1 min-w-0">
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-border px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> 코치 검색
              </a>
              <span className="w-px h-4 bg-border" />
              <h1 className="text-[15px] font-bold flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> 사업 관리
              </h1>
              {/* 탭 */}
              <div className="flex gap-1 ml-2">
                <button onClick={() => setTab("projects")}
                  className={"px-3 py-1 text-[11px] font-medium rounded-[2px] transition-colors " +
                    (tab === "projects" ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                  <span className="flex items-center gap-1"><ClipboardList className="w-3 h-3" /> 사업 목록 <span className="font-mono">{projects.length}</span></span>
                </button>
                <button onClick={() => setTab("coaches")}
                  className={"px-3 py-1 text-[11px] font-medium rounded-[2px] transition-colors " +
                    (tab === "coaches" ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                  <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> 코치 현황</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {user && <span className="text-[11px] text-muted-foreground">{user}</span>}
              {tab === "projects" && (
                <Button onClick={() => setFormOpen(true)} className="h-7 px-3 text-[11px] rounded-[2px] gap-1">
                  <Plus className="w-3 h-3" /> 새 사업 등록
                </Button>
              )}
              <button onClick={logout} className="text-[11px] text-muted-foreground hover:text-red-500 transition-colors">로그아웃</button>
            </div>
          </div>
        </div>

        {tab === "coaches" ? (
          <CoachDashboard projects={projects} />
        ) : (
          <div className="p-6">
            <div className="relative mb-6 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input className="w-full border border-border pl-8 pr-3 py-2 text-[13px] rounded-[2px] focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="사업명, 발주처 검색..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border">
                <ClipboardList className="w-10 h-10 text-muted-foreground mb-4" />
                <p className="text-[15px] font-bold mb-1">등록된 사업이 없습니다</p>
                <p className="text-[13px] text-muted-foreground mb-5">사업을 등록하고 투입 코치와 성과를 체계적으로 관리하세요.</p>
                <Button onClick={() => setFormOpen(true)} className="text-[12px] h-9 rounded-[2px]">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> 첫 번째 사업 등록하기
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(project => {
                  const statusInfo = PROJECT_STATUS_LABELS[project.status];
                  const evaluatedCount = project.coaches.filter(c => c.evaluation).length;
                  const totalPayout = project.coaches.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
                  return (
                    <button key={project.id} onClick={() => setSelectedId(project.id)}
                      className="text-left border border-border bg-white hover:border-gray-300 hover:shadow-sm transition-all p-5 group">
                      <div className="flex items-start justify-between mb-3">
                        <span className={"px-2 py-[2px] text-[10px] font-semibold rounded-[2px] " + statusInfo.color}>{statusInfo.ko}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                      <h3 className="text-[14px] font-bold mb-1 leading-tight">{project.name}</h3>
                      {project.client && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-2">
                          <Building2 className="w-3 h-3" /> {project.client}
                        </div>
                      )}
                      {project.description && <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2">{project.description}</p>}
                      {(project.startDate || project.endDate) && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-3">
                          <Calendar className="w-3 h-3" />{project.startDate || "-"} ~ {project.endDate || "-"}
                        </div>
                      )}
                      <div className="flex items-center gap-4 pt-3 border-t border-border text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span className="font-mono font-bold text-foreground">{project.coaches.length}</span> 코치
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          <span className="font-mono font-bold text-green-600">{evaluatedCount}</span> 평가
                        </span>
                        {totalPayout > 0 && (
                          <span className="flex items-center gap-1 ml-auto">
                            <Wallet className="w-3 h-3" />
                            <span className="font-mono font-bold text-primary">{formatKRW(totalPayout)}</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      {formOpen && <ProjectFormModal open={formOpen} onClose={() => setFormOpen(false)} />}
    </div>
  );
}
