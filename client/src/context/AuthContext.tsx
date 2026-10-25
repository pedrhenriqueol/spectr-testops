import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { api, getApiErrorMessage, installApiSessionHandlers } from '../api/client';

export interface AuthUser { id: string; name: string; email: string; }
export interface AuthWorkspace { id: string; name: string; slug: string; role: 'OWNER' | 'ADMIN' | 'MEMBER'; }
export interface LoginInput { email: string; password: string; }
export interface RegisterInput extends LoginInput { name: string; workspaceName?: string; }
interface SessionResponse { user: AuthUser; workspaces: AuthWorkspace[]; currentWorkspaceId: string; }

interface AuthContextValue {
  loading: boolean;
  user: AuthUser | null;
  workspaces: AuthWorkspace[];
  selectedWorkspaceId: string | null;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  createWorkspace: (name: string) => Promise<AuthWorkspace>;
  selectWorkspace: (id: string) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function canChangeContext(): boolean {
  return window.dispatchEvent(new Event('spectr:before-context-change', { cancelable: true }));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspaces, setWorkspaces] = useState<AuthWorkspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workspaceRef = useRef<string | null>(null);
  const userRef = useRef<AuthUser | null>(null);
  const operationVersion = useRef(0);

  const clearSession = useCallback(() => {
    operationVersion.current += 1;
    workspaceRef.current = null;
    userRef.current = null;
    setUser(null);
    setWorkspaces([]);
    setSelectedWorkspaceId(null);
    setError(null);
    setLoading(false);
  }, []);

  const applySession = useCallback((session: SessionResponse) => {
    const chosen = session.workspaces.find(workspace => workspace.id === workspaceRef.current)?.id
      || session.workspaces.find(workspace => workspace.id === session.currentWorkspaceId)?.id
      || session.workspaces[0]?.id || null;
    // Update before mounting authenticated children so their first request has the correct scope.
    workspaceRef.current = chosen;
    userRef.current = session.user;
    setUser(session.user);
    setWorkspaces(session.workspaces);
    setSelectedWorkspaceId(chosen);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    const version = ++operationVersion.current;
    setLoading(true);
    try {
      const response = await api.get<SessionResponse>('/auth/me');
      if (version !== operationVersion.current) return;
      applySession(response.data);
    } catch (failure) {
      if (version !== operationVersion.current) return;
      if (isAxiosError(failure) && failure.response?.status === 401) clearSession();
      else {
        workspaceRef.current = null;
        userRef.current = null;
        setUser(null);
        setWorkspaces([]);
        setSelectedWorkspaceId(null);
        setError(getApiErrorMessage(failure));
      }
    } finally {
      if (version === operationVersion.current) setLoading(false);
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    const removeHandlers = installApiSessionHandlers({
      getWorkspaceId: () => workspaceRef.current,
      getSessionVersion: () => operationVersion.current,
      onUnauthenticated: clearSession
    });
    void refresh();
    return () => {
      operationVersion.current += 1;
      removeHandlers();
    };
  }, [clearSession, refresh]);

  const login = useCallback(async (input: LoginInput) => {
    const version = ++operationVersion.current;
    const response = await api.post<SessionResponse>('/auth/login', input);
    if (version !== operationVersion.current) return;
    workspaceRef.current = null;
    applySession(response.data);
    setLoading(false);
  }, [applySession]);

  const register = useCallback(async (input: RegisterInput) => {
    const version = ++operationVersion.current;
    const response = await api.post<SessionResponse>('/auth/register', input);
    if (version !== operationVersion.current) return;
    workspaceRef.current = null;
    applySession(response.data);
    setLoading(false);
  }, [applySession]);

  const logout = useCallback(async () => {
    if (!canChangeContext()) throw new Error('Alteração cancelada.');
    await api.post('/auth/logout');
    clearSession();
  }, [clearSession]);

  const selectWorkspace = useCallback((id: string) => {
    if (id === workspaceRef.current || !workspaces.some(workspace => workspace.id === id)) return;
    if (!canChangeContext()) return;
    workspaceRef.current = id;
    setSelectedWorkspaceId(id);
    setError(null);
  }, [workspaces]);

  const createWorkspace = useCallback(async (name: string) => {
    if (!canChangeContext()) throw new Error('Alteração cancelada.');
    const version = operationVersion.current;
    const response = await api.post<{ workspace: AuthWorkspace }>('/workspaces', { name: name.trim() });
    if (version !== operationVersion.current || !userRef.current) throw new Error('A sessão foi alterada. Entre novamente.');
    const workspace = response.data.workspace;
    workspaceRef.current = workspace.id;
    setWorkspaces(current => [...current.filter(item => item.id !== workspace.id), workspace]);
    setSelectedWorkspaceId(workspace.id);
    setError(null);
    return workspace;
  }, []);

  return <AuthContext.Provider value={{ loading, user, workspaces, selectedWorkspaceId, error, login, register, logout, createWorkspace, selectWorkspace, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
