import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, Play, CheckCircle2, XCircle, Clock, Shield, 
  Terminal, Copy, Check, FileJson, Key, Sliders, AlertTriangle, 
  ChevronRight, ChevronDown, Folder, Code, Send, Sparkles, Layers,
  ExternalLink, Edit3, Download, FileSpreadsheet, FileCode, CheckCheck, Globe
} from 'lucide-react';
import { TestSuite, TestCase, TestRun, HttpMethod, SingleResponse } from '../types';
import { api, getApiErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { ENVIRONMENTS_MAP, resolveBaseUrl } from './PostmanTopNav';
import { motion, AnimatePresence } from 'framer-motion';

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
  setSearchQuery?: (q: string) => void;
  environment?: string;
}

function parseJsonOrText(value: string): unknown {
  try { return JSON.parse(value); } catch { return value; }
}

function assertionPassed(result: { statusMatch: boolean; slaPassed: boolean; schemaValid: boolean; errorMessage?: string | null }): boolean {
  return result.statusMatch && result.slaPassed && result.schemaValid && !result.errorMessage;
}

// Componente de Syntax Highlighter de JSON customizado e limpo
const JsonSyntaxView: React.FC<{ data: any; raw: string }> = ({ data, raw }) => {
  const formatted = useMemo(() => {
    try {
      return typeof data === 'object' && data !== null
        ? JSON.stringify(data, null, 2)
        : raw;
    } catch {
      return raw;
    }
  }, [data, raw]);

  const lines = useMemo(() => formatted.split('\n'), [formatted]);

  const highlightLine = (line: string) => {
    // Regex para identificar chaves, strings, números, booleanos e nulos
    const parts = line.split(/("(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g);
    return parts.map((part, index) => {
      if (/^"/.test(part) && /^\s*:/.test(parts[index + 1] || '')) {
        return <span key={index} className="text-pm-orange font-semibold">{part}</span>;
      }
      if (/^".*?"$/.test(part)) {
        return <span key={index} className="text-emerald-500 dark:text-emerald-400">{part}</span>;
      }
      if (/^\b(?:true|false)\b$/.test(part)) {
        return <span key={index} className="text-amber-500 font-bold">{part}</span>;
      }
      if (/^\bnull\b$/.test(part)) {
        return <span key={index} className="text-slate-400 italic">{part}</span>;
      }
      if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(part)) {
        return <span key={index} className="text-sky-400 font-mono">{part}</span>;
      }
      return <span key={index} className="text-pm-light-text dark:text-slate-300">{part}</span>;
    });
  };

  return (
    <div className="font-mono text-[11px] leading-relaxed select-text overflow-x-auto">
      {lines.map((line, idx) => (
        <div key={idx} className="flex hover:bg-black/5 dark:hover:bg-white/[0.04] px-2 py-0.5 rounded">
          <span className="w-8 shrink-0 text-pm-light-textMuted dark:text-slate-600 select-none text-right pr-3 font-mono text-[10px]">
            {idx + 1}
          </span>
          <span className="whitespace-pre">{highlightLine(line)}</span>
        </div>
      ))}
    </div>
  );
};

// Componente para destacar termos pesquisados
const HighlightText: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${query.replace(/[-[\]{}()*+?.,\\\^$|#\s]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-pm-orange/30 text-pm-orange dark:text-orange-300 font-bold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

export const Workstation: React.FC<WorkstationProps> = ({
  suites,
  selectedSuite,
  onSelectSuite,
  onRunSuite,
  latestRun,
  isExecuting,
  onOpenCreateModal,
  onOpenCreateEndpointModal,
  onUpdateBaseUrl,
  searchQuery = '',
  setSearchQuery,
  environment = 'production'
}) => {
  const { showToast } = useToast();
  const { t, language } = useLanguage();
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeRequestTab, setActiveRequestTab] = useState<'assertions' | 'headers' | 'body' | 'schema'>('assertions');
  
  // Single Request Runner State
  const [singleResponse, setSingleResponse] = useState<SingleResponse | null>(null);
  const [isSendingSingle, setIsSendingSingle] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [responseMode, setResponseMode] = useState<'single' | 'collection'>('single');
  const [activeSingleTab, setActiveSingleTab] = useState<'body' | 'tests' | 'headers'>('body');
  const [activeCollectionTab, setActiveCollectionTab] = useState<'cli' | 'breakdown'>('cli');

  const [copied, setCopied] = useState(false);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [editedUrl, setEditedUrl] = useState('');
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [showResolvedUrl, setShowResolvedUrl] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Termo de busca unificado
  const activeQuery = searchQuery || localSearch;

  // Sincroniza caso ativo
  const activeCases = selectedSuite?.cases || [];
  const currentCase = activeCases.find(item => item.id === selectedCase?.id) || activeCases[0] || null;

  // Determina a Base URL efetiva conforme o Environment selecionado
  const activeEnvConfig = ENVIRONMENTS_MAP[environment] || ENVIRONMENTS_MAP.production;
  const effectiveBaseUrl = resolveBaseUrl(selectedSuite, environment);
  const requestUrl = currentCase?.path.match(/^https?:\/\//i)
    ? currentCase.path
    : `${effectiveBaseUrl.replace(/\/+$/, '')}/${currentCase?.path.replace(/^\/+/, '') || ''}`;
  const requestHeaders = useMemo<Record<string, string>>(() => {
    const suiteHeaders = selectedSuite?.headers ? parseJsonOrText(selectedSuite.headers) : {};
    const caseHeaders = currentCase?.headers ? parseJsonOrText(currentCase.headers) : {};
    return {
      'Content-Type': 'application/json',
      ...(typeof suiteHeaders === 'object' && suiteHeaders !== null ? suiteHeaders : {}),
      ...(typeof caseHeaders === 'object' && caseHeaders !== null ? caseHeaders : {})
    };
  }, [selectedSuite?.headers, currentCase?.headers]);

  useEffect(() => {
    setIsEditingUrl(false);
    setUrlError(null);
  }, [selectedSuite?.id, environment]);

  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsSendingSingle(false);
    setSingleResponse(null);
    setRequestError(null);
    return () => { abortControllerRef.current?.abort(); };
  }, [currentCase?.id, effectiveBaseUrl]);

  useEffect(() => {
    if (isExecuting || latestRun) setResponseMode('collection');
  }, [isExecuting, latestRun?.id]);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  // Filtra casos de teste em tempo real com memoização
  const filteredCases = useMemo(() => {
    return activeCases.filter(c => 
      c.name.toLowerCase().includes(activeQuery.toLowerCase()) ||
      c.path.toLowerCase().includes(activeQuery.toLowerCase()) ||
      c.method.toLowerCase().includes(activeQuery.toLowerCase())
    );
  }, [activeCases, activeQuery]);

  const handleCopy = async (text: string, label = 'Payload') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast({ type: 'success', title: `${label} copiado!`, message: 'Conteúdo transferido para a área de transferência.' });
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({ type: 'error', title: 'Não foi possível copiar', message: 'Selecione o conteúdo e copie com o teclado.' });
    }
  };

  const handleSaveBaseUrl = async () => {
    if (!onUpdateBaseUrl || isSavingUrl) return;
    try {
      const url = new URL(editedUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        setUrlError('Use uma URL HTTP(S) sem credenciais.');
        return;
      }
      setIsSavingUrl(true);
      setUrlError(null);
      await onUpdateBaseUrl(editedUrl.trim());
      setIsEditingUrl(false);
      showToast({ type: 'success', title: 'Base URL atualizada', message: editedUrl.trim() });
    } catch (error) {
      setUrlError(error instanceof TypeError ? 'Informe uma URL HTTP(S) válida.' : getApiErrorMessage(error));
    } finally {
      setIsSavingUrl(false);
    }
  };

  // Send sempre apresenta a resposta real do motor; falhas de rede não viram resultados de teste.
  const handleSendSingle = async () => {
    if (!currentCase || isExecuting) return;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsSendingSingle(false);
      showToast({ type: 'info', title: 'Espera cancelada', message: 'O motor pode concluir a chamada já enviada ao destino.' });
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsSendingSingle(true);
    setSingleResponse(null);
    setRequestError(null);
    setResponseMode('single');
    try {
      const response = await api.post<SingleResponse>(`/cases/${currentCase.id}/run`, { baseUrl: effectiveBaseUrl }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const result = response.data;
      setSingleResponse(result);
      showToast({
        type: assertionPassed(result) ? 'success' : 'warn',
        title: result.actualStatus ? `HTTP ${result.actualStatus} ${result.statusText || ''}` : 'Falha na chamada ao destino',
        message: result.errorMessage || `Latência: ${result.latencyMs}ms (SLA: ${result.maxLatencyMs}ms)`
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = getApiErrorMessage(error);
      setRequestError(message);
      showToast({ type: 'error', title: 'Falha no disparo da requisição', message });
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsSendingSingle(false);
      }
    }
  };

  // 3. EXPORTAÇÃO REAL DE RELATÓRIO DE CONFORMIDADE (EXPORT SLA REPORT)
  const handleExportReport = (format: 'json' | 'csv') => {
    if (!(responseMode === 'single' ? singleResponse : latestRun)) return;
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
        executionSnapshot: responseMode === 'collection' && latestRun ? {
          runId: latestRun.id,
          status: latestRun.status,
          successRate: `${latestRun.successRate}%`,
          passedTests: latestRun.passedTests,
          failedTests: latestRun.failedTests,
          totalTests: latestRun.totalTests,
          p95LatencyMs: latestRun.p95LatencyMs,
          p99LatencyMs: latestRun.p99LatencyMs,
          totalDurationMs: latestRun.totalDurationMs,
          assertions: latestRun.assertions
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

      if (responseMode === 'collection' && latestRun?.assertions && latestRun.assertions.length > 0) {
        latestRun.assertions.forEach(ast => {
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

    setIsExportMenuOpen(false);
    showToast({
      type: 'success',
      title: 'Relatório SLA Exportado',
      message: `Download de ${filename} concluído.`
    });
  };

  // Badges com contraste calibrado para atender WCAG AA (> 4.5:1) em temas Claro e Escuro
  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-emerald-500/15 text-[#077E36] dark:text-[#12D468] border-emerald-500/30';
      case 'POST': return 'bg-pm-orange/15 text-[#D94F1E] dark:text-pm-orange border-pm-orange/30';
      case 'PUT': return 'bg-blue-500/15 text-[#0762BE] dark:text-sky-400 border-blue-500/30';
      case 'DELETE': return 'bg-rose-500/15 text-[#C81B10] dark:text-rose-400 border-rose-500/30';
      case 'PATCH': return 'bg-purple-500/15 text-[#7C3AED] dark:text-purple-400 border-purple-500/30';
      default: return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
    }
  };

  const getMethodTextClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-pm-get';
      case 'POST': return 'text-pm-post';
      case 'PUT': return 'text-pm-put';
      case 'DELETE': return 'text-pm-delete';
      case 'PATCH': return 'text-pm-patch';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col md:flex-row overflow-hidden bg-pm-light-bg dark:bg-pm-dark-bg transition-colors duration-200 select-none">
      
      <div className="md:hidden flex shrink-0 items-center justify-between gap-3 border-b border-pm-light-border dark:border-pm-dark-border bg-pm-light-sidebar dark:bg-pm-dark-sidebar px-3 py-2 text-xs">
        <button className="flex shrink-0 items-center gap-1.5 font-semibold text-pm-orange" aria-expanded={isSidebarOpen} aria-controls="collections-sidebar" onClick={() => setIsSidebarOpen(open => !open)}>
          <Folder className="h-3.5 w-3.5" />{t.collectionsHeader}<ChevronDown className={`h-3 w-3 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
        </button>
        <span className="truncate text-[11px] text-pm-light-textMuted dark:text-pm-dark-textMuted">{currentCase?.name || selectedSuite?.name || t.selectCollectionPrompt}</span>
      </div>
      {/* ── POSTMAN COLLECTIONS SIDEBAR ── */}
      <div id="collections-sidebar" role="region" aria-label={t.collectionsHeader} className={`${isSidebarOpen ? 'flex' : 'hidden'} md:flex w-full md:w-72 lg:w-80 max-h-[50%] md:max-h-none bg-pm-light-sidebar dark:bg-pm-dark-sidebar border-r border-pm-light-border dark:border-pm-dark-border flex-col shrink-0`}>
        
        {/* Collections Toolbar */}
        <div className="p-3 border-b border-pm-light-border dark:border-pm-dark-border space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-pm-light-text dark:text-pm-dark-text uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-pm-orange" />
              {t.collectionsHeader}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenCreateEndpointModal}
                disabled={!selectedSuite}
                title="Adicionar Novo Request/Endpoint"
                className="px-2 py-1 rounded bg-pm-orange/15 hover:bg-pm-orange/25 border border-pm-orange/40 text-pm-orange text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3 h-3" />
                <span>{t.requestBtn}</span>
              </button>
              <button
                onClick={onOpenCreateModal}
                title="Criar Nova Coleção"
                className="p-1 rounded bg-pm-light-panel dark:bg-pm-dark-panel hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover border border-pm-light-border dark:border-pm-dark-border text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text transition-colors text-[10px] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{t.collectionBtn}</span>
              </button>
            </div>
          </div>

          {/* Search Box com feedback de correspondências */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-pm-light-textMuted dark:text-pm-dark-textMuted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="collection-search"
              aria-label={t.filterPlaceholder}
              type="search"
              value={activeQuery}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                if (setSearchQuery) setSearchQuery(e.target.value);
              }}
              placeholder={t.filterPlaceholder}
              className="w-full pl-8 pr-12 py-1.5 bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border rounded text-[11px] text-pm-light-text dark:text-pm-dark-text placeholder-pm-light-textMuted dark:placeholder-pm-dark-textMuted focus:outline-none focus:border-pm-orange"
            />
            {activeQuery && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 px-1 rounded bg-pm-orange/20 text-pm-orange text-[9px] font-mono font-bold">
                {filteredCases.length}
              </span>
            )}
          </div>
        </div>

        {/* Collection Selector Tabs */}
        <div className="px-3 py-2 border-b border-pm-light-border dark:border-pm-dark-border overflow-x-auto flex gap-1.5 scrollbar-none">
          {suites.map((s) => (
            <button
              key={s.id}
              disabled={isExecuting}
              aria-pressed={selectedSuite?.id === s.id}
              onClick={() => {
                onSelectSuite(s);
                setSelectedCase(s.cases[0] || null);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer border ${
                selectedSuite?.id === s.id
                  ? 'bg-pm-orange text-white border-pm-orange shadow-sm font-semibold'
                  : 'bg-pm-light-panel dark:bg-pm-dark-panel border-pm-light-border dark:border-pm-dark-border text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
              }`}
            >
              <HighlightText text={s.name.split('──')[0].trim()} query={activeQuery} />
            </button>
          ))}
        </div>

        {/* Requests Tree */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {selectedSuite ? (
            <div>
              {/* Collection Header Row */}
              <div className="px-2 py-1.5 rounded flex items-center justify-between text-xs font-semibold text-pm-light-text dark:text-pm-dark-text mb-1">
                <div className="flex items-center gap-1.5 truncate">
                  <ChevronDown className="w-3.5 h-3.5 text-pm-light-textMuted dark:text-pm-dark-textMuted" />
                  <span className="truncate">
                    <HighlightText text={selectedSuite.name} query={activeQuery} />
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-pm-light-textMuted dark:text-pm-dark-textMuted">
                  {filteredCases.length}
                </span>
              </div>

              {/* Request Items */}
              <div className="pl-3 space-y-0.5">
                {filteredCases.length === 0 ? (
                  <div className="py-4 text-center text-xs text-pm-light-textMuted dark:text-pm-dark-textMuted space-y-2">
                    <p>{activeCases.length ? t.noRequestsFound : t.noRequestSelected}</p>
                    {!activeCases.length && <button className="font-semibold text-pm-orange hover:underline" onClick={onOpenCreateEndpointModal}>{t.createEndpointTitle}</button>}
                  </div>
                ) : (
                  filteredCases.map((c) => {
                    const isCurrent = currentCase?.id === c.id;
                    return (
                      <motion.button
                        type="button"
                        aria-pressed={isCurrent}
                        title={`${c.method} ${c.path}`}
                        key={c.id}
                        whileHover={{ x: 2 }}
                        onClick={() => { setSelectedCase(c); setIsSidebarOpen(false); }}
                        className={`w-full text-left min-h-9 px-2.5 py-1.5 rounded flex items-center justify-between gap-2 cursor-pointer transition-colors text-xs ${
                          isCurrent
                            ? 'bg-pm-light-panelHover dark:bg-pm-dark-panelHover border-l-2 border-pm-orange text-pm-light-text dark:text-pm-dark-text font-medium'
                            : 'hover:bg-pm-light-panel dark:hover:bg-pm-dark-panel text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <span className={`font-mono text-[10px] font-bold w-9 uppercase shrink-0 ${getMethodTextClass(c.method)}`}>
                            <HighlightText text={c.method} query={activeQuery} />
                          </span>
                          <span className="truncate text-[11px] font-mono">
                            <HighlightText text={c.name} query={activeQuery} />
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-pm-light-textMuted dark:text-pm-dark-textMuted shrink-0">
                          {c.maxLatencyMs}ms
                        </span>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 text-center text-xs text-pm-light-textMuted dark:text-pm-dark-textMuted space-y-3">
              <Folder className="mx-auto h-7 w-7 opacity-40" />
              <p>{t.selectCollectionPrompt}</p>
              <button className="rounded border border-pm-orange/40 px-3 py-1.5 font-semibold text-pm-orange hover:bg-pm-orange/10" onClick={onOpenCreateModal}>{t.createSuiteTitle}</button>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-2.5 border-t border-pm-light-border dark:border-pm-dark-border bg-pm-light-panel dark:bg-pm-dark-panel flex items-center justify-between text-[10px] font-mono text-pm-light-textMuted dark:text-pm-dark-textMuted">
          <span>{filteredCases.length} {t.endpointsReady}</span>
          <span className="text-pm-orange font-medium flex items-center gap-1">
            <Globe className="w-2.5 h-2.5" />
            {activeEnvConfig.badge}
          </span>
        </div>

      </div>


      {/* ── COLUNA PRINCIPAL: REQUEST WORKBENCH & RESPONSE PANE ── */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
        
        {/* 1. Request Address Bar & Send Button */}
        <div className="p-3 border-b border-pm-light-border dark:border-pm-dark-border bg-pm-light-surface dark:bg-pm-dark-surface flex items-center gap-2">
          {currentCase ? (
            <>
              {/* Method Selector */}
              <div className={`px-3 py-1.5 rounded border text-xs font-bold font-mono uppercase tracking-wider ${getMethodBadgeClass(currentCase.method)}`}>
                {currentCase.method}
              </div>

              {/* URL Address Bar com variável {{BASE_URL}} e disparo via Enter */}
              <div 
                className="flex-1 min-w-0 flex items-center bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border rounded px-3 py-1.5 text-xs font-mono overflow-hidden relative group cursor-text"
                onClick={() => setShowResolvedUrl(!showResolvedUrl)}
                title={t.clickToToggleUrl}
              >
                {!/^https?:\/\//i.test(currentCase.path) && <span className="text-pm-orange font-bold mr-1 truncate shrink-0 max-w-[45%] select-none">
                  {showResolvedUrl ? effectiveBaseUrl.replace(/\/+$/, '') : '{{BASE_URL}}'}
                </span>}
                <input
                  aria-label="URL da requisição"
                  title={requestUrl}
                  type="text"
                  readOnly
                  value={currentCase.path}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendSingle();
                    }
                  }}
                  className="bg-transparent text-pm-light-text dark:text-pm-dark-text font-semibold flex-1 min-w-0 focus:outline-none cursor-pointer"
                />
                <span className="text-[10px] text-pm-light-textMuted dark:text-pm-dark-textMuted font-mono hidden md:inline ml-2 opacity-50">
                  {t.enterToSendHint}
                </span>
              </div>

              {/* Send Button (Disparo Individual com microanimação) */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSendSingle}
                disabled={isExecuting}
                aria-label={isSendingSingle ? 'Cancelar espera da requisição' : t.sendBtn}
                className="px-4 py-1.5 bg-pm-orange hover:bg-pm-orangeHover disabled:opacity-50 text-white font-semibold rounded text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer font-sans"
              >
                <Send className={`w-3.5 h-3.5 ${isSendingSingle ? 'animate-spin' : ''}`} />
                <span>{isSendingSingle ? 'Cancelar' : t.sendBtn}</span>
              </motion.button>
            </>
          ) : (
            <div className="flex min-w-0 flex-wrap items-center gap-3 text-xs">
              <span className="text-pm-light-textMuted dark:text-pm-dark-textMuted">{t.noRequestSelected}</span>
              <button className="font-semibold text-pm-orange hover:underline" onClick={selectedSuite ? onOpenCreateEndpointModal : onOpenCreateModal}>{selectedSuite ? t.createEndpointTitle : t.createSuiteTitle}</button>
            </div>
          )}
        </div>

        {/* 2. Base URL Config & Environment Indicator Bar */}
        {selectedSuite && (
          <div className="px-3 py-1.5 bg-pm-light-panel dark:bg-pm-dark-panel border-b border-pm-light-border dark:border-pm-dark-border flex flex-wrap gap-2 items-center justify-between text-[11px] font-mono">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-pm-light-textMuted dark:text-pm-dark-textMuted font-bold">{t.activeEnvLabel}:</span>
              <span className="px-1.5 py-0.5 rounded bg-pm-orange/15 text-pm-orange font-bold text-[10px] border border-pm-orange/30">
                {activeEnvConfig.name}
              </span>
              <span className="text-pm-light-textMuted dark:text-pm-dark-textMuted">❯</span>
              {isEditingUrl ? (
                <form className="flex min-w-0 flex-wrap items-center gap-2" onSubmit={event => { event.preventDefault(); void handleSaveBaseUrl(); }}>
                  <input type="url" autoFocus required aria-label="Base URL da coleção" value={editedUrl} disabled={isSavingUrl} onChange={event => setEditedUrl(event.target.value)} className="min-w-0 w-52 rounded border border-pm-light-border dark:border-pm-dark-border bg-pm-light-bg dark:bg-pm-dark-bg px-2 py-1 text-xs" />
                  <button disabled={isSavingUrl} className="font-semibold text-pm-orange" type="submit">{isSavingUrl ? 'Salvando...' : 'Salvar'}</button>
                  <button disabled={isSavingUrl} type="button" onClick={() => setIsEditingUrl(false)}>Cancelar</button>
                  {urlError && <p role="alert" className="w-full text-rose-500">{urlError}</p>}
                </form>
              ) : (
                <>
                  <span title={effectiveBaseUrl} className="text-pm-light-text dark:text-pm-dark-text truncate max-w-[40vw] select-text">{effectiveBaseUrl}</span>
                  {environment === 'production' && onUpdateBaseUrl && <button title="Editar Base URL da coleção" aria-label="Editar Base URL da coleção" className="text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-orange" onClick={() => { setEditedUrl(selectedSuite.baseUrl); setUrlError(null); setIsEditingUrl(true); }}><Edit3 className="h-3.5 w-3.5" /></button>}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-pm-light-textMuted dark:text-pm-dark-textMuted">
              <span>{t.expectedStatusLabel}: <strong className="text-emerald-500 font-bold">{currentCase?.expectedStatus || '—'}</strong></span>
              <span>•</span>
              <span>{t.slaTargetLabel}: <strong className="text-pm-orange">{currentCase?.maxLatencyMs || 250}ms</strong></span>
            </div>
          </div>
        )}

        {currentCase && /^https?:\/\//i.test(currentCase.path) && <p className="shrink-0 border-b border-pm-light-border dark:border-pm-dark-border px-3 py-1 text-[10px] text-pm-light-textMuted dark:text-pm-dark-textMuted">URL absoluta: este endpoint mantém o próprio destino ao alternar o ambiente.</p>}

        {/* 3. Request Settings Tabs com layoutId Indicador Fluido */}
        <div className="overflow-x-auto shrink-0 border-b border-pm-light-border dark:border-pm-dark-border bg-pm-light-surface dark:bg-pm-dark-surface px-3 flex items-center gap-1 text-xs relative">
          {[
            { id: 'assertions', label: t.tabAssertions, count: 2 },
            { id: 'headers', label: t.tabHeaders, count: Object.keys(requestHeaders).length },
            { id: 'body', label: t.tabBody, count: currentCase?.body ? 1 : 0 },
            { id: 'schema', label: t.tabSchema, count: currentCase?.expectedSchema ? 1 : 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveRequestTab(tab.id as any)}
              className={`px-3 py-2 font-medium text-[11px] transition-colors relative cursor-pointer ${
                activeRequestTab === tab.id
                  ? 'text-pm-orange font-semibold'
                  : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
              }`}
            >
              {activeRequestTab === tab.id && (
                <motion.div
                  layoutId="activeRequestTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-pm-orange"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <div className="flex items-center gap-1.5">
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className="text-[9px] px-1 rounded-full bg-pm-light-panel dark:bg-pm-dark-panel text-pm-light-textMuted dark:text-pm-dark-textMuted">
                    {tab.count}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* 4. Request Configuration Viewport */}
        <div className="h-32 md:h-40 shrink-0 p-3 bg-pm-light-bg dark:bg-pm-dark-bg border-b border-pm-light-border dark:border-pm-dark-border overflow-y-auto text-xs font-mono">
          <AnimatePresence mode="wait">
            {activeRequestTab === 'assertions' && (
              <motion.div
                key="tab-assertions"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between p-2 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t.statusCodeCheck}</span>
                  </div>
                  <span className="text-emerald-500 font-bold">pm.response.to.have.status({currentCase?.expectedStatus || 200})</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-pm-orange" />
                    <span>{t.latencySlaCheck}</span>
                  </div>
                  <span className="text-pm-orange font-bold">pm.response.responseTime &lt; {currentCase?.maxLatencyMs || 250}ms</span>
                </div>
              </motion.div>
            )}

            {activeRequestTab === 'headers' && (
              <motion.div
                key="tab-headers"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="space-y-1.5"
              >
                <div className="grid grid-cols-12 gap-2 text-pm-light-textMuted dark:text-pm-dark-textMuted font-bold text-[10px] pb-1 border-b border-pm-light-border dark:border-pm-dark-border">
                  <span className="col-span-5">KEY</span>
                  <span className="col-span-7">VALUE</span>
                </div>
                {Object.entries(requestHeaders).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-12 gap-2 text-[11px]">
                    <span className="col-span-5 text-pm-orange font-semibold break-all">{key}</span>
                    <span className="col-span-7 text-pm-light-text dark:text-pm-dark-text break-all select-text">{value}</span>
                  </div>
                ))}
              </motion.div>
            )}

            {activeRequestTab === 'body' && (
              <motion.div
                key="tab-body"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                {currentCase?.body ? (
                  <div className="p-2 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border overflow-hidden">
                    <JsonSyntaxView data={parseJsonOrText(currentCase.body)} raw={currentCase.body} />
                  </div>
                ) : (
                  <p className="text-pm-light-textMuted dark:text-pm-dark-textMuted py-4 text-center">{t.noBodyConfigured}</p>
                )}
              </motion.div>
            )}

            {activeRequestTab === 'schema' && (
              <motion.div
                key="tab-schema"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                {currentCase?.expectedSchema ? (
                  <pre className="p-2 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-[11px] text-pm-light-text dark:text-pm-dark-text overflow-x-auto">
                    {currentCase.expectedSchema}
                  </pre>
                ) : (
                  <p className="text-pm-light-textMuted dark:text-pm-dark-textMuted py-4 text-center">{t.autoContractValidation}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* 5. Postman Response Pane (Single Request Response & Collection Runner Stream) */}
        <div className="flex-1 flex flex-col min-h-0 bg-pm-light-surface dark:bg-pm-dark-surface">
          
          {/* Response Pane Header Bar */}
          <div className="min-h-10 py-2 gap-2 flex-wrap bg-pm-light-sidebar dark:bg-pm-dark-sidebar border-b border-pm-light-border dark:border-pm-dark-border px-3 flex items-center justify-between text-xs shrink-0">
            
            {/* Left: Mode Switcher & Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Selector de Modo com Pílula Animada */}
              <div className="flex items-center bg-pm-light-bg dark:bg-pm-dark-bg p-0.5 rounded border border-pm-light-border dark:border-pm-dark-border relative">
                <button
                  onClick={() => setResponseMode('single')}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all relative cursor-pointer ${
                    responseMode === 'single'
                      ? 'text-white'
                      : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
                  }`}
                >
                  {responseMode === 'single' && (
                    <motion.div
                      layoutId="responseModeIndicator"
                      className="absolute inset-0 bg-pm-orange rounded shadow-sm"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{t.modeSingleResponse}</span>
                </button>

                <button
                  onClick={() => setResponseMode('collection')}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all relative cursor-pointer ${
                    responseMode === 'collection'
                      ? 'text-white'
                      : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
                  }`}
                >
                  {responseMode === 'collection' && (
                    <motion.div
                      layoutId="responseModeIndicator"
                      className="absolute inset-0 bg-pm-orange rounded shadow-sm"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{t.modeCollectionRunner}</span>
                </button>
              </div>

              {/* Sub-tabs dependendo do modo ativo */}
              {responseMode === 'single' ? (
                <div className="flex items-center gap-1 pl-2 border-l border-pm-light-border dark:border-pm-dark-border relative">
                  {[
                    { id: 'body', label: t.subtabBody },
                    { id: 'tests', label: t.subtabTestResults },
                    { id: 'headers', label: `${t.subtabHeaders} (${singleResponse ? Object.keys(singleResponse.responseHeaders).length : 0})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSingleTab(tab.id as any)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer relative ${
                        activeSingleTab === tab.id
                          ? 'text-pm-orange font-bold'
                          : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
                      }`}
                    >
                      {activeSingleTab === tab.id && (
                        <motion.div
                          layoutId="singleSubTabIndicator"
                          className="absolute bottom-0 left-1 right-1 h-0.5 bg-pm-orange"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1 pl-2 border-l border-pm-light-border dark:border-pm-dark-border">
                  <button
                    onClick={() => setActiveCollectionTab('cli')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      activeCollectionTab === 'cli'
                        ? 'text-pm-orange font-bold underline'
                        : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
                    }`}
                  >
                    {t.subtabCliStream}
                  </button>
                  <button
                    onClick={() => setActiveCollectionTab('breakdown')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      activeCollectionTab === 'breakdown'
                        ? 'text-pm-orange font-bold underline'
                        : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
                    }`}
                  >
                    {t.subtabBreakdown} ({latestRun?.assertions?.length || 0})
                  </button>
                </div>
              )}

            </div>

            {/* Right: Metrics Pills & Export SLA Report Button */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              
              {/* Status Pills */}
              {responseMode === 'single' && singleResponse ? (
                <>
                  <motion.span 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`px-2 py-0.5 rounded font-bold border ${
                      singleResponse.statusMatch
                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                    }`}
                  >
                    {t.statusLabel}: {singleResponse.actualStatus} {singleResponse.statusText}
                  </motion.span>
                  <span className="px-2 py-0.5 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-pm-light-text dark:text-pm-dark-text">
                    {t.timeLabel}: <strong className="text-pm-orange">{singleResponse.latencyMs}ms</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-pm-light-text dark:text-pm-dark-text">
                    {t.sizeLabel}: <strong className="text-pm-light-text dark:text-pm-dark-text">{singleResponse.responseSize}</strong>
                  </span>
                </>
              ) : latestRun ? (
                <>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-bold">
                    {latestRun.passedTests}/{latestRun.totalTests} PASS ({latestRun.successRate}%)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-pm-light-text dark:text-pm-dark-text">
                    Time: <strong className="text-pm-orange">{latestRun.totalDurationMs}ms</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-pm-light-text dark:text-pm-dark-text">
                    p95: <strong className="text-pm-orange">{latestRun.p95LatencyMs}ms</strong>
                  </span>
                </>
              ) : null}

              {/* 3. EXPORTAÇÃO REAL DE RELATÓRIO DE CONFORMIDADE (NOVA FEATURE) */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  disabled={!(responseMode === 'single' ? singleResponse : latestRun)}
                  aria-expanded={isExportMenuOpen}
                  title="Exportar Relatório Técnico de Conformidade SLA"
                  className="px-2.5 py-1 rounded bg-pm-light-panel dark:bg-pm-dark-panel hover:bg-pm-orange/15 border border-pm-light-border dark:border-pm-dark-border hover:border-pm-orange/50 text-pm-light-text dark:text-pm-dark-text transition-colors flex items-center gap-1.5 font-sans text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-3 h-3 text-pm-orange" />
                  <span>{t.exportReportBtn}</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </motion.button>

                {isExportMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute right-0 mt-1 w-48 rounded-md bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border shadow-xl py-1 z-50 font-sans text-xs"
                  >
                    <button
                      onClick={() => handleExportReport('json')}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover text-pm-light-text dark:text-pm-dark-text transition-colors cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5 text-pm-orange" />
                      <span>{t.exportJson}</span>
                    </button>
                    <button
                      onClick={() => handleExportReport('csv')}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover text-pm-light-text dark:text-pm-dark-text transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t.exportCsv}</span>
                    </button>
                  </motion.div>
                )}
              </div>

            </div>
          </div>

          {/* Response Viewport Content */}
          <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
            <AnimatePresence mode="wait">
              
              {/* ── MODO 1: SINGLE REQUEST RESPONSE ── */}
              {responseMode === 'single' && (
                <motion.div
                  key="single-view"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="h-full flex flex-col"
                >
                  {isSendingSingle ? (
                    <div className="py-12 text-center space-y-3">
                      <div className="inline-block w-5 h-5 rounded-full border-2 border-pm-orange border-t-transparent animate-spin" />
                      <p className="text-pm-orange font-bold text-sm">Disparando requisição individual...</p>
                      <p className="text-[11px] text-pm-light-textMuted dark:text-pm-dark-textMuted">
                        Target: {requestUrl}
                      </p>
                    </div>
                  ) : requestError ? (
                    <div role="alert" className="my-4 rounded border border-rose-500/30 bg-rose-500/10 p-4 text-rose-600 dark:text-rose-300">
                      <p className="font-semibold">Falha ao obter a resposta</p>
                      <p className="mt-1 text-xs">{requestError}</p>
                      <button className="mt-3 font-semibold underline" onClick={() => void handleSendSingle()}>Tentar novamente</button>
                    </div>
                  ) : !singleResponse ? (
                    <div className="py-14 text-center text-pm-light-textMuted dark:text-pm-dark-textMuted space-y-2">
                      <Send className="w-8 h-8 mx-auto opacity-30 text-pm-orange" />
                      <p className="font-semibold text-pm-light-text dark:text-pm-dark-text">{t.noSingleResponseYet}</p>
                      <p className="text-[11px]">{t.clickSendHint}</p>
                    </div>
                  ) : (
                    <>
                      {singleResponse.errorMessage && <p role="alert" className="mb-3 rounded border border-rose-500/30 bg-rose-500/10 p-3 text-rose-600 dark:text-rose-300">{singleResponse.errorMessage}</p>}
                      {/* Tab 1: Pretty Body (JSON) com Syntax Highlighting */}
                      {activeSingleTab === 'body' && (
                        <div className="h-full flex flex-col rounded bg-pm-light-panel dark:bg-[#151515] border border-pm-light-border dark:border-pm-dark-border overflow-hidden shadow-inner">
                          <div className="p-2 border-b border-pm-light-border dark:border-white/[0.08] flex items-center justify-between text-[11px] text-pm-light-textMuted dark:text-pm-dark-textMuted bg-pm-light-sidebar dark:bg-pm-dark-panel">
                            <span className="font-bold flex items-center gap-1.5 text-pm-light-text dark:text-pm-dark-text">
                              <FileJson className="w-3.5 h-3.5 text-pm-orange" />
                              RESPONSE PAYLOAD (JSON PRETTY)
                            </span>
                            <button
                              onClick={() => handleCopy(typeof singleResponse.responseBody === 'object' ? JSON.stringify(singleResponse.responseBody, null, 2) : singleResponse.rawBody, 'JSON Payload')}
                              className="flex items-center gap-1 text-[11px] text-pm-orange hover:underline cursor-pointer font-bold px-2 py-0.5 rounded hover:bg-pm-orange/10 transition-colors"
                            >
                              {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copied ? t.copied : t.copyPayload}</span>
                            </button>
                          </div>
                          <div className="flex-1 p-2 overflow-y-auto">
                            <JsonSyntaxView data={singleResponse.responseBody} raw={singleResponse.rawBody} />
                          </div>
                        </div>
                      )}

                      {/* Tab 2: Test Results com Ícones Animados */}
                      {activeSingleTab === 'tests' && (
                        <div className="space-y-2">
                          <motion.div 
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-3 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              {singleResponse.statusMatch ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> PASS
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> FAIL
                                </span>
                              )}
                              <span className="font-semibold text-pm-light-text dark:text-pm-dark-text">
                                Status code is {singleResponse.expectedStatus}
                              </span>
                            </div>
                            <span className={`font-mono font-bold ${singleResponse.statusMatch ? 'text-emerald-500' : 'text-rose-500'}`}>{singleResponse.actualStatus || 'ERROR'} HTTP</span>
                          </motion.div>

                          <motion.div 
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.15, delay: 0.04 }}
                            className="p-3 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              {singleResponse.slaPassed ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> PASS
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> FAIL
                                </span>
                              )}
                              <span className="font-semibold text-pm-light-text dark:text-pm-dark-text">
                                Response time is within SLA threshold ({singleResponse.maxLatencyMs}ms)
                              </span>
                            </div>
                            <span className={`font-mono font-bold ${singleResponse.slaPassed ? 'text-pm-orange' : 'text-rose-500'}`}>{singleResponse.latencyMs}ms</span>
                          </motion.div>

                          <motion.div 
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="p-3 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              {!currentCase?.expectedSchema ? (
                                <span className="px-1.5 py-0.5 rounded bg-pm-light-bg dark:bg-pm-dark-bg text-pm-light-textMuted dark:text-pm-dark-textMuted border border-pm-light-border dark:border-pm-dark-border text-[10px] font-bold">SKIP</span>
                              ) : singleResponse.schemaValid ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> PASS
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> FAIL
                                </span>
                              )}
                              <span className="font-semibold text-pm-light-text dark:text-pm-dark-text">
                                Contract schema integrity verification
                              </span>
                            </div>
                            <span className={`font-mono font-bold ${!currentCase?.expectedSchema ? 'text-pm-light-textMuted dark:text-pm-dark-textMuted' : singleResponse.schemaValid ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {!currentCase?.expectedSchema ? (language === 'pt' ? 'Não configurado' : 'Not configured') : singleResponse.schemaValid ? '[SCHEMA_VALID]' : '[SCHEMA_INVALID]'}
                            </span>
                          </motion.div>
                        </div>
                      )}

                      {/* Tab 3: Response Headers */}
                      {activeSingleTab === 'headers' && (
                        <div className="rounded bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border overflow-hidden">
                          <table className="w-full text-left font-mono text-[11px]">
                            <thead className="bg-pm-light-panel dark:bg-pm-dark-panel border-b border-pm-light-border dark:border-pm-dark-border text-[10px] text-pm-light-textMuted dark:text-pm-dark-textMuted uppercase">
                              <tr>
                                <th className="px-4 py-2">{t.headerKey}</th>
                                <th className="px-4 py-2">{t.headerValue}</th>
                                <th className="px-4 py-2 text-right">{t.headerAction}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-pm-light-border dark:divide-pm-dark-border">
                              {Object.entries(singleResponse.responseHeaders).map(([k, v]) => (
                                <tr key={k} className="hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover">
                                  <td className="px-4 py-2 text-pm-orange font-bold">{k}</td>
                                  <td className="px-4 py-2 text-pm-light-text dark:text-pm-dark-text truncate max-w-md">{v}</td>
                                  <td className="px-4 py-2 text-right">
                                    <button 
                                      onClick={() => handleCopy(v, k)}
                                      className="text-[10px] text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-orange cursor-pointer"
                                      title="Copiar valor"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}


              {/* ── MODO 2: COLLECTION RUNNER STREAM ── */}
              {responseMode === 'collection' && (
                <motion.div
                  key="collection-view"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="h-full"
                >
                  {activeCollectionTab === 'cli' && (
                    <div className="h-full rounded bg-pm-light-panel dark:bg-[#151515] border border-pm-light-border dark:border-pm-dark-border p-3 text-[11px] text-pm-light-text dark:text-slate-300 overflow-y-auto space-y-1.5 shadow-inner">
                      <div className="text-pm-light-textMuted dark:text-slate-500 pb-2 border-b border-pm-light-border dark:border-white/[0.08] flex items-center justify-between text-[10px]">
                        <span>POSTMAN RUNNER PROTOCOL v10.14 ── FASTIFY TEST ENGINE</span>
                        <span>{new Date().toLocaleDateString('pt-BR')}</span>
                      </div>

                      {isExecuting ? (
                        <div className="py-8 text-center space-y-2">
                          <div className="inline-block w-3 h-3 rounded-full bg-pm-orange animate-ping" />
                          <p className="text-pm-orange font-bold">Executando bateria sequencial de testes...</p>
                          <p className="text-[10px] text-pm-light-textMuted dark:text-slate-500">
                            Disparando asserções, encadeamento dinâmico de JWT e cálculo de percentis p95/p99.
                          </p>
                        </div>
                      ) : !latestRun ? (
                        <div className="py-12 text-center text-pm-light-textMuted dark:text-slate-500 space-y-1">
                          <Terminal className="w-8 h-8 mx-auto opacity-30" />
                          <p>{t.noCollectionRunYet}</p>
                          <p className="text-[10px]">{t.clickRunCollectionHint}</p>
                        </div>
                      ) : (
                        <motion.div 
                          initial="hidden"
                          animate="visible"
                          variants={{
                            hidden: { opacity: 0 },
                            visible: { opacity: 1, transition: { staggerChildren: 0.01 } }
                          }}
                          className="space-y-1.5 leading-relaxed"
                        >
                          <p className="text-pm-light-textMuted dark:text-slate-500">
                            [{new Date(latestRun.createdAt).toLocaleTimeString('pt-BR')}] ❯ {latestRun.status}: "{latestRun.suite?.name}" ({latestRun.totalTests} requests)
                          </p>

                          {latestRun.assertions?.map((ast, idx) => (
                            <motion.div
                              key={ast.id}
                              variants={{
                                hidden: { opacity: 0, x: -6, y: 3 },
                                visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.18 } }
                              }}
                              className="flex flex-wrap items-start gap-2 text-[11px]"
                            >
                              <span className="text-pm-light-textMuted dark:text-slate-600 w-4 text-right">{idx + 1}.</span>
                              {assertionPassed(ast) ? (
                                <span className="text-emerald-500 font-bold">PASS ✔</span>
                              ) : (
                                <span className="text-rose-500 font-bold">FAIL ✖</span>
                              )}
                              
                              <span className={`font-bold uppercase ${getMethodTextClass(ast.method)}`}>
                                [{ast.method}]
                              </span>

                              <span className="text-pm-light-text dark:text-white font-medium">{ast.endpoint}</span>
                              <span className="text-pm-light-textMuted dark:text-slate-500">──</span>
                              <span className={ast.statusMatch ? 'text-emerald-500 font-bold' : 'text-rose-500'}>
                                {ast.actualStatus} HTTP
                              </span>
                              <span className="text-pm-light-textMuted dark:text-slate-500">•</span>
                              <span className={ast.slaPassed ? 'text-pm-orange' : 'text-amber-500 font-bold'}>
                                {ast.latencyMs}ms
                              </span>
                              
                              {!ast.schemaValid && <span className="text-rose-500 text-[10px]">[SCHEMA_INVALID]</span>}
                            </motion.div>
                          ))}

                          <div className="pt-2 mt-2 border-t border-pm-light-border dark:border-white/[0.08] text-[11px] space-y-0.5">
                            <p>
                              ── RESULT: <strong className={latestRun.status === 'PASSED' ? 'text-emerald-500' : 'text-rose-500'}>{latestRun.passedTests}/{latestRun.totalTests} PASSED</strong> • Success Rate: <strong className="text-pm-orange">{latestRun.successRate}%</strong>
                            </p>
                            <p className="text-pm-light-textMuted dark:text-slate-400">
                              ── LATENCY: p95 = <strong className="text-pm-orange">{latestRun.p95LatencyMs}ms</strong> • Total Duration: {latestRun.totalDurationMs}ms
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {activeCollectionTab === 'breakdown' && (
                    <div className="space-y-2">
                      {latestRun?.assertions?.map((ast) => (
                        <div
                          key={ast.id}
                          className="p-2.5 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border flex flex-wrap gap-2 items-center justify-between text-xs"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            {assertionPassed(ast) ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 text-[10px] font-bold border border-emerald-500/30">PASS</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 text-[10px] font-bold border border-rose-500/30">FAIL</span>
                            )}
                            <span className={`font-mono text-[10px] font-bold uppercase ${getMethodTextClass(ast.method)}`}>[{ast.method}]</span>
                            <span className="font-semibold text-pm-light-text dark:text-pm-dark-text">{ast.name}</span>
                            <span className="text-pm-light-textMuted dark:text-pm-dark-textMuted font-mono text-[11px]">({ast.endpoint})</span>
                          </div>

                          <div className="flex items-center gap-3 font-mono text-[11px]">
                            <span className={ast.statusMatch ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>{ast.actualStatus || 'ERROR'} HTTP</span>
                            <span className={ast.slaPassed ? 'text-pm-orange' : 'text-rose-500'}>{ast.latencyMs}ms</span>
                            {!ast.schemaValid && <span className="text-rose-500">Schema FAIL</span>}
                          </div>
                          {ast.errorMessage && <p className="w-full text-[11px] text-rose-600 dark:text-rose-300 select-text">{ast.errorMessage}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>

      </div>

    </div>
  );
};
