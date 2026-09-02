import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Play, CheckCircle2, XCircle, Clock, Shield, 
  Terminal, Copy, Check, FileJson, Key, Sliders, AlertTriangle, 
  ChevronRight, ChevronDown, Folder, Code, Send, Sparkles, Layers,
  ExternalLink, Edit3, Download, FileSpreadsheet, FileCode
} from 'lucide-react';
import { TestSuite, TestCase, TestRun, HttpMethod, SingleResponse } from '../types';
import { api } from '../api/client';
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
}

// Helper para destacar termos pesquisados na listagem
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
  setSearchQuery
}) => {
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [activeRequestTab, setActiveRequestTab] = useState<'assertions' | 'headers' | 'body' | 'schema'>('assertions');
  
  // Single Request Runner State
  const [singleResponse, setSingleResponse] = useState<SingleResponse | null>(null);
  const [isSendingSingle, setIsSendingSingle] = useState(false);
  const [responseMode, setResponseMode] = useState<'single' | 'collection'>('single');
  const [activeSingleTab, setActiveSingleTab] = useState<'body' | 'tests' | 'headers'>('body');
  const [activeCollectionTab, setActiveCollectionTab] = useState<'cli' | 'breakdown'>('cli');

  const [copied, setCopied] = useState(false);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [editedUrl, setEditedUrl] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Termo de busca unificado (do Topbar ou local)
  const activeQuery = searchQuery || localSearch;

  // Sincroniza caso ativo quando muda de suíte
  const activeCases = selectedSuite?.cases || [];
  const currentCase = selectedCase || (activeCases.length > 0 ? activeCases[0] : null);

  const filteredCases = activeCases.filter(c => 
    c.name.toLowerCase().includes(activeQuery.toLowerCase()) ||
    c.path.toLowerCase().includes(activeQuery.toLowerCase()) ||
    c.method.toLowerCase().includes(activeQuery.toLowerCase())
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveBaseUrl = async () => {
    if (editedUrl.trim() && onUpdateBaseUrl) {
      await onUpdateBaseUrl(editedUrl.trim());
      setIsEditingUrl(false);
    }
  };

  // Disparo Individual de Request (Send Button)
  const handleSendSingle = async () => {
    if (!currentCase) return;
    try {
      setIsSendingSingle(true);
      const res = await api.post(`/cases/${currentCase.id}/run`);
      setSingleResponse(res.data);
      setResponseMode('single');
    } catch (err: any) {
      console.error('Falha na execução individual:', err);
    } finally {
      setIsSendingSingle(false);
    }
  };

  // Exportação de Relatório de Conformidade (SLA Report)
  const handleExportReport = (format: 'json' | 'csv') => {
    const reportTimestamp = new Date().toISOString();
    const suiteName = selectedSuite?.name || 'Spectr-Suite';
    const cleanSuiteName = suiteName.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (format === 'json') {
      const reportData = {
        title: 'SPECTR TestOps SLA & API Compliance Technical Report',
        generatedAt: reportTimestamp,
        suite: {
          id: selectedSuite?.id,
          name: selectedSuite?.name,
          baseUrl: selectedSuite?.baseUrl
        },
        execution: latestRun ? {
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
        activeSingleResponse: singleResponse
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spectr-sla-report-${cleanSuiteName}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV Format
      const headers = ['Test Name', 'Method', 'Endpoint', 'HTTP Status', 'Expected Status', 'Status Match', 'Latency (ms)', 'SLA Target (ms)', 'SLA Passed', 'Schema Valid', 'Result', 'Error Message'];
      const rows: string[][] = [];

      if (latestRun?.assertions) {
        latestRun.assertions.forEach(ast => {
          rows.push([
            `"${ast.name.replace(/"/g, '""')}"`,
            ast.method,
            ast.endpoint,
            String(ast.actualStatus),
            String(ast.expectedStatus),
            ast.statusMatch ? 'PASS' : 'FAIL',
            String(ast.latencyMs),
            '1500',
            ast.slaPassed ? 'YES' : 'NO',
            ast.schemaValid ? 'YES' : 'NO',
            ast.statusMatch ? 'PASS' : 'FAIL',
            `"${(ast.errorMessage || '').replace(/"/g, '""')}"`
          ]);
        });
      } else if (singleResponse) {
        rows.push([
          `"${singleResponse.name.replace(/"/g, '""')}"`,
          singleResponse.method,
          singleResponse.url,
          String(singleResponse.actualStatus),
          String(singleResponse.expectedStatus),
          singleResponse.statusMatch ? 'PASS' : 'FAIL',
          String(singleResponse.latencyMs),
          String(singleResponse.maxLatencyMs),
          singleResponse.slaPassed ? 'YES' : 'NO',
          singleResponse.schemaValid ? 'YES' : 'NO',
          singleResponse.statusMatch ? 'PASS' : 'FAIL',
          `"${(singleResponse.errorMessage || '').replace(/"/g, '""')}"`
        ]);
      }

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spectr-sla-report-${cleanSuiteName}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setIsExportMenuOpen(false);
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-pm-get/15 text-pm-get border-pm-get/30';
      case 'POST': return 'bg-pm-post/15 text-pm-post border-pm-post/30';
      case 'PUT': return 'bg-pm-put/15 text-pm-put border-pm-put/30';
      case 'DELETE': return 'bg-pm-delete/15 text-pm-delete border-pm-delete/30';
      case 'PATCH': return 'bg-pm-patch/15 text-pm-patch border-pm-patch/30';
      default: return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
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
    <div className="flex-1 flex overflow-hidden bg-pm-light-bg dark:bg-pm-dark-bg transition-colors duration-200 select-none">
      
      {/* ── COLUNA ESQUERDA (320px): POSTMAN COLLECTIONS SIDEBAR ── */}
      <div className="w-80 bg-pm-light-sidebar dark:bg-pm-dark-sidebar border-r border-pm-light-border dark:border-pm-dark-border flex flex-col shrink-0">
        
        {/* Collections Toolbar */}
        <div className="p-3 border-b border-pm-light-border dark:border-pm-dark-border space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-pm-light-text dark:text-pm-dark-text uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-pm-orange" />
              Collections
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenCreateEndpointModal}
                disabled={!selectedSuite}
                title="Adicionar Novo Request/Endpoint"
                className="px-2 py-1 rounded bg-pm-orange/15 hover:bg-pm-orange/25 border border-pm-orange/40 text-pm-orange text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3 h-3" />
                <span>Request</span>
              </button>
              <button
                onClick={onOpenCreateModal}
                title="Criar Nova Coleção"
                className="p-1 rounded bg-pm-light-panel dark:bg-pm-dark-panel hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover border border-pm-light-border dark:border-pm-dark-border text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text transition-colors text-[10px] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Collection</span>
              </button>
            </div>
          </div>

          {/* Search Box com feedback de correspondências */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-pm-light-textMuted dark:text-pm-dark-textMuted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={activeQuery}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                if (setSearchQuery) setSearchQuery(e.target.value);
              }}
              placeholder="Filtrar por nome, rota ou método..."
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

              {/* Request Items com Destaque de Busca */}
              <div className="pl-3 space-y-0.5">
                {filteredCases.length === 0 ? (
                  <p className="py-4 text-center text-xs text-pm-light-textMuted dark:text-pm-dark-textMuted">
                    Nenhum request coincide com a busca.
                  </p>
                ) : (
                  filteredCases.map((c) => {
                    const isCurrent = currentCase?.id === c.id;
                    return (
                      <motion.div
                        key={c.id}
                        whileHover={{ x: 2 }}
                        onClick={() => setSelectedCase(c)}
                        className={`px-2.5 py-1.5 rounded flex items-center justify-between gap-2 cursor-pointer transition-colors text-xs ${
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
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <p className="p-4 text-center text-xs text-pm-light-textMuted dark:text-pm-dark-textMuted">Selecione uma coleção.</p>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-2.5 border-t border-pm-light-border dark:border-pm-dark-border bg-pm-light-panel dark:bg-pm-dark-panel flex items-center justify-between text-[10px] font-mono text-pm-light-textMuted dark:text-pm-dark-textMuted">
          <span>{filteredCases.length} endpoints prontos</span>
          <span className="text-pm-orange font-medium">Postman Engine v10</span>
        </div>

      </div>


      {/* ── COLUNA PRINCIPAL: REQUEST WORKBENCH & RESPONSE PANE ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* 1. Request Address Bar & Send Button */}
        <div className="p-3 border-b border-pm-light-border dark:border-pm-dark-border bg-pm-light-surface dark:bg-pm-dark-surface flex items-center gap-2">
          {currentCase ? (
            <>
              {/* Method Selector */}
              <div className={`px-3 py-1.5 rounded border text-xs font-bold font-mono uppercase tracking-wider ${getMethodBadgeClass(currentCase.method)}`}>
                {currentCase.method}
              </div>

              {/* URL Address Bar */}
              <div className="flex-1 flex items-center bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border rounded px-3 py-1.5 text-xs font-mono overflow-hidden">
                <span className="text-pm-light-textMuted dark:text-pm-dark-textMuted shrink-0">
                  {selectedSuite?.baseUrl.replace(/\/+$/, '')}
                </span>
                <span className="text-pm-orange font-semibold truncate">{currentCase.path}</span>
              </div>

              {/* Send Button (Disparo Individual com spinner) */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSendSingle}
                disabled={isSendingSingle || isExecuting}
                className="px-4 py-1.5 bg-pm-orange hover:bg-pm-orangeHover disabled:opacity-50 text-white font-semibold rounded text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer font-sans"
              >
                <Send className={`w-3.5 h-3.5 ${isSendingSingle ? 'animate-spin' : ''}`} />
                <span>{isSendingSingle ? 'Sending...' : 'Send'}</span>
              </motion.button>
            </>
          ) : (
            <span className="text-xs text-pm-light-textMuted dark:text-pm-dark-textMuted">Nenhuma requisição selecionada</span>
          )}
        </div>

        {/* 2. Base URL Config & Quick Edit Bar */}
        {selectedSuite && (
          <div className="px-3 py-1.5 bg-pm-light-panel dark:bg-pm-dark-panel border-b border-pm-light-border dark:border-pm-dark-border flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <span className="text-pm-light-textMuted dark:text-pm-dark-textMuted font-bold">BASE_URL:</span>
              {isEditingUrl ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editedUrl}
                    onChange={(e) => setEditedUrl(e.target.value)}
                    className="px-2 py-0.5 bg-pm-light-bg dark:bg-pm-dark-bg border border-pm-orange rounded text-pm-light-text dark:text-pm-dark-text text-[11px] w-72 focus:outline-none"
                  />
                  <button onClick={handleSaveBaseUrl} className="p-1 rounded bg-pm-orange text-white cursor-pointer"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setIsEditingUrl(false)} className="p-1 rounded bg-slate-500/20 text-slate-400 cursor-pointer"><XCircle className="w-3 h-3" /></button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditedUrl(selectedSuite.baseUrl);
                    setIsEditingUrl(true);
                  }}
                  className="flex items-center gap-1 text-pm-orange hover:underline cursor-pointer"
                >
                  <span>{selectedSuite.baseUrl}</span>
                  <Edit3 className="w-2.5 h-2.5 opacity-60" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-pm-light-textMuted dark:text-pm-dark-textMuted">
              <span>Status Esperado: <strong className="text-emerald-500 font-bold">{currentCase?.expectedStatus || 200} OK</strong></span>
              <span>•</span>
              <span>SLA Target: <strong className="text-pm-orange">{currentCase?.maxLatencyMs || 250}ms</strong></span>
            </div>
          </div>
        )}

        {/* 3. Request Settings Tabs (Assertions, Headers, Body, Schema) */}
        <div className="border-b border-pm-light-border dark:border-pm-dark-border bg-pm-light-surface dark:bg-pm-dark-surface px-3 flex items-center gap-1 text-xs">
          {[
            { id: 'assertions', label: 'Assertions & SLA', count: 2 },
            { id: 'headers', label: 'Headers', count: 3 },
            { id: 'body', label: 'Body (JSON)', count: currentCase?.body ? 1 : 0 },
            { id: 'schema', label: 'Contract Schema', count: currentCase?.expectedSchema ? 1 : 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveRequestTab(tab.id as any)}
              className={`px-3 py-2 border-b-2 font-medium text-[11px] transition-colors relative cursor-pointer ${
                activeRequestTab === tab.id
                  ? 'border-pm-orange text-pm-orange font-semibold'
                  : 'border-transparent text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
              }`}
            >
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
        <div className="h-40 p-3 bg-pm-light-bg dark:bg-pm-dark-bg border-b border-pm-light-border dark:border-pm-dark-border overflow-y-auto text-xs font-mono">
          <AnimatePresence mode="wait">
            {activeRequestTab === 'assertions' && (
              <motion.div
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between p-2 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Status Code Check</span>
                  </div>
                  <span className="text-emerald-500 font-bold">pm.response.to.have.status({currentCase?.expectedStatus || 200})</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-pm-orange" />
                    <span>Response Time SLA Threshold</span>
                  </div>
                  <span className="text-pm-orange font-bold">pm.response.responseTime &lt; {currentCase?.maxLatencyMs || 250}ms</span>
                </div>
              </motion.div>
            )}

            {activeRequestTab === 'headers' && (
              <motion.div
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                className="space-y-1.5"
              >
                <div className="grid grid-cols-12 gap-2 text-pm-light-textMuted dark:text-pm-dark-textMuted font-bold text-[10px] pb-1 border-b border-pm-light-border dark:border-pm-dark-border">
                  <span className="col-span-5">KEY</span>
                  <span className="col-span-7">VALUE</span>
                </div>
                <div className="grid grid-cols-12 gap-2 text-[11px]">
                  <span className="col-span-5 text-pm-orange font-semibold">Content-Type</span>
                  <span className="col-span-7 text-pm-light-text dark:text-pm-dark-text">application/json</span>
                </div>
                <div className="grid grid-cols-12 gap-2 text-[11px]">
                  <span className="col-span-5 text-pm-orange font-semibold">Accept</span>
                  <span className="col-span-7 text-pm-light-text dark:text-pm-dark-text">application/json</span>
                </div>
                <div className="grid grid-cols-12 gap-2 text-[11px]">
                  <span className="col-span-5 text-pm-orange font-semibold">Authorization</span>
                  <span className="col-span-7 text-emerald-500 font-semibold">Bearer &lt;dynamic_jwt_session&gt;</span>
                </div>
              </motion.div>
            )}

            {activeRequestTab === 'body' && (
              <motion.div
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
              >
                {currentCase?.body ? (
                  <pre className="p-2 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-[11px] text-pm-light-text dark:text-pm-dark-text overflow-x-auto">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(currentCase.body), null, 2);
                      } catch {
                        return currentCase.body;
                      }
                    })()}
                  </pre>
                ) : (
                  <p className="text-pm-light-textMuted dark:text-pm-dark-textMuted py-4 text-center">Nenhum payload JSON configurado para este request.</p>
                )}
              </motion.div>
            )}

            {activeRequestTab === 'schema' && (
              <motion.div
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
              >
                {currentCase?.expectedSchema ? (
                  <pre className="p-2 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-[11px] text-pm-light-text dark:text-pm-dark-text overflow-x-auto">
                    {currentCase.expectedSchema}
                  </pre>
                ) : (
                  <p className="text-pm-light-textMuted dark:text-pm-dark-textMuted py-4 text-center">Validação automática de contrato ativo (status 200 OK).</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* 5. Postman Response Pane (Single Request Response & Collection Runner Stream) */}
        <div className="flex-1 flex flex-col min-h-0 bg-pm-light-surface dark:bg-pm-dark-surface">
          
          {/* Response Pane Header Bar */}
          <div className="h-10 bg-pm-light-sidebar dark:bg-pm-dark-sidebar border-b border-pm-light-border dark:border-pm-dark-border px-3 flex items-center justify-between text-xs shrink-0">
            
            {/* Left: Mode Switcher & Tabs */}
            <div className="flex items-center gap-2">
              
              {/* Selector de Modo: Single Request vs Collection Stream */}
              <div className="flex items-center bg-pm-light-bg dark:bg-pm-dark-bg p-0.5 rounded border border-pm-light-border dark:border-pm-dark-border">
                <button
                  onClick={() => setResponseMode('single')}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    responseMode === 'single'
                      ? 'bg-pm-orange text-white shadow-sm'
                      : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
                  }`}
                >
                  ⚡ Single Response
                </button>
                <button
                  onClick={() => setResponseMode('collection')}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    responseMode === 'collection'
                      ? 'bg-pm-orange text-white shadow-sm'
                      : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
                  }`}
                >
                  📋 Collection Runner
                </button>
              </div>

              {/* Sub-tabs dependendo do modo ativo */}
              {responseMode === 'single' ? (
                <div className="flex items-center gap-1 pl-2 border-l border-pm-light-border dark:border-pm-dark-border">
                  <button
                    onClick={() => setActiveSingleTab('body')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      activeSingleTab === 'body'
                        ? 'text-pm-orange font-bold underline'
                        : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
                    }`}
                  >
                    Body (JSON Pretty)
                  </button>
                  <button
                    onClick={() => setActiveSingleTab('tests')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      activeSingleTab === 'tests'
                        ? 'text-pm-orange font-bold underline'
                        : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
                    }`}
                  >
                    Test Results
                  </button>
                  <button
                    onClick={() => setActiveSingleTab('headers')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      activeSingleTab === 'headers'
                        ? 'text-pm-orange font-bold underline'
                        : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
                    }`}
                  >
                    Headers ({singleResponse ? Object.keys(singleResponse.responseHeaders).length : 0})
                  </button>
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
                    CLI Stream
                  </button>
                  <button
                    onClick={() => setActiveCollectionTab('breakdown')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      activeCollectionTab === 'breakdown'
                        ? 'text-pm-orange font-bold underline'
                        : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
                    }`}
                  >
                    Breakdown ({latestRun?.assertions?.length || 0})
                  </button>
                </div>
              )}

            </div>

            {/* Right: Metrics Pills & Export SLA Report Button */}
            <div className="flex items-center gap-2 text-[11px] font-mono">
              
              {/* Status Pills */}
              {responseMode === 'single' && singleResponse ? (
                <>
                  <span className={`px-2 py-0.5 rounded font-bold border ${
                    singleResponse.statusMatch
                      ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                  }`}>
                    Status: {singleResponse.actualStatus} {singleResponse.statusText}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-pm-light-text dark:text-pm-dark-text">
                    Time: <strong className="text-pm-orange">{singleResponse.latencyMs}ms</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-pm-light-text dark:text-pm-dark-text">
                    Size: <strong className="text-pm-light-text dark:text-pm-dark-text">{singleResponse.responseSize}</strong>
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

              {/* 4. EXPORTAÇÃO DE RELATÓRIO DE CONFORMIDADE (NOVA FEATURE) */}
              <div className="relative">
                <button
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  title="Exportar Relatório Técnico de Conformidade SLA"
                  className="px-2.5 py-1 rounded bg-pm-light-panel dark:bg-pm-dark-panel hover:bg-pm-orange/15 border border-pm-light-border dark:border-pm-dark-border hover:border-pm-orange/50 text-pm-light-text dark:text-pm-dark-text transition-colors flex items-center gap-1.5 font-sans text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-3 h-3 text-pm-orange" />
                  <span>Export SLA Report</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {isExportMenuOpen && (
                  <div className="absolute right-0 mt-1 w-44 rounded-md bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border shadow-xl py-1 z-50 font-sans text-xs">
                    <button
                      onClick={() => handleExportReport('json')}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover text-pm-light-text dark:text-pm-dark-text transition-colors cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5 text-pm-orange" />
                      <span>Export JSON (.json)</span>
                    </button>
                    <button
                      onClick={() => handleExportReport('csv')}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover text-pm-light-text dark:text-pm-dark-text transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Export CSV (.csv)</span>
                    </button>
                  </div>
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col"
                >
                  {isSendingSingle ? (
                    <div className="py-12 text-center space-y-2">
                      <div className="inline-block w-4 h-4 rounded-full bg-pm-orange animate-ping" />
                      <p className="text-pm-orange font-bold">Disparando requisição individual contra o alvo...</p>
                      <p className="text-[11px] text-pm-light-textMuted dark:text-pm-dark-textMuted">
                        Autenticando sessão JWT, medindo latência e capturando headers de resposta.
                      </p>
                    </div>
                  ) : !singleResponse ? (
                    <div className="py-14 text-center text-pm-light-textMuted dark:text-pm-dark-textMuted space-y-2">
                      <Send className="w-8 h-8 mx-auto opacity-30 text-pm-orange" />
                      <p className="font-semibold text-pm-light-text dark:text-pm-dark-text">Nenhuma resposta individual recebida.</p>
                      <p className="text-[11px]">Clique no botão "Send" na barra de endereço para disparar esta requisição.</p>
                    </div>
                  ) : (
                    <>
                      {/* Tab 1: Pretty Body (JSON) */}
                      {activeSingleTab === 'body' && (
                        <div className="h-full flex flex-col rounded bg-pm-light-bg dark:bg-[#151515] border border-pm-light-border dark:border-pm-dark-border overflow-hidden shadow-inner">
                          <div className="p-2 border-b border-pm-light-border dark:border-white/[0.08] flex items-center justify-between text-[11px] text-pm-light-textMuted dark:text-pm-dark-textMuted bg-pm-light-panel dark:bg-pm-dark-panel">
                            <span>RESPONSE PAYLOAD (JSON PRETTY)</span>
                            <button
                              onClick={() => handleCopy(JSON.stringify(singleResponse.responseBody, null, 2))}
                              className="flex items-center gap-1 text-[10px] text-pm-orange hover:underline cursor-pointer font-bold"
                            >
                              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                            </button>
                          </div>
                          <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] text-pm-light-text dark:text-emerald-400">
                            <pre className="whitespace-pre-wrap">
                              {typeof singleResponse.responseBody === 'object'
                                ? JSON.stringify(singleResponse.responseBody, null, 2)
                                : singleResponse.rawBody}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Tab 2: Test Results */}
                      {activeSingleTab === 'tests' && (
                        <div className="space-y-2">
                          <div className="p-3 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {singleResponse.statusMatch ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-bold">PASS</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[10px] font-bold">FAIL</span>
                              )}
                              <span className="font-semibold text-pm-light-text dark:text-pm-dark-text">
                                Status code is {singleResponse.expectedStatus} OK
                              </span>
                            </div>
                            <span className="font-mono text-emerald-500 font-bold">{singleResponse.actualStatus} HTTP</span>
                          </div>

                          <div className="p-3 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {singleResponse.slaPassed ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-bold">PASS</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-bold">WARN</span>
                              )}
                              <span className="font-semibold text-pm-light-text dark:text-pm-dark-text">
                                Response time is within SLA threshold ({singleResponse.maxLatencyMs}ms)
                              </span>
                            </div>
                            <span className="font-mono text-pm-orange font-bold">{singleResponse.latencyMs}ms</span>
                          </div>

                          <div className="p-3 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {singleResponse.schemaValid ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-bold">PASS</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[10px] font-bold">FAIL</span>
                              )}
                              <span className="font-semibold text-pm-light-text dark:text-pm-dark-text">
                                Contract schema integrity verification
                              </span>
                            </div>
                            <span className="font-mono text-emerald-500 font-bold">[SCHEMA_VALID]</span>
                          </div>
                        </div>
                      )}

                      {/* Tab 3: Response Headers */}
                      {activeSingleTab === 'headers' && (
                        <div className="rounded bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border overflow-hidden">
                          <table className="w-full text-left font-mono text-[11px]">
                            <thead className="bg-pm-light-panel dark:bg-pm-dark-panel border-b border-pm-light-border dark:border-pm-dark-border text-[10px] text-pm-light-textMuted dark:text-pm-dark-textMuted uppercase">
                              <tr>
                                <th className="px-4 py-2">Header Key</th>
                                <th className="px-4 py-2">Header Value</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-pm-light-border dark:divide-pm-dark-border">
                              {Object.entries(singleResponse.responseHeaders).map(([k, v]) => (
                                <tr key={k} className="hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover">
                                  <td className="px-4 py-2 text-pm-orange font-bold">{k}</td>
                                  <td className="px-4 py-2 text-pm-light-text dark:text-pm-dark-text truncate max-w-md">{v}</td>
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  {activeCollectionTab === 'cli' && (
                    <div className="h-full rounded bg-pm-light-bg dark:bg-[#151515] border border-pm-light-border dark:border-pm-dark-border p-3 text-[11px] text-pm-light-text dark:text-slate-300 overflow-y-auto space-y-1.5 shadow-inner">
                      <div className="text-pm-light-textMuted dark:text-slate-500 pb-2 border-b border-pm-light-border dark:border-white/[0.08] flex items-center justify-between text-[10px]">
                        <span>POSTMAN RUNNER PROTOCOL v10.14 ── FASTIFY TEST ENGINE</span>
                        <span>{new Date().toLocaleDateString('pt-BR')}</span>
                      </div>

                      {isExecuting ? (
                        <div className="py-8 text-center space-y-2">
                          <div className="inline-block w-3 h-3 rounded-full bg-pm-orange animate-ping" />
                          <p className="text-pm-orange font-bold">Executando bateria sequencial de testes contra o alvo...</p>
                          <p className="text-[10px] text-pm-light-textMuted dark:text-slate-500">Disparando asserções, encadeamento de JWT e cálculo de percentis p95/p99.</p>
                        </div>
                      ) : !latestRun ? (
                        <div className="py-12 text-center text-pm-light-textMuted dark:text-slate-500 space-y-1">
                          <Terminal className="w-8 h-8 mx-auto opacity-30" />
                          <p>Nenhuma bateria de coleção executada ainda.</p>
                          <p className="text-[10px]">Clique em "Run Collection" no topo para disparar toda a suíte de testes.</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 leading-relaxed">
                          <p className="text-pm-light-textMuted dark:text-slate-500">
                            [{new Date(latestRun.createdAt).toLocaleTimeString('pt-BR')}] ❯ RUNNING: "{latestRun.suite?.name}" ({latestRun.totalTests} requests)
                          </p>

                          {latestRun.assertions?.map((ast, idx) => (
                            <motion.div
                              key={ast.id}
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.04 }}
                              className="flex items-start gap-2 text-[11px]"
                            >
                              <span className="text-pm-light-textMuted dark:text-slate-600 w-4 text-right">{idx + 1}.</span>
                              {ast.statusMatch ? (
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
                              
                              {ast.schemaValid && (
                                <span className="text-emerald-500/80 text-[10px]">[SCHEMA_VALID]</span>
                              )}
                            </motion.div>
                          ))}

                          <div className="pt-2 mt-2 border-t border-pm-light-border dark:border-white/[0.08] text-[11px] space-y-0.5">
                            <p>
                              ── RESULT: <strong className="text-emerald-500">{latestRun.passedTests}/{latestRun.totalTests} PASSED</strong> • Success Rate: <strong className="text-pm-orange">{latestRun.successRate}%</strong>
                            </p>
                            <p className="text-pm-light-textMuted dark:text-slate-400">
                              ── LATENCY: p95 = <strong className="text-pm-orange">{latestRun.p95LatencyMs}ms</strong> • Total Duration: {latestRun.totalDurationMs}ms
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeCollectionTab === 'breakdown' && (
                    <div className="space-y-2">
                      {latestRun?.assertions?.map((ast) => (
                        <div
                          key={ast.id}
                          className="p-2.5 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {ast.statusMatch ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 text-[10px] font-bold border border-emerald-500/30">PASS</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 text-[10px] font-bold border border-rose-500/30">FAIL</span>
                            )}
                            <span className={`font-mono text-[10px] font-bold uppercase ${getMethodTextClass(ast.method)}`}>[{ast.method}]</span>
                            <span className="font-semibold text-pm-light-text dark:text-pm-dark-text">{ast.name}</span>
                            <span className="text-pm-light-textMuted dark:text-pm-dark-textMuted font-mono text-[11px]">({ast.endpoint})</span>
                          </div>

                          <div className="flex items-center gap-3 font-mono text-[11px]">
                            <span className="text-emerald-500 font-bold">{ast.actualStatus} HTTP</span>
                            <span className="text-pm-orange">{ast.latencyMs}ms</span>
                          </div>
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
