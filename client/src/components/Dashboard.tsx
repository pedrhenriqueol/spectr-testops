import React from 'react';
import { OverviewMetrics, TestRun } from '../types';
import { Layers, Activity, CheckCircle2, Clock, ShieldAlert, ArrowUpRight, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardProps {
  metrics: OverviewMetrics | null;
  runs: TestRun[];
  loading: boolean;
  onSelectRun: (runId: string) => void;
  onNavigateToRunner: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  metrics,
  runs,
  loading,
  onSelectRun,
  onNavigateToRunner
}) => {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Telemetria & Qualidade de APIs</h2>
        <p className="text-sm text-slate-400 mt-1">
          Monitoramento contínuo de suítes de teste, conformidade de latência p95 e validação automatizada de contratos.
        </p>
      </div>

      {/* 4 Datadog-styled KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Suítes Configuradas */}
        <div className="p-5 rounded-2xl bg-[#121420] border border-white/[0.08] shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Suítes Ativas</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono tracking-tight">
              {metrics?.totalSuites ?? 1}
            </span>
            <span className="text-xs text-slate-400 font-mono">cadastradas</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            {metrics?.totalCases ?? 5} casos de teste monitorados
          </p>
        </div>

        {/* Total de Execuções */}
        <div className="p-5 rounded-2xl bg-[#121420] border border-white/[0.08] shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Testes Executados</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono tracking-tight">
              {metrics?.totalRuns ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-mono">baterias</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Pipeline com automação contínua
          </p>
        </div>

        {/* Taxa Global de Sucesso */}
        <div className="p-5 rounded-2xl bg-[#121420] border border-white/[0.08] shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Taxa de Sucesso</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-400 font-mono tracking-tight">
              {metrics?.avgSuccessRate || '100%'}
            </span>
            <span className="text-xs text-emerald-500 font-mono">SLA Aprovado</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: metrics?.avgSuccessRate ? metrics.avgSuccessRate.replace('%', '') + '%' : '100%' }}
            />
          </div>
        </div>

        {/* Latência p95 Média */}
        <div className="p-5 rounded-2xl bg-[#121420] border border-white/[0.08] shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Latência p95</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono tracking-tight">
              {metrics?.avgP95LatencyMs || '142ms'}
            </span>
            <span className="text-xs text-purple-400 font-mono">p95 médio</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Limiar nominal seguro &lt; 250ms
          </p>
        </div>

      </div>

      {/* Recent Test Runs Feed */}
      <div className="p-6 rounded-2xl bg-[#121420] border border-white/[0.08] shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-white">Histórico Recente de Execuções</h3>
            <p className="text-xs text-slate-400 mt-0.5">Últimas baterias de testes disparadas pelo runner</p>
          </div>
          <button
            onClick={onNavigateToRunner}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Abrir Runner de Suítes</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {runs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono border border-dashed border-white/[0.08] rounded-xl">
              Nenhuma execução registrada ainda. Clique no botão "Demo 1-Click Run" no topo para disparar a primeira bateria!
            </div>
          ) : (
            runs.map((run) => (
              <div
                key={run.id}
                onClick={() => onSelectRun(run.id)}
                className="p-3.5 rounded-xl bg-[#090A0F]/80 border border-white/[0.06] hover:border-purple-500/40 transition-all flex items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    run.status === 'PASSED'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  }`}>
                    {run.status}
                  </span>
                  <div className="min-w-0 truncate">
                    <p className="text-xs font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                      {run.suite?.name || 'Suíte de Testes'}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono block truncate">
                      {run.passedTests}/{run.totalTests} aprovados • {run.suite?.baseUrl}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-400 shrink-0">
                  <div className="text-right">
                    <span className="block text-white font-bold">{run.successRate}% taxa</span>
                    <span className="text-[10px] text-slate-400">{run.totalDurationMs}ms total</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-purple-400 font-bold">{run.p95LatencyMs}ms p95</span>
                    <span className="text-[10px] text-slate-400">{new Date(run.createdAt).toLocaleTimeString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
