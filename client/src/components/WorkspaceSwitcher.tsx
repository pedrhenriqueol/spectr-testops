import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Layers, Loader2, LogOut, Plus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getApiErrorMessage } from '../api/client';

export function WorkspaceSwitcher({ className = '' }: { className?: string }) {
  const { user, workspaces, selectedWorkspaceId, selectWorkspace, createWorkspace, logout } = useAuth();
  const { language } = useLanguage();
  const text = (pt: string, en: string) => language === 'pt' ? pt : en;
  const selected = workspaces.find(workspace => workspace.id === selectedWorkspaceId);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && creating) nameRef.current?.focus();
  }, [open, creating]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  const close = () => { setOpen(false); triggerRef.current?.focus(); };
  const choose = (id: string) => { selectWorkspace(id); setError(null); close(); };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await createWorkspace(name);
      setName('');
      setCreating(false);
      close();
    } catch (failure) { setError(getApiErrorMessage(failure)); }
    finally { setBusy(false); }
  };
  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try { await logout(); }
    catch (failure) { setError(getApiErrorMessage(failure)); }
    finally { setBusy(false); }
  };
  const actionClass = 'flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs transition-colors hover:bg-pm-light-panelHover disabled:opacity-50 dark:hover:bg-pm-dark-panelHover';

  return (
    <div ref={containerRef} className={`relative min-w-0 shrink-0 ${className}`}>
      <button ref={triggerRef} type="button" aria-label={`${text('Selecionar workspace', 'Select workspace')}: ${selected?.name || text('Nenhum workspace', 'No workspace')}`} aria-expanded={open} aria-controls="workspace-switcher-panel" onClick={() => { setOpen(value => !value); setError(null); }} title={selected?.name || 'Workspaces'} className="flex h-7 w-7 items-center justify-center gap-2 rounded text-pm-light-textMuted transition-colors hover:bg-pm-light-panelHover hover:text-pm-light-text dark:text-pm-dark-textMuted dark:hover:bg-pm-dark-panelHover dark:hover:text-pm-dark-text lg:w-auto lg:max-w-[180px] lg:justify-start lg:px-2">
        <Layers className="h-3.5 w-3.5 shrink-0" /><span className="hidden min-w-0 truncate text-xs lg:inline">{selected?.name || text('Workspaces', 'Workspaces')}</span><ChevronDown className="hidden h-3 w-3 shrink-0 lg:block" />
      </button>
      {open && <div id="workspace-switcher-panel" className="fixed left-3 right-3 top-12 z-50 overflow-hidden rounded-md border border-pm-light-border bg-pm-light-surface p-1.5 text-pm-light-text shadow-xl dark:border-pm-dark-border dark:bg-pm-dark-surface dark:text-pm-dark-text sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72">
        <div className="border-b border-pm-light-border px-2.5 pb-3 pt-2 dark:border-pm-dark-border"><p className="truncate text-xs font-medium">{user?.name}</p><p className="mt-1 truncate text-[11px] text-pm-light-textMuted dark:text-pm-dark-textMuted">{user?.email}</p></div>
        <p className="px-2.5 pb-1 pt-3 text-[10px] font-medium uppercase tracking-wide text-pm-light-textMuted dark:text-pm-dark-textMuted">Workspaces</p>
        <div className="max-h-52 overflow-y-auto">
          {workspaces.map(workspace => <button key={workspace.id} type="button" disabled={busy} aria-pressed={workspace.id === selectedWorkspaceId} onClick={() => choose(workspace.id)} className={actionClass}><Layers className="h-3.5 w-3.5 shrink-0 text-pm-light-textMuted dark:text-pm-dark-textMuted" /><span className="min-w-0 flex-1 truncate">{workspace.name}</span>{workspace.id === selectedWorkspaceId && <Check className="h-3.5 w-3.5 shrink-0 text-pm-orange" />}</button>)}
          {!workspaces.length && <p className="px-2.5 py-3 text-xs text-pm-light-textMuted dark:text-pm-dark-textMuted">{text('Nenhum workspace disponível.', 'No workspace available.')}</p>}
        </div>
        {creating ? <form onSubmit={submit} className="my-1 space-y-2 rounded bg-pm-light-panel p-2.5 dark:bg-pm-dark-panel"><div className="flex items-center justify-between gap-2"><label htmlFor="new-workspace-name" className="text-xs font-medium">{text('Nome do workspace', 'Workspace name')}</label><button type="button" disabled={busy} aria-label={text('Cancelar criação', 'Cancel creation')} onClick={() => { setCreating(false); setError(null); }} className="workbench-icon h-6 w-6"><X className="h-3.5 w-3.5" /></button></div><input ref={nameRef} id="new-workspace-name" required minLength={2} maxLength={100} value={name} onChange={event => setName(event.target.value)} disabled={busy} className="h-8 w-full rounded border border-pm-light-border bg-pm-light-bg px-2 text-xs outline-none focus:border-pm-orange dark:border-pm-dark-border dark:bg-pm-dark-bg" /><button type="submit" disabled={busy || name.trim().length < 2} className="workbench-button w-full">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}{text('Criar workspace', 'Create workspace')}</button></form> : <button type="button" disabled={busy} onClick={() => { setCreating(true); setError(null); }} className={`${actionClass} mt-1`}><Plus className="h-3.5 w-3.5" />{text('Criar workspace', 'Create workspace')}</button>}
        {error && <p role="alert" className="mx-2.5 mb-2 break-words text-xs leading-5 text-rose-700 dark:text-rose-300">{error}</p>}
        <div className="mt-1 border-t border-pm-light-border pt-1 dark:border-pm-dark-border"><button type="button" disabled={busy} onClick={() => void signOut()} className={actionClass}>{busy && !creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}{text('Sair da conta', 'Sign out')}</button></div>
      </div>}
    </div>
  );
}
