/*
 * CoachDataContext - Firestore 기반 코치 데이터 CRUD 관리
 * 원본 JSON + Firestore 오버레이로 신규 등록/수정/삭제 지원
 * Firestore 미설정 시 localStorage 폴백
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { Coach } from "@/types/coach";
import coachesRaw from "@/data/coaches_db.json";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

const LS_KEY = "underdogs_coach_custom_data";
const FIRESTORE_DOC = "coachOverlay/global";

interface CustomData {
  added: Coach[];
  edited: Record<number, Partial<Coach>>;
  deleted: number[];
}

const EMPTY: CustomData = { added: [], edited: {}, deleted: [] };

function loadFromLS(): CustomData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return EMPTY;
}

interface CoachDataContextType {
  allCoaches: Coach[];
  addCoach: (coach: Omit<Coach, "id">) => void;
  updateCoach: (id: number, updates: Partial<Coach>) => void;
  deleteCoach: (id: number) => void;
  resetCustomData: () => void;
  customDataStats: { added: number; edited: number; deleted: number };
}

const CoachDataContext = createContext<CoachDataContextType>({
  allCoaches: [],
  addCoach: () => {},
  updateCoach: () => {},
  deleteCoach: () => {},
  resetCustomData: () => {},
  customDataStats: { added: 0, edited: 0, deleted: 0 },
});

const baseCoaches = coachesRaw as Coach[];

export function CoachDataProvider({ children }: { children: ReactNode }) {
  const [customData, setCustomData] = useState<CustomData>(EMPTY);

  // Firestore 실시간 동기화
  useEffect(() => {
    if (!db) {
      setCustomData(loadFromLS());
      return;
    }
    const [colId, docId] = FIRESTORE_DOC.split("/");
    const unsubscribe = onSnapshot(
      doc(db, colId, docId),
      (snap) => {
        if (snap.exists()) {
          setCustomData(snap.data() as CustomData);
        } else {
          setCustomData(EMPTY);
        }
      },
      () => {
        setCustomData(loadFromLS());
      }
    );
    return unsubscribe;
  }, []);

  // Firestore 또는 localStorage에 저장
  const persist = useCallback(async (data: CustomData) => {
    if (db) {
      const [colId, docId] = FIRESTORE_DOC.split("/");
      await setDoc(doc(db, colId, docId), data);
    } else {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    }
  }, []);

  const allCoaches: Coach[] = (() => {
    let result = baseCoaches
      .filter((c) => !customData.deleted.includes(c.id))
      .map((c) => {
        const edits = customData.edited[c.id];
        return edits ? { ...c, ...edits } : c;
      });
    return [...result, ...customData.added];
  })();

  const addCoach = useCallback((coachData: Omit<Coach, "id">) => {
    setCustomData((prev) => {
      const maxId = Math.max(
        ...baseCoaches.map((c) => c.id),
        ...prev.added.map((c) => c.id),
        0
      );
      const newCoach: Coach = { ...coachData, id: maxId + 1 } as Coach;
      const next = { ...prev, added: [...prev.added, newCoach] };
      persist(next);
      return next;
    });
  }, [persist]);

  const updateCoach = useCallback((id: number, updates: Partial<Coach>) => {
    setCustomData((prev) => {
      const addedIdx = prev.added.findIndex((c) => c.id === id);
      let next: CustomData;
      if (addedIdx >= 0) {
        const newAdded = [...prev.added];
        newAdded[addedIdx] = { ...newAdded[addedIdx], ...updates };
        next = { ...prev, added: newAdded };
      } else {
        next = {
          ...prev,
          edited: { ...prev.edited, [id]: { ...(prev.edited[id] || {}), ...updates } },
        };
      }
      persist(next);
      return next;
    });
  }, [persist]);

  const deleteCoach = useCallback((id: number) => {
    setCustomData((prev) => {
      const addedIdx = prev.added.findIndex((c) => c.id === id);
      let next: CustomData;
      if (addedIdx >= 0) {
        next = { ...prev, added: prev.added.filter((c) => c.id !== id) };
      } else {
        next = { ...prev, deleted: [...prev.deleted, id] };
      }
      persist(next);
      return next;
    });
  }, [persist]);

  const resetCustomData = useCallback(() => {
    persist(EMPTY);
    setCustomData(EMPTY);
    localStorage.removeItem(LS_KEY);
  }, [persist]);

  const customDataStats = {
    added: customData.added.length,
    edited: Object.keys(customData.edited).length,
    deleted: customData.deleted.length,
  };

  return (
    <CoachDataContext.Provider
      value={{ allCoaches, addCoach, updateCoach, deleteCoach, resetCustomData, customDataStats }}
    >
      {children}
    </CoachDataContext.Provider>
  );
}

export function useCoachData() {
  return useContext(CoachDataContext);
}
