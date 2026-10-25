import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Edit3, Folder, Play } from 'lucide-react';
import { TestSuite, TestCase, TestRun, SingleResponse } from '../types';
import { api, getApiErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { ENVIRONMENTS_MAP, resolveBaseUrl } from './PostmanTopNav';
import { CollectionsSidebar } from './CollectionsSidebar';
import { RequestPanel } from './RequestPanel';
import { ResponsePanel } from './ResponsePanel';
import { ModalShell } from './ModalShell';
import { getRequestDraftErrors, toRequestOverrides, toRequestPayload } from '../types/request';

interface WorkstationProps {
  suites: TestSuite[];
  selectedSuite: TestSuite | null;
  onSelectSuite: (suite: TestSuite) => void;
  onRunSuite: (suiteId: string) => void;
  latestRun: TestRun | null;
  isExecuting: boolean;
  onOpenCreateModal: () => void;
  onOpenCreateEndpointModal: () => void;
  onUpdateBaseUrl?: (newUrl: string) => Promise<void>;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  environment?: string;
  onEnvironmentChange: (environment: string) => void;
  onCaseUpdated: (testCase: TestCase) => void;
  onCaseDeleted: (caseId: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}

function parseJsonOrText(value: string): unknown {
  try { return JSON.parse(value); } catch { return value; }
}

function assertionPassed(result: { statusMatch: boolean; slaPassed: boolean; schemaValid: boolean; errorMessage?: string | null }): boolean {
  return result.statusMatch && result.slaPassed && result.schemaValid && !result.errorMessage;
}

export function Workstation({ suites, selectedSuite, onSelectSuite, onRunSuite, latestRun, isExecuting, onOpenCreateModal, onOpenCreateEndpointModal, onUpdateBaseUrl, searchQuery = '', setSearchQuery, environment = 'production', onEnvironmentChange, onCaseUpdated, onCaseDeleted, onDirtyChange }: WorkstationProps) {
  const { showToast } = useToast();
  const { language, t } = useLanguage();
  const text = (pt: string, en: string) => language === 'pt' ? pt : en;
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [draft, setDraft] = useState<TestCase | null>(null);
  const [sentCase, setSentCase] = useState<TestCase | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [singleResponse, setSingleResponse] = useState<SingleResponse | null>(null);
  const [isSendingSingle, setIsSendingSingle] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [responseMode, setResponseMode] = useState<'single' | 'collection'>('single');
  const [activeSingleTab, setActiveSingleTab] = useState<'body' | 'tests' | 'headers'>('body');
  const [activeCollectionTab, setActiveCollectionTab] = useState<'cli' | 'breakdown'>('cli');
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [editedUrl, setEditedUrl] = useState('');
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const collectionsToggleRef = useRef<HTMLButtonElement>(null);
  const resizingRef = useRef(false);
  const [requestSize, setRequestSize] = useState(43);

  const activeCases = selectedSuite?.cases || [];
  const storedCase = activeCases.find(item => item.id === selectedCase?.id) || activeCases[0] || null;
  const currentCase = storedCase && draft?.id === storedCase.id ? draft : storedCase;
  const editableFields: (keyof TestCase)[] = ['name','method','path','headers','body','expectedStatus','maxLatencyMs','expectedSchema','active'];
  const isDirty = !!(storedCase && currentCase && editableFields.some(key => (storedCase[key] ?? null) !== (currentCase[key] ?? null)));
  const activeEnvConfig = ENVIRONMENTS_MAP[environment] || ENVIRONMENTS_MAP.production;
  const effectiveBaseUrl = resolveBaseUrl(selectedSuite, environment);
  const visibleRun = latestRun?.suiteId === selectedSuite?.id ? latestRun : null;
  const requestUrl = currentCase?.path.match(/^https?:\/\//i)
    ? currentCase.path
    : `${effectiveBaseUrl.replace(/\/+$/, '')}/${currentCase?.path.replace(/^\/+/, '') || ''}`;
  const requestHeaders = useMemo<Record<string, string>>(() => {
    const headers = new Headers();
    if (currentCase?.body) headers.set('Content-Type','application/json');
    for (const raw of [selectedSuite?.headers, currentCase?.headers]) {
      if (!raw) continue;
      try { const value = JSON.parse(raw); if (value && typeof value === 'object' && !Array.isArray(value)) for (const [key,item] of Object.entries(value)) if(typeof item === 'string') headers.set(key,item); } catch { /* Invalid draft stays editable and is validated before Save/Send. */ }
    }
    const result: Record<string,string> = {};
    headers.forEach((value,key)=>{result[key]=value;});
    return result;
  }, [selectedSuite?.headers, currentCase?.headers, currentCase?.body]);

  useEffect(() => { setDraft(null); setSaveError(null); setDeleteOpen(false); }, [storedCase?.id]);
  useEffect(() => { onDirtyChange(isDirty); }, [isDirty,onDirtyChange]);
  useEffect(() => {
    if (!isDirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const change = (event: Event) => { if (!window.confirm(text('Descartar as alterações não salvas desta requisição?', 'Discard unsaved changes to this request?'))) event.preventDefault(); };
    window.addEventListener('beforeunload',unload);
    window.addEventListener('spectr:before-context-change',change);
    return () => {window.removeEventListener('beforeunload',unload);window.removeEventListener('spectr:before-context-change',change);};
  },[isDirty,language]);
  const discardBefore = (action: () => void) => {
    if (isDirty && !window.confirm(text('Descartar as alterações não salvas desta requisição?', 'Discard unsaved changes to this request?'))) return;
    setDraft(null); setSaveError(null); action();
  };
  const handleSaveDraft = async () => {
    if (!currentCase || !selectedSuite || isSavingDraft || !isDirty) return;
    const errors = getRequestDraftErrors(currentCase,language);
    if (Object.keys(errors).length) { setSaveError(Object.values(errors).join(' ')); return; }
    setIsSavingDraft(true); setSaveError(null);
    try {
      const response = await api.patch<{testCase:TestCase}>(`/suites/${selectedSuite.id}/cases/${currentCase.id}`,toRequestPayload(currentCase));
      setDraft(response.data.testCase); onCaseUpdated(response.data.testCase);
    } catch(error) { setSaveError(getApiErrorMessage(error)); }
    finally { setIsSavingDraft(false); }
  };
  useEffect(() => {
    const save = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && !(event.target instanceof Element && event.target.closest('[role=dialog]'))) { event.preventDefault(); void handleSaveDraft(); }
    };
    window.addEventListener('keydown',save);
    return () => window.removeEventListener('keydown',save);
  },[currentCase,selectedSuite,isDirty,isSavingDraft,language]);

  const handleDeleteCase = async () => {
    if (!storedCase || !selectedSuite || isDeleting) return;
    setIsDeleting(true); setDeleteError(null);
    try { await api.delete(`/suites/${selectedSuite.id}/cases/${storedCase.id}`); onCaseDeleted(storedCase.id); setSelectedCase(null); setDraft(null); setSingleResponse(null); setDeleteOpen(false); }
    catch(error) {setDeleteError(getApiErrorMessage(error));}
    finally {setIsDeleting(false);}
  };
  const runSavedCollection = (id: string) => {
    if (isDirty) { showToast({type:'info',title:text('Salve ou descarte as alterações antes de executar a coleção.', 'Save or discard changes before running the collection.')}); return; }
    onRunSuite(id);
  };

  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsSendingSingle(false);
    setSingleResponse(null);
    setSentCase(null);
    setRequestError(null);
    setCopied(false);
    return () => { abortControllerRef.current?.abort(); };
  }, [currentCase?.id, effectiveBaseUrl]);
  useEffect(() => {
    setIsEditingUrl(false);
    setUrlError(null);
  }, [selectedSuite?.id, environment]);
  useEffect(() => {
    if (isExecuting || visibleRun) setResponseMode('collection');
    else setResponseMode('single');
  }, [isExecuting, visibleRun?.id, selectedSuite?.id]);
  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);
  useEffect(() => {
    if (!isEditingUrl) return;
    const outside = (event: MouseEvent) => { if (!settingsRef.current?.contains(event.target as Node)) setIsEditingUrl(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsEditingUrl(false); };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); };
  }, [isEditingUrl]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setIsSidebarOpen(false); collectionsToggleRef.current?.focus(); }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [isSidebarOpen]);

  const handleCopy = async (value: string, label = 'Payload') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      showToast({ type: 'success', title: text(`${label} copiado`, `${label} copied`) });
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch { showToast({ type: 'error', title: text('Não foi possível copiar', 'Unable to copy'), message: text('Selecione o conteúdo e copie com o teclado.', 'Select the content and copy using your keyboard.') }); }
  };
  const handleSaveBaseUrl = async () => {
    if (!onUpdateBaseUrl || isSavingUrl) return;
    try {
      const url = new URL(editedUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) { setUrlError(text('Use uma URL HTTP(S) sem credenciais.', 'Use an HTTP(S) URL without credentials.')); return; }
      setIsSavingUrl(true);
      setUrlError(null);
      await onUpdateBaseUrl(editedUrl.trim());
      setIsEditingUrl(false);
      showToast({ type: 'success', title: text('Base URL atualizada', 'Base URL updated') });
    } catch (error) { setUrlError(error instanceof TypeError ? text('Informe uma URL HTTP(S) válida.', 'Enter a valid HTTP(S) URL.') : getApiErrorMessage(error)); }
    finally { setIsSavingUrl(false); }
  };
  const handleSendSingle = async () => {
    if (!currentCase || isExecuting) return;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); abortControllerRef.current = null; setIsSendingSingle(false);
      showToast({ type: 'info', title: text('Espera cancelada', 'Waiting cancelled'), message: text('O motor pode concluir a chamada já enviada ao destino.', 'The engine may complete the call already sent to the target.') });
      return;
    }
    const errors = getRequestDraftErrors(currentCase,language);
    if (Object.keys(errors).length) { setSaveError(Object.values(errors).join(' ')); return; }
    const snapshot = {...currentCase};
    setSentCase(snapshot);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsSendingSingle(true); setRequestError(null); setSingleResponse(null); setResponseMode('single');
    try {
      const response = await api.post<SingleResponse>(`/cases/${currentCase.id}/run`, { baseUrl: effectiveBaseUrl, overrides: toRequestOverrides(snapshot) }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setSingleResponse(response.data);
      setActiveSingleTab('body');
    } catch (error) {
      if (controller.signal.aborted) return;
      setRequestError(getApiErrorMessage(error));
    } finally { if (abortControllerRef.current === controller) { abortControllerRef.current = null; setIsSendingSingle(false); } }
  };

  const handleExportReport = (format: 'json' | 'csv') => {
    if (!(responseMode === 'single' ? singleResponse : visibleRun)) return;
    const reportTimestamp = new Date().toISOString();
    const suiteName = selectedSuite?.name || 'Spectr-Suite';
    const cleanSuiteName = suiteName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestampStr = Date.now();
    let filename = '';

    if (format === 'json') {
      filename = `spectr-sla-report-${cleanSuiteName}-${timestampStr}.json`;
      const reportData = {
        title: 'SPECTR TestOps SLA & API Compliance Technical Report',
        generatedAt: reportTimestamp,
        responseMode,
        environment: {
          id: environment,
          name: activeEnvConfig.name,
          baseUrl: effectiveBaseUrl
        },
        suite: {
          id: selectedSuite?.id,
          name: selectedSuite?.name,
          baseUrl: effectiveBaseUrl
        },
        executionSnapshot: responseMode === 'collection' && visibleRun ? {
          runId: visibleRun.id,
          status: visibleRun.status,
          successRate: `${visibleRun.successRate}%`,
          passedTests: visibleRun.passedTests,
          failedTests: visibleRun.failedTests,
          totalTests: visibleRun.totalTests,
          p95LatencyMs: visibleRun.p95LatencyMs,
          p99LatencyMs: visibleRun.p99LatencyMs,
          totalDurationMs: visibleRun.totalDurationMs,
          assertions: visibleRun.assertions
        } : null,
        activeSingleResponse: responseMode === 'single' ? singleResponse : null
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Formato CSV
      filename = `spectr-sla-report-${cleanSuiteName}-${timestampStr}.csv`;
      const headers = ['Test Name', 'Method', 'Endpoint', 'HTTP Status', 'Expected Status', 'Status Match', 'Latency (ms)', 'SLA Target (ms)', 'SLA Passed', 'Schema Valid', 'Result', 'Error Message'];
      const rows: string[][] = [];

      if (responseMode === 'collection' && visibleRun?.assertions && visibleRun.assertions.length > 0) {
        visibleRun.assertions.forEach(ast => {
          rows.push([
            ast.name,
            ast.method,
            ast.endpoint,
            String(ast.actualStatus),
            String(ast.expectedStatus),
            ast.statusMatch ? 'PASS' : 'FAIL',
            String(ast.latencyMs),
            '',
            ast.slaPassed ? 'YES' : 'NO',
            ast.schemaValid ? 'YES' : 'NO',
            assertionPassed(ast) ? 'PASS' : 'FAIL',
            ast.errorMessage || ''
          ]);
        });
      } else if (responseMode === 'single' && singleResponse) {
        rows.push([
          singleResponse.name,
          singleResponse.method,
          singleResponse.url,
          String(singleResponse.actualStatus),
          String(singleResponse.expectedStatus),
          singleResponse.statusMatch ? 'PASS' : 'FAIL',
          String(singleResponse.latencyMs),
          String(singleResponse.maxLatencyMs),
          singleResponse.slaPassed ? 'YES' : 'NO',
          singleResponse.schemaValid ? 'YES' : 'NO',
          assertionPassed(singleResponse) ? 'PASS' : 'FAIL',
          singleResponse.errorMessage || ''
        ]);
      }

      const csvCell = (value: string) => {
        const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
        return `"${safe.replace(/"/g, '""')}"`;
      };
      const csvContent = [headers.join(','), ...rows.map(row => row.map(csvCell).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    showToast({
      type: 'success',
      title: 'Relatório SLA Exportado',
      message: `Download de ${filename} concluído.`
    });
  };

  const resizeRequest = (percentage: number) => {
    const height = splitRef.current?.getBoundingClientRect().height || 600;
    const minimum = Math.min(180, height * 0.35) / height * 100;
    const maximum = (height - Math.min(230, height * 0.35)) / height * 100;
    setRequestSize(Math.max(minimum, Math.min(maximum, percentage)));
  };
  const panelHeight = splitRef.current?.getBoundingClientRect().height || 600;
  const minimumRequestSize = Math.round(Math.min(180, panelHeight * 0.35) / panelHeight * 100);
  const maximumRequestSize = Math.round((panelHeight - Math.min(230, panelHeight * 0.35)) / panelHeight * 100);
  const sidebar = <CollectionsSidebar
    suites={suites} selectedSuite={selectedSuite} currentCaseId={currentCase?.id}
    searchQuery={searchQuery || localSearch} onSearchChange={setSearchQuery || setLocalSearch}
    onSelectSuite={suite => { if (!isExecuting && suite.id !== selectedSuite?.id) discardBefore(() => onSelectSuite(suite)); }}
    onSelectCase={(suite, testCase) => { if (isExecuting || testCase.id === storedCase?.id) {setIsSidebarOpen(false);return;} discardBefore(() => {if(suite.id!==selectedSuite?.id)onSelectSuite(suite);setSelectedCase(testCase);setIsSidebarOpen(false);}); }}
    onCreateSuite={onOpenCreateModal} onCreateEndpoint={onOpenCreateEndpointModal}
    onRunSuite={runSavedCollection} isExecuting={isExecuting || isSavingDraft} onDeleteCase={() => {setDeleteError(null);setDeleteOpen(true);}} onClose={() => setIsSidebarOpen(false)} />;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-pm-light-bg dark:bg-pm-dark-bg">
      {isSidebarOpen && <button type="button" aria-label={text('Fechar painel de coleções', 'Close collections panel')} onClick={() => setIsSidebarOpen(false)} className="absolute inset-0 z-30 bg-black/35 md:hidden" />}
      <aside aria-label={text('Navegador de coleções', 'Collections browser')} className={`${isSidebarOpen ? 'absolute inset-y-0 left-0 z-40 block w-[min(300px,calc(100vw_-_32px))] shadow-xl' : 'hidden'} h-full shrink-0 border-r border-pm-light-border bg-pm-light-sidebar dark:border-pm-dark-border dark:bg-pm-dark-sidebar md:static md:z-auto md:block md:w-60 md:shadow-none xl:w-64`}>{sidebar}</aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative z-20 flex h-10 shrink-0 items-center justify-between gap-2 border-b border-pm-light-border bg-pm-light-sidebar pl-2 pr-3 dark:border-pm-dark-border dark:bg-pm-dark-sidebar sm:pl-4 sm:pr-5">
          <div className="flex h-full min-w-0 flex-1 items-center gap-2">
            <button ref={collectionsToggleRef} type="button" aria-label={text('Mostrar coleções', 'Show collections')} aria-expanded={isSidebarOpen} className="workbench-icon md:hidden" onClick={() => setIsSidebarOpen(open => !open)}><Folder className="h-4 w-4" /></button>
            <div className="flex h-full min-w-0 max-w-sm items-center gap-2 border-t-2 border-pm-orange bg-pm-light-bg px-2.5 text-xs dark:bg-pm-dark-bg sm:px-3">
              {currentCase && <span className="shrink-0 font-mono text-[10px] font-semibold text-pm-light-textMuted dark:text-pm-dark-textMuted">{currentCase.method}</span>}
              <span title={currentCase?.name || selectedSuite?.name} className="truncate font-medium">{currentCase?.name || selectedSuite?.name || text('Visão geral', 'Overview')}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <select aria-label={t.activeEnvLabel} disabled={isExecuting || isSendingSingle} value={environment} onChange={event => onEnvironmentChange(event.target.value)} className="h-7 max-w-[112px] cursor-pointer rounded border-0 bg-transparent pr-1 text-[11px] text-pm-light-textMuted focus:text-pm-light-text dark:text-pm-dark-textMuted dark:focus:text-pm-dark-text sm:max-w-[165px]">
              <option value="production" className="bg-pm-light-surface dark:bg-pm-dark-surface">{t.envProduction}</option>
              <option value="staging" className="bg-pm-light-surface dark:bg-pm-dark-surface">{t.envStaging}</option>
              <option value="local" className="bg-pm-light-surface dark:bg-pm-dark-surface">{t.envLocal}</option>
            </select>
            <div ref={settingsRef}>
              <button type="button" title={text('Configurar Base URL', 'Configure Base URL')} aria-label={text('Configurar Base URL', 'Configure Base URL')} aria-expanded={isEditingUrl} disabled={!selectedSuite || isExecuting || isSendingSingle} onClick={() => { setEditedUrl(selectedSuite?.baseUrl || ''); setUrlError(null); setIsEditingUrl(open => !open); }} className="workbench-icon"><Edit3 className="h-3.5 w-3.5" /></button>
              {isEditingUrl && <div className="absolute right-2 top-full z-50 mt-1 w-[min(360px,calc(100vw-24px))] rounded-md border border-pm-light-border bg-pm-light-surface p-4 shadow-xl dark:border-pm-dark-border dark:bg-pm-dark-surface">
                <p className="mb-1 text-xs font-medium">{text('Ambiente de execução', 'Execution environment')}</p>
                <p className="mb-4 break-all font-mono text-[11px] leading-relaxed text-pm-light-textMuted dark:text-pm-dark-textMuted">{effectiveBaseUrl || text('Selecione uma coleção', 'Select a collection')}</p>
                {environment === 'production' && onUpdateBaseUrl ? <form onSubmit={event => { event.preventDefault(); void handleSaveBaseUrl(); }} className="space-y-3">
                  <label className="block text-xs" htmlFor="collection-base-url">{text('Base URL da coleção', 'Collection Base URL')}</label>
                  <input id="collection-base-url" type="url" autoFocus required value={editedUrl} disabled={isSavingUrl} onChange={event => setEditedUrl(event.target.value)} className="h-9 w-full rounded border border-pm-light-border bg-pm-light-bg px-2 font-mono text-xs dark:border-pm-dark-border dark:bg-pm-dark-bg" />
                  {urlError && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{urlError}</p>}
                  <div className="flex justify-end gap-2"><button type="button" className="workbench-button" disabled={isSavingUrl} onClick={() => setIsEditingUrl(false)}>{t.cancelBtn}</button><button disabled={isSavingUrl} className="workbench-button" type="submit">{isSavingUrl ? text('Salvando…', 'Saving…') : text('Salvar', 'Save')}</button></div>
                </form> : <p className="text-xs leading-relaxed text-pm-light-textMuted dark:text-pm-dark-textMuted">{text('Use “URL da coleção” para editar o endereço salvo.', 'Choose “Collection URL” to edit the saved address.')}</p>}
                {currentCase && /^https?:\/\//i.test(currentCase.path) && <p className="mt-3 border-t border-pm-light-border pt-3 text-[11px] leading-relaxed text-pm-light-textMuted dark:border-pm-dark-border dark:text-pm-dark-textMuted">{text('Este endpoint usa uma URL absoluta e mantém seu próprio destino.', 'This endpoint uses an absolute URL and keeps its own destination.')}</p>}
              </div>}
            </div>
            <button type="button" onClick={() => { if (selectedSuite) runSavedCollection(selectedSuite.id); }} disabled={!selectedSuite || isExecuting || isSendingSingle || isDirty || !activeCases.some(testCase => testCase.active)} title={t.runCollection} aria-label={t.runCollection} className="workbench-button h-7 gap-1.5 px-2"><Play className={`h-3 w-3 ${isExecuting ? 'animate-pulse' : ''}`} /><span className="hidden sm:inline">{isExecuting ? t.running : 'Run'}</span></button>
          </div>
        </div>
        <div ref={splitRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div data-testid="request-pane" className="min-h-0 shrink-0 overflow-hidden" style={{ height: `${requestSize}%` }}>
            <RequestPanel currentCase={currentCase} requestUrl={requestUrl} requestHeaders={requestHeaders} isExecuting={isExecuting} isSending={isSendingSingle} onSend={() => void handleSendSingle()} onCreate={selectedSuite ? onOpenCreateEndpointModal : onOpenCreateModal} hasSuite={!!selectedSuite} onChange={patch => {if(currentCase)setDraft({...currentCase,...patch});setSaveError(null);}} onSave={() => void handleSaveDraft()} onDiscard={() => {setDraft(null);setSaveError(null);}} isDirty={isDirty} isSaving={isSavingDraft} saveError={saveError} onDelete={() => {setDeleteError(null);setDeleteOpen(true);}} />
          </div>
          <div role="separator" aria-label={text('Redimensionar editor e resposta', 'Resize request and response')} aria-orientation="horizontal" aria-valuenow={Math.round(requestSize)} aria-valuemin={minimumRequestSize} aria-valuemax={maximumRequestSize} tabIndex={0}
            onPointerDown={event => { resizingRef.current = true; event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault(); }}
            onPointerMove={event => { if (!resizingRef.current) return; const rect = splitRef.current?.getBoundingClientRect(); if (rect?.height) resizeRequest((event.clientY - rect.top) / rect.height * 100); }}
            onPointerUp={event => { resizingRef.current = false; event.currentTarget.releasePointerCapture(event.pointerId); }}
            onLostPointerCapture={() => { resizingRef.current = false; }}
            onKeyDown={event => { if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) { event.preventDefault(); resizeRequest(event.key === 'Home' ? 20 : event.key === 'End' ? 80 : requestSize + (event.key === 'ArrowUp' ? -4 : 4)); } }}
            className="group relative z-10 flex h-2 shrink-0 touch-none cursor-row-resize items-center justify-center border-y border-pm-light-border bg-pm-light-bg transition-colors hover:bg-pm-orange/10 focus-visible:bg-pm-orange/10 dark:border-pm-dark-border dark:bg-pm-dark-bg">
            <span className="h-0.5 w-8 rounded bg-pm-light-border transition-colors group-hover:bg-pm-orange/60 dark:bg-pm-dark-border" />
          </div>
          <div data-testid="response-pane" className="min-h-0 flex-1 overflow-hidden">
            <ResponsePanel currentCase={sentCase || currentCase} singleResponse={singleResponse} latestRun={visibleRun} isSendingSingle={isSendingSingle} isExecuting={isExecuting} requestError={requestError} requestUrl={requestUrl} responseMode={responseMode} onResponseModeChange={setResponseMode} activeSingleTab={activeSingleTab} onSingleTabChange={setActiveSingleTab} activeCollectionTab={activeCollectionTab} onCollectionTabChange={setActiveCollectionTab} onRetry={() => void handleSendSingle()} onCopy={handleCopy} copied={copied} onExport={handleExportReport} />
          </div>
        </div>
      </div>
      {deleteOpen && storedCase && <ModalShell titleId="delete-request-title" busy={isDeleting} onClose={()=>setDeleteOpen(false)}>
        <h2 id="delete-request-title" className="text-sm font-semibold">{text('Excluir requisição?', 'Delete request?')}</h2>
        <p className="mt-3 text-xs leading-relaxed text-pm-light-textMuted dark:text-pm-dark-textMuted">{text(`“${storedCase.name}” será removida, junto com as asserções de histórico associadas.`, `“${storedCase.name}” and its related historical assertions will be removed.`)}</p>
        {deleteError && <p role="alert" className="mt-3 text-xs text-rose-600 dark:text-rose-400">{deleteError}</p>}
        <div className="mt-5 flex justify-end gap-2"><button disabled={isDeleting} onClick={()=>setDeleteOpen(false)} className="workbench-button">{t.cancelBtn}</button><button disabled={isDeleting} onClick={()=>void handleDeleteCase()} className="workbench-button !border-rose-500/50 !text-rose-600 dark:!text-rose-400">{isDeleting ? text('Excluindo…','Deleting…') : text('Excluir','Delete')}</button></div>
      </ModalShell>}
    </div>
  );
}
