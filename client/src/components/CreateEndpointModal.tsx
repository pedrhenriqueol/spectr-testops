import { useLanguage } from '../context/LanguageContext';
import React, { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import { getSubmitError, ModalShell } from './ModalShell';
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
  const { t, language } = useLanguage();
  const formId = useId();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setError(null);
  }, [isOpen]);

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
    if (loading) return;
    setError(null);
    try {
      setLoading(true);
      await onSubmit({
        name: name.trim(),
        method,
        path: path.trim(),
        expectedStatus: Number(expectedStatus),
        maxLatencyMs: Number(maxLatencyMs),
        body: ['POST', 'PUT', 'PATCH'].includes(method) && body.trim() ? body : undefined
      });
      onClose();
      setName('');
      setPath('');
      setBody('');
      setMethod('GET');
      setExpectedStatus(200);
      setMaxLatencyMs(300);
    } catch (err) {
      setError(getSubmitError(err, language === 'pt' ? 'Não foi possível adicionar o endpoint. Tente novamente.' : 'Unable to add the endpoint. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell titleId={`${formId}-title`} busy={loading} onClose={onClose} wide>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-pm-light-border dark:border-pm-dark-border">
        <div>
          <h3 id={`${formId}-title`} className="font-bold text-pm-light-text dark:text-pm-dark-text text-sm">
            {t.createEndpointTitle}
          </h3>
          <span className="text-[11px] text-pm-light-textMuted dark:text-pm-dark-textMuted font-mono">
            {language === 'pt' ? 'Coleção' : 'Collection'}: <strong className="text-pm-orange">{suiteName}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleFillPaystreamSample}
            disabled={loading}
            className="px-2 py-0.5 bg-pm-orange/15 hover:bg-pm-orange/25 border border-pm-orange/40 text-pm-orange text-[10px] font-semibold rounded transition-all cursor-pointer font-mono"
          >
            Exemplo PayStream
          </button>
          <button type="button" onClick={onClose} disabled={loading} aria-label={language === 'pt' ? 'Fechar diálogo' : 'Close dialog'} className="text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        {error && <p role="alert" className="rounded border border-rose-500/40 bg-rose-500/10 p-2 text-rose-700 dark:text-rose-300">{error}</p>}
        <fieldset disabled={loading} className="space-y-3">
          <div>
            <label htmlFor={`${formId}-name`} className="block font-semibold text-pm-light-text dark:text-pm-dark-text mb-1 text-[11px]">
              {t.endpointNameLabel} *
            </label>
            <input
              id={`${formId}-name`}
              data-autofocus
              type="text"
              minLength={2}
              required
              placeholder={t.endpointNamePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 bg-pm-light-bg dark:bg-pm-dark-bg border border-pm-light-border dark:border-pm-dark-border rounded text-pm-light-text dark:text-pm-dark-text placeholder-pm-light-textMuted dark:placeholder-pm-dark-textMuted focus:outline-none focus:border-pm-orange font-mono"
            />
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-4">
              <label htmlFor={`${formId}-method`} className="block font-semibold text-pm-light-text dark:text-pm-dark-text mb-1 text-[11px]">
                {t.methodLabel} *
              </label>
              <select
                id={`${formId}-method`}
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
              <label htmlFor={`${formId}-path`} className="block font-semibold text-pm-light-text dark:text-pm-dark-text mb-1 text-[11px]">
                {t.pathLabel} *
              </label>
              <input
                id={`${formId}-path`}
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
              <label htmlFor={`${formId}-status`} className="block font-semibold text-pm-light-text dark:text-pm-dark-text mb-1 text-[11px]">
                {t.expectedStatusLabel}
              </label>
              <input
                id={`${formId}-status`}
                type="number"
                min={100}
                max={599}
                step={1}
                required
                value={expectedStatus}
                onChange={(e) => setExpectedStatus(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-pm-light-bg dark:bg-pm-dark-bg border border-pm-light-border dark:border-pm-dark-border rounded text-pm-light-text dark:text-pm-dark-text font-mono"
              />
            </div>

            <div>
              <label htmlFor={`${formId}-sla`} className="block font-semibold text-pm-light-text dark:text-pm-dark-text mb-1 text-[11px]">
                {t.slaTargetLabel} (ms)
              </label>
              <input
                id={`${formId}-sla`}
                type="number"
                min={1}
                  max={300000}
                step={1}
                required
                value={maxLatencyMs}
                onChange={(e) => setMaxLatencyMs(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-pm-light-bg dark:bg-pm-dark-bg border border-pm-light-border dark:border-pm-dark-border rounded text-pm-light-text dark:text-pm-dark-text font-mono"
              />
            </div>
          </div>

          {['POST', 'PUT', 'PATCH'].includes(method) && (
            <div>
              <label htmlFor={`${formId}-body`} className="block font-semibold text-pm-light-text dark:text-pm-dark-text mb-1 text-[11px]">
                Request Payload (JSON)
              </label>
              <textarea
                id={`${formId}-body`}
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
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-pm-orange hover:bg-pm-orangeHover text-white font-semibold rounded cursor-pointer"
            >
              {loading ? (language === 'pt' ? 'Adicionando...' : 'Adding...') : t.saveEndpointBtn}
            </button>
          </div>
        </fieldset>
      </form>

    </ModalShell>
  );
};
