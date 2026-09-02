import React, { useState } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';

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

  const handleFillDemo = () => {
    setName('Microserviço de Autenticação & Tokens');
    setDescription('Validação de ciclo de vida de JWT, headers de segurança e revogação de chaves.');
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
      <div className="bg-[#121420] border border-white/[0.08] w-full max-w-lg rounded-2xl p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <h3 className="font-bold text-white text-base">Nova Suíte de Testes</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFillDemo}
              className="px-2.5 py-1 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-[11px] font-medium rounded-lg transition-all cursor-pointer font-mono"
            >
              Preencher Demo
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              Nome da Suíte *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Pagamentos & Liquidação"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#090A0F] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              Base URL da API *
            </label>
            <input
              type="url"
              required
              placeholder="http://localhost:3335/api/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2 bg-[#090A0F] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              Descrição do Escopo
            </label>
            <textarea
              rows={3}
              placeholder="Bateria de validação de latência p95 e conformidade de schemas..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#090A0F] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/[0.04] text-slate-300 rounded-xl hover:bg-white/[0.08]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl"
            >
              {loading ? 'Salvando...' : 'Criar Suíte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
