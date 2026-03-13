import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { Project, ProjectCoach, ProjectCoachEvaluation } from "@/types/project";
import { db } from "@/lib/firebase";
import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
} from "firebase/firestore";

const LS_KEY = "underdogs_projects";

interface CoachPayment {
  payRole?: string;
  payGrade?: string;
  payUnit?: string;
  payRatio?: number;
  unitPrice?: number;
  sessions?: number;
  totalAmount?: number;
}

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  addProject: (p: Omit<Project, "id" | "createdAt" | "coaches">) => Promise<void>;
  updateProject: (id: number, updates: Partial<Omit<Project, "id" | "coaches">>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  addCoachToProject: (projectId: number, coach: Omit<ProjectCoach, "evaluation">) => Promise<void>;
  removeCoachFromProject: (projectId: number, coachId: number) => Promise<void>;
  updateCoachTask: (projectId: number, coachId: number, taskSummary: string) => Promise<void>;
  updateCoachPayment: (projectId: number, coachId: number, payment: CoachPayment) => Promise<void>;
  saveEvaluation: (projectId: number, coachId: number, evaluation: ProjectCoachEvaluation) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

function loadFromLS(): Project[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const projectsRef = useRef<Project[]>([]);

  useEffect(() => { projectsRef.current = projects; }, [projects]);

  // Firestore 실시간 동기화 (없으면 localStorage 폴백)
  useEffect(() => {
    if (!db) {
      setProjects(loadFromLS());
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(
      collection(db, "projects"),
      (snapshot) => {
        const data = snapshot.docs.map(d => d.data() as Project);
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setProjects(data);
        setLoading(false);
      },
      () => {
        setProjects(loadFromLS());
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  // localStorage 폴백 시 동기화
  useEffect(() => {
    if (!db) localStorage.setItem(LS_KEY, JSON.stringify(projects));
  }, [projects]);

  const saveProject = useCallback(async (project: Project) => {
    if (db) {
      await setDoc(doc(db, "projects", String(project.id)), project);
    } else {
      setProjects(prev => {
        const next = prev.find(p => p.id === project.id)
          ? prev.map(p => p.id === project.id ? project : p)
          : [...prev, project];
        localStorage.setItem(LS_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, []);

  const updateCoaches = useCallback(async (
    projectId: number,
    updater: (coaches: ProjectCoach[]) => ProjectCoach[]
  ) => {
    const project = projectsRef.current.find(p => p.id === projectId);
    if (!project) return;
    await saveProject({ ...project, coaches: updater(project.coaches) });
  }, [saveProject]);

  const addProject = useCallback(async (p: Omit<Project, "id" | "createdAt" | "coaches">) => {
    const id = Date.now();
    await saveProject({ ...p, id, createdAt: new Date().toISOString(), coaches: [] });
  }, [saveProject]);

  const updateProject = useCallback(async (id: number, updates: Partial<Omit<Project, "id" | "coaches">>) => {
    const project = projectsRef.current.find(p => p.id === id);
    if (!project) return;
    await saveProject({ ...project, ...updates });
  }, [saveProject]);

  const deleteProject = useCallback(async (id: number) => {
    if (db) {
      await deleteDoc(doc(db, "projects", String(id)));
    } else {
      setProjects(prev => {
        const next = prev.filter(p => p.id !== id);
        localStorage.setItem(LS_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, []);

  const addCoachToProject = useCallback(async (projectId: number, coach: Omit<ProjectCoach, "evaluation">) => {
    await updateCoaches(projectId, coaches => {
      if (coaches.find(c => c.coachId === coach.coachId)) return coaches;
      return [...coaches, { ...coach, taskSummary: "" }];
    });
  }, [updateCoaches]);

  const removeCoachFromProject = useCallback(async (projectId: number, coachId: number) => {
    await updateCoaches(projectId, coaches => coaches.filter(c => c.coachId !== coachId));
  }, [updateCoaches]);

  const updateCoachTask = useCallback(async (projectId: number, coachId: number, taskSummary: string) => {
    await updateCoaches(projectId, coaches =>
      coaches.map(c => c.coachId === coachId ? { ...c, taskSummary } : c)
    );
  }, [updateCoaches]);

  const updateCoachPayment = useCallback(async (projectId: number, coachId: number, payment: CoachPayment) => {
    await updateCoaches(projectId, coaches =>
      coaches.map(c => c.coachId === coachId ? { ...c, ...payment } : c)
    );
  }, [updateCoaches]);

  const saveEvaluation = useCallback(async (projectId: number, coachId: number, evaluation: ProjectCoachEvaluation) => {
    await updateCoaches(projectId, coaches =>
      coaches.map(c => c.coachId === coachId ? { ...c, evaluation } : c)
    );
  }, [updateCoaches]);

  return (
    <ProjectContext.Provider value={{
      projects, loading, addProject, updateProject, deleteProject,
      addCoachToProject, removeCoachFromProject, updateCoachTask, updateCoachPayment, saveEvaluation,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProjects must be used within ProjectProvider");
  return ctx;
}
