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
import { AnimatePresence, motion } from 'framer-motion';

function MainApp() {
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
  const [latestRun, setLatestRun] = useState<TestRun | null>(null);
  const [runsHistory, setRunsHistory] = useState<TestRun[]>([]);
  const [activeView, setActiveView] = useState<'workstation' | 'chaos' | 'history'>('workstation');
  const [environment, setEnvironment] = useState('production');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateEndpointModalOpen, setIsCreateEndpointModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const [suitesRes, runsRes] = await Promise.all([
        api.get('/suites'),
        api.get('/runs?limit=30')
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
        // Carrega o run mais recente com asserções detalhadas
        const runDetail = await api.get(`/runs/${runs[0].id}`);
        setLatestRun(runDetail.data.run);
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
      const res = await api.post(`/suites/${suiteId}/run`);
      const runId = res.data.runId;
      
      // Busca detalhes completos com asserções
      const runDetail = await api.get(`/runs/${runId}`);
      setLatestRun(runDetail.data.run);
      await loadData();
    } catch (err) {
      console.error('Erro na execução da suíte:', err);
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
    }
  };

  const handleCreateSuite = async (data: { name: string; description?: string; baseUrl: string }) => {
    await api.post('/suites', data);
    await loadData();
  };

  const handleCreateEndpoint = async (data: any) => {
    if (!selectedSuite) return;
    await api.post(`/suites/${selectedSuite.id}/cases`, data);
    await loadData();
  };

  const handleUpdateBaseUrl = async (newUrl: string) => {
    if (!selectedSuite) return;
    await api.patch(`/suites/${selectedSuite.id}`, { baseUrl: newUrl });
    await loadData();
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
      />

      {/* 2. Main Workstation Area */}
      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {activeView === 'workstation' && (
            <motion.div
              key="workstation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex overflow-hidden"
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
              />
            </motion.div>
          )}

          {activeView === 'chaos' && (
            <motion.div
              key="chaos"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex-1 flex overflow-hidden"
            >
              <ChaosLab />
            </motion.div>
          )}

          {activeView === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex-1 flex overflow-hidden"
            >
              <AuditLedger
                runs={runsHistory}
                onSelectRun={async (r) => {
                  const runDetail = await api.get(`/runs/${r.id}`);
                  setLatestRun(runDetail.data.run);
                  setActiveView('workstation');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
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
      <MainApp />
    </ThemeProvider>
  );
}

export default App;
