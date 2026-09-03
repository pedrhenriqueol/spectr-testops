import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import { TestSuite, TestRun } from './types';
import { PostmanTopNav } from './components/PostmanTopNav';
import { Workstation } from './components/Workstation';
import { ChaosLab } from './components/ChaosLab';
import { AuditLedger } from './components/AuditLedger';
import { CreateSuiteModal } from './components/CreateSuiteModal';
import { CreateEndpointModal } from './components/CreateEndpointModal';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { motion } from 'framer-motion';

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

  const loadData = async () => {
    try {
      const [suitesRes, runsRes] = await Promise.all([
        api.get('/suites').catch(() => ({ data: { suites: [] } })),
        api.get('/runs?limit=30').catch(() => ({ data: { runs: [] } }))
      ]);

      const loadedSuites: TestSuite[] = suitesRes.data.suites || [];
      setSuites(loadedSuites);

      if (loadedSuites.length > 0 && !selectedSuite) {
        setSelectedSuite(loadedSuites[0]);
      } else if (selectedSuite) {
        const updated = loadedSuites.find(s => s.id === selectedSuite.id);
        if (updated) setSelectedSuite(updated);
      }

      const runs: TestRun[] = runsRes.data.runs || [];
      setRunsHistory(runs);
      if (runs.length > 0 && !latestRun) {
        try {
          const runDetail = await api.get('/runs/' + runs[0].id);
          setLatestRun(runDetail.data.run);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('Falha ao carregar dados do Fastify:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunSuite = async (suiteId: string) => {
    try {
      setIsExecuting(true);
      showToast({
        type: 'info',
        title: 'Executando Suíte de Testes',
        message: 'Disparando chamadas sequenciais e calculando latência p95/p99...'
      });

      const res = await api.post('/suites/' + suiteId + '/run');
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
        message: err.message || 'Verifique se o backend Fastify está ativo.'
      });
    } finally {
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
        title: 'Demo PayStream',
        message: 'Carregando suíte PayStream Core Banking...'
      });
    }
  };

  const handleCreateSuite = async (data: { name: string; description?: string; baseUrl: string }) => {
    try {
      await api.post('/suites', data);
      await loadData();
      showToast({
        type: 'success',
        title: 'Coleção Criada',
        message: 'Suíte "' + data.name + '" adicionada com sucesso.'
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro ao criar coleção',
        message: err.message
      });
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
        message: err.message
      });
    }
  };

  const handleUpdateBaseUrl = async (newUrl: string) => {
    if (!selectedSuite) return;
    try {
      await api.patch('/suites/' + selectedSuite.id, { baseUrl: newUrl });
      await loadData();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-pm-light-bg dark:bg-pm-dark-bg text-pm-light-text dark:text-pm-dark-text transition-colors duration-200">
      
      {/* 1. Global Postman Topbar */}
      <PostmanTopNav
        activeView={activeView}
        setActiveView={setActiveView}
        selectedSuite={selectedSuite}
        onRunSuite={() => selectedSuite && handleRunSuite(selectedSuite.id)}
        isExecuting={isExecuting}
        onRunDemo={handleRunDemo}
        environment={environment}
        setEnvironment={setEnvironment}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* 2. Main Workstation Area com Renderização Direta e Fluid Motion */}
      <div className="flex-1 flex overflow-hidden relative w-full h-full">
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
              onSelectSuite={setSelectedSuite}
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
                  setActiveView('workstation');
                } catch {
                  setActiveView('workstation');
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
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <MainApp />
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
