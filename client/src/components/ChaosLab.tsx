import React, { useState } from 'react';
import { Sliders, Zap, AlertTriangle, Clock, RefreshCw, Terminal, Activity } from 'lucide-react';
import { api } from '../api/client';
import { motion } from 'framer-motion';

export const ChaosLab: React.FC = () => {
  const [delay, setDelay] = useState(250);
  const [errorCode, setErrorCode] = useState(503);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<any>(null);
  const [latency, setLatency] = useState<number | null>(null);

  const handleTestDelay = async () => {
    const start = Date.now();
    try {
      setLoading(true);
      const res = await api.get(`/chaos/simulate-delay?delay=${delay}`);
      setLatency(Date.now() - start);
      setOutput(res.data);
    } catch (err: any) {
      setLatency(Date.now() - start);
      setOutput(err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestError = async () => {
    const start = Date.now();
    try {
      setLoading(true);
      await api.get(`/chaos/simulate-error?code=${errorCode}`);
    } catch (err: any) {
      setLatency(Date.now() - start);
      setOutput(err.response?.data || { error: 'Falha simulada capturada' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestFlaky = async () => {
    const start = Date.now();
    try {
      setLoading(true);
      const res = await api.get('/chaos/simulate-flaky');
      setLatency(Date.now() - start);
      setOutput(res.data);
    } catch (err: any) {
      setLatency(Date.now() - start);
      setOutput(err.response?.data || { error: 'Falha de intermitência simulada' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-pm-light-bg dark:bg-pm-dark-bg transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h2 className="text-lg font-bold text-pm-light-text dark:text-pm-dark-text flex items-center gap-2">
            <Sliders className="w-5 h-5 text-pm-orange" />
            Postman Chaos Engineering Lab
          </h2>
          <p className="text-xs text-pm-light-textMuted dark:text-pm-dark-textMuted mt-1">
            Simule falhas de infraestrutura, alta latência de rede e intermitências controladas contra APIs e microsserviços.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Controls Rack */}
          <div className="space-y-4">
            
            {/* 1. Injeção de Latência */}
            <div className="p-4 rounded-lg bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pm-light-text dark:text-pm-dark-text flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-pm-orange" />
                  Network Latency Injection
                </span>
                <span className="text-xs font-mono font-bold text-pm-orange px-2 py-0.5 rounded bg-pm-orange/10 border border-pm-orange/30">
                  {delay}ms
                </span>
              </div>

              <input
                type="range"
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
                    className="flex-1 py-1 rounded bg-pm-light-panel dark:bg-pm-dark-panel hover:bg-pm-orange/15 border border-pm-light-border dark:border-pm-dark-border hover:border-pm-orange/50 text-[10px] font-mono text-pm-light-text dark:text-pm-dark-text transition-colors cursor-pointer"
                  >
                    {d}ms
                  </button>
                ))}
              </div>

              <button
                onClick={handleTestDelay}
                disabled={loading}
                className="w-full py-2 bg-pm-orange hover:bg-pm-orangeHover disabled:opacity-50 text-white font-semibold rounded text-xs transition-all cursor-pointer font-sans"
              >
                Injetar Atraso de Rede
              </button>
            </div>

            {/* 2. Injeção de Código de Erro */}
            <div className="p-4 rounded-lg bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pm-light-text dark:text-pm-dark-text flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  Fault Status Code Override
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
                    className={`py-1.5 px-2 rounded text-[11px] font-mono border transition-all cursor-pointer ${
                      errorCode === item.code
                        ? 'bg-rose-500 text-white border-rose-500 font-bold shadow-sm'
                        : 'bg-pm-light-panel dark:bg-pm-dark-panel border-pm-light-border dark:border-pm-dark-border text-pm-light-textMuted dark:text-pm-dark-textMuted hover:text-pm-light-text dark:hover:text-pm-dark-text'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleTestError}
                disabled={loading}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold rounded text-xs transition-all cursor-pointer font-sans"
              >
                Disparar Falha de Infraestrutura
              </button>
            </div>

            {/* 3. Instabilidade Estocástica */}
            <div className="p-4 rounded-lg bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border space-y-3 shadow-sm">
              <span className="text-xs font-bold text-pm-light-text dark:text-pm-dark-text flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-amber-500" />
                Stochastic Flaky Simulation
              </span>
              <p className="text-[11px] text-pm-light-textMuted dark:text-pm-dark-textMuted">
                Simula oscilações aleatórias na rota com taxa de descarte de 50%.
              </p>
              <button
                onClick={handleTestFlaky}
                disabled={loading}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded text-xs transition-all cursor-pointer font-sans"
              >
                Testar Flaky Connection
              </button>
            </div>

          </div>


          {/* Terminal de Saída de Injeção */}
          <div className="rounded-lg bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border p-4 flex flex-col font-mono text-xs shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-pm-light-border dark:border-pm-dark-border text-pm-light-textMuted dark:text-pm-dark-textMuted text-[11px]">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-pm-orange" />
                Chaos Response Console
              </span>
              {latency !== null && (
                <span className="text-pm-orange font-bold">
                  Latency: {latency}ms
                </span>
              )}
            </div>

            <div className="flex-1 mt-3 p-3 rounded bg-pm-light-bg dark:bg-[#151515] border border-pm-light-border dark:border-pm-dark-border overflow-y-auto text-[11px] text-pm-light-text dark:text-slate-300">
              {loading ? (
                <div className="py-8 text-center text-pm-orange animate-pulse">
                  Injetando caos e aguardando resposta da camada de rede...
                </div>
              ) : output ? (
                <pre className="overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(output, null, 2)}
                </pre>
              ) : (
                <div className="py-12 text-center text-pm-light-textMuted dark:text-pm-dark-textMuted">
                  Nenhum teste de caos disparado. Escolha um dos controles à esquerda para testar.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
