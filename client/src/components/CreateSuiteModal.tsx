import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CreateSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string; baseUrl: string }) => Promise<void>;
}

export const CreateSuiteModal: React.FC<CreateSuiteModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFillPayStreamDemo = () => {
    setName('PayStream Gateway ── Core Banking Suite');
    setDescription('Bateria de testes de estresse, concorrência, idempotência e webhooks assinados do PayStream.');
    setBaseUrl('https://paystream-gateway-server.onrender.com/api/v1');
  };

  const handleFillChaosDemo = () => {
    setName('Microserviço Local & Chaos Engine');
    setDescription('Validação de ciclo de vida de JWT, headers de segurança e injeção de atraso artificial.');
    setBaseUrl('http://localhost:3335/api/v1');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onSubmit({ name, description, baseUrl });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-spectr-surface border border-spectr-border w-full max-w-lg rounded-lg p-6 shadow-2xl relative font-sans">
        <div className="flex items-center justify-between pb-3 border-b border-spectr-border">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono">Nova Suíte de Testes</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFillPayStreamDemo}
              className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-medium rounded transition-all cursor-pointer font-mono"
            >
              Demo PayStream
            </button>
            <button
              type="button"
              onClick={handleFillChaosDemo}
              className="px-2 py-0.5 bg-spectr-violet/20 hover:bg-spectr-violet/30 border border-spectr-violet/40 text-purple-300 text-[10px] font-medium rounded transition-all cursor-pointer font-mono"
            >
              Demo Chaos
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1 uppercase tracking-wider font-mono text-[11px]">
              Nome da Suíte *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Pagamentos & Liquidação"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-spectr-bg border border-spectr-border rounded text-white placeholder-slate-600 focus:outline-none focus:border-spectr-violet font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1 uppercase tracking-wider font-mono text-[11px]">
              Base URL da API *
            </label>
            <input
              type="url"
              required
              placeholder="http://localhost:3335/api/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2 bg-spectr-bg border border-spectr-border rounded text-white placeholder-slate-600 focus:outline-none focus:border-spectr-violet font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1 uppercase tracking-wider font-mono text-[11px]">
              Descrição do Escopo
            </label>
            <textarea
              rows={3}
              placeholder="Bateria de validação de latência p95 e conformidade de schemas..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-spectr-bg border border-spectr-border rounded text-white placeholder-slate-600 focus:outline-none focus:border-spectr-violet font-mono"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-spectr-panel text-slate-300 rounded hover:bg-spectr-panelHover font-mono"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-1.5 bg-spectr-violet hover:bg-spectr-violetHover text-white font-semibold rounded font-mono"
            >
              {loading ? 'Salvando...' : 'Criar Suíte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
