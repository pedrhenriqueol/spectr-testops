import React, { useState } from 'react';
import { X, Sparkles, FolderPlus } from 'lucide-react';

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
    setBaseUrl('https://paystream-gateway.onrender.com/api/v1');
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
      setName('');
      setDescription('');
      setBaseUrl('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border w-full max-w-md rounded-lg p-5 shadow-xl relative font-sans text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-pm-light-border dark:border-pm-dark-border">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-pm-orange" />
            <h3 className="font-bold text-pm-light-text dark:text-pm-dark-text text-sm">
              Criar Nova Coleção Postman
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleFillPayStreamDemo}
              className="px-2 py-0.5 bg-pm-orange/15 hover:bg-pm-orange/25 border border-pm-orange/40 text-pm-orange text-[10px] font-semibold rounded transition-all cursor-pointer"
            >
              Demo PayStream
            </button>
            <button
              type="button"
              onClick={handleFillChaosDemo}
              className="px-2 py-0.5 bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-pm-light-textMuted dark:text-pm-dark-textMuted text-[10px] font-semibold rounded transition-all cursor-pointer"
            >
              Demo Chaos
            </button>
            <button onClick={onClose} className="text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block font-semibold text-pm-light-text dark:text-pm-dark-text mb-1 text-[11px]">
              Nome da Coleção *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Core Banking API Suite"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 bg-pm-light-bg dark:bg-pm-dark-bg border border-pm-light-border dark:border-pm-dark-border rounded text-pm-light-text dark:text-pm-dark-text placeholder-pm-light-textMuted dark:placeholder-pm-dark-textMuted focus:outline-none focus:border-pm-orange font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-pm-light-text dark:text-pm-dark-text mb-1 text-[11px]">
              Base URL da API *
            </label>
            <input
              type="url"
              required
              placeholder="https://api.exemplo.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 py-1.5 bg-pm-light-bg dark:bg-pm-dark-bg border border-pm-light-border dark:border-pm-dark-border rounded text-pm-light-text dark:text-pm-dark-text placeholder-pm-light-textMuted dark:placeholder-pm-dark-textMuted focus:outline-none focus:border-pm-orange font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-pm-light-text dark:text-pm-dark-text mb-1 text-[11px]">
              Descrição Técnica
            </label>
            <textarea
              rows={2}
              placeholder="Descreva a finalidade desta suíte de testes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 bg-pm-light-bg dark:bg-pm-dark-bg border border-pm-light-border dark:border-pm-dark-border rounded text-pm-light-text dark:text-pm-dark-text placeholder-pm-light-textMuted dark:placeholder-pm-dark-textMuted focus:outline-none focus:border-pm-orange"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-pm-light-panel dark:bg-pm-dark-panel text-pm-light-text dark:text-pm-dark-text rounded hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-pm-orange hover:bg-pm-orangeHover text-white font-semibold rounded cursor-pointer"
            >
              {loading ? 'Criando...' : 'Criar Coleção'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
