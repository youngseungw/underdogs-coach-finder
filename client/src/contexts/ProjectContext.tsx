import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { Project, ProjectCoach, ProjectCoachEvaluation, ProjectStatus } from "@/types/project";

const LS_KEY = "underdogs_projects";

interface ProjectContextType {
  projects: Project[];
  addProject: (p: Omit<Project, "id" | "createdAt" | "coaches">) => void;
  updateProject: (id: number, updates: Partial<Omit<Project, "id" | "coaches">>) => void;
  deleteProject: (id: number) => void;
  addCoachToProject: (projectId: number, coach: Omit<ProjectCoach, "evaluation">) => void;
  removeCoachFromProject: (projectId: number, coachId: number) => void;
  updateCoachTask: (projectId: number, coachId: number, taskSummary: string) => void;
  saveEvaluation: (projectId: number, coachId: number, evaluation: ProjectCoachEvaluation) => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

function load(): Project[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(projects: Project[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(projects));
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(load);

  useEffect(() => { save(projects); }, [projects]);

  const addProject = useCallback((p: Omit<Project, "id" | "createdAt" | "coaches">) => {
    setProjects(prev => {
      const id = prev.length > 0 ? Math.max(...prev.map(x => x.id)) + 1 : 1;
      return [...prev, { ...p, id, createdAt: new Date().toISOString(), coaches: [] }];
    });
  }, []);

  const updateProject = useCallback((id: number, updates: Partial<Omit<Project, "id" | "coaches">>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const deleteProject = useCallback((id: number) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  const addCoachToProject = useCallback((projectId: number, coach: Omit<ProjectCoach, "evaluation">) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      if (p.coaches.find(c => c.coachId === coach.coachId)) return p;
      return { ...p, coaches: [...p.coaches, { ...coach, taskSummary: "" }] };
    }));
  }, []);

  const removeCoachFromProject = useCallback((projectId: number, coachId: number) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, coaches: p.coaches.filter(c => c.coachId !== coachId) }
        : p
    ));
  }, []);

  const updateCoachTask = useCallback((projectId: number, coachId: number, taskSummary: string) => {
    setProjects(prev => prev.map(p =>
      p.id !== projectId ? p : {
        ...p,
        coaches: p.coaches.map(c =>
          c.coachId === coachId ? { ...c, taskSummary } : c
        ),
      }
    ));
  }, []);

  const saveEvaluation = useCallback((projectId: number, coachId: number, evaluation: ProjectCoachEvaluation) => {
    setProjects(prev => prev.map(p =>
      p.id !== projectId ? p : {
        ...p,
        coaches: p.coaches.map(c =>
          c.coachId === coachId ? { ...c, evaluation } : c
        ),
      }
    ));
  }, []);

  return (
    <ProjectContext.Provider value={{
      projects, addProject, updateProject, deleteProject,
      addCoachToProject, removeCoachFromProject, updateCoachTask, saveEvaluation,
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
