import React from 'react';
import { 
  Terminal, 
  Sliders, 
  Database, 
  Zap, 
  Activity, 
  ShieldCheck, 
  Layers, 
  Server
} from 'lucide-react';

interface SidebarProps {
  activeView: 'workstation' | 'chaos' | 'ledger';
  setActiveView: (view: 'workstation' | 'chaos' | 'ledger') => void;
  onRunDemo: () => void;
  isExecuting: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  onRunDemo,
  isExecuting
}) => {
  return (
    <aside className="w-16 bg-spectr-surface border-r border-spectr-border flex flex-col items-center py-4 justify-between select-none shrink-0 z-20">
      
      {/* Top: Logo Monogram */}
      <div className="flex flex-col items-center gap-6">
        <div className="w-10 h-10 rounded-lg bg-spectr-violet/15 border border-spectr-violet/40 flex items-center justify-center text-spectr-violet shadow-sm shadow-spectr-violet/20 group cursor-default">
          <Activity className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
        </div>

        {/* Navigation Tool Rail */}
        <nav className="flex flex-col items-center gap-2">
          
          {/* Workstation (Collections + Live Runner) */}
          <button
            onClick={() => setActiveView('workstation')}
            title="Workstation de Testes (Coleções & Console CLI)"
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeView === 'workstation'
                ? 'bg-spectr-violet text-white shadow-md shadow-spectr-violet/30'
                : 'text-slate-400 hover:text-white hover:bg-spectr-panel'
            }`}
          >
            <Terminal className="w-4 h-4" />
          </button>

          {/* Chaos Lab (Parameter Injection Mesa) */}
          <button
            onClick={() => setActiveView('chaos')}
            title="Chaos & Resilience Lab (Mesa de Injeção de Falhas)"
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeView === 'chaos'
                ? 'bg-spectr-violet text-white shadow-md shadow-spectr-violet/30'
                : 'text-slate-400 hover:text-white hover:bg-spectr-panel'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Audit Ledger (History & Telemetry Table) */}
          <button
            onClick={() => setActiveView('ledger')}
            title="Ledger Técnico de Execuções & Auditoria SLA"
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeView === 'ledger'
                ? 'bg-spectr-violet text-white shadow-md shadow-spectr-violet/30'
                : 'text-slate-400 hover:text-white hover:bg-spectr-panel'
            }`}
          >
            <Database className="w-4 h-4" />
          </button>

        </nav>
      </div>

      {/* Bottom Actions & Status */}
      <div className="flex flex-col items-center gap-3">
        {/* Quick Demo Trigger */}
        <button
          onClick={onRunDemo}
          disabled={isExecuting}
          title="Executar Demonstração Rápida (1-Click)"
          className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-50 border border-purple-400/40"
        >
          <Zap className="w-4 h-4 fill-current" />
        </button>

        {/* Server Pulse */}
        <div className="flex flex-col items-center gap-1" title="TestOps Engine Online (Port 3335)">
          <div className="w-2 h-2 rounded-full bg-spectr-terminal animate-pulse" />
          <span className="text-[9px] font-mono text-slate-500">3335</span>
        </div>
      </div>

    </aside>
  );
};
