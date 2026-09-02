import React from 'react';
import { Activity, Zap, Play, Terminal, Sliders, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'runner' | 'chaos';
  setActiveTab: (tab: 'dashboard' | 'runner' | 'chaos') => void;
  onRunDemo: () => void;
  isExecuting: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onRunDemo,
  isExecuting
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#0D0F18]/90 backdrop-blur-md border-b border-white/[0.08] px-6 h-16 flex items-center justify-between">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm shadow-purple-500/20">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-white tracking-wider text-base">
              SPECTR <span className="text-purple-400 font-mono text-xs px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30">TestOps</span>
            </h1>
          </div>
          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Resilience & API Engine
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06]">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Visão Geral</span>
        </button>

        <button
          onClick={() => setActiveTab('runner')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'runner'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Runner de Suítes</span>
        </button>

        <button
          onClick={() => setActiveTab('chaos')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'chaos'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Chaos Playground</span>
        </button>
      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onRunDemo}
          disabled={isExecuting}
          className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-600/25 flex items-center gap-2 transition-all cursor-pointer border border-purple-400/30"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>{isExecuting ? 'Executando...' : 'Demo 1-Click Run'}</span>
        </button>
      </div>
    </header>
  );
};
