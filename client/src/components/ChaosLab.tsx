import React, { useRef, useState } from 'react';
import axios from 'axios';
import { Sliders, Zap, AlertTriangle, Clock, RefreshCw, Terminal, Activity, Play } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'framer-motion';

export const ChaosLab: React.FC = () => {
  const { showToast } = useToast();
  const { t, language } = useLanguage();
  const [delay, setDelay] = useState(350);
  const [errorCode, setErrorCode] = useState(503);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<unknown>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const requestInProgress = useRef(false);
  const text = (pt: string, en: string) => language === 'pt' ? pt : en;

  const reportFailure = (error: unknown) => {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.message || error.response?.data?.error || error.message
      : error instanceof Error ? error.message : text('Erro inesperado.', 'Unexpected error.');
    setLatency(null);
    setOutput({
      status: 'REQUEST_FAILED',
      message,
      ...(axios.isAxiosError(error) && error.response ? { httpStatus: error.response.status, response: error.response.data } : {})
    });
    showToast({
      type: 'error',
      title: text('Falha no teste de Chaos', 'Chaos test failed'),
      message
    });
  };

  const runTest = async (path: string, expectedType: string[], expectedStatus?: number) => {
    if (requestInProgress.current) return;
    requestInProgress.current = true;
    setLoading(true);
    setLatency(null);
    const start = performance.now();
    try {
      const response = await api.get(path, { validateStatus: () => true });
      const data = response.data;
      const expectedResponse = data?.simulated === true && expectedType.includes(data?.type)
        && (expectedStatus === undefined
          ? (data.type === 'FLAKY_SUCCESS' && response.status === 200) || (data.type === 'FLAKY_FAILURE' && response.status === 500)
          : response.status === expectedStatus);
      if (!expectedResponse) {
        setOutput({ status: 'UNEXPECTED_RESPONSE', httpStatus: response.status, response: data });
        showToast({
          type: 'error',
          title: text('Resposta inesperada do motor de Chaos', 'Unexpected Chaos engine response'),
          message: `HTTP ${response.status}`
        });
        return;
      }
      const elapsed = Math.round(performance.now() - start);
      setLatency(elapsed);
      setOutput({ ...data, httpStatus: response.status, measuredLatencyMs: elapsed });
      showToast({
        type: response.status >= 400 || (data.type === 'LATENCY_DELAY' && elapsed > 250) ? 'warn' : 'success',
        title: data.type === 'LATENCY_DELAY'
          ? text(`Latência medida: ${elapsed}ms`, `Measured latency: ${elapsed}ms`)
          : text(`Resposta de Chaos recebida: HTTP ${response.status}`, `Chaos response received: HTTP ${response.status}`),
        message: data.message
      });
    } catch (error: unknown) {
      reportFailure(error);
    } finally {
      requestInProgress.current = false;
      setLoading(false);
    }
  };

  const handleTestDelay = () => runTest('/chaos/simulate-delay?delay=' + delay, ['LATENCY_DELAY'], 200);
  const handleTestError = () => runTest('/chaos/simulate-error?code=' + errorCode, ['INJECTED_ERROR'], errorCode);
  const handleTestFlaky = () => runTest('/chaos/simulate-flaky', ['FLAKY_SUCCESS', 'FLAKY_FAILURE']);

  return (
    <div className="w-full h-full overflow-y-auto p-3 sm:p-6 bg-pm-light-bg dark:bg-pm-dark-bg transition-colors duration-200">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-pm-light-text dark:text-pm-dark-text flex items-center gap-2">
              <Sliders className="w-5 h-5 text-pm-orange" />
              {t.chaosTitle}
            </h2>
            <p className="text-xs text-pm-light-textMuted dark:text-pm-dark-textMuted mt-1">
              {t.chaosSubtitle}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded bg-pm-orange/10 border border-pm-orange/30 text-pm-orange font-mono text-[11px] font-semibold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            {text('Simulador de Chaos', 'Chaos simulator')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Controls Rack */}
          <div className="space-y-4">
            
            {/* 1. Injeção de Latência */}
            <motion.div 
              whileHover={{ y: -2 }}
              className="p-4 rounded-lg bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pm-light-text dark:text-pm-dark-text flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-pm-orange" />
                  {t.latencyInjectionTitle}
                </span>
                <span className="text-xs font-mono font-bold text-pm-orange px-2 py-0.5 rounded bg-pm-orange/10 border border-pm-orange/30">
                  {delay}ms
                </span>
              </div>

              <input
                type="range"
                aria-label={t.latencyInjectionTitle}
                min="50"
                max="3000"
                step="50"
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
                className="w-full accent-pm-orange cursor-pointer"
              />

              <div className="flex gap-1.5 pt-1">
                {[100, 350, 800, 1500, 2500].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDelay(d)}
                    className={'flex-1 py-1 rounded border text-[10px] font-mono transition-all cursor-pointer ' + (
                      delay === d
                        ? 'bg-pm-orange text-white border-pm-orange font-bold shadow-sm'
                        : 'bg-pm-light-panel dark:bg-pm-dark-panel border-pm-light-border dark:border-pm-dark-border text-pm-light-text dark:text-pm-dark-text hover:border-pm-orange/50'
                    )}
                  >
                    {d}ms
                  </button>
                ))}
              </div>

              <button
                onClick={handleTestDelay}
                disabled={loading}
                className="w-full py-2 bg-pm-orange hover:bg-pm-orangeHover disabled:opacity-50 text-white font-semibold rounded text-xs transition-all cursor-pointer font-sans flex items-center justify-center gap-1.5"
              >
                <Play className={'w-3 h-3 ' + (loading ? 'animate-spin' : '')} />
                <span>{t.injectLatencyBtn}</span>
              </button>
            </motion.div>

            {/* 2. Injeção de Código de Erro */}
            <motion.div 
              whileHover={{ y: -2 }}
              className="p-4 rounded-lg bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pm-light-text dark:text-pm-dark-text flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  {t.faultOverrideTitle}
                </span>
                <span className="text-xs font-mono font-bold text-rose-500 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30">
                  HTTP {errorCode}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { code: 500, label: '500 Server Error' },
                  { code: 503, label: '503 Unavailable' },
                  { code: 429, label: '429 Rate Limit' },
                ].map((item) => (
                  <button
                    key={item.code}
                    onClick={() => setErrorCode(item.code)}
                    className={'py-1.5 px-2 rounded text-[11px] font-mono border transition-all cursor-pointer ' + (
                      errorCode === item.code
                        ? 'bg-rose-500 text-white border-rose-500 font-bold shadow-sm'
                        : 'bg-pm-light-panel dark:bg-pm-dark-panel border-pm-light-border dark:border-pm-dark-border text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleTestError}
                disabled={loading}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold rounded text-xs transition-all cursor-pointer font-sans flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3 h-3" />
                <span>{t.triggerFaultBtn}</span>
              </button>
            </motion.div>

            {/* 3. Instabilidade Estocástica */}
            <motion.div 
              whileHover={{ y: -2 }}
              className="p-4 rounded-lg bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border space-y-3 shadow-sm"
            >
              <span className="text-xs font-bold text-pm-light-text dark:text-pm-dark-text flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-amber-500" />
                {t.stochasticTitle}
              </span>
              <p className="text-[11px] text-pm-light-textMuted dark:text-pm-dark-textMuted">
                {t.stochasticSubtitle}
              </p>
              <button
                onClick={handleTestFlaky}
                disabled={loading}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded text-xs transition-all cursor-pointer font-sans flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={'w-3 h-3 ' + (loading ? 'animate-spin' : '')} />
                <span>{t.testFlakyBtn}</span>
              </button>
            </motion.div>

          </div>


          {/* Terminal de Saída de Injeção */}
          <div className="rounded-lg bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border p-4 min-w-0 flex flex-col font-mono text-xs shadow-sm min-h-[420px]">
            <div className="flex items-center justify-between pb-2 border-b border-pm-light-border dark:border-pm-dark-border text-pm-light-textMuted dark:text-pm-dark-textMuted text-[11px]">
              <span className="flex items-center gap-1.5 font-bold text-pm-light-text dark:text-pm-dark-text">
                <Terminal className="w-3.5 h-3.5 text-pm-orange" />
                {t.chaosConsoleTitle}
              </span>
              {latency !== null && (
                <span className="text-pm-orange font-bold px-2 py-0.5 rounded bg-pm-orange/10 border border-pm-orange/30">
                  {text('Latência', 'Latency')}: {latency}ms
                </span>
              )}
            </div>

            <div aria-live="polite" aria-busy={loading} className="flex-1 min-w-0 mt-3 p-3 rounded bg-pm-light-panel dark:bg-[#151515] border border-pm-light-border dark:border-pm-dark-border overflow-y-auto text-[11px] text-pm-light-text dark:text-slate-300">
              {loading ? (
                <div className="py-12 text-center space-y-2">
                  <div className="inline-block w-4 h-4 rounded-full border-2 border-pm-orange border-t-transparent animate-spin" />
                  <p className="text-pm-orange font-bold">{text('Aguardando resposta do motor de Chaos...', 'Waiting for the Chaos engine response...')}</p>
                </div>
              ) : output ? (
                <pre className="overflow-x-auto whitespace-pre-wrap break-words select-text">
                  {JSON.stringify(output, null, 2)}
                </pre>
              ) : (
                <div className="py-12 text-center text-pm-light-textMuted dark:text-pm-dark-textMuted">
                  {t.noChaosFiredYet}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
