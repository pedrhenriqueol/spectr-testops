import axios, { InternalAxiosRequestConfig } from 'axios';

const rawBaseURL = import.meta.env.VITE_API_URL || (import.meta.env.PROD
  ? 'https://spectr-testops-server.onrender.com/api/v1'
  : 'http://localhost:3335/api/v1');
const cleanBase = rawBaseURL.replace(/\/+$/, '');
export const baseURL = cleanBase.endsWith('/api/v1')
  ? cleanBase
  : cleanBase.endsWith('/api')
    ? `${cleanBase}/v1`
    : `${cleanBase}/api/v1`;

export const api = axios.create({
  // The URL used by the execution engine stays absolute; the browser uses a
  // first-party cookie through Vite's proxy / Vercel's external rewrite.
  baseURL: import.meta.env.VITE_API_TRANSPORT === 'direct' ? baseURL : '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data?.message === 'string') return data.message;
    if (typeof data?.error === 'string') return data.error;
    if (!error.response) return 'Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.';
    return `A operação falhou (HTTP ${error.response.status}).`;
  }
  return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
}

interface ApiSessionHandlers {
  getWorkspaceId: () => string | null;
  getSessionVersion: () => number;
  onUnauthenticated: () => void;
}

const isAuthEndpoint = (path?: string) => /(?:^|\/)auth(?:\/|$)/.test(path || '');

/** Session credentials stay in the browser's HttpOnly cookie; only workspace scope is added here. */
export function installApiSessionHandlers({ getWorkspaceId, getSessionVersion, onUnauthenticated }: ApiSessionHandlers): () => void {
  type SessionRequestConfig = InternalAxiosRequestConfig & { spectrSessionVersion?: number };
  const requests = api.interceptors.request.use(config => {
    (config as SessionRequestConfig).spectrSessionVersion = getSessionVersion();
    const workspaceId = isAuthEndpoint(config.url) ? null : getWorkspaceId();
    if (workspaceId) config.headers.set('X-Workspace-Id', workspaceId);
    else config.headers.delete('X-Workspace-Id');
    return config;
  });
  const responses = api.interceptors.response.use(response => response, failure => {
    if (axios.isAxiosError(failure) && failure.response?.status === 401 && !isAuthEndpoint(failure.config?.url)) {
      const failedWorkspace = failure.config?.headers?.get?.('X-Workspace-Id');
      // Ignore a late failure from a request sent before the user switched workspaces or accounts.
      const currentSession = (failure.config as SessionRequestConfig | undefined)?.spectrSessionVersion === getSessionVersion();
      if (currentSession && getWorkspaceId() && failedWorkspace === getWorkspaceId()) onUnauthenticated();
    }
    return Promise.reject(failure);
  });
  return () => {
    api.interceptors.request.eject(requests);
    api.interceptors.response.eject(responses);
  };
}
