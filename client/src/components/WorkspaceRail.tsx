import React from 'react';
import { Folder, History, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export type WorkspaceView = 'workstation' | 'chaos' | 'history';

interface WorkspaceRailProps {
  activeView: WorkspaceView;
  onChangeView: (view: WorkspaceView) => void;
}

export function WorkspaceRail({ activeView, onChangeView }: WorkspaceRailProps) {
  const { t, language } = useLanguage();
  const views = [
    { id: 'workstation' as const, label: t.collectionsHeader, accessibleLabel: t.collectionsTab, icon: Folder },
    { id: 'chaos' as const, label: 'Chaos', accessibleLabel: t.chaosTab, icon: SlidersHorizontal },
    { id: 'history' as const, label: language === 'pt' ? 'Histórico' : 'History', accessibleLabel: t.auditTab, icon: History }
  ];

  return (
    <nav aria-label={language === 'pt' ? 'Navegação principal' : 'Main navigation'} className="flex h-10 w-full shrink-0 border-b border-pm-light-border bg-pm-light-sidebar dark:border-pm-dark-border dark:bg-pm-dark-sidebar md:h-full md:w-16 md:flex-col md:border-b-0 md:border-r md:pt-2">
      {views.map(({ id, label, accessibleLabel, icon: Icon }) => {
        const selected = activeView === id;
        return (
          <button
            key={id}
            type="button"
            aria-label={accessibleLabel}
            aria-current={selected ? 'page' : undefined}
            title={accessibleLabel}
            onClick={() => onChangeView(id)}
            className={`relative flex min-w-0 flex-1 items-center justify-center gap-2 px-2 text-xs transition-colors md:h-16 md:flex-none md:flex-col md:gap-1.5 md:px-1 md:text-[10px] ${selected ? 'bg-pm-light-panelHover text-pm-light-text dark:bg-pm-dark-panelHover dark:text-pm-dark-text' : 'text-pm-light-textMuted hover:bg-pm-light-panelHover hover:text-pm-light-text dark:text-pm-dark-textMuted dark:hover:bg-pm-dark-panelHover dark:hover:text-pm-dark-text'}`}
          >
            {selected && <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-0.5 bg-pm-orange md:inset-y-2 md:left-0 md:right-auto md:h-auto md:w-0.5" />}
            <Icon strokeWidth={1.6} className="h-4 w-4 shrink-0 md:h-[19px] md:w-[19px]" />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
