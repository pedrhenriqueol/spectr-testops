import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Braces, Info, Plus, RotateCcw, Save, Send, Square, Trash2 } from 'lucide-react';
import { HttpMethod, TestCase } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getRequestDraftErrors, headerEntries, queryEntries, withQueryEntries } from '../types/request';

type RequestTab = 'params' | 'headers' | 'body' | 'assertions' | 'schema';

interface RequestPanelProps {
  currentCase: TestCase | null;
  requestUrl: string;
  requestHeaders: Record<string, string>;
  isExecuting: boolean;
  isSending: boolean;
  onSend: () => void;
  onCreate: () => void;
  hasSuite: boolean;
  onChange: (patch: Partial<TestCase>) => void;
  onSave: () => void;
  onDiscard: () => void;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  onDelete: () => void;
}

interface KeyValueEditorProps {
  source: string;
  entries: [string, string][];
  onChange: (entries: [string, string][]) => string;
  kind: 'params' | 'headers';
  disabled: boolean;
}

const fieldClass = 'h-8 w-full min-w-0 rounded border border-pm-light-border bg-transparent px-2 font-mono text-xs text-pm-light-text placeholder:text-pm-light-textMuted focus:border-pm-orange focus:outline-none disabled:opacity-50 dark:border-pm-dark-border dark:text-pm-dark-text dark:placeholder:text-pm-dark-textMuted';
const textareaClass = 'min-h-[160px] w-full resize-y rounded border border-pm-light-border bg-pm-light-panel p-3 font-mono text-[12px] leading-relaxed text-pm-light-text placeholder:text-pm-light-textMuted focus:border-pm-orange focus:outline-none disabled:opacity-50 dark:border-pm-dark-border dark:bg-pm-dark-panel dark:text-pm-dark-text dark:placeholder:text-pm-dark-textMuted';

function KeyValueEditor({ source, entries, onChange, kind, disabled }: KeyValueEditorProps) {
  const { language } = useLanguage();
  const text = (pt: string, en: string) => language === 'pt' ? pt : en;
  const [rows, setRows] = useState(() => entries.map(([key, value]) => ({ id: crypto.randomUUID(), key, value })));
  const lastChange = useRef(source);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  useEffect(() => {
    if (source !== lastChange.current) {
      setRows(entriesRef.current.map(([key, value]) => ({ id: crypto.randomUUID(), key, value })));
      lastChange.current = source;
    }
  }, [source]);
  const update = (nextRows: typeof rows) => {
    setRows(nextRows);
    lastChange.current = onChange(nextRows.map(row => [row.key, row.value]));
  };
  const label = kind === 'params' ? text('Parâmetro', 'Parameter') : 'Header';
  return (
    <div className="min-w-0">
      <table className="workbench-table w-full table-fixed text-left text-xs">
        <thead><tr><th className="w-[38%]">{text('CHAVE', 'KEY')}</th><th>{text('VALOR', 'VALUE')}</th><th className="w-10"><span className="sr-only">{text('Ações', 'Actions')}</span></th></tr></thead>
        <tbody>{rows.map((row, index) => <tr key={row.id}>
          <td className="!px-1 !py-1.5"><input disabled={disabled} aria-label={`${label} ${index + 1}: ${text('chave', 'key')}`} placeholder={text('Chave', 'Key')} value={row.key} onChange={event => update(rows.map(item => item.id === row.id ? { ...item, key: event.target.value } : item))} className={fieldClass} /></td>
          <td className="!px-1 !py-1.5"><input disabled={disabled} aria-label={`${label} ${index + 1}: ${text('valor', 'value')}`} placeholder={text('Valor', 'Value')} value={row.value} onChange={event => update(rows.map(item => item.id === row.id ? { ...item, value: event.target.value } : item))} className={fieldClass} /></td>
          <td className="!px-1 !py-1.5"><button type="button" disabled={disabled} className="workbench-icon" title={`${text('Remover', 'Remove')} ${label.toLowerCase()} ${index + 1}`} aria-label={`${text('Remover', 'Remove')} ${label.toLowerCase()} ${index + 1}`} onClick={() => update(rows.filter(item => item.id !== row.id))}><Trash2 className="h-3.5 w-3.5" /></button></td>
        </tr>)}</tbody>
      </table>
      <button type="button" disabled={disabled} onClick={() => setRows(current => [...current, { id: crypto.randomUUID(), key: '', value: '' }])} className="mt-2 flex h-8 items-center gap-1.5 rounded px-1 text-xs text-pm-orange hover:bg-pm-orange/5 disabled:opacity-40"><Plus className="h-3.5 w-3.5" />{kind === 'params' ? text('Adicionar parâmetro', 'Add parameter') : text('Adicionar header', 'Add header')}</button>
    </div>
  );
}

