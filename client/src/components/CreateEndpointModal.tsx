import { useLanguage } from '../context/LanguageContext';
import React, { useState } from 'react';
import { X, Plus, Send } from 'lucide-react';
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
  const [maxLatencyMs, setMaxLatencyMs] = useState(300);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  if (!isOpen) return null;

  const handleFillPaystreamSample = () => {
    setName('Exportação de Extrato Financeiro & Checksum');
    setMethod('GET');
    setPath('/transactions/export-statement');
    setExpectedStatus(200);
    setMaxLatencyMs(450);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border w-full max-w-lg rounded-lg p-5 shadow-xl relative font-sans text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-pm-light-border dark:border-pm-dark-border">
          <div>
            <h3 className="font-bold text-pm-light-text dark:text-pm-dark-text text-sm">
              Adicionar Request à Coleção
            </h3>
            <span className="text-[11px] text-pm-light-textMuted dark:text-pm-dark-textMuted font-mono">
              Coleção: <strong className="text-pm-orange">{suiteName}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleFillPaystreamSample}
              className="px-2 py-0.5 bg-pm-orange/15 hover:bg-pm-orange/25 border border-pm-orange/40 text-pm-orange text-[10px] font-semibold rounded transition-all cursor-pointer font-mono"
            >
              Exemplo PayStream
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
              Nome do Request *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Conciliação de Extrato Bancário"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 bg-pm-light-bg dark:bg-pm-dark-bg border border-pm-light-border dark:border-pm-dark-border rounded text-pm-light-text dark:text-pm-dark-text placeholder-pm-light-textMuted dark:placeholder-pm-dark-textMuted focus:outline-none focus:border-pm-orange font-mono"
            />
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-4">
              <label className="block font-semibold text-pm-light-text dark:text-pm-dark-text mb-1 text-[11px]">
                Método *
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                className="w-full px-2.5 py-1.5 bg-pm-light-bg dark:bg-pm-dark-bg border border-pm-light-border dark:border-pm-dark-border rounded text-pm-light-text dark:text-pm-dark-text focus:outline-none focus:border-pm-orange font-mono font-bold"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>

            <div className="col-span-8">
              <label className="block font-semibold text-pm-light-text dark:text-pm-dark-text mb-1 text-[11px]">
                Endpoint Path *
              </label>
              <input
                type="text"
                required
                placeholder="/transactions ou /health"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="w-full px-3 py-1.5 bg-pm-light-bg dark:bg-pm-dark-bg border border-pm-light-border dark:border-pm-dark-border rounded text-pm-light-text dark:text-pm-dark-text placeholder-pm-light-textMuted dark:placeholder-pm-dark-textMuted focus:outline-none focus:border-pm-orange font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-pm-light-text dark:text-pm-dark-text mb-1 text-[11px]">
                Expected Status Code
              </label>
              <input
                type="number"
                required
                value={expectedStatus}
                onChange={(e) => setExpectedStatus(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-pm-light-bg dark:bg-pm-dark-bg border border-pm-light-border dark:border-pm-dark-border rounded text-pm-light-text dark:text-pm-dark-text font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-pm-light-text dark:text-pm-dark-text mb-1 text-[11px]">
                SLA Threshold (ms)
              </label>
              <input
                type="number"
                required
                value={maxLatencyMs}
                onChange={(e) => setMaxLatencyMs(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-pm-light-bg dark:bg-pm-dark-bg border border-pm-light-border dark:border-pm-dark-border rounded text-pm-light-text dark:text-pm-dark-text font-mono"
              />
            </div>
          </div>

          {['POST', 'PUT', 'PATCH'].includes(method) && (
            <div>
              <label className="block font-semibold text-pm-light-text dark:text-pm-dark-text mb-1 text-[11px]">
                Request Payload (JSON)
              </label>
              <textarea
                rows={3}
                placeholder='{ "amount": 100.0, "currency": "BRL" }'
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3 py-1.5 bg-pm-light-bg dark:bg-pm-dark-bg border border-pm-light-border dark:border-pm-dark-border rounded text-pm-light-text dark:text-pm-dark-text placeholder-pm-light-textMuted dark:placeholder-pm-dark-textMuted focus:outline-none focus:border-pm-orange font-mono text-[11px]"
              />
            </div>
          )}

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
              {loading ? 'Adicionando...' : 'Adicionar Request'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
