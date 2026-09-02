import React, { useState } from 'react';
import { 
  Plus, Search, Play, CheckCircle2, XCircle, Clock, Shield, 
  Terminal, Copy, Check, FileJson, Key, Sliders, AlertTriangle, 
  ChevronRight, ChevronDown, Folder, Code, Send, Sparkles, Layers,
  ExternalLink, Edit3
} from 'lucide-react';
import { TestSuite, TestCase, TestRun, HttpMethod } from '../types';
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
}

export const Workstation: React.FC<WorkstationProps> = ({
  suites,
  selectedSuite,
  onSelectSuite,
  onRunSuite,
  latestRun,
  isExecuting,
  onOpenCreateModal,
  onOpenCreateEndpointModal,
  onUpdateBaseUrl
}) => {
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [search, setSearch] = useState('');
  const [activeRequestTab, setActiveRequestTab] = useState<'params' | 'headers' | 'body' | 'assertions' | 'schema'>('assertions');
  const [activeResponseTab, setActiveResponseTab] = useState<'cli' | 'assertions' | 'responseBody'>('cli');
  const [copied, setCopied] = useState(false);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [editedUrl, setEditedUrl] = useState('');

  // Sincroniza caso ativo quando muda de suíte
  const activeCases = selectedSuite?.cases || [];
  const currentCase = selectedCase || (activeCases.length > 0 ? activeCases[0] : null);

  const filteredCases = activeCases.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.path.toLowerCase().includes(search.toLowerCase()) ||
    c.method.toLowerCase().includes(search.toLowerCase())
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
    <div className="flex-1 flex overflow-hidden bg-pm-light-bg dark:bg-pm-dark-bg transition-colors duration-200">
      
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

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-pm-light-textMuted dark:text-pm-dark-textMuted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter requests..."
              className="w-full pl-8 pr-3 py-1 bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border rounded text-[11px] text-pm-light-text dark:text-pm-dark-text placeholder-pm-light-textMuted dark:placeholder-pm-dark-textMuted focus:outline-none focus:border-pm-orange"
            />
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
              {s.name.split('──')[0].trim()}
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
                  <span className="truncate">{selectedSuite.name}</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-pm-light-textMuted dark:text-pm-dark-textMuted">
                  {filteredCases.length}
                </span>
              </div>

              {/* Request Items */}
              <div className="pl-3 space-y-0.5">
                {filteredCases.length === 0 ? (
                  <p className="py-4 text-center text-xs text-pm-light-textMuted dark:text-pm-dark-textMuted">No requests match search.</p>
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
                            {c.method}
                          </span>
                          <span className="truncate text-[11px] font-mono">{c.name}</span>
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
            <p className="p-4 text-center text-xs text-pm-light-textMuted dark:text-pm-dark-textMuted">Select a collection.</p>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-2.5 border-t border-pm-light-border dark:border-pm-dark-border bg-pm-light-panel dark:bg-pm-dark-panel flex items-center justify-between text-[10px] font-mono text-pm-light-textMuted dark:text-pm-dark-textMuted">
          <span>{filteredCases.length} endpoints</span>
          <span className="text-pm-orange font-medium">Postman Engine v10</span>
        </div>

      </div>


      {/* ── COLUNA PRINCIPAL: POSTMAN REQUEST WORKBENCH & RESPONSE PANE ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* 1. Request Address Bar & HTTP Method Row */}
        <div className="p-3 border-b border-pm-light-border dark:border-pm-dark-border bg-pm-light-surface dark:bg-pm-dark-surface flex items-center gap-2">
          {currentCase ? (
            <>
              {/* Method Selector */}
              <div className={`px-3 py-1.5 rounded border text-xs font-bold font-mono uppercase tracking-wider ${getMethodBadgeClass(currentCase.method)}`}>
                {currentCase.method}
              </div>

              {/* URL Address Bar */}
              <div className="flex-1 flex items-center bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border rounded px-3 py-1.5 text-xs font-mono">
                <span className="text-pm-light-textMuted dark:text-pm-dark-textMuted shrink-0">
                  {selectedSuite?.baseUrl.replace(/\/+$/, '')}
                </span>
                <span className="text-pm-orange font-semibold">{currentCase.path}</span>
              </div>

              {/* Send Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectedSuite && onRunSuite(selectedSuite.id)}
                disabled={isExecuting}
                className="px-4 py-1.5 bg-pm-orange hover:bg-pm-orangeHover disabled:opacity-50 text-white font-semibold rounded text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer font-sans"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </motion.button>
            </>
          ) : (
            <span className="text-xs text-pm-light-textMuted dark:text-pm-dark-textMuted">No request selected</span>
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
              <span>Expected Status: <strong className="text-emerald-500 font-bold">{currentCase?.expectedStatus || 200} OK</strong></span>
              <span>•</span>
              <span>SLA Target: <strong className="text-pm-orange">{currentCase?.maxLatencyMs || 250}ms</strong></span>
            </div>
          </div>
        )}

        {/* 3. Request Settings Tabs (Params, Headers, Body, Assertions, Schema) */}
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
        <div className="h-44 p-3 bg-pm-light-bg dark:bg-pm-dark-bg border-b border-pm-light-border dark:border-pm-dark-border overflow-y-auto text-xs font-mono">
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
                  <p className="text-pm-light-textMuted dark:text-pm-dark-textMuted py-4 text-center">No JSON payload body configured for this request.</p>
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
                  <p className="text-pm-light-textMuted dark:text-pm-dark-textMuted py-4 text-center">Automatic schema verification enabled (validates 200 OK structure).</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* 5. Response Pane & Postman Test Runner Stream */}
        <div className="flex-1 flex flex-col min-h-0 bg-pm-light-surface dark:bg-pm-dark-surface">
          
          {/* Response Pane Header Bar */}
          <div className="h-10 bg-pm-light-sidebar dark:bg-pm-dark-sidebar border-b border-pm-light-border dark:border-pm-dark-border px-3 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveResponseTab('cli')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  activeResponseTab === 'cli'
                    ? 'bg-pm-orange text-white font-semibold shadow-sm'
                    : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
                }`}
              >
                Test Results Console
              </button>
              <button
                onClick={() => setActiveResponseTab('assertions')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  activeResponseTab === 'assertions'
                    ? 'bg-pm-orange text-white font-semibold shadow-sm'
                    : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
                }`}
              >
                Test Breakdown ({latestRun?.assertions?.length || 0})
              </button>
            </div>

            {/* Status Metric Pills (Postman Style) */}
            {latestRun && (
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-bold">
                  Status: {latestRun.passedTests}/{latestRun.totalTests} PASS ({latestRun.successRate}%)
                </span>
                <span className="px-2 py-0.5 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-pm-light-text dark:text-pm-dark-text">
                  Time: <strong className="text-pm-orange">{latestRun.totalDurationMs}ms</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-pm-light-text dark:text-pm-dark-text">
                  p95: <strong className="text-pm-orange">{latestRun.p95LatencyMs}ms</strong>
                </span>
              </div>
            )}
          </div>

          {/* Response Viewport */}
          <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
            <AnimatePresence mode="wait">
              
              {/* CLI Stream Tab */}
              {activeResponseTab === 'cli' && (
                <motion.div
                  key="cli"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full rounded bg-pm-light-bg dark:bg-[#151515] border border-pm-light-border dark:border-pm-dark-border p-3 text-[11px] text-pm-light-text dark:text-slate-300 overflow-y-auto space-y-1.5 shadow-inner"
                >
                  <div className="text-pm-light-textMuted dark:text-slate-500 pb-2 border-b border-pm-light-border dark:border-white/[0.08] flex items-center justify-between text-[10px]">
                    <span>POSTMAN RUNNER PROTOCOL v10.14 ── FASTIFY TEST ENGINE</span>
                    <span>{new Date().toLocaleDateString('pt-BR')}</span>
                  </div>

                  {isExecuting ? (
                    <div className="py-8 text-center space-y-2">
                      <div className="inline-block w-3 h-3 rounded-full bg-pm-orange animate-ping" />
                      <p className="text-pm-orange font-bold">Executing test collection against target server...</p>
                      <p className="text-[10px] text-pm-light-textMuted dark:text-slate-500">Dispatching assertions, verifying JWT chain and telemetry metrics.</p>
                    </div>
                  ) : !latestRun ? (
                    <div className="py-12 text-center text-pm-light-textMuted dark:text-slate-500 space-y-1">
                      <Terminal className="w-8 h-8 mx-auto opacity-30" />
                      <p>No tests executed yet.</p>
                      <p className="text-[10px]">Click "Send" or "Run Collection" to dispatch test battery.</p>
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
                </motion.div>
              )}

              {/* Assertions Tab */}
              {activeResponseTab === 'assertions' && (
                <motion.div
                  key="assertions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
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
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>

      </div>

    </div>
  );
};
