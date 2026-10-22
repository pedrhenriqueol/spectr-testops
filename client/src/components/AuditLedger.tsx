import React from 'react';
import { Database, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { TestRun } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface AuditLedgerProps {
  runs?: TestRun[];
  onSelectRun?: (run: TestRun) => void;
}

export const AuditLedger: React.FC<AuditLedgerProps> = ({ runs = [], onSelectRun }) => {
  const { t, language } = useLanguage();
  const safeRuns = Array.isArray(runs) ? runs : [];
  const locale = language === 'pt' ? 'pt-BR' : 'en-US';

  return (
    <div className="w-full h-full overflow-y-auto p-3 sm:p-6 bg-pm-light-bg dark:bg-pm-dark-bg transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-pm-light-text dark:text-pm-dark-text flex items-center gap-2">
              <Database className="w-5 h-5 text-pm-orange" />
              {t.auditTitle}
            </h2>
            <p className="text-xs text-pm-light-textMuted dark:text-pm-dark-textMuted mt-0.5">
              {t.auditSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-pm-light-text dark:text-pm-dark-text">
              {t.totalExecutions}: <strong>{safeRuns.length}</strong>
            </span>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="rounded-lg bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border overflow-x-auto shadow-sm">
          <table className="w-full min-w-[760px] text-left font-mono text-xs">
            <caption className="sr-only">{t.auditTitle}</caption>
            <thead className="bg-pm-light-panel dark:bg-pm-dark-panel border-b border-pm-light-border dark:border-pm-dark-border text-[10px] text-pm-light-textMuted dark:text-pm-dark-textMuted uppercase">
              <tr>
                <th className="px-4 py-2.5">{t.colRunId}</th>
                <th className="px-4 py-2.5">{t.colStatus}</th>
                <th className="px-4 py-2.5">{t.colTargetSuite}</th>
                <th className="px-4 py-2.5">{t.colPassTotal}</th>
                <th className="px-4 py-2.5">{t.colSuccessRate}</th>
                <th className="px-4 py-2.5">{t.colP95}</th>
                <th className="px-4 py-2.5">{t.colDuration}</th>
                <th className="px-4 py-2.5 text-right">{t.colDateTime}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pm-light-border dark:divide-pm-dark-border text-[11px]">
              {safeRuns.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-pm-light-textMuted dark:text-pm-dark-textMuted">
                    {t.noExecutionsFound}
                  </td>
                </tr>
              )}
              {safeRuns.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover transition-colors"
                >
                  <td className="px-4 py-3 text-pm-orange font-bold">
                    <button
                      type="button"
                      disabled={!onSelectRun}
                      onClick={() => onSelectRun?.(r)}
                      className="underline-offset-4 hover:underline focus-visible:underline rounded disabled:no-underline"
                      aria-label={`${t.colRunId}: ${r.id}`}
                    >
                      #{r.id.slice(0, 8)}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'PASSED' ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-bold text-[10px] flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" /> PASS
                      </span>
                    ) : r.status === 'FAILED' ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-500 border border-rose-500/30 font-bold text-[10px] flex items-center gap-1 w-fit">
                        <XCircle className="w-3 h-3" /> FAIL
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-[10px] flex items-center gap-1 w-fit">
                        <Clock className="w-3 h-3" /> {r.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-pm-light-text dark:text-pm-dark-text font-medium truncate max-w-xs font-sans">
                    {r.suite?.name || 'Suíte Sem Nome'}
                  </td>
                  <td className="px-4 py-3 text-pm-light-text dark:text-pm-dark-text">
                    {r.passedTests}/{r.totalTests}
                  </td>
                  <td className="px-4 py-3 font-bold text-pm-orange">
                    {r.successRate}%
                  </td>
                  <td className="px-4 py-3 text-pm-light-text dark:text-pm-dark-text">
                    {r.p95LatencyMs}ms
                  </td>
                  <td className="px-4 py-3 text-pm-light-textMuted dark:text-pm-dark-textMuted">
                    {r.totalDurationMs}ms
                  </td>
                  <td className="px-4 py-3 text-right text-pm-light-textMuted dark:text-pm-dark-textMuted font-mono text-[10px]">
                    {new Date(r.createdAt).toLocaleString(locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
