import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface ThemeToggleProps {
  className?: string;
  ariaLabel?: string;
  title?: string;
}

/** Shares the theme reveal origin and icon choreography across login and workspace. */
export function ThemeToggle({ className = 'workbench-icon', ariaLabel, title }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const { language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const label = ariaLabel || (theme === 'dark'
    ? language === 'pt' ? 'Tema claro' : 'Light theme'
    : language === 'pt' ? 'Tema escuro' : 'Dark theme');

  return (
    <motion.button
      type="button"
      data-theme-toggle=""
      aria-label={label}
      title={title || label}
      onClick={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }}
      whileHover={reduceMotion ? undefined : { y: -1 }}
      whileTap={reduceMotion ? undefined : { scale: 0.9 }}
      transition={{ duration: reduceMotion ? 0 : 0.16 }}
      className={`relative overflow-hidden ${className}`}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={theme}
          className="inline-flex items-center justify-center"
          initial={reduceMotion ? false : { opacity: 0, rotate: -65, scale: 0.65 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, rotate: 65, scale: 0.65 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {theme === 'dark' ? <Sun aria-hidden="true" className="h-4 w-4" /> : <Moon aria-hidden="true" className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
