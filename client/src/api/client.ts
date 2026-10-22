import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:3335/api/v1';
const cleanBase = rawBaseURL.replace(/\/+$/, '');
export const baseURL = cleanBase.endsWith('/api/v1')
  ? cleanBase
  : cleanBase.endsWith('/api')
    ? `${cleanBase}/v1`
    : `${cleanBase}/api/v1`;

export const api = axios.create({
  baseURL,
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
