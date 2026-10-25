import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Globe, Loader2, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { getApiErrorMessage } from '../api/client';
import { SpectrLogo } from './SpectrLogo';

export function AuthScreen() {
  const { login, register, error: connectionError, refresh } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
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

  const changeMode = (next: 'login' | 'register') => {
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
    } catch (failure) { setError(getApiErrorMessage(failure)); }
    finally { setBusy(false); }
  };
  const fieldClass = 'h-10 w-full rounded border border-pm-light-border bg-pm-light-bg px-3 text-sm text-pm-light-text outline-none transition-colors focus:border-pm-orange disabled:opacity-50 dark:border-pm-dark-border dark:bg-pm-dark-bg dark:text-pm-dark-text';

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-auto bg-pm-light-bg text-pm-light-text dark:bg-pm-dark-bg dark:text-pm-dark-text">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 px-5 sm:px-8">
        <SpectrLogo showVersion={false} />
        <div className="flex items-center gap-1">
          <button type="button" aria-label={text('Change language to English', 'Mudar idioma para português')} onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')} className="workbench-icon w-auto gap-1.5 px-2 text-[11px]"><Globe className="h-3.5 w-3.5" />{language === 'pt' ? 'PT-BR' : 'EN'}</button>
          <button type="button" aria-label={theme === 'dark' ? text('Tema claro', 'Light theme') : text('Tema escuro', 'Dark theme')} onClick={toggleTheme} className="workbench-icon">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-5 pb-10 pt-3 sm:py-10">
        <section aria-labelledby="auth-heading" className="w-full max-w-[390px]">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-pm-light-textMuted dark:text-pm-dark-textMuted">API WORKSPACE</p>
          <h1 id="auth-heading" className="text-2xl font-semibold tracking-tight">{registering ? text('Crie seu espaço de trabalho', 'Create your workspace') : text('Entre no Spectr', 'Sign in to Spectr')}</h1>
          <p className="mt-2 text-sm leading-6 text-pm-light-textMuted dark:text-pm-dark-textMuted">{registering ? text('Organize suas coleções e mantenha os resultados no workspace da sua conta.', 'Organize your collections and keep results in your account workspace.') : text('Acesse suas coleções, requisições e resultados.', 'Access your collections, requests and results.')}</p>
          <div className="mb-6 mt-7 flex gap-6 border-b border-pm-light-border dark:border-pm-dark-border">
            {(['login', 'register'] as const).map(item => <button key={item} type="button" disabled={busy} aria-pressed={mode === item} onClick={() => changeMode(item)} className={`border-b-2 pb-2.5 text-xs transition-colors ${mode === item ? 'border-pm-orange font-medium' : 'border-transparent text-pm-light-textMuted dark:text-pm-dark-textMuted'}`}>{item === 'login' ? text('Entrar', 'Sign in') : text('Criar conta', 'Create account')}</button>)}
          </div>
          {connectionError && <div role="alert" className="mb-5 rounded border border-rose-500/30 bg-rose-500/5 p-3 text-xs leading-5 text-rose-700 dark:text-rose-300"><p>{connectionError}</p><button type="button" onClick={() => void refresh()} disabled={busy} className="mt-2 font-medium underline underline-offset-2">{text('Tentar conectar novamente', 'Try connecting again')}</button></div>}
          <form onSubmit={submit} aria-busy={busy} className="space-y-4">
            {registering && <div><label htmlFor="auth-name" className="mb-1.5 block text-xs font-medium">{text('Seu nome', 'Your name')}</label><input id="auth-name" name="name" autoFocus autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={event => setName(event.target.value)} disabled={busy} className={fieldClass} /></div>}
            <div><label htmlFor="auth-email" className="mb-1.5 block text-xs font-medium">{text('E-mail', 'Email')}</label><input id="auth-email" name="email" autoFocus={!registering} type="email" autoComplete="username" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy} className={fieldClass} /></div>
            <div>
              <label htmlFor="auth-password" className="mb-1.5 block text-xs font-medium">{text('Senha', 'Password')}</label>
              <div className="relative"><input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} required minLength={registering ? 12 : undefined} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} disabled={busy} aria-describedby={registering ? 'auth-password-help' : undefined} className={`${fieldClass} pr-11`} /><button type="button" disabled={busy} onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? text('Ocultar senha', 'Hide password') : text('Mostrar senha', 'Show password')} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded text-pm-light-textMuted hover:text-pm-light-text dark:text-pm-dark-textMuted dark:hover:text-pm-dark-text">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
              {registering && <p id="auth-password-help" className="mt-1.5 text-[11px] leading-5 text-pm-light-textMuted dark:text-pm-dark-textMuted">{text('Use de 12 a 128 caracteres.', 'Use 12 to 128 characters.')}</p>}
            </div>
            {registering && <div><label htmlFor="auth-workspace" className="mb-1.5 block text-xs font-medium">{text('Nome do workspace', 'Workspace name')} <span className="font-normal text-pm-light-textMuted dark:text-pm-dark-textMuted">{text('(opcional)', '(optional)')}</span></label><input id="auth-workspace" name="workspaceName" autoComplete="organization" minLength={2} maxLength={100} value={workspaceName} onChange={event => setWorkspaceName(event.target.value)} disabled={busy} className={fieldClass} /></div>}
            {error && <p role="alert" className="rounded border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 text-xs leading-5 text-rose-700 dark:text-rose-300">{error}</p>}
            <button type="submit" disabled={busy} className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded bg-pm-orange text-sm font-medium text-white transition-colors hover:bg-pm-orangeHover disabled:opacity-60">{busy ? <><Loader2 className="h-4 w-4 animate-spin" />{text('Aguarde…', 'Please wait…')}</> : <>{registering ? text('Criar conta e workspace', 'Create account and workspace') : text('Entrar', 'Sign in')}<ArrowRight className="h-3.5 w-3.5" /></>}</button>
          </form>
          <p className="mt-6 text-center text-[11px] leading-5 text-pm-light-textMuted dark:text-pm-dark-textMuted">{text('As coleções e os resultados são vinculados ao workspace selecionado.', 'Collections and results are linked to the selected workspace.')}</p>
        </section>
      </main>
    </div>
  );
}
