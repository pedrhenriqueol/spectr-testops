import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, MoreHorizontal, Plus, Play, Search, Trash2, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { HttpMethod, TestCase, TestSuite } from '../types';

interface CollectionsSidebarProps {
  suites: TestSuite[];
  selectedSuite: TestSuite | null;
  currentCaseId?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectSuite: (suite: TestSuite) => void;
  onSelectCase: (suite: TestSuite, testCase: TestCase) => void;
  onCreateSuite: () => void;
  onCreateEndpoint: () => void;
  onRunSuite: (suiteId: string) => void;
  onDeleteCase?: () => void;
  isExecuting: boolean;
  onClose?: () => void;
}

const methodColors: Record<HttpMethod, string> = {
  GET: 'text-[#07883c] dark:text-[#73cf9a]',
  POST: 'text-[#b17b08] dark:text-[#e4bb6c]',
  PUT: 'text-[#176eb0] dark:text-[#76b6e5]',
  DELETE: 'text-[#c13e47] dark:text-[#ec9196]',
  PATCH: 'text-[#8751b7] dark:text-[#bc9be3]'
};

export function CollectionsSidebar({
  suites,
  selectedSuite,
  currentCaseId,
  searchQuery,
  onSearchChange,
  onSelectSuite,
  onSelectCase,
  onCreateSuite,
  onCreateEndpoint,
  onRunSuite,
  onDeleteCase,
  isExecuting,
  onClose
}: CollectionsSidebarProps) {
  const { t, language } = useLanguage();
  const text = (pt: string, en: string) => language === 'pt' ? pt : en;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(selectedSuite ? [selectedSuite.id] : []));
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const actionsButtonRef = useRef<HTMLButtonElement>(null);
  const actionsId = useId();

  useEffect(() => {
    if (!selectedSuite) return;
    setExpandedIds(current => new Set(current).add(selectedSuite.id));
  }, [selectedSuite?.id]);

  useEffect(() => {
    if (!isActionsOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !actionsRef.current?.contains(event.target)) setIsActionsOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsActionsOpen(false);
        actionsButtonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isActionsOpen]);

  const query = searchQuery.trim().toLocaleLowerCase();
  const visibleSuites = useMemo(() => suites.flatMap(suite => {
    const suiteMatches = `${suite.name} ${suite.description || ''}`.toLocaleLowerCase().includes(query);
    const cases = query && !suiteMatches
      ? suite.cases.filter(testCase => `${testCase.name} ${testCase.path} ${testCase.method}`.toLocaleLowerCase().includes(query))
      : suite.cases;
    return !query || suiteMatches || cases.length ? [{ suite, cases }] : [];
  }), [suites, query]);
  const requestCount = visibleSuites.reduce((total, item) => total + item.cases.length, 0);

  const selectSuite = (suite: TestSuite) => {
    onSelectSuite(suite);
    setExpandedIds(current => {
      const next = new Set(current);
      if (selectedSuite?.id === suite.id && next.has(suite.id)) next.delete(suite.id);
      else next.add(suite.id);
      return next;
    });
  };

  const performAction = (action: () => void) => {
    setIsActionsOpen(false);
    actionsButtonRef.current?.focus();
    action();
  };

  const iconButtonClass = 'flex h-7 w-7 items-center justify-center rounded text-pm-light-textMuted dark:text-pm-dark-textMuted transition-colors hover:bg-black/5 dark:hover:bg-white/5 hover:text-pm-light-text dark:hover:text-pm-dark-text disabled:opacity-40';
  const actionClass = 'flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-pm-light-text dark:text-pm-dark-text hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover disabled:opacity-40';

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col bg-pm-light-sidebar dark:bg-pm-dark-sidebar font-sans" aria-label={t.collectionsHeader}>
      <div className="flex h-11 shrink-0 items-center justify-between px-3">
        <h2 className="text-[12px] font-semibold tracking-wide text-pm-light-text dark:text-pm-dark-text">{t.collectionsHeader}</h2>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={onCreateSuite} className={iconButtonClass} title={t.createSuiteTitle} aria-label={t.createSuiteTitle}>
            <Plus className="h-4 w-4" />
          </button>
          <div className="relative" ref={actionsRef}>
            <button
              ref={actionsButtonRef}
              type="button"
              onClick={() => setIsActionsOpen(open => !open)}
              className={iconButtonClass}
              title={text('Ações das coleções', 'Collection actions')}
              aria-label={text('Ações das coleções', 'Collection actions')}
              aria-expanded={isActionsOpen}
              aria-controls={actionsId}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {isActionsOpen && (
              <div id={actionsId} className="absolute right-0 top-full z-40 mt-1 w-52 overflow-hidden rounded-md border border-pm-light-border dark:border-pm-dark-border bg-pm-light-surface dark:bg-pm-dark-surface py-1 shadow-lg">
                <button type="button" className={actionClass} onClick={() => performAction(onCreateSuite)}>
                  <Folder className="h-3.5 w-3.5" />{t.createSuiteTitle}
                </button>
                <button type="button" className={actionClass} disabled={!selectedSuite} onClick={() => performAction(onCreateEndpoint)}>
                  <Plus className="h-3.5 w-3.5" />{t.createEndpointTitle}
                </button>
                <div className="my-1 border-t border-pm-light-border dark:border-pm-dark-border" />
                <button
                  type="button"
                  className={actionClass}
                  disabled={isExecuting || !selectedSuite?.cases.some(testCase => testCase.active)}
                  onClick={() => selectedSuite && performAction(() => onRunSuite(selectedSuite.id))}
                >
                  <Play className="h-3.5 w-3.5" />{isExecuting ? t.running : t.runCollection}
                </button>
                <div className="my-1 border-t border-pm-light-border dark:border-pm-dark-border" />
                <button
                  type="button"
                  className={`${actionClass} text-rose-600 dark:text-rose-400`}
                  disabled={!currentCaseId || isExecuting || !onDeleteCase}
                  onClick={() => onDeleteCase && performAction(onDeleteCase)}
                >
                  <Trash2 className="h-3.5 w-3.5" />{text('Excluir requisição', 'Delete request')}
                </button>
              </div>
            )}
          </div>
          {onClose && <button type="button" className={`${iconButtonClass} md:hidden`} onClick={onClose} aria-label={text('Fechar coleções', 'Close collections')} title={text('Fechar coleções', 'Close collections')}><X className="h-3.5 w-3.5" /></button>}
        </div>
      </div>

      <div className="relative mx-3 mb-3 shrink-0">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-pm-light-textMuted dark:text-pm-dark-textMuted" />
        <input
          id="collection-search"
          type="search"
          value={searchQuery}
          onChange={event => onSearchChange(event.target.value)}
          placeholder={text('Filtrar coleções', 'Filter collections')}
          aria-label={t.filterPlaceholder}
          className="h-[30px] w-full rounded border border-pm-light-border dark:border-pm-dark-border bg-transparent pl-7 pr-2 text-[12px] text-pm-light-text dark:text-pm-dark-text placeholder:text-pm-light-textMuted dark:placeholder:text-pm-dark-textMuted focus:border-pm-orange focus:outline-none"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-4">
        {visibleSuites.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs leading-relaxed text-pm-light-textMuted dark:text-pm-dark-textMuted">
            {query ? <p>{t.noRequestsFound}</p> : <>
              <Folder className="mx-auto mb-3 h-7 w-7 opacity-35" />
              <p>{text('Organize suas requisições em coleções.', 'Organize your requests into collections.')}</p>
              <button type="button" onClick={onCreateSuite} className="mt-3 text-pm-orange hover:underline">{t.createSuiteTitle}</button>
            </>}
          </div>
        ) : visibleSuites.map(({ suite, cases }) => {
          const isSelectedSuite = selectedSuite?.id === suite.id;
          const isExpanded = query !== '' || expandedIds.has(suite.id);
          const casesId = `collection-cases-${suite.id}`;
          return (
            <section key={suite.id} className="mb-0.5">
              <button
                type="button"
                disabled={isExecuting}
                onClick={() => selectSuite(suite)}
                aria-expanded={isExpanded}
                aria-controls={casesId}
                aria-pressed={isSelectedSuite}
                title={suite.name}
                className={`flex h-8 w-full min-w-0 items-center gap-1.5 rounded px-1.5 text-left text-[13px] transition-colors disabled:opacity-50 ${isSelectedSuite ? 'text-pm-light-text dark:text-pm-dark-text' : 'text-pm-light-textMuted dark:text-pm-dark-textMuted'} hover:bg-black/[0.035] dark:hover:bg-white/[0.035]`}
              >
                {isExpanded ? <ChevronDown className="h-3 w-3 shrink-0 opacity-70" /> : <ChevronRight className="h-3 w-3 shrink-0 opacity-70" />}
                {isExpanded ? <FolderOpen className="h-3.5 w-3.5 shrink-0 opacity-70" /> : <Folder className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                <span className="min-w-0 flex-1 truncate font-medium">{suite.name}</span>
              </button>
              {isExpanded && (
                <div id={casesId} className="ml-3 border-l border-pm-light-border dark:border-pm-dark-border pl-1">
                  {cases.length ? cases.map(testCase => {
                    const isCurrent = isSelectedSuite && testCase.id === currentCaseId;
                    return (
                      <button
                        key={testCase.id}
                        type="button"
                        disabled={isExecuting}
                        onClick={() => onSelectCase(suite, testCase)}
                        aria-pressed={isCurrent}
                        title={`${testCase.method} ${testCase.path}\n${testCase.name}`}
                        className={`relative flex h-[30px] w-full min-w-0 items-center gap-2 rounded-sm pl-2 pr-2 text-left transition-colors disabled:opacity-50 ${isCurrent ? 'bg-pm-light-panelHover text-pm-light-text dark:bg-pm-dark-panelHover dark:text-pm-dark-text before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded before:bg-pm-orange' : 'text-pm-light-textMuted dark:text-pm-dark-textMuted hover:bg-black/[0.035] dark:hover:bg-white/[0.035] hover:text-pm-light-text dark:hover:text-pm-dark-text'}`}
                      >
                        <span className={`w-9 shrink-0 text-right font-mono text-[10px] font-semibold ${methodColors[testCase.method]}`}>{testCase.method}</span>
                        <span className={`min-w-0 flex-1 truncate text-[13px] ${!testCase.active ? 'opacity-50' : ''}`}>{testCase.name}</span>
                      </button>
                    );
                  }) : <p className="px-4 py-2 text-[11px] leading-relaxed text-pm-light-textMuted dark:text-pm-dark-textMuted">{text('Nenhuma requisição nesta coleção.', 'No requests in this collection.')}</p>}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="flex h-8 shrink-0 items-center gap-1.5 border-t border-pm-light-border dark:border-pm-dark-border px-3 text-[10px] text-pm-light-textMuted dark:text-pm-dark-textMuted">
        <span>{visibleSuites.length} {text(visibleSuites.length === 1 ? 'coleção' : 'coleções', visibleSuites.length === 1 ? 'collection' : 'collections')}</span>
        <span className="opacity-50">·</span>
        <span>{requestCount} {text(requestCount === 1 ? 'requisição' : 'requisições', requestCount === 1 ? 'request' : 'requests')}</span>
      </div>
    </aside>
  );
}
