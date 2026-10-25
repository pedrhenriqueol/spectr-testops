import React, { useId, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Globe, Loader2 } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { SessionConfirmationError, useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getApiErrorMessage } from '../api/client';
import { SpectrLogo } from './SpectrLogo';
import { ThemeToggle } from './ThemeToggle';
import { easeOut, layoutSpring, springSoft } from '../lib/motion';

// AnimatePresence retains the previous render during exit. Presence must update
// the fields themselves so a hidden required input cannot block sign-in.
function RegistrationField({ children }: { children: (present: boolean) => React.ReactNode }) {
  const present = useIsPresent();
  const reduceMotion = useReducedMotion();
  return <motion.div initial={reduceMotion ? false : { height: 0, opacity: 0, marginBottom: 0 }} animate={{ height: 'auto', opacity: 1, marginBottom: 16 }} exit={{ height: 0, opacity: 0, marginBottom: 0 }} transition={{ duration: reduceMotion ? 0 : 0.3, ease: easeOut }} className="overflow-hidden"><div className="p-0.5">{children(present)}</div></motion.div>;
}

export function AuthScreen() {
  const { login, register, error: connectionError, refresh } = useAuth();
  const { language, setLanguage } = useLanguage();
  const reduceMotion = useReducedMotion();
  const layoutId = useId();
  const text = (pt: string, en: string) => language === 'pt' ? pt : en;
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const registering = mode === 'register';
  const reveal = {
    initial: reduceMotion ? false as const : { height: 0, opacity: 0, marginBottom: 0 },
    animate: { height: 'auto', opacity: 1, marginBottom: 16 },
    exit: { height: 0, opacity: 0, marginBottom: 0 },
    transition: { duration: reduceMotion ? 0 : 0.3, ease: easeOut }
  };
  const copyEntrance = { initial: reduceMotion ? false as const : { opacity: 0, y: 3 }, animate: { opacity: 1, y: 0 }, transition: { duration: reduceMotion ? 0 : 0.2, ease: easeOut } };
  const label = (id: string, title: React.ReactNode) => <label htmlFor={id} className="mb-1.5 block text-xs font-medium"><motion.span key={`${language}-${id}`} {...copyEntrance} className="block">{title}</motion.span></label>;

  const changeMode = (next: 'login' | 'register') => {
    if (mode === next || busy) return;
    setMode(next);
    setPassword('');
    setShowPassword(false);
    setError(null);
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const credentials = { email: email.trim().toLowerCase(), password };
      if (registering) await register({ ...credentials, name: name.trim(), ...(workspaceName.trim() ? { workspaceName: workspaceName.trim() } : {}) });
      else await login(credentials);
      setPassword('');
    } catch (failure) {
      if (failure instanceof SessionConfirmationError && failure.accountCreated) {
        setMode('login');
        setPassword('');
        setShowPassword(false);
      }
      setError(getApiErrorMessage(failure));
    }
    finally { setBusy(false); }
  };
  const fieldClass = 'auth-input h-10 w-full rounded border border-pm-light-border bg-pm-light-bg px-3 text-sm text-pm-light-text outline-none disabled:opacity-50 dark:border-pm-dark-border dark:bg-pm-dark-bg dark:text-pm-dark-text';

  return (
    <div className="relative isolate flex h-dvh min-h-0 flex-col overflow-auto bg-pm-light-bg text-pm-light-text dark:bg-pm-dark-bg dark:text-pm-dark-text">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div initial={false} animate={{ x: registering ? 36 : -24, y: registering ? -32 : 18, scale: registering ? 1.15 : 1, opacity: registering ? 0.9 : 0.55 }} transition={{ duration: reduceMotion ? 0 : 0.7, ease: easeOut }} className="auth-ambient absolute left-[calc(50%-280px)] top-[calc(50%-280px)] h-[560px] w-[560px]" />
      </div>
      <motion.header initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="flex h-16 shrink-0 items-center justify-between gap-3 px-5 sm:px-8">
        <SpectrLogo showVersion={false} />
        <div className="flex items-center gap-1">
          <motion.button type="button" aria-label={text('Change language to English', 'Mudar idioma para português')} onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')} whileHover={reduceMotion ? undefined : { y: -1 }} whileTap={reduceMotion ? undefined : { scale: 0.94 }} className="workbench-icon w-auto gap-1.5 px-2 text-[11px]">
            <motion.span animate={{ rotate: reduceMotion ? 0 : language === 'en' ? 32 : 0 }} transition={springSoft}><Globe className="h-3.5 w-3.5" /></motion.span>
            <span className="relative grid w-9 place-items-center"><AnimatePresence initial={false}>{<motion.span key={language} initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -5 }} transition={{ duration: reduceMotion ? 0 : 0.18 }} className="col-start-1 row-start-1">{language === 'pt' ? 'PT-BR' : 'EN'}</motion.span>}</AnimatePresence></span>
          </motion.button>
          <ThemeToggle className="workbench-icon" />
        </div>
      </motion.header>
      <main className="flex flex-1 flex-col items-center justify-center px-5 pb-10 pt-3 sm:py-10">
        <motion.section layout="position" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ layout: reduceMotion ? { duration: 0 } : layoutSpring, opacity: { duration: 0.35 }, y: { duration: 0.45, ease: easeOut } }} aria-labelledby="auth-heading" className="relative w-full max-w-[390px]">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-pm-light-textMuted dark:text-pm-dark-textMuted">API WORKSPACE</p>
          <motion.div layout="position" transition={reduceMotion ? { duration: 0 } : layoutSpring}>
            <h1 id="auth-heading" className="text-2xl font-semibold tracking-tight"><motion.span key={`${mode}-${language}-heading`} {...copyEntrance} className="block">{registering ? text('Crie seu espaço de trabalho', 'Create your workspace') : text('Entre no Spectr', 'Sign in to Spectr')}</motion.span></h1>
            <p className="mt-2 text-sm leading-6 text-pm-light-textMuted dark:text-pm-dark-textMuted"><motion.span key={`${mode}-${language}-description`} {...copyEntrance} className="block">{registering ? text('Organize suas coleções e mantenha os resultados no workspace da sua conta.', 'Organize your collections and keep results in your account workspace.') : text('Acesse suas coleções, requisições e resultados.', 'Access your collections, requests and results.')}</motion.span></p>
          </motion.div>
          <LayoutGroup id={layoutId}>
            <div className="mb-6 mt-7 flex gap-6 border-b border-pm-light-border dark:border-pm-dark-border">
              {(['login', 'register'] as const).map(item => <motion.button key={item} type="button" disabled={busy} aria-pressed={mode === item} onClick={() => changeMode(item)} whileHover={reduceMotion ? undefined : { y: -1 }} whileTap={reduceMotion ? undefined : { scale: 0.97 }} className={`relative pb-2.5 text-xs transition-colors ${mode === item ? 'font-medium' : 'text-pm-light-textMuted hover:text-pm-light-text dark:text-pm-dark-textMuted dark:hover:text-pm-dark-text'}`}>
                {item === 'login' ? text('Entrar', 'Sign in') : text('Criar conta', 'Create account')}
                {mode === item && <motion.span layoutId="auth-mode-indicator" transition={reduceMotion ? { duration: 0 } : springSoft} className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-pm-orange" />}
              </motion.button>)}
            </div>
          </LayoutGroup>
          <AnimatePresence initial={false}>{connectionError && <motion.div key="connection-error" {...reveal} className="overflow-hidden"><div role="alert" className="rounded border border-rose-500/30 bg-rose-500/5 p-3 text-xs leading-5 text-rose-700 dark:text-rose-300"><p>{connectionError}</p><button type="button" onClick={() => void refresh()} disabled={busy} className="mt-2 font-medium underline underline-offset-2">{text('Tentar conectar novamente', 'Try connecting again')}</button></div></motion.div>}</AnimatePresence>
          <form onSubmit={submit} aria-busy={busy}>
            <AnimatePresence initial={false}>{registering && <RegistrationField key="name-field">{present => <>{label('auth-name', text('Seu nome', 'Your name'))}<input id="auth-name" name="name" autoFocus autoComplete="name" required={present} minLength={2} maxLength={100} value={name} onChange={event => setName(event.target.value)} disabled={busy || !present} className={fieldClass} /></>}</RegistrationField>}</AnimatePresence>
            <div className="mb-4 p-0.5">{label('auth-email', text('E-mail', 'Email'))}<input id="auth-email" name="email" autoFocus type="email" autoComplete="username" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy} className={fieldClass} /></div>
            <div className="mb-4 p-0.5">
              {label('auth-password', text('Senha', 'Password'))}
              <div className="relative"><input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} required minLength={registering ? 12 : undefined} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} disabled={busy} aria-describedby={registering ? 'auth-password-help' : undefined} className={`${fieldClass} pr-11`} /><motion.button type="button" disabled={busy} onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? text('Ocultar senha', 'Hide password') : text('Mostrar senha', 'Show password')} whileTap={reduceMotion ? undefined : { scale: 0.85 }} className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded text-pm-light-textMuted hover:text-pm-light-text dark:text-pm-dark-textMuted dark:hover:text-pm-dark-text"><AnimatePresence initial={false}><motion.span key={String(showPassword)} initial={reduceMotion ? false : { opacity: 0, rotate: -20, scale: 0.8 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: reduceMotion ? 0 : 20, scale: reduceMotion ? 1 : 0.8 }} transition={{ duration: reduceMotion ? 0 : 0.16 }} className="col-start-1 row-start-1">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</motion.span></AnimatePresence></motion.button></div>
              <AnimatePresence initial={false}>{registering && <motion.p key="password-help" id="auth-password-help" initial={reduceMotion ? false : { height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 6 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} transition={{ duration: reduceMotion ? 0 : 0.24, ease: easeOut }} className="overflow-hidden text-[11px] leading-5 text-pm-light-textMuted dark:text-pm-dark-textMuted">{text('Use de 12 a 128 caracteres.', 'Use 12 to 128 characters.')}</motion.p>}</AnimatePresence>
            </div>
            <AnimatePresence initial={false}>{registering && <RegistrationField key="workspace-field">{present => <>{label('auth-workspace', <>{text('Nome do workspace', 'Workspace name')} <span className="font-normal text-pm-light-textMuted dark:text-pm-dark-textMuted">{text('(opcional)', '(optional)')}</span></>)}<input id="auth-workspace" name="workspaceName" autoComplete="organization" minLength={2} maxLength={100} value={workspaceName} onChange={event => setWorkspaceName(event.target.value)} disabled={busy || !present} className={fieldClass} /></>}</RegistrationField>}</AnimatePresence>
            <AnimatePresence initial={false}>{error && <motion.div key="auth-error" {...reveal} className="overflow-hidden"><p role="alert" className="rounded border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 text-xs leading-5 text-rose-700 dark:text-rose-300">{error}</p></motion.div>}</AnimatePresence>
            <motion.button type="submit" disabled={busy} whileHover={reduceMotion || busy ? undefined : { y: -1, boxShadow: '0 6px 22px rgba(255,108,55,0.2)' }} whileTap={reduceMotion || busy ? undefined : { scale: 0.985 }} transition={{ duration: 0.18 }} className="group mt-1 flex h-10 w-full items-center justify-center rounded bg-pm-orange text-sm font-medium text-white transition-colors hover:bg-pm-orangeHover disabled:opacity-60">
              <span className="grid w-full place-items-center"><AnimatePresence initial={false}><motion.span key={`${busy ? 'busy' : mode}-${language}`} initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -5 }} transition={{ duration: reduceMotion ? 0 : 0.18 }} className="col-start-1 row-start-1 flex items-center justify-center gap-2">{busy ? <><Loader2 className="h-4 w-4 animate-spin" />{text('Aguarde…', 'Please wait…')}</> : <>{registering ? text('Criar conta e workspace', 'Create account and workspace') : text('Entrar', 'Sign in')}<ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" /></>}</motion.span></AnimatePresence></span>
            </motion.button>
          </form>
          <p className="mt-6 text-center text-[11px] leading-5 text-pm-light-textMuted dark:text-pm-dark-textMuted"><motion.span key={`${language}-footer`} {...copyEntrance} className="block">{text('As coleções e os resultados são vinculados ao workspace selecionado.', 'Collections and results are linked to the selected workspace.')}</motion.span></p>
        </motion.section>
      </main>
    </div>
  );
}
