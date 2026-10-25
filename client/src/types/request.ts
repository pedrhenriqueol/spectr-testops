import type { TestCase } from './index';
import type { Language } from '../context/LanguageContext';

export type RequestDraftErrors = Partial<Record<'name' | 'path' | 'headers' | 'body' | 'expectedStatus' | 'maxLatencyMs' | 'expectedSchema', string>>;
const headerNamePattern = /^[!#$%&'*+\-.^_`|~\da-z]+$/i;

export function headerEntries(raw: string): [string, string][] {
  const value: unknown = JSON.parse(raw || '{}');
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.values(value).some(item => typeof item !== 'string')) throw new Error('Invalid headers');
  // A flat object of JSON strings lets us retain duplicate names until validation.
  const pairs = raw.matchAll(/(?:\{|,)\s*("(?:\\.|[^"\\])*")\s*:\s*("(?:\\.|[^"\\])*")/g);
  return [...pairs].map(pair => [JSON.parse(pair[1]) as string, JSON.parse(pair[2]) as string]);
}


export function getRequestDraftErrors(draft: TestCase, language: Language = 'pt'): RequestDraftErrors {
  const text = (pt: string, en: string) => language === 'pt' ? pt : en;
  const errors: RequestDraftErrors = {};
  if (draft.name.trim().length < 2) errors.name = text('Use pelo menos 2 caracteres no nome.', 'Use at least 2 characters for the name.');
  if (!draft.path.trim() || /[\r\n]/.test(draft.path)) errors.path = text('Informe um caminho ou URL HTTP(S) válido.', 'Enter a valid path or HTTP(S) URL.');
  else if (/^[a-z][a-z\d+.-]*:/i.test(draft.path.trim())) {
    try {
      const url = new URL(draft.path.trim());
      if (!['http:', 'https:'].includes(url.protocol)) errors.path = text('A URL deve usar HTTP ou HTTPS.', 'The URL must use HTTP or HTTPS.');
    } catch { errors.path = text('Informe uma URL HTTP(S) válida.', 'Enter a valid HTTP(S) URL.'); }
  }
  if (!Number.isInteger(draft.expectedStatus) || draft.expectedStatus < 100 || draft.expectedStatus > 599) errors.expectedStatus = text('O status deve ser um inteiro entre 100 e 599.', 'Status must be an integer from 100 to 599.');
  if (!Number.isInteger(draft.maxLatencyMs) || draft.maxLatencyMs < 1 || draft.maxLatencyMs > 300000) errors.maxLatencyMs = text('A latência deve ser um inteiro entre 1 e 300000 ms.', 'Latency must be an integer from 1 to 300000 ms.');
  if (draft.headers?.trim()) {
    try {
      const entries = headerEntries(draft.headers);
      const names = entries.map(([key]) => key.toLowerCase());
      if (entries.some(([key, value]) => !headerNamePattern.test(key) || typeof value !== 'string' || /[\r\n]/.test(value)) || new Set(names).size !== names.length) throw new Error();
    } catch { errors.headers = text('Use um objeto JSON com nomes de headers únicos e valores de texto, sem quebras de linha.', 'Use a JSON object with unique header names and text values, without line breaks.'); }
  }
  if (draft.body?.trim()) {
    try { JSON.parse(draft.body); } catch { errors.body = text('O body deve conter JSON válido. Deixe vazio para remover o payload.', 'Body must contain valid JSON. Leave it empty to remove the payload.'); }
  }
  if (draft.expectedSchema?.trim()) {
    try {
      const schema: unknown = JSON.parse(draft.expectedSchema);
      if (typeof schema !== 'boolean' && (!schema || typeof schema !== 'object' || Array.isArray(schema))) throw new Error();
    } catch { errors.expectedSchema = text('O schema deve ser um objeto JSON ou booleano (true/false). Deixe vazio para remover.', 'Schema must be a JSON object or boolean (true/false). Leave it empty to remove it.'); }
  }
  return errors;
}

export function toRequestOverrides(draft: TestCase) {
  return {
    method: draft.method,
    path: draft.path.trim(),
    headers: draft.headers?.trim() ? JSON.parse(draft.headers) as Record<string, string> : null,
    // Keep raw JSON so a literal JSON null is distinct from clearing the payload.
    body: draft.body?.trim() ? draft.body : null,
    expectedStatus: draft.expectedStatus,
    maxLatencyMs: draft.maxLatencyMs,
    expectedSchema: draft.expectedSchema?.trim() ? JSON.parse(draft.expectedSchema) as Record<string, unknown> | boolean : null
  };
}

export function toRequestPayload(draft: TestCase) {
  return { ...toRequestOverrides(draft), name: draft.name.trim(), active: draft.active };
}

export function queryEntries(path: string): [string, string][] {
  const beforeHash = path.split('#', 1)[0];
  const queryIndex = beforeHash.indexOf('?');
  return queryIndex < 0 ? [] : [...new URLSearchParams(beforeHash.slice(queryIndex + 1)).entries()];
}

export function withQueryEntries(path: string, entries: [string, string][]): string {
  const hashIndex = path.indexOf('#');
  const hash = hashIndex < 0 ? '' : path.slice(hashIndex);
  const beforeHash = hashIndex < 0 ? path : path.slice(0, hashIndex);
  const queryIndex = beforeHash.indexOf('?');
  const pathname = queryIndex < 0 ? beforeHash : beforeHash.slice(0, queryIndex);
  const params = new URLSearchParams();
  entries.forEach(([key, value]) => { if (key || value) params.append(key, value); });
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}${hash}`;
}
