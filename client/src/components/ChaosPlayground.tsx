import React, { useState } from 'react';
import { api } from '../api/client';
import { Sliders, Zap, AlertTriangle, Clock, RefreshCw, Terminal, CheckCircle2 } from 'lucide-react';

export const ChaosPlayground: React.FC = () => {
  const [delay, setDelay] = useState(1200);
  const [errorCode, setErrorCode] = useState(503);
  const [output, setOutput] = useState<any>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTestDelay = async () => {
    try {
      setLoading(true);
      const start = Date.now();
      const res = await api.get(`/chaos/simulate-delay?delay=${delay}`);
      const dur = Date.now() - start;
      setLatency(dur);
      setOutput(res.data);
    } catch (err: any) {
      setOutput(err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestError = async () => {
    try {
      setLoading(true);
      const start = Date.now();
      await api.get(`/chaos/simulate-error?code=${errorCode}`);
    } catch (err: any) {
      setLatency(Date.now());
      setOutput(err.response?.data || { error: 'Falha capturada' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestFlaky = async () => {
    try {
      setLoading(true);
      const start = Date.now();
      const res = await api.get('/chaos/simulate-flaky');
      setLatency(Date.now() - start);
      setOutput(res.data);
    } catch (err: any) {
      setOutput(err.response?.data || { error: 'Intermitência 500 detectada' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Chaos & Resilience Playground</h2>
        <p className="text-sm text-slate-400 mt-1">
          Injeção de estresse em tempo de execução: atrasos de rede artificiais, falhas HTTP 500/503 e cenários flaky.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chaos Injection Controls (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Card 1: Simulação de Latência */}
          <div className="p-5 rounded-2xl bg-[#121420] border border-white/[0.08] shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                <Clock className="w-4 h-4" />
                <span>Injeção de Latência / Atraso Artificial</span>
              </div>
              <span className="text-xs font-mono text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/30">
                {delay}ms
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Simula saturação de rede ou gargalos de banco de dados para validar se o cliente trata timeouts de acordo com o SLA.
            </p>

            <div className="space-y-2">
              <input
                type="range"
                min="100"
                max="3000"
                step="100"
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>100ms (Rápido)</span>
                <span>1500ms (Degradado)</span>
                <span>3000ms (Crítico)</span>
              </div>
            </div>

            <button
              onClick={handleTestDelay}
              disabled={loading}
              className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Injetar Atraso de {delay}ms</span>
            </button>
          </div>

          {/* Card 2: Injeção de Erros 500 / 503 */}
          <div className="p-5 rounded-2xl bg-[#121420] border border-white/[0.08] shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Simulação de Indisponibilidade & Erros HTTP</span>
              </div>
              <select
                value={errorCode}
                onChange={(e) => setErrorCode(Number(e.target.value))}
                className="bg-[#090A0F] border border-white/[0.08] text-xs font-mono text-white rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value={503}>503 Service Unavailable</option>
                <option value={500}>500 Internal Error</option>
                <option value={429}>429 Rate Limit Exceeded</option>
              </select>
            </div>

            <p className="text-xs text-slate-400">
              Valida circuit-breakers, retries exponenciais e páginas de contingência diante de falhas de infraestrutura.
            </p>

            <button
              onClick={handleTestError}
              disabled={loading}
              className="w-full py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Injetar Resposta HTTP {errorCode}</span>
            </button>
          </div>

          {/* Card 3: Intermitência Flaky */}
          <div className="p-5 rounded-2xl bg-[#121420] border border-white/[0.08] shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                <RefreshCw className="w-4 h-4" />
                <span>Teste de Resiliência Flaky (Intermitência)</span>
              </div>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                50% Drop Rate
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Alterna aleatoriamente entre respostas 200 OK e 500 Internal Error para validar a idempotência das requisições.
            </p>

            <button
              onClick={handleTestFlaky}
              disabled={loading}
              className="w-full py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Disparar Requisição Flaky</span>
            </button>
          </div>

        </div>

        {/* Live Telemetry Output Console (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 rounded-2xl bg-[#121420] border border-white/[0.08] shadow-lg flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
              <div className="flex items-center gap-2 text-white text-sm font-semibold">
                <Terminal className="w-4 h-4 text-purple-400" />
                <span>Console de Resposta ao Vivo</span>
              </div>
              {latency && (
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {latency}ms tempo total
                </span>
              )}
            </div>

            <div className="flex-1 bg-[#090A0F] rounded-xl p-4 border border-white/[0.06] overflow-y-auto font-mono text-xs text-slate-300">
              {loading ? (
                <div className="h-full flex items-center justify-center text-purple-400 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Aguardando resposta do motor de caos...</span>
                </div>
              ) : output ? (
                <pre className="text-[11px] leading-relaxed whitespace-pre-wrap">
                  {JSON.stringify(output, null, 2)}
                </pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-2">
                  <Terminal className="w-8 h-8 opacity-40" />
                  <p>Execute uma simulação ao lado para inspecionar os headers e o payload retornado.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
