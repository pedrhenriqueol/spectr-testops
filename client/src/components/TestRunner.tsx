import React, { useState } from 'react';
import { TestSuite, TestRun } from '../types';
import { Play, CheckCircle2, XCircle, Clock, AlertTriangle, ChevronDown, ChevronRight, Terminal, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TestRunnerProps {
  suites: TestSuite[];
  selectedSuite: TestSuite | null;
  onSelectSuite: (suite: TestSuite) => void;
  onRunSuite: (suiteId: string) => void;
  latestRun: TestRun | null;
  isExecuting: boolean;
  onOpenCreateModal: () => void;
}

export const TestRunner: React.FC<TestRunnerProps> = ({
  suites,
  selectedSuite,
  onSelectSuite,
  onRunSuite,
  latestRun,
  isExecuting,
  onOpenCreateModal
}) => {
  const [expandedAssertionId, setExpandedAssertionId] = useState<string | null>(null);

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-blue-400 bg-blue-500/15 border-blue-500/30';
      case 'POST': return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
      case 'PUT': return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
      case 'DELETE': return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
      default: return 'text-purple-400 bg-purple-500/15 border-purple-500/30';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Runner de Suítes & Contratos</h2>
          <p className="text-sm text-slate-400 mt-1">
            Execução determinística de coleções de requisições, medição de latência p95 e auditoria de SLAs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCreateModal}
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Suíte</span>
          </button>

          {selectedSuite && (
            <button
              onClick={() => onRunSuite(selectedSuite.id)}
              disabled={isExecuting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all cursor-pointer border border-purple-400/40"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isExecuting ? 'Executando Bateria...' : 'Executar Bateria de Testes'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Suite Selector Ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {suites.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelectSuite(s)}
            className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all text-left whitespace-nowrap cursor-pointer ${
              selectedSuite?.id === s.id
                ? 'bg-purple-500/15 border-purple-500/50 text-purple-200 shadow-sm'
                : 'bg-[#121420] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/[0.15]'
            }`}
          >
            <span className="font-semibold block">{s.name}</span>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{s.baseUrl}</span>
          </button>
        ))}
      </div>

      {/* Execution Progress Bar */}
      {isExecuting && (
        <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-purple-300">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              Disparando requisições HTTP e medindo latência p95...
            </span>
            <span>Runner Ativo</span>
          </div>
          <div className="w-full bg-purple-900/40 h-2 rounded-full overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      )}

      {/* Main Grid: Cases on Left, Latest Telemetry on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Test Cases Spec (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-[#121420] border border-white/[0.08] shadow-lg">
            <h3 className="text-sm font-bold text-white mb-1">Casos de Teste da Suíte</h3>
            <p className="text-xs text-slate-400 mb-4">Endpoints configurados para asserção</p>

            <div className="space-y-2.5">
              {selectedSuite?.cases.map((tc) => (
                <div
                  key={tc.id}
                  className="p-3 rounded-xl bg-[#090A0F] border border-white/[0.06] text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{tc.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">Max {tc.maxLatencyMs}ms</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] border ${getMethodColor(tc.method)}`}>
                      {tc.method}
                    </span>
                    <span className="text-slate-300 truncate">{tc.path}</span>
                    <span className="text-slate-500 ml-auto">Esperado: {tc.expectedStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Run Telemetry & Assertions (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-[#121420] border border-white/[0.08] shadow-lg">
            
            {/* Header of Results */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Telemetria da Última Execução</h3>
                <span className="text-xs text-slate-400 font-mono">
                  {latestRun ? `Execução #${latestRun.id.slice(0, 8)} • ${new Date(latestRun.createdAt).toLocaleTimeString('pt-BR')}` : 'Aguardando disparo'}
                </span>
              </div>

              {latestRun && (
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                    latestRun.status === 'PASSED'
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  }`}>
                    {latestRun.status} ({latestRun.successRate}%)
                  </span>
                </div>
              )}
            </div>

            {/* Run Stats Bar */}
            {latestRun && (
              <div className="grid grid-cols-4 gap-2 mb-4 p-3 rounded-xl bg-[#090A0F] border border-white/[0.06] text-center font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Total</span>
                  <span className="font-bold text-white">{latestRun.totalTests}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400 block uppercase">Aprovados</span>
                  <span className="font-bold text-emerald-400">{latestRun.passedTests}</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-400 block uppercase">Falhas</span>
                  <span className="font-bold text-rose-400">{latestRun.failedTests}</span>
                </div>
                <div>
                  <span className="text-[10px] text-purple-400 block uppercase">p95 Latência</span>
                  <span className="font-bold text-purple-400">{latestRun.p95LatencyMs}ms</span>
                </div>
              </div>
            )}

            {/* Assertions List */}
            <div className="space-y-2">
              {!latestRun?.assertions || latestRun.assertions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 font-mono border border-dashed border-white/[0.08] rounded-xl">
                  Clique em "Executar Bateria de Testes" para ver o stream de asserções em tempo real.
                </div>
              ) : (
                latestRun.assertions.map((ast) => {
                  const isExpanded = expandedAssertionId === ast.id;

                  return (
                    <div
                      key={ast.id}
                      className={`rounded-xl border transition-all overflow-hidden ${
                        ast.statusMatch && ast.slaPassed
                          ? 'bg-[#090A0F] border-white/[0.06] hover:border-emerald-500/40'
                          : 'bg-rose-950/10 border-rose-500/30'
                      }`}
                    >
                      <div
                        onClick={() => setExpandedAssertionId(isExpanded ? null : ast.id)}
                        className="p-3.5 flex items-center justify-between gap-3 cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {ast.statusMatch && ast.slaPassed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}

                          <span className={`px-2 py-0.5 rounded font-mono font-bold uppercase text-[10px] border ${getMethodColor(ast.method)}`}>
                            {ast.method}
                          </span>

                          <div className="min-w-0 truncate">
                            <span className="font-semibold text-white truncate block">{ast.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono truncate block">{ast.endpoint}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                          <span className={`font-bold ${ast.statusMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {ast.actualStatus ? `${ast.actualStatus} HTTP` : 'ERR'}
                          </span>
                          <span className={`flex items-center gap-1 ${ast.slaPassed ? 'text-slate-300' : 'text-rose-400'}`}>
                            <Clock className="w-3 h-3 text-slate-500" />
                            {ast.latencyMs}ms
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Expandable JSON details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-3.5 pb-3.5 pt-1 text-[11px] font-mono border-t border-white/[0.06] space-y-2 bg-black/40"
                          >
                            {ast.errorMessage && (
                              <div className="p-2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300">
                                <strong>Falha:</strong> {ast.errorMessage}
                              </div>
                            )}

                            <div>
                              <span className="text-slate-500 block mb-1">Payload de Resposta (Preview):</span>
                              <pre className="p-2.5 rounded-lg bg-black/80 border border-white/[0.08] text-slate-300 overflow-x-auto text-[10px]">
                                {ast.responseBody ? JSON.stringify(JSON.parse(ast.responseBody), null, 2) : 'Corpo vazio ou indisponível.'}
                              </pre>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
