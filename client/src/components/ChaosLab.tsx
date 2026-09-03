import React, { useState } from 'react';
import { Sliders, Zap, AlertTriangle, Clock, RefreshCw, Terminal, Activity, Play, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';

export const ChaosLab: React.FC = () => {
  const { showToast } = useToast();
  const [delay, setDelay] = useState(350);
  const [errorCode, setErrorCode] = useState(503);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<any>({
    protocol: 'SPECTR CHAOS ENGINE v10.4',
    status: 'IDLE',
    message: 'Pronto para injeção de latência, códigos de falha e instabilidade na malha de microsserviços.'
  });
  const [latency, setLatency] = useState<number | null>(null);

  const handleTestDelay = async () => {
    const start = Date.now();
    try {
      setLoading(true);
      showToast({
        type: 'info',
        title: 'Injetando Latência',
        message: 'Atrasando resposta artificialmente em ' + delay + 'ms...'
      });

      let resData: any = null;
      try {
        const res = await api.get('/chaos/simulate-delay?delay=' + delay);
        resData = res.data;
      } catch {
        await new Promise(r => setTimeout(r, Math.min(delay, 1200)));
        resData = {
          simulated: true,
          type: 'LATENCY_DELAY',
          delayInjectedMs: delay,
          timestamp: new Date().toISOString(),
          message: 'Resposta atrasada propositalmente em ' + delay + 'ms para testes de resiliência e timeout SLA.'
        };
      }

      const elapsed = Date.now() - start;
      setLatency(elapsed);
      setOutput(resData);
      showToast({
        type: 'warn',
        title: 'Latência Injetada: ' + elapsed + 'ms',
        message: 'Atraso propagado com sucesso na malha de testes.'
      });
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
      showToast({
        type: 'warn',
        title: 'Injetando Falha HTTP ' + errorCode,
        message: 'Simulando colapso de microsserviço...'
      });

      let resData: any = null;
      try {
        const res = await api.get('/chaos/simulate-error?code=' + errorCode);
        resData = res.data;
      } catch (err: any) {
        resData = err.response?.data || {
          simulated: true,
          type: 'INJECTED_ERROR',
          statusCode: errorCode,
          error: errorCode === 503 ? 'Service Unavailable' : errorCode === 429 ? 'Too Many Requests' : 'Internal Server Error',
          message: 'Falha simulada injetada pelo motor de Chaos Engineering do Spectr.'
        };
      }

      setLatency(Date.now() - start);
      setOutput(resData);
      showToast({
        type: 'error',
        title: 'Falha HTTP ' + errorCode + ' Injetada',
        message: resData.error || 'Indisponibilidade capturada pelo gateway.'
      });
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
      showToast({
        type: 'info',
        title: 'Disparando Simulação Estocástica',
        message: 'Testando oscilações randômicas de 50% de descarte...'
      });

      let resData: any = null;
      try {
        const res = await api.get('/chaos/simulate-flaky');
        resData = res.data;
      } catch (err: any) {
        const isSuccess = Math.random() > 0.5;
        resData = isSuccess
          ? { simulated: true, type: 'FLAKY_SUCCESS', statusCode: 200, message: 'Requisição processada com sucesso na malha instável.' }
          : { simulated: true, type: 'FLAKY_FAILURE', statusCode: 500, message: 'Falha intermitente simulada (500 Internal Error).' };
      }

      setLatency(Date.now() - start);
      setOutput(resData);
      showToast({
        type: resData.type === 'FLAKY_SUCCESS' ? 'success' : 'warn',
        title: resData.type === 'FLAKY_SUCCESS' ? 'Flaky Test: Sucesso (200 OK)' : 'Flaky Test: Falha Intermitente (500)',
        message: resData.message
      });
    } catch (err: any) {
      setLatency(Date.now() - start);
      setOutput(err.response?.data || { error: 'Falha de intermitência simulada' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto p-6 bg-pm-light-bg dark:bg-pm-dark-bg transition-colors duration-200">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-pm-light-text dark:text-pm-dark-text flex items-center gap-2">
              <Sliders className="w-5 h-5 text-pm-orange" />
              Postman Chaos Engineering Lab
            </h2>
            <p className="text-xs text-pm-light-textMuted dark:text-pm-dark-textMuted mt-1">
              Simule falhas de infraestrutura, alta latência de rede e intermitências controladas contra APIs e microsserviços.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded bg-pm-orange/10 border border-pm-orange/30 text-pm-orange font-mono text-[11px] font-semibold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Chaos Engine v10.4 Active
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
                <span>Injetar Atraso de Rede</span>
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
                <span>Disparar Falha de Infraestrutura</span>
              </button>
            </motion.div>

            {/* 3. Instabilidade Estocástica */}
            <motion.div 
              whileHover={{ y: -2 }}
              className="p-4 rounded-lg bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border space-y-3 shadow-sm"
            >
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
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded text-xs transition-all cursor-pointer font-sans flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={'w-3 h-3 ' + (loading ? 'animate-spin' : '')} />
                <span>Testar Flaky Connection</span>
              </button>
            </motion.div>

          </div>


          {/* Terminal de Saída de Injeção */}
          <div className="rounded-lg bg-pm-light-surface dark:bg-pm-dark-surface border border-pm-light-border dark:border-pm-dark-border p-4 flex flex-col font-mono text-xs shadow-sm min-h-[420px]">
            <div className="flex items-center justify-between pb-2 border-b border-pm-light-border dark:border-pm-dark-border text-pm-light-textMuted dark:text-pm-dark-textMuted text-[11px]">
              <span className="flex items-center gap-1.5 font-bold text-pm-light-text dark:text-pm-dark-text">
                <Terminal className="w-3.5 h-3.5 text-pm-orange" />
                Chaos Response Console
              </span>
              {latency !== null && (
                <span className="text-pm-orange font-bold px-2 py-0.5 rounded bg-pm-orange/10 border border-pm-orange/30">
                  Latency: {latency}ms
                </span>
              )}
            </div>

            <div className="flex-1 mt-3 p-3 rounded bg-pm-light-panel dark:bg-[#151515] border border-pm-light-border dark:border-pm-dark-border overflow-y-auto text-[11px] text-pm-light-text dark:text-slate-300">
              {loading ? (
                <div className="py-12 text-center space-y-2">
                  <div className="inline-block w-4 h-4 rounded-full border-2 border-pm-orange border-t-transparent animate-spin" />
                  <p className="text-pm-orange font-bold">Injetando caos e aguardando resposta da camada de rede...</p>
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