export function RequestPanel({ currentCase, requestUrl, requestHeaders, isExecuting, isSending, onSend, onCreate, hasSuite, onChange, onSave, onDiscard, isDirty, isSaving, saveError, onDelete }: RequestPanelProps) {
  const { language, t } = useLanguage();
  const text = (pt: string, en: string) => language === 'pt' ? pt : en;
  const [activeTab, setActiveTab] = useState<RequestTab>('params');
  const fieldPrefix = useId();
  const errors = useMemo(() => currentCase ? getRequestDraftErrors(currentCase, language) : {}, [currentCase, language]);
  const hasErrors = Object.keys(errors).length > 0;
  const disabled = isExecuting || isSaving;
  const params = useMemo(() => queryEntries(currentCase?.path || ''), [currentCase?.path]);
  const caseHeaders = useMemo<[string, string][]>(() => {
    try {
      return headerEntries(currentCase?.headers || '{}');
    } catch { return []; }
  }, [currentCase?.headers]);
  const tabs: { id: RequestTab; label: string; count?: number }[] = [
    { id: 'params', label: text('Parâmetros', 'Params'), count: params.length },
    { id: 'headers', label: 'Headers', count: Object.keys(requestHeaders).length },
    { id: 'body', label: 'Body', count: currentCase?.body?.trim() ? 1 : 0 },
    { id: 'assertions', label: text('Testes e SLA', 'Tests & SLA') },
    { id: 'schema', label: text('Contrato', 'Schema'), count: currentCase?.expectedSchema?.trim() ? 1 : 0 }
  ];
  const methodClass: Record<HttpMethod, string> = { GET: 'text-emerald-600 dark:text-emerald-400', POST: 'text-amber-700 dark:text-amber-400', PUT: 'text-blue-600 dark:text-blue-400', PATCH: 'text-purple-600 dark:text-purple-400', DELETE: 'text-rose-600 dark:text-rose-400' };
  const errorFor = (field: keyof typeof errors) => errors[field] ? <p id={`${fieldPrefix}-${field}-error`} role="status" className="mt-1 text-[11px] leading-relaxed text-rose-600 dark:text-rose-300">{errors[field]}</p> : null;
  const jsonInput = (field: 'body' | 'expectedSchema') => {
    if (!currentCase) return null;
    const isBody = field === 'body';
    const value = currentCase[field] || '';
    const label = isBody ? text('Body da requisição (JSON)', 'Request body (JSON)') : text('Schema de resposta (JSON)', 'Response schema (JSON)');
    return <div className="space-y-2">
      <div className="flex items-center justify-between gap-3"><label htmlFor={`${fieldPrefix}-${field}`} className="text-xs font-medium">{label}</label><button type="button" disabled={disabled || !value.trim() || !!errors[field]} onClick={() => { try { onChange({ [field]: JSON.stringify(JSON.parse(value), null, 2) }); } catch { /* The inline validation explains malformed JSON. */ } }} className="text-[11px] text-pm-orange disabled:opacity-40">{text('Formatar JSON', 'Format JSON')}</button></div>
      <textarea id={`${fieldPrefix}-${field}`} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `${fieldPrefix}-${field}-error` : undefined} disabled={disabled} spellCheck={false} value={value} onChange={event => onChange({ [field]: event.target.value || null })} placeholder={isBody ? '{ "message": "hello" }' : '{ "type": "object", "required": ["id"] }'} className={textareaClass} />
      {errorFor(field)}
      <p className="text-[11px] leading-relaxed text-pm-light-textMuted dark:text-pm-dark-textMuted">{isBody ? text('JSON válido, incluindo arrays, strings, números e booleanos. Campo vazio remove o payload salvo.', 'Valid JSON, including arrays, strings, numbers, and booleans. An empty field removes the saved payload.') : text('Objeto JSON Schema ou booleano true/false. Campo vazio remove o contrato salvo.', 'JSON Schema object or boolean true/false. An empty field removes the saved schema.')}</p>
      {isBody && currentCase.method === 'GET' && <p className="text-[11px] text-pm-light-textMuted dark:text-pm-dark-textMuted">{text('O método GET não envia body.', 'GET does not send a body.')}</p>}
    </div>;
  };

  if (!currentCase) return (
    <section aria-label={text('Editor de requisição', 'Request editor')} className="flex h-full min-h-0 flex-col items-center justify-center gap-3 px-5 text-center">
      <Braces className="h-7 w-7 text-pm-light-textMuted dark:text-pm-dark-textMuted" strokeWidth={1.25} />
      <p className="text-sm font-medium">{text('Prepare sua próxima requisição', 'Prepare your next request')}</p>
      <p className="max-w-xs text-xs leading-relaxed text-pm-light-textMuted dark:text-pm-dark-textMuted">{hasSuite ? text('Adicione um endpoint à coleção para começar.', 'Add an endpoint to this collection to get started.') : text('Crie uma coleção para organizar os endpoints da sua API.', 'Create a collection to organize your API endpoints.')}</p>
      <button onClick={onCreate} className="workbench-button mt-1">{hasSuite ? t.createEndpointTitle : t.createSuiteTitle}</button>
    </section>
  );

  return (
    <section aria-label={text('Editor de requisição', 'Request editor')} className="flex h-full min-h-0 flex-col bg-pm-light-bg dark:bg-pm-dark-bg">
      <form onSubmit={event => { event.preventDefault(); if (isSending || !hasErrors) onSend(); }} className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-3 sm:px-5">
        <div className="flex h-10 min-w-0 flex-1 items-center rounded border border-pm-light-border bg-pm-light-panel dark:border-pm-dark-border dark:bg-pm-dark-panel focus-within:border-pm-orange/60">
          <select aria-label={text('Método HTTP', 'HTTP method')} disabled={disabled} value={currentCase.method} onChange={event => onChange({ method: event.target.value as HttpMethod })} className={`h-6 w-[78px] shrink-0 border-r border-pm-light-border bg-transparent pl-2 font-mono text-[11px] font-semibold focus:outline-none dark:border-pm-dark-border ${methodClass[currentCase.method] || ''}`}>{Object.keys(methodClass).map(method => <option key={method} value={method} className="bg-pm-light-surface text-pm-light-text dark:bg-pm-dark-surface dark:text-pm-dark-text">{method}</option>)}</select>
          <input aria-label={text('URL da requisição', 'Request URL')} aria-invalid={!!errors.path} aria-describedby={errors.path ? `${fieldPrefix}-path-error` : undefined} disabled={disabled} title={requestUrl} value={currentCase.path} onChange={event => onChange({ path: event.target.value })} placeholder={text('/endpoint ou URL completa', '/endpoint or full URL')} className="h-full min-w-0 flex-1 bg-transparent px-3 font-mono text-xs text-pm-light-text dark:text-pm-dark-text focus:outline-none disabled:opacity-50" />
          {/^https?:\/\//i.test(currentCase.path) && <span title={text('Esta URL absoluta mantém o destino ao trocar o ambiente.', 'This absolute URL keeps its destination when the environment changes.')} className="hidden shrink-0 px-2 text-pm-light-textMuted dark:text-pm-dark-textMuted sm:block"><Info className="h-3.5 w-3.5" /></span>}
        </div>
        <button type="submit" disabled={disabled || (!isSending && hasErrors)} aria-label={isSending ? text('Cancelar espera da requisição', 'Cancel waiting for request') : t.sendBtn} className="flex h-10 shrink-0 items-center justify-center gap-2 rounded bg-pm-orange px-4 text-xs font-semibold text-white transition-colors hover:bg-pm-orangeHover disabled:opacity-50 sm:min-w-[92px]">
          {isSending ? <Square className="h-3 w-3" /> : <Send className="h-3.5 w-3.5" />}<span>{isSending ? t.cancelBtn : t.sendBtn}</span>
        </button>
      </form>
      <div className="flex min-h-9 shrink-0 flex-wrap items-center gap-2 px-3 pb-2 sm:px-5">
        <input aria-label={text('Nome da requisição', 'Request name')} aria-invalid={!!errors.name} aria-describedby={errors.name ? `${fieldPrefix}-name-error` : undefined} title={currentCase.name} disabled={disabled} value={currentCase.name} onChange={event => onChange({ name: event.target.value })} className="h-7 min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-xs font-medium hover:border-pm-light-border focus:border-pm-orange focus:outline-none dark:hover:border-pm-dark-border" />
        {isDirty && <span aria-label={text('Alterações não salvas', 'Unsaved changes')} title={text('Alterações não salvas', 'Unsaved changes')} className="h-1.5 w-1.5 shrink-0 rounded-full bg-pm-orange" />}
        <button type="button" onClick={onSave} disabled={disabled || !isDirty || hasErrors} className="workbench-button !h-7 !px-2" title={text('Salvar requisição (Ctrl+S)', 'Save request (Ctrl+S)')} aria-label={text('Salvar requisição', 'Save request')}><Save className="h-3.5 w-3.5" /><span className="hidden sm:inline">{isSaving ? text('Salvando...', 'Saving...') : text('Salvar', 'Save')}</span></button>
        <button type="button" onClick={onDiscard} disabled={disabled || !isDirty} className="workbench-icon !h-7 !w-7" title={text('Descartar alterações', 'Discard changes')} aria-label={text('Descartar alterações', 'Discard changes')}><RotateCcw className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={onDelete} disabled={disabled} className="workbench-icon !h-7 !w-7 hover:!text-rose-500" title={text('Excluir requisição', 'Delete request')} aria-label={text('Excluir requisição', 'Delete request')}><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {(errors.name || errors.path || saveError) && <div className="shrink-0 px-3 pb-2 sm:px-5">{errorFor('name')}{errorFor('path')}{saveError && <p role="alert" className="text-[11px] leading-relaxed text-rose-600 dark:text-rose-300">{saveError}</p>}</div>}
      <div role="tablist" aria-label={text('Configuração da requisição', 'Request configuration')} className="flex h-9 shrink-0 items-stretch gap-4 overflow-x-auto border-b border-pm-light-border px-3 dark:border-pm-dark-border sm:gap-5 sm:px-5">
        {tabs.map(tab => <button key={tab.id} id={`request-tab-${tab.id}`} type="button" role="tab" aria-selected={activeTab === tab.id} tabIndex={activeTab === tab.id ? 0 : -1} onKeyDown={event => {
          const index = tabs.findIndex(item => item.id === activeTab);
          const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
          if (next >= 0) { event.preventDefault(); setActiveTab(tabs[next].id); document.getElementById(`request-tab-${tabs[next].id}`)?.focus(); }
        }} aria-controls={`request-panel-${tab.id}`} onClick={() => setActiveTab(tab.id)} className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 text-xs transition-colors ${activeTab === tab.id ? 'border-pm-orange font-medium text-pm-light-text dark:text-pm-dark-text' : 'border-transparent text-pm-light-textMuted hover:text-pm-light-text dark:text-pm-dark-textMuted dark:hover:text-pm-dark-text'}`}>
          {tab.label}{!!tab.count && <span className="text-[10px] text-pm-light-textMuted dark:text-pm-dark-textMuted">{tab.count}</span>}{((tab.id === 'headers' && errors.headers) || (tab.id === 'body' && errors.body) || (tab.id === 'schema' && errors.expectedSchema) || (tab.id === 'assertions' && (errors.expectedStatus || errors.maxLatencyMs))) && <span aria-label={text('Campo inválido', 'Invalid field')} className="h-1 w-1 rounded-full bg-rose-500" />}
        </button>)}
      </div>
      <div id={`request-panel-${activeTab}`} role="tabpanel" aria-labelledby={`request-tab-${activeTab}`} tabIndex={0} className="min-h-0 flex-1 overflow-auto px-3 py-3 sm:px-5">
        {activeTab === 'params' && <KeyValueEditor key={`${currentCase.id}-params`} kind="params" disabled={disabled} source={currentCase.path} entries={params} onChange={entries => { const path = withQueryEntries(currentCase.path, entries); onChange({ path }); return path; }} />}
        {activeTab === 'headers' && <div>
          <p className="mb-2 text-[11px] leading-relaxed text-pm-light-textMuted dark:text-pm-dark-textMuted">{text('Headers desta requisição sobrescrevem os headers herdados da coleção.', 'Request headers override headers inherited from the collection.')}</p>
          <KeyValueEditor key={`${currentCase.id}-headers`} kind="headers" disabled={disabled} source={currentCase.headers || ''} entries={caseHeaders} onChange={entries => {
            const filtered = entries.filter(([key, value]) => key || value);
            const headers = filtered.length ? `{${filtered.map(([key, value]) => `${JSON.stringify(key)}:${JSON.stringify(value)}`).join(',')}}` : null;
            onChange({ headers });
            return headers || '';
          }} />
          {errorFor('headers')}
          <details className="mt-3 border-t border-pm-light-border pt-2 text-[11px] dark:border-pm-dark-border"><summary className="cursor-pointer text-pm-light-textMuted dark:text-pm-dark-textMuted">{text('Headers efetivos', 'Effective headers')} ({Object.keys(requestHeaders).length})</summary><dl className="mt-2 space-y-1.5">{Object.entries(requestHeaders).map(([key, value]) => <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3"><dt className="break-all font-mono">{key}</dt><dd className="break-all font-mono text-pm-light-textMuted dark:text-pm-dark-textMuted">{value}</dd></div>)}</dl></details>
        </div>}
        {activeTab === 'body' && jsonInput('body')}
        {activeTab === 'schema' && jsonInput('expectedSchema')}
        {activeTab === 'assertions' && <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor={`${fieldPrefix}-expectedStatus`} className="mb-1.5 block text-xs font-medium">{text('Status HTTP esperado', 'Expected HTTP status')}</label><input id={`${fieldPrefix}-expectedStatus`} type="number" min={100} max={599} step={1} disabled={disabled} value={Number.isFinite(currentCase.expectedStatus) ? currentCase.expectedStatus : ''} aria-invalid={!!errors.expectedStatus} aria-describedby={errors.expectedStatus ? `${fieldPrefix}-expectedStatus-error` : undefined} onChange={event => onChange({ expectedStatus: event.target.value === '' ? NaN : Number(event.target.value) })} className={fieldClass} />{errorFor('expectedStatus')}</div>
            <div><label htmlFor={`${fieldPrefix}-maxLatencyMs`} className="mb-1.5 block text-xs font-medium">{text('Latência máxima (ms)', 'Maximum latency (ms)')}</label><input id={`${fieldPrefix}-maxLatencyMs`} type="number" min={1} max={300000} step={1} disabled={disabled} value={Number.isFinite(currentCase.maxLatencyMs) ? currentCase.maxLatencyMs : ''} aria-invalid={!!errors.maxLatencyMs} aria-describedby={errors.maxLatencyMs ? `${fieldPrefix}-maxLatencyMs-error` : undefined} onChange={event => onChange({ maxLatencyMs: event.target.value === '' ? NaN : Number(event.target.value) })} className={fieldClass} />{errorFor('maxLatencyMs')}</div>
          </div>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" disabled={disabled} checked={currentCase.active} onChange={event => onChange({ active: event.target.checked })} className="accent-pm-orange" />{text('Incluir na execução da coleção', 'Include in collection runs')}</label>
          <p className="text-[11px] leading-relaxed text-pm-light-textMuted dark:text-pm-dark-textMuted">{text('Status, latência e contrato são avaliados ao executar. Apenas requisições ativas entram na coleção.', 'Status, latency, and schema are checked when sending. Only active requests are included in collection runs.')}</p>
        </div>}
      </div>
    </section>
  );
}
