import React, { useState } from 'react';
import { Play, Activity, Terminal, Edit3, Check, X } from 'lucide-react';
import { TestSuite, TestRun } from '../types';

interface WorkbenchHeaderProps {
  suite: TestSuite | null;
  latestRun: TestRun | null;
  isExecuting: boolean;
  onRunSuite: () => void;
  onOpenCreateModal?: () => void;
  onUpdateBaseUrl?: (newUrl: string) => Promise<void>;
}

export const WorkbenchHeader: React.FC<WorkbenchHeaderProps> = ({
  suite,
  latestRun,
  onRunSuite,
  isExecuting,
  onUpdateBaseUrl
}) => {
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [editedUrl, setEditedUrl] = useState('');

  const handleStartEdit = () => {
    if (suite) {
      setEditedUrl(suite.baseUrl);
      setIsEditingUrl(true);
    }
  };

  const handleSaveUrl = async () => {
    if (editedUrl.trim() && onUpdateBaseUrl) {
      await onUpdateBaseUrl(editedUrl.trim());
      setIsEditingUrl(false);
    }
  };

  return (
    <header className="h-12 bg-spectr-surface border-b border-spectr-border flex items-center justify-between px-4 z-10 shrink-0">
      
      {/* Breadcrumb Técnico & Target URL */}
      <div className="flex items-center gap-3 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          <span className="uppercase tracking-wider">WORKSPACE</span>
          <span>&rsaquo;</span>
          <span className="text-slate-300">Enterprise QA</span>
          <span>&rsaquo;</span>
          <span className="text-white font-semibold">
            {suite ? suite.name : 'Nenhuma Suíte Selecionada'}
          </span>
        </div>

        {suite && (
          isEditingUrl ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={editedUrl}
                onChange={(e) => setEditedUrl(e.target.value)}
                placeholder="https://sua-api.com/api/v1 ou http://localhost:3334/api/v1"
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-spectr-bg border border-purple-500 text-white w-72 focus:outline-none"
              />
              <button
                onClick={handleSaveUrl}
                title="Salvar URL"
                className="p-1 rounded bg-purple-600 hover:bg-purple-500 text-white"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => setIsEditingUrl(false)}
                title="Cancelar"
                className="p-1 rounded bg-spectr-panel hover:bg-slate-700 text-slate-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartEdit}
              title="Clique para editar a Base URL da API"
              className="group flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-spectr-panel hover:bg-spectr-panelHover border border-spectr-border text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <span>{suite.baseUrl}</span>
              <Edit3 className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 text-purple-400" />
            </button>
          )
        )}
      </div>

      {/* Ações & Telemetria do Topo */}
      <div className="flex items-center gap-3">
        {latestRun && (
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-spectr-bg px-2.5 py-1 rounded border border-spectr-border">
            <span>p95: <strong className="text-purple-300">{latestRun.p95LatencyMs}ms</strong></span>
            <span className="text-slate-600">&bull;</span>
            <span>Taxa: <strong className={latestRun.successRate >= 90 ? 'text-emerald-400' : 'text-rose-400'}>{latestRun.successRate}%</strong></span>
            <span className="text-slate-600">&bull;</span>
            <span>Total: <strong className="text-slate-300">{latestRun.totalDurationMs}ms</strong></span>
          </div>
        )}

        <button
          onClick={onRunSuite}
          disabled={!suite || isExecuting}
          className="px-3.5 py-1.5 bg-spectr-violet hover:bg-spectr-violetHover disabled:opacity-50 text-white text-xs font-semibold rounded font-mono flex items-center gap-2 shadow-lg shadow-purple-900/30 transition-all cursor-pointer"
        >
          <Play className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : 'fill-white'}`} />
          <span>{isExecuting ? 'Executando...' : 'Executar Bateria'}</span>
          <kbd className="hidden md:inline-block px-1.5 py-0.2 bg-black/40 rounded text-[10px] text-purple-200 border border-purple-400/30">
            ⌘R
          </kbd>
        </button>
      </div>

    </header>
  );
};
