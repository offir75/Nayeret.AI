import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkspaceType = 'personal' | 'family' | 'business';
export type MemberRole = 'admin' | 'contributor' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  emoji: string;
  createdAt: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: MemberRole;
  displayName: string;
  email: string;
}

interface PersistedState {
  workspaces: Workspace[];
  activeId: string;
  members: WorkspaceMember[];
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  activeId: string;
  setActiveWorkspaceId: (id: string) => void;
  members: WorkspaceMember[];
  currentRole: MemberRole;
  isPersonal: boolean;
  addMember: (email: string, displayName: string, role: MemberRole) => void;
  removeMember: (userId: string) => void;
  updateMemberRole: (userId: string, role: MemberRole) => void;
  updateWorkspace: (id: string, updates: Partial<Pick<Workspace, 'name' | 'emoji'>>) => void;
  deleteWorkspace: (id: string) => void;
  createWorkspace: (name: string, type: WorkspaceType, emoji: string) => void;
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'nayeret_workspaces';
export const PERSONAL_WS_ID = 'ws-personal';

export const WORKSPACE_TYPE_CONFIG: Record<WorkspaceType, { he: string; en: string }> = {
  personal: { he: 'אישי', en: 'Personal' },
  family: { he: 'משפחה', en: 'Family' },
  business: { he: 'עסקי', en: 'Business' },
};

const PERSONAL_WORKSPACE: Workspace = {
  id: PERSONAL_WS_ID,
  name: 'Personal',
  type: 'personal',
  emoji: '🔒',
  createdAt: new Date().toISOString(),
};

// ─── Context ──────────────────────────────────────────────────────────────────

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be inside WorkspaceProvider');
  return ctx;
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PersistedState;
  } catch {}
  return { workspaces: [PERSONAL_WORKSPACE], activeId: PERSONAL_WS_ID, members: [] };
}

function saveState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(() =>
    typeof window === 'undefined'
      ? { workspaces: [PERSONAL_WORKSPACE], activeId: PERSONAL_WS_ID, members: [] }
      : loadState()
  );
  const [currentUserId, setCurrentUserId] = useState('');

  // Ensure personal workspace always exists
  useEffect(() => {
    setState(prev => {
      if (prev.workspaces.find(w => w.id === PERSONAL_WS_ID)) return prev;
      return { ...prev, workspaces: [PERSONAL_WORKSPACE, ...prev.workspaces] };
    });
  }, []);

  const persist = useCallback((fn: (prev: PersistedState) => PersistedState) => {
    setState(prev => {
      const next = fn(prev);
      saveState(next);
      return next;
    });
  }, []);

  const activeWorkspace =
    state.workspaces.find(w => w.id === state.activeId) ?? state.workspaces[0] ?? PERSONAL_WORKSPACE;

  const members = state.members.filter(m => m.workspaceId === state.activeId);
  const currentRole: MemberRole =
    members.find(m => m.userId === currentUserId)?.role ?? 'admin';
  const isPersonal = activeWorkspace.type === 'personal';

  const setActiveWorkspaceId = useCallback((id: string) => {
    persist(prev => ({ ...prev, activeId: id }));
  }, [persist]);

  const addMember = useCallback((email: string, displayName: string, role: MemberRole) => {
    persist(prev => ({
      ...prev,
      members: [...prev.members, { workspaceId: prev.activeId, userId: email, role, displayName, email }],
    }));
  }, [persist]);

  const removeMember = useCallback((userId: string) => {
    persist(prev => ({
      ...prev,
      members: prev.members.filter(m => !(m.workspaceId === prev.activeId && m.userId === userId)),
    }));
  }, [persist]);

  const updateMemberRole = useCallback((userId: string, role: MemberRole) => {
    persist(prev => ({
      ...prev,
      members: prev.members.map(m =>
        m.workspaceId === prev.activeId && m.userId === userId ? { ...m, role } : m
      ),
    }));
  }, [persist]);

  const updateWorkspace = useCallback((id: string, updates: Partial<Pick<Workspace, 'name' | 'emoji'>>) => {
    persist(prev => ({
      ...prev,
      workspaces: prev.workspaces.map(w => w.id === id ? { ...w, ...updates } : w),
    }));
  }, [persist]);

  const deleteWorkspace = useCallback((id: string) => {
    persist(prev => ({
      workspaces: prev.workspaces.filter(w => w.id !== id),
      activeId: prev.activeId === id ? PERSONAL_WS_ID : prev.activeId,
      members: prev.members.filter(m => m.workspaceId !== id),
    }));
  }, [persist]);

  const createWorkspace = useCallback((name: string, type: WorkspaceType, emoji: string) => {
    const newId = `ws-${Date.now()}`;
    persist(prev => ({
      ...prev,
      workspaces: [...prev.workspaces, { id: newId, name, type, emoji, createdAt: new Date().toISOString() }],
      activeId: newId,
    }));
  }, [persist]);

  return (
    <WorkspaceContext.Provider value={{
      workspaces: state.workspaces,
      activeWorkspace,
      activeId: state.activeId,
      setActiveWorkspaceId,
      members,
      currentRole,
      isPersonal,
      addMember,
      removeMember,
      updateMemberRole,
      updateWorkspace,
      deleteWorkspace,
      createWorkspace,
      currentUserId,
      setCurrentUserId,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
