import React, { useRef, useEffect } from 'react';
import { 
  Terminal, Search, Sun, Moon, Play, Layers, 
  ChevronDown, Globe, Zap, Sliders, Database, Command
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { TestSuite } from '../types';
import { motion } from 'framer-motion';

interface PostmanTopNavProps {
  activeView: 'workstation' | 'chaos' | 'history';
  setActiveView: (view: 'workstation' | 'chaos' | 'history') => void;
  selectedSuite: TestSuite | null;
  onRunSuite: () => void;
  isExecuting: boolean;
  onRunDemo: () => void;
  environment: string;
  setEnvironment: (env: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const PostmanTopNav: React.FC<PostmanTopNavProps> = ({
  activeView,
  setActiveView,
  selectedSuite,
  onRunSuite,
  isExecuting,
  onRunDemo,
  environment,
  setEnvironment,
  searchQuery,
  setSearchQuery
}) => {
  const { theme, toggleTheme } = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Shortcut Ctrl+K / Cmd+K para focar imediatamente na busca global
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="h-12 bg-pm-light-sidebar dark:bg-pm-dark-sidebar border-b border-pm-light-border dark:border-pm-dark-border flex items-center justify-between px-3 text-xs z-30 shrink-0 transition-colors duration-200 select-none">
      
      {/* ── Left: Brand & Workspace Selector ── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r border-pm-light-border dark:border-pm-dark-border">
          <div className="w-6 h-6 rounded bg-pm-orange flex items-center justify-center text-white font-black text-xs shadow-sm">
            S
          </div>
          <span className="font-bold text-sm tracking-tight text-pm-light-text dark:text-pm-dark-text">
            SPECTR <span className="font-mono text-[11px] font-normal text-pm-orange">TestOps</span>
          </span>
        </div>

        {/* Workspace Dropdown */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border hover:border-pm-orange/50 transition-colors cursor-pointer text-pm-light-text dark:text-pm-dark-text">
          <Layers className="w-3.5 h-3.5 text-pm-orange" />
          <span className="font-medium text-[11px]">Enterprise QA Workspace</span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </div>

        {/* Top Views Segmented Control */}
        <div className="hidden md:flex items-center bg-pm-light-bg dark:bg-pm-dark-bg p-0.5 rounded border border-pm-light-border dark:border-pm-dark-border relative">
          <button
            onClick={() => setActiveView('workstation')}
            className={`px-3 py-1 rounded text-[11px] font-medium transition-all relative cursor-pointer ${
              activeView === 'workstation'
                ? 'text-white'
                : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
            }`}
          >
            {activeView === 'workstation' && (
              <motion.div
                layoutId="topNavPill"
                className="absolute inset-0 bg-pm-orange rounded shadow-sm"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Terminal className="w-3 h-3" />
              Collections & Requests
            </span>
          </button>

          <button
            onClick={() => setActiveView('chaos')}
            className={`px-3 py-1 rounded text-[11px] font-medium transition-all relative cursor-pointer ${
              activeView === 'chaos'
                ? 'text-white'
                : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
            }`}
          >
            {activeView === 'chaos' && (
              <motion.div
                layoutId="topNavPill"
                className="absolute inset-0 bg-pm-orange rounded shadow-sm"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Sliders className="w-3 h-3" />
              Chaos Lab
            </span>
          </button>

          <button
            onClick={() => setActiveView('history')}
            className={`px-3 py-1 rounded text-[11px] font-medium transition-all relative cursor-pointer ${
              activeView === 'history'
                ? 'text-white'
                : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
            }`}
          >
            {activeView === 'history' && (
              <motion.div
                layoutId="topNavPill"
                className="absolute inset-0 bg-pm-orange rounded shadow-sm"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Database className="w-3 h-3" />
              Audit Ledger
            </span>
          </button>
        </div>
      </div>

      {/* ── Center: Search Bar com Atalho Ctrl+K ── */}
      <div className="hidden lg:flex items-center w-80 max-w-sm relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 text-pm-light-textMuted dark:text-pm-dark-textMuted" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar endpoints, coleções ou métodos..."
          className="w-full pl-8 pr-14 py-1.5 bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border rounded text-[11px] text-pm-light-text dark:text-pm-dark-text placeholder-pm-light-textMuted dark:placeholder-pm-dark-textMuted focus:outline-none focus:border-pm-orange transition-colors"
        />
        <div className="absolute right-2 flex items-center gap-0.5 pointer-events-none">
          <kbd className="px-1.5 py-0.5 rounded bg-pm-light-bg dark:bg-pm-dark-bg border border-pm-light-border dark:border-pm-dark-border text-[9px] font-mono text-pm-light-textMuted dark:text-pm-dark-textMuted font-semibold">
            Ctrl+K
          </kbd>
        </div>
      </div>

      {/* ── Right: Environment, Theme Switcher, Demo, Run Collection ── */}
      <div className="flex items-center gap-2">
        
        {/* Environment Selector */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-[11px] text-pm-light-text dark:text-pm-dark-text">
          <Globe className="w-3 h-3 text-emerald-500" />
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            className="bg-transparent focus:outline-none cursor-pointer font-medium"
          >
            <option value="production" className="dark:bg-pm-dark-sidebar">Production (Render Cloud)</option>
            <option value="local" className="dark:bg-pm-dark-sidebar">Localhost (Dev 3334/3335)</option>
            <option value="staging" className="dark:bg-pm-dark-sidebar">Staging Cluster</option>
          </select>
        </div>

        {/* 1. Theme Switcher Nativo (Light/Dark Postman) ao lado do Environment Selector */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Alternar para Tema Claro (Postman White)' : 'Alternar para Tema Escuro (Postman Dark)'}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-pm-light-panel dark:bg-pm-dark-panel hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover border border-pm-light-border dark:border-pm-dark-border text-pm-light-text dark:text-pm-dark-text transition-colors cursor-pointer"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-medium hidden xl:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-slate-700" />
              <span className="text-[11px] font-medium hidden xl:inline">Dark</span>
            </>
          )}
        </button>

        {/* 1-Click Demo Trigger */}
        <button
          onClick={onRunDemo}
          title="Executar Bateria Completa PayStream"
          className="px-2.5 py-1 rounded bg-pm-orange/10 hover:bg-pm-orange/20 border border-pm-orange/30 text-pm-orange font-medium text-[11px] flex items-center gap-1 transition-all cursor-pointer"
        >
          <Zap className="w-3 h-3" />
          <span className="hidden sm:inline">PayStream Demo</span>
        </button>

        {/* Primary Run Collection Action */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRunSuite}
          disabled={!selectedSuite || isExecuting}
          className="px-3.5 py-1.5 bg-pm-orange hover:bg-pm-orangeHover disabled:opacity-50 text-white font-semibold rounded text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer font-sans"
        >
          <Play className={`w-3 h-3 ${isExecuting ? 'animate-spin' : 'fill-white'}`} />
          <span>{isExecuting ? 'Running...' : 'Run Collection'}</span>
          <kbd className="hidden md:inline-block px-1 py-0.2 bg-black/20 rounded text-[10px] text-orange-100">
            ⌘R
          </kbd>
        </motion.button>

      </div>

    </header>
  );
};
