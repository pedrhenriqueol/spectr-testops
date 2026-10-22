import React, { useRef, useState, useEffect } from 'react';
import { 
  Terminal, Search, Sun, Moon, Play, Layers, 
  ChevronDown, Globe, Zap, Sliders, Database, Check
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useLanguage, Language } from '../context/LanguageContext';
import { TestSuite } from '../types';
import { baseURL } from '../api/client';
import { SpectrLogo } from './SpectrLogo';
import { motion, AnimatePresence } from 'framer-motion';

export const ENVIRONMENTS_MAP: Record<string, { name: string; url: string; badge: string }> = {
  production: {
    name: 'URL da coleção',
    url: 'https://paystream-gateway.onrender.com/api/v1',
    badge: 'Coleção'
  },
  staging: {
    name: 'Staging Cluster',
    url: 'https://staging-api.spectr-ops.internal/api/v1',
    badge: 'Staging'
  },
  local: {
    name: 'Spectr API',
    url: baseURL,
    badge: 'Local'
  }
};

export function resolveBaseUrl(suite: TestSuite | null, environment: string): string {
  return environment === 'production' ? suite?.baseUrl || '' : (ENVIRONMENTS_MAP[environment] || ENVIRONMENTS_MAP.local).url;
}

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
  const { language, setLanguage, t } = useLanguage();
  
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Atalho global Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = searchInputRef.current?.offsetParent ? searchInputRef.current : document.querySelector<HTMLInputElement>('#collection-search');
        input?.focus();
        input?.select();
      }
      if (e.key === 'Escape') {
        if (langDropdownRef.current?.contains(document.activeElement)) langDropdownRef.current.querySelector('button')?.focus();
        setIsLangOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fechamento ao clicar fora do menu flutuante de idioma
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
    };

    if (isLangOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLangOpen]);

  const handleEnvironmentChange = (newEnv: string) => {
    setEnvironment(newEnv);
    const envInfo = ENVIRONMENTS_MAP[newEnv] || ENVIRONMENTS_MAP.production;
    showToast({
      type: 'info',
      title: `${t.toastEnvChanged}: ${envInfo.name}`,
      message: `{{BASE_URL}} → ${resolveBaseUrl(selectedSuite, newEnv) || 'Selecione uma coleção'}`
    });
  };

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
    setIsLangOpen(false);
    langDropdownRef.current?.querySelector('button')?.focus();
    showToast({
      type: 'info',
      title: lang === 'pt' ? 'Idioma: Português (Brasil)' : 'Language: English (US)',
      message: lang === 'pt' ? 'Interface adaptada para padrões técnicos PT-BR.' : 'Interface updated to US technical standards.'
    });
  };

  return (
    <header className="min-h-12 flex-col xl:flex-row gap-2 py-2 bg-pm-light-sidebar dark:bg-pm-dark-sidebar border-b border-pm-light-border dark:border-pm-dark-border flex items-stretch xl:items-center justify-between px-3 text-xs z-30 shrink-0 transition-colors duration-200 select-none">
      
      {/* ── Left: Brand & Workspace Selector & Segmented View Tabs (Zero CLS) ── */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <div className="flex items-center pr-3 border-r border-pm-light-border dark:border-pm-dark-border">
          <SpectrLogo />
        </div>

        {/* Workspace Dropdown */}
        <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border hover:border-pm-orange/50 transition-colors text-pm-light-text dark:text-pm-dark-text whitespace-nowrap">
          <Layers className="w-3.5 h-3.5 text-pm-orange shrink-0" />
          <span className="font-medium text-[11px]">{t.workspaceTitle}</span>
        </div>

        <select
          aria-label="Navegação principal"
          value={activeView}
          onChange={(event) => setActiveView(event.target.value as PostmanTopNavProps['activeView'])}
          className="xl:hidden min-w-0 flex-1 rounded border border-pm-light-border dark:border-pm-dark-border bg-pm-light-panel dark:bg-pm-dark-panel px-2 py-1.5 text-xs"
        >
          <option value="workstation">{t.collectionsTab}</option>
          <option value="chaos">{t.chaosTab}</option>
          <option value="history">{t.auditTab}</option>
        </select>

        {/* Top Views Segmented Control com min-width estabilizado contra CLS */}
        <div aria-label="Navegação principal" className="hidden xl:flex items-center bg-pm-light-bg dark:bg-pm-dark-bg p-0.5 rounded border border-pm-light-border dark:border-pm-dark-border relative">
          <button
            onClick={() => setActiveView('workstation')}
            aria-current={activeView === 'workstation' ? 'page' : undefined}
            className={`min-w-[140px] h-7 px-3 py-1 rounded text-[11px] font-medium transition-all relative cursor-pointer flex items-center justify-center ${
              activeView === 'workstation'
                ? 'text-white font-semibold'
                : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
            }`}
          >
            {activeView === 'workstation' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-pm-orange rounded shadow-sm"
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap">
              <Terminal className="w-3 h-3 shrink-0" />
              {t.collectionsTab}
            </span>
          </button>

          <button
            onClick={() => setActiveView('chaos')}
            aria-current={activeView === 'chaos' ? 'page' : undefined}
            className={`min-w-[125px] h-7 px-3 py-1 rounded text-[11px] font-medium transition-all relative cursor-pointer flex items-center justify-center ${
              activeView === 'chaos'
                ? 'text-white font-semibold'
                : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
            }`}
          >
            {activeView === 'chaos' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-pm-orange rounded shadow-sm"
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap">
              <Sliders className="w-3 h-3 shrink-0" />
              {t.chaosTab}
            </span>
          </button>

          <button
            onClick={() => setActiveView('history')}
            aria-current={activeView === 'history' ? 'page' : undefined}
            className={`min-w-[125px] h-7 px-3 py-1 rounded text-[11px] font-medium transition-all relative cursor-pointer flex items-center justify-center ${
              activeView === 'history'
                ? 'text-white font-semibold'
                : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
            }`}
          >
            {activeView === 'history' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-pm-orange rounded shadow-sm"
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap">
              <Database className="w-3 h-3 shrink-0" />
              {t.auditTab}
            </span>
          </button>
        </div>
      </div>

      {/* ── Center: Search Bar com Dimensionamento Estável (Zero CLS) ── */}
      <div className="flex-1 min-w-0 max-w-xl mx-4 relative hidden 2xl:flex items-center">
        <Search className="w-3.5 h-3.5 absolute left-2.5 text-pm-light-textMuted dark:text-pm-dark-textMuted shrink-0 pointer-events-none" />
        <input
          aria-label={t.searchPlaceholder}
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

      {/* ── Right: Language Dropdown, Environment, Theme Switcher, Demo, Run Collection ── */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        
        {/* 1. Dropdown Corporativo de Idiomas (PT-BR / EN-US) */}
        <div className="relative" ref={langDropdownRef}>
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-pm-light-panel dark:bg-pm-dark-panel hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover border border-pm-light-border dark:border-pm-dark-border text-pm-light-text dark:text-pm-dark-text transition-colors cursor-pointer text-[11px] font-medium whitespace-nowrap"
            title="Selecionar idioma da interface"
            aria-expanded={isLangOpen}
            aria-controls="language-options"
          >
            <Globe className="w-3.5 h-3.5 text-pm-orange shrink-0" />
            <span className="hidden sm:inline font-semibold font-mono text-[10px]">{t.langLabel}</span>
            <ChevronDown className={`w-3 h-3 text-pm-light-textMuted dark:text-pm-dark-textMuted transition-transform duration-150 ${isLangOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isLangOpen && (
              <motion.div
                id="language-options"
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                className="absolute left-0 sm:left-auto sm:right-0 mt-1 w-44 rounded-lg bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border shadow-xl py-1 z-50 overflow-hidden font-sans"
              >
                <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-pm-light-textMuted dark:text-pm-dark-textMuted border-b border-pm-light-border dark:border-pm-dark-border">
                  Interface Language
                </div>

                <button
                  onClick={() => handleSelectLanguage('pt')}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    language === 'pt'
                      ? 'bg-pm-orange/10 text-pm-orange font-bold'
                      : 'text-pm-light-text dark:text-pm-dark-text hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">🇧🇷</span>
                    <span>{t.langPt}</span>
                  </span>
                  {language === 'pt' && <Check className="w-3.5 h-3.5 text-pm-orange shrink-0" />}
                </button>

                <button
                  onClick={() => handleSelectLanguage('en')}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    language === 'en'
                      ? 'bg-pm-orange/10 text-pm-orange font-bold'
                      : 'text-pm-light-text dark:text-pm-dark-text hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">🇺🇸</span>
                    <span>{t.langEn}</span>
                  </span>
                  {language === 'en' && <Check className="w-3.5 h-3.5 text-pm-orange shrink-0" />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. Environment Switcher com Toast Dinâmico */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-[11px] text-pm-light-text dark:text-pm-dark-text whitespace-nowrap">
          <Globe className="w-3 h-3 text-pm-light-textMuted dark:text-pm-dark-textMuted shrink-0" />
          <select
            aria-label={t.activeEnvLabel}
            disabled={isExecuting}
            value={environment}
            onChange={(e) => handleEnvironmentChange(e.target.value)}
            className="max-w-[110px] sm:max-w-none bg-transparent focus:outline-none cursor-pointer font-medium text-[11px]"
          >
            <option value="production" className="dark:bg-pm-dark-sidebar">{t.envProduction}</option>
            <option value="staging" className="dark:bg-pm-dark-sidebar">{t.envStaging}</option>
            <option value="local" className="dark:bg-pm-dark-sidebar">{t.envLocal}</option>
          </select>
        </div>

        {/* 3. Theme Switcher Nativo */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? t.themeLight : t.themeDark}
          title={theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-pm-light-panel dark:bg-pm-dark-panel hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover border border-pm-light-border dark:border-pm-dark-border text-pm-light-text dark:text-pm-dark-text transition-colors cursor-pointer shrink-0"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] font-medium hidden xl:inline">{t.themeLight}</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <span className="text-[11px] font-medium hidden xl:inline">{t.themeDark}</span>
            </>
          )}
        </motion.button>

        {/* 4. 1-Click Demo Trigger (Estável min-w) */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRunDemo}
          disabled={isExecuting || !selectedSuite}
          title="Executar Bateria Completa PayStream"
          className="hidden md:flex disabled:opacity-50 min-w-[125px] h-7 px-2.5 py-1 rounded bg-pm-orange/10 hover:bg-pm-orange/20 border border-pm-orange/30 text-pm-orange font-medium text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
        >
          <Zap className="w-3 h-3 shrink-0" />
          <span>{t.paystreamDemo}</span>
        </motion.button>

        {/* 5. Primary Run Collection Action (Estável min-w) */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRunSuite}
          disabled={!selectedSuite || isExecuting}
          className="min-w-0 sm:min-w-[125px] h-7 px-2 sm:px-3 py-1 bg-pm-orange hover:bg-pm-orangeHover disabled:opacity-50 text-white font-semibold rounded text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer font-sans whitespace-nowrap"
        >
          <Play className={`w-3 h-3 shrink-0 ${isExecuting ? 'animate-spin' : 'fill-white'}`} />
          <span className="hidden sm:inline">{isExecuting ? t.running : t.runCollection}</span>
          <span className="sm:hidden">{isExecuting ? t.running : 'Run'}</span>

        </motion.button>

      </div>

    </header>
  );
};
