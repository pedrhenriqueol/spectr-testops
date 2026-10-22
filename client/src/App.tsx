import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api, getApiErrorMessage } from './api/client';
import { TestSuite, TestRun } from './types';
import { PostmanTopNav, resolveBaseUrl } from './components/PostmanTopNav';
import { Workstation } from './components/Workstation';
import { ChaosLab } from './components/ChaosLab';
import { AuditLedger } from './components/AuditLedger';
import { CreateSuiteModal } from './components/CreateSuiteModal';
import { CreateEndpointModal } from './components/CreateEndpointModal';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { MotionConfig, motion } from 'framer-motion';

function MainApp() {
  const { showToast } = useToast();
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
  const [latestRun, setLatestRun] = useState<TestRun | null>(null);
  const [runsHistory, setRunsHistory] = useState<TestRun[]>([]);
  const [activeView, setActiveView] = useState<'workstation' | 'chaos' | 'history'>('workstation');
  const [environment, setEnvironment] = useState('production');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateEndpointModalOpen, setIsCreateEndpointModalOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const executingRef = useRef(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [suitesRes, runsRes] = await Promise.all([
        api.get<{ suites: TestSuite[] }>('/suites'),
        api.get<{ runs: TestRun[] }>('/runs?limit=30')
      ]);
      const loadedSuites = suitesRes.data.suites;
      setSuites(loadedSuites);
      setSelectedSuite(current => loadedSuites.find(suite => suite.id === current?.id) || loadedSuites[0] || null);
      setRunsHistory(runsRes.data.runs);
      setLoadError(null);
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRunSuite = async (suiteId: string) => {
    if (executingRef.current) return;
    const suite = suites.find(item => item.id === suiteId);
    if (!suite) return;
    executingRef.current = true;
    setSelectedSuite(suite);
    setLatestRun(null);
    try {
      setIsExecuting(true);
      showToast({
        type: 'info',
        title: 'Executando Suíte de Testes',
        message: 'Disparando chamadas sequenciais e calculando latência p95/p99...'
      });

      const res = await api.post('/suites/' + suiteId + '/run', { baseUrl: resolveBaseUrl(suite, environment) });
      const runId = res.data.runId;
      
      const runDetail = await api.get('/runs/' + runId);
      setLatestRun(runDetail.data.run);
      await loadData();

      showToast({
        type: runDetail.data.run.status === 'PASSED' ? 'success' : 'warn',
        title: 'Suíte Concluída: ' + runDetail.data.run.status,
        message: runDetail.data.run.passedTests + '/' + runDetail.data.run.totalTests + ' testes aprovados (' + runDetail.data.run.successRate + '%)'
      });
    } catch (err: any) {
      console.error('Erro na execução da suíte:', err);
      showToast({
        type: 'error',
        title: 'Falha na Execução',
        message: getApiErrorMessage(err)
      });
    } finally {
      executingRef.current = false;
      setIsExecuting(false);
    }
  };

  const handleRunDemo = async () => {
    const paystreamSuite = suites.find(s => s.name.includes('PayStream')) || suites[0];
    if (paystreamSuite) {
      setSelectedSuite(paystreamSuite);
      setActiveView('workstation');
      await handleRunSuite(paystreamSuite.id);
    } else {
      showToast({
        type: 'info',
        title: 'Nenhuma coleção disponível',
        message: 'Crie uma coleção e adicione endpoints para executar os testes.'
      });
    }
  };

  const handleCreateSuite = async (data: { name: string; description?: string; baseUrl: string }) => {
    try {
      const created = await api.post('/suites', data);
      await loadData();
      if (created.data.suite) {
        setSelectedSuite({ ...created.data.suite, cases: [] });
        setLatestRun(null);
      }
      showToast({
        type: 'success',
        title: 'Coleção Criada',
        message: 'Suíte "' + data.name + '" adicionada com sucesso.'
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro ao criar coleção',
        message: getApiErrorMessage(err)
      });
      throw err;
    }
  };

  const handleCreateEndpoint = async (data: any) => {
    if (!selectedSuite) return;
    try {
      await api.post('/suites/' + selectedSuite.id + '/cases', data);
      await loadData();
      showToast({
        type: 'success',
        title: 'Endpoint Adicionado',
        message: '[' + data.method + '] ' + data.path + ' salvo na coleção.'
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro ao adicionar endpoint',
        message: getApiErrorMessage(err)
      });
      throw err;
    }
  };

  const handleUpdateBaseUrl = async (newUrl: string) => {
    if (!selectedSuite) return;
    try {
      await api.patch('/suites/' + selectedSuite.id, { baseUrl: newUrl });
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro ao atualizar URL', message: getApiErrorMessage(err) });
      throw err;
    }
  };

  return (
    <div className="flex flex-col h-dvh w-full overflow-hidden bg-pm-light-bg dark:bg-pm-dark-bg text-pm-light-text dark:text-pm-dark-text transition-colors duration-200">
      
      {/* 1. Global Postman Topbar */}
      <PostmanTopNav
        activeView={activeView}
        setActiveView={setActiveView}
        selectedSuite={selectedSuite}
        onRunSuite={() => selectedSuite && handleRunSuite(selectedSuite.id)}
        isExecuting={isExecuting}
        onRunDemo={handleRunDemo}
        environment={environment}
        setEnvironment={(value) => { setEnvironment(value); setLatestRun(null); }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {loadError && (
        <div role="alert" className="flex shrink-0 items-center justify-between gap-3 border-b border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs">
          <span>{loadError}</span>
          <button onClick={() => void loadData()} disabled={isLoading} className="shrink-0 font-semibold text-pm-orange disabled:opacity-50">
            {isLoading ? 'Carregando...' : 'Tentar novamente'}
          </button>
        </div>
      )}
      {isLoading && !suites.length && !loadError && <div role="status" className="shrink-0 px-4 py-2 text-xs text-pm-orange">Carregando coleções...</div>}

      {/* 2. Main Workstation Area com Renderização Direta e Fluid Motion */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative w-full">
        {activeView === 'workstation' && (
          <motion.div
            key="workstation"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full h-full flex overflow-hidden"
          >
            <Workstation
              suites={suites}
              selectedSuite={selectedSuite}
              onSelectSuite={(suite) => { setSelectedSuite(suite); setLatestRun(null); }}
              onRunSuite={handleRunSuite}
              latestRun={latestRun}
              isExecuting={isExecuting}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              onOpenCreateEndpointModal={() => setIsCreateEndpointModalOpen(true)}
              onUpdateBaseUrl={handleUpdateBaseUrl}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              environment={environment}
            />
          </motion.div>
        )}

        {activeView === 'chaos' && (
          <motion.div
            key="chaos"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full h-full flex flex-col overflow-hidden"
          >
            <ChaosLab />
          </motion.div>
        )}

        {activeView === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full h-full flex flex-col overflow-hidden"
          >
            <AuditLedger
              runs={runsHistory}
              onSelectRun={async (r) => {
                try {
                  const runDetail = await api.get('/runs/' + r.id);
                  setLatestRun(runDetail.data.run);
                  const suite = suites.find(item => item.id === runDetail.data.run.suiteId);
                  if (suite) setSelectedSuite(suite);
                  setActiveView('workstation');
                } catch (error) {
                  showToast({ type: 'error', title: 'Erro ao carregar execução', message: getApiErrorMessage(error) });
                }
              }}
            />
          </motion.div>
        )}
      </div>

      {/* Modais */}
      <CreateSuiteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSuite}
      />

      <CreateEndpointModal
        isOpen={isCreateEndpointModalOpen}
        suiteName={selectedSuite?.name || ''}
        onClose={() => setIsCreateEndpointModalOpen(false)}
        onSubmit={handleCreateEndpoint}
      />

    </div>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <MainApp />
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
    </MotionConfig>
  );
}

export default App;
