import React from 'react';
import { Database, Clock, CheckCircle2, XCircle, ArrowUpRight, Activity } from 'lucide-react';
import { TestRun } from '../types';
import { motion } from 'framer-motion';

interface AuditLedgerProps {
  runs: TestRun[];
  onSelectRun?: (run: TestRun) => void;
}

export const AuditLedger: React.FC<AuditLedgerProps> = ({ runs, onSelectRun }) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-pm-light-bg dark:bg-pm-dark-bg transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-pm-light-text dark:text-pm-dark-text flex items-center gap-2">
              <Database className="w-5 h-5 text-pm-orange" />
              Audit Ledger & Test Run History
            </h2>
            <p className="text-xs text-pm-light-textMuted dark:text-pm-dark-textMuted mt-0.5">
              Registro histórico imutável das baterias de testes com telemetria p95, taxas de sucesso e asserções.
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-pm-light-text dark:text-pm-dark-text">
            Total Execuções: <strong>{runs.length}</strong>
          </span>
        </div>

        {/* Ledger Table */}
        <div className="rounded-lg bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border overflow-hidden shadow-sm">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-pm-light-panel dark:bg-pm-dark-panel border-b border-pm-light-border dark:border-pm-dark-border text-[10px] text-pm-light-textMuted dark:text-pm-dark-textMuted uppercase">
              <tr>
                <th className="px-4 py-2.5">Run ID</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Suíte Alvo</th>
                <th className="px-4 py-2.5">Pass/Total</th>
                <th className="px-4 py-2.5">Taxa (%)</th>
                <th className="px-4 py-2.5">p95 Latência</th>
                <th className="px-4 py-2.5">Duração</th>
                <th className="px-4 py-2.5 text-right">Data / Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pm-light-border dark:divide-pm-dark-border text-[11px]">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-pm-light-textMuted dark:text-pm-dark-textMuted">
                    Nenhum registro de execução encontrado.
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onSelectRun && onSelectRun(r)}
                    className="hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5 font-bold text-pm-orange">{r.id.slice(0, 8)}...</td>
                    <td className="px-4 py-2.5">
                      {r.status === 'PASSED' ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-bold">
                          PASSED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[10px] font-bold">
                          FAILED
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-sans font-medium text-pm-light-text dark:text-pm-dark-text truncate max-w-xs">
                      {r.suite?.name || 'Suíte sem nome'}
                    </td>
                    <td className="px-4 py-2.5 text-pm-light-text dark:text-pm-dark-text">{r.passedTests}/{r.totalTests}</td>
                    <td className="px-4 py-2.5">
                      <span className={r.successRate === 100 ? 'text-emerald-500 font-bold' : 'text-pm-orange font-bold'}>
                        {r.successRate}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-pm-orange font-bold">{r.p95LatencyMs}ms</td>
                    <td className="px-4 py-2.5 text-pm-light-textMuted dark:text-pm-dark-textMuted">{r.totalDurationMs}ms</td>
                    <td className="px-4 py-2.5 text-right text-pm-light-textMuted dark:text-pm-dark-textMuted text-[10px]">
                      {new Date(r.createdAt).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
