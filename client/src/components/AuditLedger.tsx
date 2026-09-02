import React from 'react';
import { TestRun } from '../types';
import { Database, Clock, CheckCircle2, XCircle, ArrowUpRight, Filter } from 'lucide-react';

interface AuditLedgerProps {
  runs: TestRun[];
  onSelectRun: (runId: string) => void;
}

export const AuditLedger: React.FC<AuditLedgerProps> = ({
  runs,
  onSelectRun
}) => {
  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full overflow-y-auto space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-400" />
            <span>Ledger Técnico de Execuções & Auditoria de SLA</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro imutável de baterias de teste executadas, latência p95 e conformidade de asserções.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Total de {runs.length} baterias registradas
        </div>
      </div>

      {/* Dense Audit Table */}
      <div className="rounded-lg bg-spectr-surface border border-spectr-border overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            
            {/* Table Header */}
            <thead className="bg-spectr-panel border-b border-spectr-border text-[11px] text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Run ID</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Suíte Alvo</th>
                <th className="py-2.5 px-3 text-center">Asserções</th>
                <th className="py-2.5 px-3 text-center">Taxa Sucesso</th>
                <th className="py-2.5 px-3 text-center">p95 Latência</th>
                <th className="py-2.5 px-3 text-center">Duração</th>
                <th className="py-2.5 px-3 text-right">Data / Hora</th>
                <th className="py-2.5 px-3 text-center">Ação</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-spectr-border/60">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    Nenhuma execução registrada no ledger ainda.
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr 
                    key={r.id} 
                    onClick={() => onSelectRun(r.id)}
                    className="hover:bg-spectr-panel/60 transition-colors cursor-pointer group"
                  >
                    {/* Run ID */}
                    <td className="py-2.5 px-3 font-bold text-purple-400">
                      #{r.id.slice(0, 8)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                        r.status === 'PASSED'
                          ? 'bg-spectr-terminal/15 text-spectr-terminal border-spectr-terminal/30'
                          : 'bg-spectr-rose/15 text-spectr-rose border-spectr-rose/30'
                      }`}>
                        {r.status === 'PASSED' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                        {r.status}
                      </span>
                    </td>

                    {/* Suíte Alvo */}
                    <td className="py-2.5 px-3 text-slate-300 font-medium">
                      {r.suite?.name || 'Suíte Padrão'}
                    </td>

                    {/* Asserções */}
                    <td className="py-2.5 px-3 text-center text-slate-300">
                      {r.passedTests} / {r.totalTests}
                    </td>

                    {/* Taxa Sucesso */}
                    <td className="py-2.5 px-3 text-center font-bold">
                      <span className={r.successRate === 100 ? 'text-spectr-terminal' : 'text-spectr-rose'}>
                        {r.successRate}%
                      </span>
                    </td>

                    {/* p95 */}
                    <td className="py-2.5 px-3 text-center text-purple-400 font-bold">
                      {r.p95LatencyMs}ms
                    </td>

                    {/* Duração */}
                    <td className="py-2.5 px-3 text-center text-slate-400">
                      {r.totalDurationMs}ms
                    </td>

                    {/* Timestamp */}
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {new Date(r.createdAt).toLocaleTimeString('pt-BR')}
                    </td>

                    {/* Ação */}
                    <td className="py-2.5 px-3 text-center">
                      <button className="p-1 rounded bg-spectr-panel hover:bg-spectr-violet text-slate-400 hover:text-white transition-colors">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
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
