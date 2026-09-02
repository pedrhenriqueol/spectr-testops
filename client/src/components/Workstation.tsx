import React, { useState } from 'react';
import { TestSuite, TestCase, TestRun, TestAssertion } from '../types';
import { 
  Terminal, 
  Search, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  Code2, 
  Copy, 
  Check, 
  ShieldCheck, 
  Play
} from 'lucide-react';
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
}

export const Workstation: React.FC<WorkstationProps> = ({
  suites,
  selectedSuite,
  onSelectSuite,
  onRunSuite,
  latestRun,
  isExecuting,
  onOpenCreateModal,
  onOpenCreateEndpointModal
}) => {
  const [search, setSearch] = useState('');
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'terminal' | 'assertions' | 'contract'>('terminal');
  const [expandedAssertionId, setExpandedAssertionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Filtra casos de teste por busca
  const filteredCases = selectedSuite?.cases.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.path.toLowerCase().includes(search.toLowerCase()) ||
    c.method.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const getMethodBadge = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
      case 'POST':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'PUT':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'DELETE':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default:
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
    }
  };

  const handleCopyPayload = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-spectr-bg">
      
      {/* ── COLUNA ESQUERDA (40%): ÁRVORE DE COLEÇÕES & REQUISIÇÕES HTTP ── */}
      <div className="w-[380px] lg:w-[420px] bg-spectr-surface border-r border-spectr-border flex flex-col shrink-0">
        
        {/* Collection Toolbar */}
        <div className="p-3 border-b border-spectr-border space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Coleções & Suítes
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenCreateEndpointModal}
                disabled={!selectedSuite}
                title="Adicionar Endpoint à Suíte Atual"
                className="px-2 py-1 rounded bg-spectr-violet/20 hover:bg-spectr-violet/30 border border-spectr-violet/50 text-purple-200 transition-colors text-[11px] flex items-center gap-1 font-mono cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3 h-3" />
                <span>Endpoint</span>
              </button>
              <button
                onClick={onOpenCreateModal}
                title="Criar Nova Suíte de Testes"
                className="p-1 rounded bg-spectr-panel hover:bg-spectr-panelHover border border-spectr-border text-slate-300 hover:text-white transition-colors text-[11px] flex items-center gap-1 font-mono cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Suíte</span>
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar endpoints, métodos..."
              className="w-full pl-8 pr-3 py-1.5 bg-spectr-bg border border-spectr-border rounded-md text-xs text-white placeholder-slate-500 focus:outline-none focus:border-spectr-violet font-mono"
            />
          </div>
        </div>

        {/* Suites Selector Ribbon */}
        {suites.length > 1 && (
          <div className="px-3 py-2 border-b border-spectr-border flex items-center gap-1 overflow-x-auto text-xs">
            {suites.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onSelectSuite(s);
                  setSelectedCase(null);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-mono whitespace-nowrap transition-colors cursor-pointer border ${
                  selectedSuite?.id === s.id
                    ? 'bg-spectr-violet/20 border-spectr-violet/60 text-purple-200'
                    : 'bg-spectr-panel border-spectr-border text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {/* Endpoints Tree View */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {selectedSuite ? (
            <div>
              {/* Suite Node */}
              <div className="px-2.5 py-2 rounded-md bg-spectr-panel/60 border border-spectr-border/80 flex items-center justify-between mb-2">
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-white truncate">{selectedSuite.name}</h4>
                  <span className="text-[10px] font-mono text-slate-400 block truncate">{selectedSuite.baseUrl}</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-spectr-bg text-purple-400 border border-spectr-border">
                  {filteredCases.length}
                </span>
              </div>

              {/* Cases List */}
              <div className="space-y-1">
                {filteredCases.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 font-mono">
                    Nenhum endpoint encontrado.
                  </div>
                ) : (
                  filteredCases.map((c) => {
                    const isSelected = selectedCase?.id === c.id;

                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCase(c)}
                        className={`p-2 rounded-md border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs select-none ${
                          isSelected
                            ? 'bg-spectr-violet/15 border-spectr-violet/50 text-white'
                            : 'bg-spectr-panel/40 border-transparent hover:border-spectr-border hover:bg-spectr-panel text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${getMethodBadge(c.method)}`}>
                            {c.method}
                          </span>
                          <span className="truncate text-[11px] font-mono">{c.path}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                          <span className="text-slate-500">{c.expectedStatus}</span>
                          <span className="text-slate-400 bg-spectr-bg px-1 rounded border border-spectr-border">
                            {c.maxLatencyMs}ms
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 font-mono">
              Nenhuma suíte selecionada.
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="p-2.5 border-t border-spectr-border bg-spectr-surface/90 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>{selectedSuite?.cases.length || 0} requisições prontas</span>
          <span className="text-purple-400">p95 SLA: 250ms</span>
        </div>

      </div>


      {/* ── COLUNA DIREITA (60%): TEST EXECUTION CONSOLE & ASSERTION TERMINAL ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-spectr-bg">
        
        {/* Console Top Header & View Tabs */}
        <div className="h-11 bg-spectr-surface border-b border-spectr-border px-4 flex items-center justify-between select-none shrink-0">
          
          {/* Tabs */}
          <div className="flex items-center gap-1 font-mono text-xs">
            <button
              onClick={() => setActiveConsoleTab('terminal')}
              className={`px-3 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                activeConsoleTab === 'terminal'
                  ? 'bg-spectr-panel text-purple-300 border border-spectr-border'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Console CLI Stream
            </button>
            <button
              onClick={() => setActiveConsoleTab('assertions')}
              className={`px-3 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                activeConsoleTab === 'assertions'
                  ? 'bg-spectr-panel text-purple-300 border border-spectr-border'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Asserções ({latestRun?.assertions?.length || 0})
            </button>
            <button
              onClick={() => setActiveConsoleTab('contract')}
              className={`px-3 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                activeConsoleTab === 'contract'
                  ? 'bg-spectr-panel text-purple-300 border border-spectr-border'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Contrato & JSON
            </button>
          </div>

          {/* Run Summary Telemetry */}
          {latestRun && (
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className={`font-bold px-2 py-0.5 rounded border ${
                latestRun.status === 'PASSED'
                  ? 'bg-spectr-terminal/15 text-spectr-terminal border-spectr-terminal/30'
                  : 'bg-spectr-rose/15 text-spectr-rose border-spectr-rose/30'
              }`}>
                {latestRun.status}
              </span>
              <span className="text-slate-400">
                {latestRun.passedTests}/{latestRun.totalTests} pass
              </span>
              <span className="text-purple-400">
                p95: {latestRun.p95LatencyMs}ms
              </span>
            </div>
          )}

        </div>

        {/* Console Body */}
        <div className="flex-1 overflow-y-auto p-4 font-mono">
          
          {/* TAB 1: TERMINAL CLI STREAM */}
          {activeConsoleTab === 'terminal' && (
            <div className="h-full rounded-md bg-black/90 border border-spectr-border p-4 text-xs font-mono overflow-y-auto space-y-2 text-slate-300 shadow-inner">
              
              {/* Terminal Banner */}
              <div className="text-slate-500 pb-2 border-b border-white/[0.06] text-[11px] flex items-center justify-between">
                <span>SPECTR TestOps Execution Console v1.0.4 ── (Node 24 / Fastify Engine)</span>
                <span>{new Date().toLocaleDateString('pt-BR')}</span>
              </div>

              {isExecuting ? (
                <div className="py-8 text-center space-y-3">
                  <div className="inline-block w-3 h-3 rounded-full bg-spectr-violet animate-ping" />
                  <p className="text-purple-400 text-xs">
                    Disparando esteira assíncrona de requisições HTTP contra o alvo...
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Avaliando códigos de status, headers de segurança e conformidade de latência p95/p99.
                  </p>
                </div>
              ) : !latestRun ? (
                <div className="py-12 text-center text-slate-600 text-xs space-y-2">
                  <Terminal className="w-8 h-8 mx-auto opacity-30" />
                  <p>Aguardando execução de testes.</p>
                  <p className="text-[10px]">Pressione "Executar Bateria" no topo para disparar a suíte.</p>
                </div>
              ) : (
                <div className="space-y-1.5 text-[11px] leading-relaxed">
                  <p className="text-slate-500">
                    [{new Date(latestRun.createdAt).toLocaleTimeString('pt-BR')}] ❯ INICIANDO EXECUÇÃO: "{latestRun.suite?.name}" ({latestRun.totalTests} casos)
                  </p>

                  {latestRun.assertions?.map((ast, idx) => (
                    <div key={ast.id} className="flex items-start gap-2">
                      <span className="text-slate-600 select-none w-5 text-right">{idx + 1}.</span>
                      {ast.statusMatch ? (
                        <span className="text-spectr-terminal font-bold">✔</span>
                      ) : (
                        <span className="text-spectr-rose font-bold">✖</span>
                      )}
                      
                      <span className={`font-bold uppercase ${
                        ast.method === 'GET' ? 'text-sky-400' : ast.method === 'POST' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        [{ast.method}]
                      </span>

                      <span className="text-white">{ast.endpoint}</span>
                      <span className="text-slate-500">──</span>
                      <span className={ast.statusMatch ? 'text-slate-200' : 'text-spectr-rose'}>
                        {ast.actualStatus} HTTP
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className={ast.slaPassed ? 'text-purple-400' : 'text-amber-400'}>
                        {ast.latencyMs}ms
                      </span>
                      
                      {ast.schemaValid && (
                        <span className="text-emerald-500/80 text-[10px]">[SCHEMA_OK]</span>
                      )}

                      {ast.errorMessage && (
                        <span className="text-spectr-rose text-[10px]">({ast.errorMessage})</span>
                      )}
                    </div>
                  ))}

                  <div className="pt-3 mt-3 border-t border-white/[0.06] text-slate-400 space-y-1">
                    <p>
                      ── BATERIA FINALIZADA: <span className="text-white font-bold">{latestRun.passedTests}/{latestRun.totalTests} APROVADOS</span> • Taxa: <strong className={latestRun.successRate === 100 ? 'text-spectr-terminal' : 'text-spectr-rose'}>{latestRun.successRate}%</strong>
                    </p>
                    <p>
                      ── METRICAS DE LATÊNCIA: p95 = <strong className="text-purple-400">{latestRun.p95LatencyMs}ms</strong> • p99 = <strong className="text-purple-400">{latestRun.p99LatencyMs}ms</strong> • Duração: {latestRun.totalDurationMs}ms
                    </p>
                    <p className="text-slate-600 text-[10px]">
                      Trilha de auditoria persistida atomicamente no banco de dados.
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: ASSERTION BREAKDOWN */}
          {activeConsoleTab === 'assertions' && (
            <div className="space-y-2">
              {!latestRun?.assertions || latestRun.assertions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Nenhuma asserção disponível. Execute a suíte primeiro.
                </div>
              ) : (
                latestRun.assertions.map((ast) => {
                  const isExpanded = expandedAssertionId === ast.id;

                  return (
                    <div
                      key={ast.id}
                      className="rounded-md border border-spectr-border bg-spectr-panel/70 overflow-hidden text-xs"
                    >
                      <div
                        onClick={() => setExpandedAssertionId(isExpanded ? null : ast.id)}
                        className="p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-spectr-panel"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {ast.statusMatch && ast.slaPassed ? (
                            <CheckCircle2 className="w-4 h-4 text-spectr-terminal shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-spectr-rose shrink-0" />
                          )}
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${getMethodBadge(ast.method)}`}>
                            {ast.method}
                          </span>
                          <span className="font-semibold text-white truncate">{ast.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono truncate">{ast.endpoint}</span>
                        </div>

                        <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
                          <span className={ast.statusMatch ? 'text-spectr-terminal' : 'text-spectr-rose'}>
                            {ast.actualStatus} HTTP
                          </span>
                          <span className={ast.slaPassed ? 'text-purple-400' : 'text-spectr-rose'}>
                            {ast.latencyMs}ms
                          </span>
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-3 border-t border-spectr-border bg-black/60 space-y-2 text-[11px]">
                          {ast.errorMessage && (
                            <div className="p-2 rounded bg-spectr-rose/10 border border-spectr-rose/30 text-rose-300">
                              <strong>Falha:</strong> {ast.errorMessage}
                            </div>
                          )}

                          <div>
                            <div className="flex items-center justify-between mb-1 text-slate-400">
                              <span>Payload de Resposta (Inspecionado):</span>
                              {ast.responseBody && (
                                <button
                                  onClick={() => handleCopyPayload(ast.responseBody || '')}
                                  className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                >
                                  {copied ? <Check className="w-3 h-3 text-spectr-terminal" /> : <Copy className="w-3 h-3" />}
                                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                                </button>
                              )}
                            </div>
                            <pre className="p-2 rounded bg-black/90 border border-spectr-border text-slate-300 text-[10px] overflow-x-auto max-h-44">
                              {ast.responseBody ? JSON.stringify(JSON.parse(ast.responseBody), null, 2) : 'Corpo vazio ou sem retorno.'}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: CONTRACT & JSON INSPECTOR */}
          {activeConsoleTab === 'contract' && (
            <div className="space-y-4">
              <div className="p-4 rounded-md bg-spectr-panel border border-spectr-border space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Contrato do Endpoint Selecionado
                  </h4>
                  {selectedCase && (
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${getMethodBadge(selectedCase.method)}`}>
                      {selectedCase.method} {selectedCase.path}
                    </span>
                  )}
                </div>

                {selectedCase ? (
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-1">JSON Schema Esperado:</span>
                      <pre className="p-3 rounded bg-black/90 border border-spectr-border text-purple-300 text-[11px] overflow-x-auto">
                        {selectedCase.expectedSchema ? JSON.stringify(JSON.parse(selectedCase.expectedSchema), null, 2) : '// Nenhum schema formal exigido (Status Code validação apenas)'}
                      </pre>
                    </div>

                    {selectedCase.body && (
                      <div>
                        <span className="text-slate-400 block mb-1">Payload de Envio (Request Body):</span>
                        <pre className="p-3 rounded bg-black/90 border border-spectr-border text-slate-300 text-[11px] overflow-x-auto">
                          {selectedCase.body}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs py-6 text-center">
                    Clique em qualquer endpoint na coluna da esquerda para inspecionar seus contratos e payloads.
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
