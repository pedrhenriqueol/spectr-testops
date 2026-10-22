import React, { useEffect, useId, useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { getSubmitError, ModalShell } from './ModalShell';
import { useLanguage } from '../context/LanguageContext';

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
  const { t, language } = useLanguage();
  const formId = useId();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setError(null);
  }, [isOpen]);

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
    if (loading) return;
    setError(null);
    try {
      setLoading(true);
      await onSubmit({ name: name.trim(), description: description.trim(), baseUrl: baseUrl.trim() });
      onClose();
      setName('');
      setDescription('');
      setBaseUrl('');
    } catch (err) {
      setError(getSubmitError(err, language === 'pt' ? 'Não foi possível criar a coleção. Tente novamente.' : 'Unable to create the collection. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell titleId={`${formId}-title`} busy={loading} onClose={onClose}>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-pm-light-border dark:border-pm-dark-border">
        <div className="flex items-center gap-2">
          <FolderPlus className="w-4 h-4 text-pm-orange" />
          <h3 id={`${formId}-title`} className="font-bold text-pm-light-text dark:text-pm-dark-text text-sm">
            {t.createSuiteTitle}
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleFillPayStreamDemo}
            disabled={loading}
            className="px-2 py-0.5 bg-pm-orange/15 hover:bg-pm-orange/25 border border-pm-orange/40 text-pm-orange text-[10px] font-semibold rounded transition-all cursor-pointer"
          >
            Demo PayStream
          </button>
          <button
            type="button"
            onClick={handleFillChaosDemo}
            disabled={loading}
            className="px-2 py-0.5 bg-pm-light-panel dark:bg-pm-dark-panel border border-pm-light-border dark:border-pm-dark-border text-pm-light-textMuted dark:text-pm-dark-textMuted text-[10px] font-semibold rounded transition-all cursor-pointer"
          >
            Demo Chaos
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
              {t.suiteNameLabel} *
            </label>
            <input
              id={`${formId}-name`}
              data-autofocus
              type="text"
              minLength={2}
              required
              placeholder={t.suiteNamePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 bg-pm-light-bg dark:bg-pm-dark-bg border border-pm-light-border dark:border-pm-dark-border rounded text-pm-light-text dark:text-pm-dark-text placeholder-pm-light-textMuted dark:placeholder-pm-dark-textMuted focus:outline-none focus:border-pm-orange font-mono"
            />
          </div>

          <div>
            <label htmlFor={`${formId}-url`} className="block font-semibold text-pm-light-text dark:text-pm-dark-text mb-1 text-[11px]">
              {t.suiteBaseUrlLabel} *
            </label>
            <input
              id={`${formId}-url`}
              type="url"
              required
              placeholder="https://api.exemplo.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 py-1.5 bg-pm-light-bg dark:bg-pm-dark-bg border border-pm-light-border dark:border-pm-dark-border rounded text-pm-light-text dark:text-pm-dark-text placeholder-pm-light-textMuted dark:placeholder-pm-dark-textMuted focus:outline-none focus:border-pm-orange font-mono"
            />
          </div>

          <div>
            <label htmlFor={`${formId}-description`} className="block font-semibold text-pm-light-text dark:text-pm-dark-text mb-1 text-[11px]">
              {t.suiteDescLabel}
            </label>
            <textarea
              id={`${formId}-description`}
              rows={2}
              placeholder={t.suiteDescPlaceholder}
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
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-pm-orange hover:bg-pm-orangeHover text-white font-semibold rounded cursor-pointer"
            >
              {loading ? (language === 'pt' ? 'Criando...' : 'Creating...') : t.saveSuiteBtn}
            </button>
          </div>
        </fieldset>
      </form>

    </ModalShell>
  );
};
