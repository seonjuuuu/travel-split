// 여행 정산 앱 - 전역 상태 관리
// localStorage 기반 영속성 지원

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { nanoid } from "nanoid";
import type {
  Expense,
  Member,
  TravelProject,
} from "@/lib/types";
import { MEMBER_COLORS } from "@/lib/types";

interface AppContextType {
  projects: TravelProject[];
  currentProjectId: string | null;
  currentProject: TravelProject | null;

  // 프로젝트 관리
  createProject: (data: {
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    myName: string;
  }) => TravelProject;
  updateProject: (id: string, data: Partial<TravelProject>) => void;
  deleteProject: (id: string) => void;
  selectProject: (id: string | null) => void;

  // 멤버 관리
  addMember: (projectId: string, name: string) => void;
  removeMember: (projectId: string, memberId: string) => void;
  updateMember: (projectId: string, memberId: string, name: string) => void;

  // 지출 관리
  addExpense: (projectId: string, expense: Omit<Expense, "id">) => void;
  updateExpense: (
    projectId: string,
    expenseId: string,
    data: Partial<Expense>
  ) => void;
  deleteExpense: (projectId: string, expenseId: string) => void;

  // 정산 상태
  settledTransfers: Record<string, boolean>; // key: `${fromId}-${toId}-${amount}`
  toggleSettlement: (key: string) => void;
  resetSettlements: (projectId: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = "travel-split-data";
const SETTLED_KEY = "travel-split-settled";

function loadData(): TravelProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveData(projects: TravelProject[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function loadSettled(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SETTLED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<TravelProject[]>(loadData);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(
    () => {
      const saved = localStorage.getItem("travel-split-current");
      return saved || null;
    }
  );
  const [settledTransfers, setSettledTransfers] =
    useState<Record<string, boolean>>(loadSettled);

  useEffect(() => {
    saveData(projects);
  }, [projects]);

  useEffect(() => {
    if (currentProjectId) {
      localStorage.setItem("travel-split-current", currentProjectId);
    } else {
      localStorage.removeItem("travel-split-current");
    }
  }, [currentProjectId]);

  useEffect(() => {
    localStorage.setItem(SETTLED_KEY, JSON.stringify(settledTransfers));
  }, [settledTransfers]);

  const currentProject =
    projects.find((p) => p.id === currentProjectId) ?? null;

  const createProject = useCallback(
    (data: {
      name: string;
      destination: string;
      startDate: string;
      endDate: string;
      myName: string;
    }) => {
      const myMember: Member = {
        id: nanoid(),
        name: data.myName,
        isMe: true,
        color: MEMBER_COLORS[0],
      };
      const project: TravelProject = {
        id: nanoid(),
        name: data.name,
        destination: data.destination,
        startDate: data.startDate,
        endDate: data.endDate,
        members: [myMember],
        expenses: [],
        createdAt: new Date().toISOString(),
      };
      setProjects((prev) => [...prev, project]);
      setCurrentProjectId(project.id);
      return project;
    },
    []
  );

  const updateProject = useCallback(
    (id: string, data: Partial<TravelProject>) => {
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...data } : p))
      );
    },
    []
  );

  const deleteProject = useCallback(
    (id: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (currentProjectId === id) {
        setCurrentProjectId(null);
      }
    },
    [currentProjectId]
  );

  const selectProject = useCallback((id: string | null) => {
    setCurrentProjectId(id);
  }, []);

  const addMember = useCallback((projectId: string, name: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const colorIndex = p.members.length % MEMBER_COLORS.length;
        const newMember: Member = {
          id: nanoid(),
          name,
          isMe: false,
          color: MEMBER_COLORS[colorIndex],
        };
        return { ...p, members: [...p.members, newMember] };
      })
    );
  }, []);

  const removeMember = useCallback(
    (projectId: string, memberId: string) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            members: p.members.filter((m) => m.id !== memberId),
          };
        })
      );
    },
    []
  );

  const updateMember = useCallback(
    (projectId: string, memberId: string, name: string) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            members: p.members.map((m) =>
              m.id === memberId ? { ...m, name } : m
            ),
          };
        })
      );
    },
    []
  );

  const addExpense = useCallback(
    (projectId: string, expense: Omit<Expense, "id">) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const newExpense: Expense = { ...expense, id: nanoid() };
          return { ...p, expenses: [...p.expenses, newExpense] };
        })
      );
    },
    []
  );

  const updateExpense = useCallback(
    (projectId: string, expenseId: string, data: Partial<Expense>) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            expenses: p.expenses.map((e) =>
              e.id === expenseId ? { ...e, ...data } : e
            ),
          };
        })
      );
    },
    []
  );

  const deleteExpense = useCallback(
    (projectId: string, expenseId: string) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            expenses: p.expenses.filter((e) => e.id !== expenseId),
          };
        })
      );
    },
    []
  );

  const toggleSettlement = useCallback((key: string) => {
    setSettledTransfers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetSettlements = useCallback((projectId: string) => {
    setSettledTransfers((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(projectId)) delete next[k];
      });
      return next;
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        projects,
        currentProjectId,
        currentProject,
        createProject,
        updateProject,
        deleteProject,
        selectProject,
        addMember,
        removeMember,
        updateMember,
        addExpense,
        updateExpense,
        deleteExpense,
        settledTransfers,
        toggleSettlement,
        resetSettlements,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
