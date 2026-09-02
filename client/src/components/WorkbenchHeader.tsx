import React from 'react';
import { Play, Layers, ShieldCheck, ChevronRight, Zap, RefreshCw } from 'lucide-react';
import { TestSuite, TestRun } from '../types';

interface WorkbenchHeaderProps {
  selectedSuite: TestSuite | null;
  latestRun: TestRun | null;
  isExecuting: boolean;
  onRunSuite: () => void;
  onOpenCreateModal: () => void;
}

export const WorkbenchHeader: React.FC<WorkbenchHeaderProps> = ({
  selectedSuite,
  latestRun,
  isExecuting,
  onRunSuite,
  onOpenCreateModal
}) => {
  return (
    <header className="h-12 bg-spectr-surface border-b border-spectr-border px-4 flex items-center justify-between select-none shrink-0 text-xs">
      
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2 font-mono text-slate-400 min-w-0">
        <span className="text-slate-500 uppercase tracking-wider text-[11px]">WORKSPACE</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-slate-300 font-medium">Enterprise QA</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-white font-semibold truncate max-w-xs">
          {selectedSuite?.name || 'Selecione uma Suíte'}
        </span>
        
        {selectedSuite && (
          <span className="hidden md:inline-flex px-2 py-0.5 rounded text-[10px] bg-spectr-border text-slate-300 border border-spectr-borderLight">
            {selectedSuite.baseUrl}
          </span>
        )}
      </div>

      {/* Right: Telemetry Chips & Action Button */}
      <div className="flex items-center gap-3 shrink-0">
        
        {/* Quick SLA Metrics Chips */}
        {latestRun && (
          <div className="hidden lg:flex items-center gap-2 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-spectr-panel border border-spectr-border text-slate-300">
              p95: <strong className="text-purple-400">{latestRun.p95LatencyMs}ms</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-spectr-panel border border-spectr-border text-slate-300">
              Taxa: <strong className={latestRun.successRate === 100 ? 'text-spectr-terminal' : 'text-spectr-rose'}>{latestRun.successRate}%</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-spectr-panel border border-spectr-border text-slate-400">
              Total: {latestRun.totalDurationMs}ms
            </span>
          </div>
        )}

        {/* Primary Run Button */}
        <button
          onClick={onRunSuite}
          disabled={!selectedSuite || isExecuting}
          className="px-3.5 py-1.5 bg-spectr-violet hover:bg-spectr-violetHover disabled:opacity-40 text-white font-semibold rounded-md shadow-sm transition-all flex items-center gap-2 cursor-pointer border border-purple-400/30"
        >
          {isExecuting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>{isExecuting ? 'Executando...' : 'Executar Bateria'}</span>
          <kbd className="hidden sm:inline-block text-[9px] bg-black/30 px-1.5 py-0.2 rounded text-purple-200 border border-white/10 font-mono">
            ⌘R
          </kbd>
        </button>

      </div>

    </header>
  );
};
