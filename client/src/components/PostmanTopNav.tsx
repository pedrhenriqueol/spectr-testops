import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe, Layers, Moon, Search, Sun, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useLanguage, Language } from '../context/LanguageContext';
import { TestSuite } from '../types';
import { baseURL } from '../api/client';
import { SpectrLogo } from './SpectrLogo';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

export const ENVIRONMENTS_MAP: Record<string, { name: string; url: string; badge: string }> = {
  production: { name: 'URL da coleção', url: 'https://paystream-gateway.onrender.com/api/v1', badge: 'Coleção' },
  staging: { name: 'Staging Cluster', url: 'https://staging-api.spectr-ops.internal/api/v1', badge: 'Staging' },
  local: { name: 'Spectr API', url: baseURL, badge: 'Local' }
};

export function resolveBaseUrl(suite: TestSuite | null, environment: string): string {
  return environment === 'production' ? suite?.baseUrl || '' : (ENVIRONMENTS_MAP[environment] || ENVIRONMENTS_MAP.local).url;
}

interface PostmanTopNavProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const PostmanTopNav: React.FC<PostmanTopNavProps> = ({ searchQuery, setSearchQuery }) => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const languageButtonRef = useRef<HTMLButtonElement>(null);
  const mobileSearchButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const searchLabel = language === 'pt' ? 'Buscar nas coleções' : 'Search collections';

  useEffect(() => {
    if (isMobileSearchOpen) mobileSearchRef.current?.focus();
  }, [isMobileSearchOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (searchInputRef.current?.offsetParent) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        } else {
          setIsMobileSearchOpen(true);
          mobileSearchRef.current?.focus();
          mobileSearchRef.current?.select();
        }
      }
      if (event.key === 'Escape') {
        if (langDropdownRef.current?.contains(document.activeElement)) languageButtonRef.current?.focus();
        if (mobileSearchRef.current === document.activeElement) mobileSearchButtonRef.current?.focus();
        setIsLangOpen(false);
        setIsMobileSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isLangOpen) return;
    const closeOutside = (event: MouseEvent) => {
      if (!langDropdownRef.current?.contains(event.target as Node)) setIsLangOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, [isLangOpen]);

  const handleSelectLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setIsLangOpen(false);
    languageButtonRef.current?.focus();
  };

  return (
    <header className="relative z-40 flex h-11 shrink-0 items-center gap-3 border-b border-pm-light-border bg-pm-light-sidebar px-3 text-xs text-pm-light-text dark:border-pm-dark-border dark:bg-pm-dark-sidebar dark:text-pm-dark-text sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <SpectrLogo showVersion={false} className="shrink-0 [&>div:first-child]:h-6 [&>div:first-child]:w-6 [&_svg]:h-6 [&_svg]:w-6" />
        <span className="hidden h-4 border-l border-pm-light-border dark:border-pm-dark-border lg:block" />
        <WorkspaceSwitcher />
      </div>

      <div className="relative hidden w-full max-w-[340px] shrink items-center sm:flex">
        <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-pm-light-textMuted dark:text-pm-dark-textMuted" />
        <input
          ref={searchInputRef}
          aria-label={searchLabel}
          type="search"
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
          placeholder={searchLabel}
          className="h-7 w-full rounded border border-pm-light-border bg-pm-light-panel pl-8 pr-16 text-xs outline-none transition-colors placeholder:text-pm-light-textMuted focus:border-pm-orange dark:border-pm-dark-border dark:bg-pm-dark-panel dark:placeholder:text-pm-dark-textMuted"
        />
        <kbd className="pointer-events-none absolute right-2 rounded border border-pm-light-border px-1 text-[10px] text-pm-light-textMuted dark:border-pm-dark-border dark:text-pm-dark-textMuted">Ctrl K</kbd>
      </div>

      <div className="flex flex-1 shrink-0 items-center justify-end gap-1 sm:gap-2">
        <button
          ref={mobileSearchButtonRef}
          type="button"
          aria-label={searchLabel}
          aria-expanded={isMobileSearchOpen}
          aria-controls="mobile-collection-search"
          onClick={() => setIsMobileSearchOpen(open => !open)}
          className="flex h-8 w-8 items-center justify-center rounded text-pm-light-textMuted transition-colors hover:bg-pm-light-panelHover dark:text-pm-dark-textMuted dark:hover:bg-pm-dark-panelHover sm:hidden"
        >
          <Search className="h-4 w-4" />
        </button>
        <div ref={langDropdownRef} className="relative">
          <button
            ref={languageButtonRef}
            type="button"
            onClick={() => setIsLangOpen(open => !open)}
            title="Selecionar idioma da interface"
            aria-label={language === 'pt' ? 'Selecionar idioma da interface' : 'Select interface language'}
            aria-expanded={isLangOpen}
            aria-controls="language-options"
            className="flex h-8 items-center gap-1.5 rounded px-2 text-pm-light-textMuted transition-colors hover:bg-pm-light-panelHover hover:text-pm-light-text dark:text-pm-dark-textMuted dark:hover:bg-pm-dark-panelHover dark:hover:text-pm-dark-text"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden text-[11px] sm:inline">{t.langLabel}</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {isLangOpen && (
              <motion.div
                id="language-options"
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 mt-2 w-44 rounded-md border border-pm-light-border bg-pm-light-surface p-1 shadow-lg dark:border-pm-dark-border dark:bg-pm-dark-surface"
              >
                {(['pt', 'en'] as Language[]).map(option => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={language === option}
                    onClick={() => handleSelectLanguage(option)}
                    className="flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-xs transition-colors hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover"
                  >
                    <span>{option === 'pt' ? t.langPt : t.langEn}</span>
                    {language === option && <Check className="h-3.5 w-3.5 text-pm-orange" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? t.themeLight : t.themeDark}
          title={theme === 'dark' ? t.themeLight : t.themeDark}
          className="flex h-8 w-8 items-center justify-center rounded text-pm-light-textMuted transition-colors hover:bg-pm-light-panelHover hover:text-pm-light-text dark:text-pm-dark-textMuted dark:hover:bg-pm-dark-panelHover dark:hover:text-pm-dark-text"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      {isMobileSearchOpen && (
        <div className="absolute left-0 right-0 top-full flex items-center gap-2 border-b border-pm-light-border bg-pm-light-surface p-3 shadow-md dark:border-pm-dark-border dark:bg-pm-dark-surface sm:hidden">
          <Search className="h-4 w-4 shrink-0 text-pm-light-textMuted dark:text-pm-dark-textMuted" />
          <input
            id="mobile-collection-search"
            ref={mobileSearchRef}
            type="search"
            aria-label={searchLabel}
            placeholder={searchLabel}
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="h-8 min-w-0 flex-1 rounded border border-pm-light-border bg-pm-light-panel px-2.5 text-xs focus:border-pm-orange focus:outline-none dark:border-pm-dark-border dark:bg-pm-dark-panel"
          />
          <button type="button" aria-label={language === 'pt' ? 'Fechar busca' : 'Close search'} onClick={() => { setIsMobileSearchOpen(false); mobileSearchButtonRef.current?.focus(); }} className="rounded p-1.5 text-pm-light-textMuted dark:text-pm-dark-textMuted"><X className="h-4 w-4" /></button>
        </div>
      )}
    </header>
  );
};
