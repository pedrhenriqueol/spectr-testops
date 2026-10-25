import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Layers, Loader2, LogOut, Plus, X } from 'lucide-react';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getApiErrorMessage } from '../api/client';
import { MotionMenuSurface } from './MotionMenuSurface';

function MenuCollapse({ children }: { children: React.ReactNode }) {
  const present = useIsPresent();
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { containerRef.current?.toggleAttribute('inert', !present); }, [present]);
  return <motion.div ref={containerRef} aria-hidden={!present || undefined} initial={reduced ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ height: { duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: reduced ? 0 : 0.16 } }} style={{ overflow: 'hidden', pointerEvents: present ? 'auto' : 'none' }}>{children}</motion.div>;
}

export function WorkspaceSwitcher({ className = '' }: { className?: string }) {
  const { user, workspaces, selectedWorkspaceId, selectWorkspace, createWorkspace, logout } = useAuth();
  const { language } = useLanguage();
  const reduced = useReducedMotion();
  const text = (pt: string, en: string) => language === 'pt' ? pt : en;
  const selected = workspaces.find(workspace => workspace.id === selectedWorkspaceId);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && creating) nameRef.current?.focus({ preventScroll: true });
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
        triggerRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  const close = () => { setOpen(false); triggerRef.current?.focus({ preventScroll: true }); };
  const choose = (id: string) => { selectWorkspace(id); setError(null); close(); };
  const cancelCreate = () => {
    setCreating(false);
    setError(null);
    requestAnimationFrame(() => createButtonRef.current?.focus({ preventScroll: true }));
  };
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
  const itemMotion = { whileHover: reduced ? undefined : { x: 2 }, whileTap: reduced ? undefined : { scale: 0.985 } };

  return (
    <div ref={containerRef} className={`relative min-w-0 shrink-0 ${className}`}>
      <motion.button ref={triggerRef} type="button" whileHover={reduced ? undefined : { y: -1 }} whileTap={reduced ? undefined : { scale: 0.97 }} aria-label={`${text('Selecionar workspace', 'Select workspace')}: ${selected?.name || text('Nenhum workspace', 'No workspace')}`} aria-expanded={open} aria-controls="workspace-switcher-panel" onClick={() => { setOpen(value => !value); setError(null); }} title={selected?.name || 'Workspaces'} className="flex h-7 w-7 items-center justify-center gap-2 rounded text-pm-light-textMuted transition-colors hover:bg-pm-light-panelHover hover:text-pm-light-text dark:text-pm-dark-textMuted dark:hover:bg-pm-dark-panelHover dark:hover:text-pm-dark-text lg:w-auto lg:max-w-[180px] lg:justify-start lg:px-2">
        <Layers className="h-3.5 w-3.5 shrink-0" />
        <span className="relative hidden h-4 w-[126px] min-w-0 overflow-hidden text-xs lg:block"><AnimatePresence initial={false}><motion.span key={selectedWorkspaceId || 'empty'} initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -4 }} transition={{ duration: reduced ? 0 : 0.18 }} className="absolute inset-0 truncate text-left">{selected?.name || 'Workspaces'}</motion.span></AnimatePresence></span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }} className="hidden lg:block"><ChevronDown className="h-3 w-3 shrink-0" /></motion.span>
      </motion.button>
      <AnimatePresence>
        {open && <MotionMenuSurface id="workspace-switcher-panel" className="fixed left-3 right-3 top-12 z-50 overflow-hidden rounded-md border border-pm-light-border bg-pm-light-surface p-1.5 text-pm-light-text shadow-xl dark:border-pm-dark-border dark:bg-pm-dark-surface dark:text-pm-dark-text sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72">
          <div className="border-b border-pm-light-border px-2.5 pb-3 pt-2 dark:border-pm-dark-border"><p className="truncate text-xs font-medium">{user?.name}</p><p className="mt-1 truncate text-[11px] text-pm-light-textMuted dark:text-pm-dark-textMuted">{user?.email}</p></div>
          <p className="px-2.5 pb-1 pt-3 text-[10px] font-medium uppercase tracking-wide text-pm-light-textMuted dark:text-pm-dark-textMuted">Workspaces</p>
          <div className="max-h-52 overflow-y-auto">
            {workspaces.map(workspace => <motion.button {...itemMotion} key={workspace.id} type="button" disabled={busy} aria-pressed={workspace.id === selectedWorkspaceId} onClick={() => choose(workspace.id)} className={actionClass}><Layers className="h-3.5 w-3.5 shrink-0 text-pm-light-textMuted dark:text-pm-dark-textMuted" /><span className="min-w-0 flex-1 truncate">{workspace.name}</span><span className="relative h-3.5 w-3.5 shrink-0"><AnimatePresence initial={false}>{workspace.id === selectedWorkspaceId && <motion.span key="selected" initial={reduced ? false : { opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: reduced ? 1 : 0.6 }} transition={{ duration: reduced ? 0 : 0.18 }} className="absolute inset-0"><Check className="h-3.5 w-3.5 text-pm-orange" /></motion.span>}</AnimatePresence></span></motion.button>)}
            {!workspaces.length && <p className="px-2.5 py-3 text-xs text-pm-light-textMuted dark:text-pm-dark-textMuted">{text('Nenhum workspace disponível.', 'No workspace available.')}</p>}
          </div>
          <AnimatePresence initial={false}>
            {creating ? <MenuCollapse key="create-form"><form onSubmit={submit} className="my-1 space-y-2 rounded bg-pm-light-panel p-2.5 dark:bg-pm-dark-panel"><div className="flex items-center justify-between gap-2"><label htmlFor="new-workspace-name" className="text-xs font-medium">{text('Nome do workspace', 'Workspace name')}</label><motion.button {...itemMotion} type="button" disabled={busy} aria-label={text('Cancelar criação', 'Cancel creation')} onClick={cancelCreate} className="workbench-icon h-6 w-6"><X className="h-3.5 w-3.5" /></motion.button></div><input ref={nameRef} id="new-workspace-name" required minLength={2} maxLength={100} value={name} onChange={event => setName(event.target.value)} disabled={busy} className="h-8 w-full rounded border border-pm-light-border bg-pm-light-bg px-2 text-xs outline-none transition-colors focus:border-pm-orange dark:border-pm-dark-border dark:bg-pm-dark-bg" /><motion.button whileTap={reduced ? undefined : { scale: 0.985 }} type="submit" disabled={busy || name.trim().length < 2} className="workbench-button w-full">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}{text('Criar workspace', 'Create workspace')}</motion.button></form></MenuCollapse> : <MenuCollapse key="create-action"><motion.button {...itemMotion} ref={createButtonRef} type="button" disabled={busy} onClick={() => { setCreating(true); setError(null); }} className={`${actionClass} mt-1`}><Plus className="h-3.5 w-3.5" />{text('Criar workspace', 'Create workspace')}</motion.button></MenuCollapse>}
          </AnimatePresence>
          <AnimatePresence initial={false}>{error && <MenuCollapse key="error"><p role="alert" className="mx-2.5 mb-2 break-words text-xs leading-5 text-rose-700 dark:text-rose-300">{error}</p></MenuCollapse>}</AnimatePresence>
          <div className="mt-1 border-t border-pm-light-border pt-1 dark:border-pm-dark-border"><motion.button {...itemMotion} type="button" disabled={busy} onClick={() => void signOut()} className={actionClass}>{busy && !creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}{text('Sair da conta', 'Sign out')}</motion.button></div>
        </MotionMenuSurface>}
      </AnimatePresence>
    </div>
  );
}
