import React, { useState } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';
import { HttpMethod } from '../types';

interface CreateEndpointModalProps {
  isOpen: boolean;
  suiteName: string;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    method: HttpMethod;
    path: string;
    expectedStatus: number;
    maxLatencyMs: number;
    body?: string;
  }) => Promise<void>;
}

export const CreateEndpointModal: React.FC<CreateEndpointModalProps> = ({
  isOpen,
  suiteName,
  onClose,
  onSubmit
}) => {
  const [name, setName] = useState('');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [path, setPath] = useState('');
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [maxLatencyMs, setMaxLatencyMs] = useState(250);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFillPaystreamSample = () => {
    setName('Exportação de Extrato Financeiro & Checksum');
    setMethod('GET');
    setPath('/transactions/export-statement');
    setExpectedStatus(200);
    setMaxLatencyMs(350);
    setBody('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onSubmit({
        name,
        method,
        path,
        expectedStatus: Number(expectedStatus),
        maxLatencyMs: Number(maxLatencyMs),
        body: body ? body : undefined
      });
      onClose();
      setName('');
      setPath('');
      setBody('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-spectr-surface border border-spectr-border w-full max-w-lg rounded-lg p-6 shadow-2xl relative font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-spectr-border">
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono">
              Adicionar Endpoint de Teste
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Suíte: <span className="text-purple-300">{suiteName}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFillPaystreamSample}
              className="px-2 py-0.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-[10px] font-medium rounded transition-all cursor-pointer font-mono"
            >
              Exemplo PayStream
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1 uppercase tracking-wider font-mono text-[11px]">
              Nome do Caso de Teste *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Conciliação de Extrato Bancário"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-spectr-bg border border-spectr-border rounded text-white placeholder-slate-600 focus:outline-none focus:border-spectr-violet font-mono"
            />
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-4">
              <label className="block font-semibold text-slate-300 mb-1 uppercase tracking-wider font-mono text-[11px]">
                Método *
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                className="w-full px-2.5 py-2 bg-spectr-bg border border-spectr-border rounded text-white focus:outline-none focus:border-spectr-violet font-mono uppercase font-bold"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>

            <div className="col-span-8">
              <label className="block font-semibold text-slate-300 mb-1 uppercase tracking-wider font-mono text-[11px]">
                Caminho do Endpoint *
              </label>
              <input
                type="text"
                required
                placeholder="/transactions ou /health"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="w-full px-3 py-2 bg-spectr-bg border border-spectr-border rounded text-white placeholder-slate-600 focus:outline-none focus:border-spectr-violet font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1 uppercase tracking-wider font-mono text-[11px]">
                Status HTTP Esperado
              </label>
              <input
                type="number"
                required
                value={expectedStatus}
                onChange={(e) => setExpectedStatus(Number(e.target.value))}
                className="w-full px-3 py-2 bg-spectr-bg border border-spectr-border rounded text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1 uppercase tracking-wider font-mono text-[11px]">
                Limite SLA (ms)
              </label>
              <input
                type="number"
                required
                value={maxLatencyMs}
                onChange={(e) => setMaxLatencyMs(Number(e.target.value))}
                className="w-full px-3 py-2 bg-spectr-bg border border-spectr-border rounded text-white font-mono"
              />
            </div>
          </div>

          {['POST', 'PUT', 'PATCH'].includes(method) && (
            <div>
              <label className="block font-semibold text-slate-300 mb-1 uppercase tracking-wider font-mono text-[11px]">
                Payload de Envio (JSON)
              </label>
              <textarea
                rows={3}
                placeholder='{ "amount": 100.0, "currency": "BRL" }'
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3 py-2 bg-spectr-bg border border-spectr-border rounded text-white placeholder-slate-600 focus:outline-none focus:border-spectr-violet font-mono text-[11px]"
              />
            </div>
          )}

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
              className="px-5 py-1.5 bg-spectr-violet hover:bg-spectr-violetHover text-white font-semibold rounded font-mono cursor-pointer"
            >
              {loading ? 'Salvando...' : 'Adicionar Endpoint'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
