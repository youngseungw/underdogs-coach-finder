/*
 * ProjectsPage - 사업 관리 & 코치 평가 시스템
 */
import { useState, useMemo } from "react";
import { useProjects } from "@/contexts/ProjectContext";
import { useCoachData } from "@/contexts/CoachDataContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { TIER_SHORT } from "@/types/coach";
import type { Project, ProjectStatus, ProjectCoachEvaluation } from "@/types/project";
import { PROJECT_STATUS_LABELS } from "@/types/project";
import { Plus, Star, ChevronRight, Users, ClipboardList, Calendar, Building2, CheckCircle2, ArrowLeft, Search, Save, X } from "lucide-react";
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

  const handleSave = () => {
    if (!name.trim()) { toast.error("사업명을 입력하세요."); return; }
    if (initial) {
      updateProject(initial.id, { name, client, description, startDate, endDate, status });
      toast.success("사업 정보가 수정되었습니다.");
    } else {
      addProject({ name, client, description, startDate, endDate, status });
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
    saveEvaluation(projectId, coachId, { rating: rating as 1|2|3|4|5, comment, evaluatedAt: new Date().toISOString() });
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
  const { removeCoachFromProject, updateCoachTask, updateProject, deleteProject } = useProjects();
  const [addCoachOpen, setAddCoachOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [evalTarget, setEvalTarget] = useState<{ coachId: number; coachName: string; initial?: ProjectCoachEvaluation } | null>(null);
  const [taskDrafts, setTaskDrafts] = useState<Record<number, string>>({});

  const handleTaskSave = (coachId: number) => {
    const draft = taskDrafts[coachId];
    if (draft !== undefined) {
      updateCoachTask(project.id, coachId, draft);
      setTaskDrafts(prev => { const n = { ...prev }; delete n[coachId]; return n; });
      toast.success("과업 내용이 저장되었습니다.");
    }
  };

  const handleDelete = () => {
    if (confirm("이 사업을 삭제하시겠습니까?")) { deleteProject(project.id); onBack(); }
  };

  const statusInfo = PROJECT_STATUS_LABELS[project.status];
  const evaluatedCount = project.coaches.filter(c => c.evaluation).length;

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
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/30 border border-border">
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
          {project.description && (
            <div className="col-span-3">
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
              const draft = taskDrafts[pc.coachId];
              const currentTask = draft !== undefined ? draft : pc.taskSummary;
              const isDirty = draft !== undefined && draft !== pc.taskSummary;
              return (
                <div key={pc.coachId} className="border border-border bg-white">
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
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <ClipboardList className="w-3 h-3" /> 수행 과업 내용
                      </label>
                      {isDirty && (
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

export default function ProjectsPage() {
  const { projects } = useProjects();
  const { logout, user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

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
              <span className="text-[12px] text-muted-foreground font-mono">{projects.length}건</span>
            </div>
            <div className="flex items-center gap-3">
              {user && <span className="text-[11px] text-muted-foreground">{user}</span>}
              <Button onClick={() => setFormOpen(true)} className="h-7 px-3 text-[11px] rounded-[2px] gap-1">
                <Plus className="w-3 h-3" /> 새 사업 등록
              </Button>
              <button onClick={logout} className="text-[11px] text-muted-foreground hover:text-red-500 transition-colors">로그아웃</button>
            </div>
          </div>
        </div>

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
                        <span className="font-mono font-bold text-green-600">{evaluatedCount}</span> 평가완료
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {formOpen && <ProjectFormModal open={formOpen} onClose={() => setFormOpen(false)} />}
    </div>
  );
}
