import React, { useState } from 'react';
import { api } from '../api/client';
import { Sliders, Zap, AlertTriangle, Clock, RefreshCw, Terminal, CheckCircle2 } from 'lucide-react';

export const ChaosLab: React.FC = () => {
  const [delay, setDelay] = useState(800);
  const [errorCode, setErrorCode] = useState(503);
  const [flakyDropRate, setFlakyDropRate] = useState(50);
  const [output, setOutput] = useState<any>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full overflow-y-auto">
      
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Sliders className="w-5 h-5 text-purple-400" />
          <span>Mesa de Injeção de Parâmetros & Engenharia de Caos</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Injeção de estresse em tempo real para validar circuit-breakers, retries exponenciais e resiliência de SLAs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        
        {/* Parameter Injection Mesa (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Rack 1: Atraso de Rede Artificial */}
          <div className="p-4 rounded-lg bg-spectr-surface border border-spectr-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5 font-mono">
                <Clock className="w-4 h-4 text-purple-400" />
                Network Latency Injector
              </span>
              <span className="text-xs font-mono font-bold text-purple-300 bg-spectr-violet/20 px-2 py-0.5 rounded border border-spectr-violet/40">
                {delay}ms
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Injeta degradação artificial de latência para testar limites de timeout de conexão e p95 da esteira.
            </p>

            <div className="space-y-1">
              <input
                type="range"
                min="50"
                max="3000"
                step="50"
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>50ms (Rápido)</span>
                <span>800ms (Degradado)</span>
                <span>3000ms (Near-Timeout)</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 pt-1">
              {[150, 500, 1200, 2500].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDelay(preset)}
                  className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                    delay === preset
                      ? 'bg-spectr-violet text-white border-spectr-violet'
                      : 'bg-spectr-panel border-spectr-border text-slate-400 hover:text-white'
                  }`}
                >
                  {preset}ms
                </button>
              ))}
            </div>

            <button
              onClick={handleTestDelay}
              disabled={loading}
              className="w-full py-2 bg-spectr-violet hover:bg-spectr-violetHover text-white font-semibold rounded-md text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Injetar Atraso de {delay}ms</span>
            </button>
          </div>

          {/* Rack 2: Injeção de Falha HTTP */}
          <div className="p-4 rounded-lg bg-spectr-surface border border-spectr-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5 font-mono">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Fault Status Override
              </span>
              <div className="flex items-center gap-1">
                {[503, 500, 429].map((code) => (
                  <button
                    key={code}
                    onClick={() => setErrorCode(code)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                      errorCode === code
                        ? 'bg-spectr-rose/20 text-rose-300 border-spectr-rose/50'
                        : 'bg-spectr-panel text-slate-400 border-spectr-border'
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Força o retorno imediato de erro de infraestrutura para testar contingências e fallback de serviço.
            </p>

            <button
              onClick={handleTestError}
              disabled={loading}
              className="w-full py-2 bg-spectr-rose/15 hover:bg-spectr-rose/25 text-rose-300 border border-spectr-rose/40 font-semibold rounded-md text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Injetar Resposta HTTP {errorCode}</span>
            </button>
          </div>

          {/* Rack 3: Intermitência Flaky */}
          <div className="p-4 rounded-lg bg-spectr-surface border border-spectr-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5 font-mono">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                Stochastic Flaky Simulation
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/40">
                50% Drop Rate
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Alterna estocasticamente entre sucesso e falha para validar idempotência e retry logic.
            </p>

            <button
              onClick={handleTestFlaky}
              disabled={loading}
              className="w-full py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-semibold rounded-md text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Disparar Requisição Flaky</span>
            </button>
          </div>

        </div>

        {/* Real-Time Chaos Output Terminal (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-[560px]">
          <div className="p-4 rounded-lg bg-spectr-surface border border-spectr-border flex flex-col flex-1 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-spectr-border mb-2 text-xs font-mono">
              <span className="text-white flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                Terminal de Injeção
              </span>
              {latency && (
                <span className="text-[10px] text-spectr-terminal bg-spectr-terminal/10 px-2 py-0.5 rounded border border-spectr-terminal/30">
                  {latency}ms medido
                </span>
              )}
            </div>

            <div className="flex-1 bg-black/90 rounded border border-spectr-border p-3 font-mono text-[11px] overflow-y-auto text-slate-300 space-y-2">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-purple-400 gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Aguardando resposta do motor de caos...</span>
                </div>
              ) : output ? (
                <pre className="text-[10px] leading-relaxed whitespace-pre-wrap">
                  {JSON.stringify(output, null, 2)}
                </pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center space-y-2">
                  <Terminal className="w-8 h-8 opacity-30" />
                  <p>Injete um parâmetro ao lado para ver a telemetria ao vivo.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
