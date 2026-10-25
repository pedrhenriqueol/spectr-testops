import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import '../theme-transition.css';

type Theme = 'dark' | 'light';
export interface ThemeOrigin { x: number; y: number; }

interface ThemeTransition {
  ready: Promise<void>;
  finished: Promise<void>;
  skipTransition: () => void;
}
type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ThemeTransition;
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (origin?: ThemeOrigin | React.MouseEvent<HTMLElement>) => void;
  setTheme: (theme: Theme, origin?: ThemeOrigin) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1C1C1C' : '#FFFFFF');
  try { localStorage.setItem('spectr_theme', theme); } catch { /* The active theme still works when storage is unavailable. */ }
}

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem('spectr_theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* Use the system preference when storage is unavailable. */ }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const themeRef = useRef(theme);
  const generation = useRef(0);
  const transitionRef = useRef<ThemeTransition | null>(null);
  const animationRef = useRef<Animation | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { applyTheme(theme); }, [theme]);

  const stopMotion = useCallback(() => {
    transitionRef.current?.skipTransition();
    transitionRef.current = null;
    animationRef.current?.cancel();
    animationRef.current = null;
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    fallbackTimer.current = null;
    document.documentElement.classList.remove('spectr-theme-reveal', 'spectr-theme-colors');
  }, []);

  const setTheme = useCallback((next: Theme, origin?: ThemeOrigin) => {
    if (next === themeRef.current) return;
    themeRef.current = next;
    const version = ++generation.current;
    stopMotion();
    const root = document.documentElement;
    const commit = () => {
      // A skipped transition can still call its update function later.
      if (version !== generation.current) return;
      flushSync(() => setThemeState(next));
      applyTheme(next);
    };
    if (reducedMotion()) { commit(); return; }

    const fallback = () => {
      if (version !== generation.current) return;
      root.classList.add('spectr-theme-colors');
      commit();
      fallbackTimer.current = setTimeout(() => {
        if (version === generation.current) root.classList.remove('spectr-theme-colors');
        fallbackTimer.current = null;
      }, 260);
    };
    const transitionDocument = document as TransitionDocument;
    if (!transitionDocument.startViewTransition) { fallback(); return; }

    const x = Math.max(0, Math.min(window.innerWidth, origin?.x ?? window.innerWidth - 28));
    const y = Math.max(0, Math.min(window.innerHeight, origin?.y ?? 28));
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    root.classList.add('spectr-theme-reveal');
    let transition: ThemeTransition;
    try {
      transition = transitionDocument.startViewTransition(commit);
      transitionRef.current = transition;
    } catch { root.classList.remove('spectr-theme-reveal'); fallback(); return; }

    void transition.ready.then(() => {
      if (version !== generation.current) return;
      animationRef.current = root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 500, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)', fill: 'both' }
      );
    }).catch(() => {
      // Hidden tabs and browsers that decline a transition still commit the requested theme.
      if (version === generation.current) commit();
    });
    void transition.finished.catch(() => undefined).finally(() => {
      if (version !== generation.current) return;
      transitionRef.current = null;
      animationRef.current?.cancel();
      animationRef.current = null;
      root.classList.remove('spectr-theme-reveal');
    });
  }, [stopMotion]);

  const toggleTheme = useCallback((source?: ThemeOrigin | React.MouseEvent<HTMLElement>) => {
    let origin: ThemeOrigin | undefined;
    if (source && 'currentTarget' in source) {
      const rect = source.currentTarget.getBoundingClientRect();
      origin = {x:rect.left + rect.width / 2, y:rect.top + rect.height / 2};
    } else origin = source;
    setTheme(themeRef.current === 'dark' ? 'light' : 'dark', origin);
  }, [setTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (event: MediaQueryListEvent) => {
      let saved: string | null = null;
      try { saved = localStorage.getItem('spectr_theme'); } catch { /* Read preference only if available. */ }
      if (!saved) setTheme(event.matches ? 'light' : 'dark');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [setTheme]);

  useEffect(() => () => { generation.current += 1; stopMotion(); }, [stopMotion]);

  return <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
