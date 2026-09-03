import React, { useRef, useEffect } from 'react';
import { 
  Terminal, Search, Sun, Moon, Play, Layers, 
  ChevronDown, Globe, Zap, Sliders, Database, Languages
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { TestSuite } from '../types';
import { motion } from 'framer-motion';

export const ENVIRONMENTS_MAP: Record<string, { name: string; url: string; badge: string }> = {
  production: {
    name: 'Production (Render Cloud)',
    url: 'https://paystream-gateway.onrender.com/api/v1',
    badge: 'Render'
  },
  staging: {
    name: 'Staging Cluster',
    url: 'https://staging-api.spectr-ops.internal/api/v1',
    badge: 'Staging'
  },
  local: {
    name: 'Localhost (Port 3334)',
    url: 'http://localhost:3334/api/v1',
    badge: 'Local'
  }
};

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
  const { showToast } = useToast();
  const { language, toggleLanguage, t } = useLanguage();
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

  const handleEnvironmentChange = (newEnv: string) => {
    setEnvironment(newEnv);
    const envInfo = ENVIRONMENTS_MAP[newEnv] || ENVIRONMENTS_MAP.production;
    showToast({
      type: 'info',
      title: `${t.toastEnvChanged}: ${envInfo.name}`,
      message: `{{BASE_URL}} -> ${envInfo.url}`
    });
  };

  return (
    <header className="h-12 bg-pm-light-sidebar dark:bg-pm-dark-sidebar border-b border-pm-light-border dark:border-pm-dark-border flex items-center justify-between px-3 text-xs z-30 shrink-0 transition-colors duration-200 select-none">
      
      {/* ── Left: Brand & Workspace Selector ── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r border-pm-light-border dark:border-pm-dark-border">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.05 }}
            className="w-6 h-6 rounded bg-pm-orange flex items-center justify-center text-white font-black text-xs shadow-sm cursor-pointer"
          >
            S
          </motion.div>
          <span className="font-bold text-sm tracking-tight text-pm-light-text dark:text-pm-dark-text">
            SPECTR <span className="font-mono text-[11px] font-normal text-pm-orange">TestOps</span>
          </span>
        </div>

        {/* Workspace Dropdown */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border hover:border-pm-orange/50 transition-colors cursor-pointer text-pm-light-text dark:text-pm-dark-text">
          <Layers className="w-3.5 h-3.5 text-pm-orange" />
          <span className="font-medium text-[11px]">{t.workspaceTitle}</span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </div>

        {/* Top Views Segmented Control com Indicador Fluido layoutId */}
        <div className="hidden md:flex items-center bg-pm-light-bg dark:bg-pm-dark-bg p-0.5 rounded border border-pm-light-border dark:border-pm-dark-border relative">
          <button
            onClick={() => setActiveView('workstation')}
            className={`px-3 py-1 rounded text-[11px] font-medium transition-all relative cursor-pointer ${
              activeView === 'workstation'
                ? 'text-white font-semibold'
                : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
            }`}
          >
            {activeView === 'workstation' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-pm-orange rounded shadow-sm"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Terminal className="w-3 h-3" />
              {t.collectionsTab}
            </span>
          </button>

          <button
            onClick={() => setActiveView('chaos')}
            className={`px-3 py-1 rounded text-[11px] font-medium transition-all relative cursor-pointer ${
              activeView === 'chaos'
                ? 'text-white font-semibold'
                : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
            }`}
          >
            {activeView === 'chaos' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-pm-orange rounded shadow-sm"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Sliders className="w-3 h-3" />
              {t.chaosTab}
            </span>
          </button>

          <button
            onClick={() => setActiveView('history')}
            className={`px-3 py-1 rounded text-[11px] font-medium transition-all relative cursor-pointer ${
              activeView === 'history'
                ? 'text-white font-semibold'
                : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
            }`}
          >
            {activeView === 'history' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-pm-orange rounded shadow-sm"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Database className="w-3 h-3" />
              {t.auditTab}
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
          placeholder={t.searchPlaceholder}
          className="w-full pl-8 pr-14 py-1.5 bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border rounded text-[11px] text-pm-light-text dark:text-pm-dark-text placeholder-pm-light-textMuted dark:placeholder-pm-dark-textMuted focus:outline-none focus:border-pm-orange transition-colors"
        />
        <div className="absolute right-2 flex items-center gap-0.5 pointer-events-none">
          <kbd className="px-1.5 py-0.5 rounded bg-pm-light-bg dark:bg-pm-dark-bg border border-pm-light-border dark:border-pm-dark-border text-[9px] font-mono text-pm-light-textMuted dark:text-pm-dark-textMuted font-semibold">
            Ctrl+K
          </kbd>
        </div>
      </div>

      {/* ── Right: Language Switcher, Environment, Theme Switcher, Demo, Run Collection ── */}
      <div className="flex items-center gap-2">
        
        {/* Language Switcher (BR / EN) */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleLanguage}
          title={language === 'pt' ? 'Switch to English (EN)' : 'Mudar para Português (BR)'}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-pm-light-panel dark:bg-pm-dark-panel hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover border border-pm-light-border dark:border-pm-dark-border text-pm-light-text dark:text-pm-dark-text transition-colors cursor-pointer font-bold font-mono text-[10px]"
        >
          <Languages className="w-3.5 h-3.5 text-pm-orange" />
          <span>{language === 'pt' ? 'BR' : 'EN'}</span>
        </motion.button>

        {/* 2. Environment Switcher com Toast Dinâmico */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-[11px] text-pm-light-text dark:text-pm-dark-text">
          <Globe className="w-3 h-3 text-emerald-500 animate-pulse" />
          <select
            value={environment}
            onChange={(e) => handleEnvironmentChange(e.target.value)}
            className="bg-transparent focus:outline-none cursor-pointer font-medium"
          >
            <option value="production" className="dark:bg-pm-dark-sidebar">{t.envProduction}</option>
            <option value="staging" className="dark:bg-pm-dark-sidebar">{t.envStaging}</option>
            <option value="local" className="dark:bg-pm-dark-sidebar">{t.envLocal}</option>
          </select>
        </div>

        {/* 1. Theme Switcher Nativo (Light/Dark Postman) */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-pm-light-panel dark:bg-pm-dark-panel hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover border border-pm-light-border dark:border-pm-dark-border text-pm-light-text dark:text-pm-dark-text transition-colors cursor-pointer"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-medium hidden xl:inline">{t.themeLight}</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-slate-700" />
              <span className="text-[11px] font-medium hidden xl:inline">{t.themeDark}</span>
            </>
          )}
        </motion.button>

        {/* 1-Click Demo Trigger */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRunDemo}
          title="Executar Bateria Completa PayStream"
          className="px-2.5 py-1 rounded bg-pm-orange/10 hover:bg-pm-orange/20 border border-pm-orange/30 text-pm-orange font-medium text-[11px] flex items-center gap-1 transition-all cursor-pointer"
        >
          <Zap className="w-3 h-3" />
          <span className="hidden sm:inline">{t.paystreamDemo}</span>
        </motion.button>

        {/* Primary Run Collection Action */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRunSuite}
          disabled={!selectedSuite || isExecuting}
          className="px-3.5 py-1.5 bg-pm-orange hover:bg-pm-orangeHover disabled:opacity-50 text-white font-semibold rounded text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer font-sans"
        >
          <Play className={`w-3 h-3 ${isExecuting ? 'animate-spin' : 'fill-white'}`} />
          <span>{isExecuting ? t.running : t.runCollection}</span>
          <kbd className="hidden md:inline-block px-1 py-0.2 bg-black/20 rounded text-[10px] text-orange-100">
            ⌘R
          </kbd>
        </motion.button>

      </div>

    </header>
  );
};
