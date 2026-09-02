import React, { useEffect, useState } from 'react';
import { api } from './api/client';
import { TestSuite, TestRun, OverviewMetrics } from './types';
import { Sidebar } from './components/Sidebar';
import { WorkbenchHeader } from './components/WorkbenchHeader';
import { Workstation } from './components/Workstation';
import { ChaosLab } from './components/ChaosLab';
import { AuditLedger } from './components/AuditLedger';
import { CreateSuiteModal } from './components/CreateSuiteModal';
import { CreateEndpointModal } from './components/CreateEndpointModal';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'workstation' | 'chaos' | 'ledger'>('workstation');
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [latestRun, setLatestRun] = useState<TestRun | null>(null);
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateEndpointModalOpen, setIsCreateEndpointModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [suitesRes, runsRes, metricsRes] = await Promise.all([
        api.get('/suites'),
        api.get('/runs'),
        api.get('/metrics/overview')
      ]);

      const fetchedSuites = suitesRes.data.suites || [];
      setSuites(fetchedSuites);
      if (fetchedSuites.length > 0 && !selectedSuite) {
        setSelectedSuite(fetchedSuites[0]);
      }

      const fetchedRuns = runsRes.data.runs || [];
      setRuns(fetchedRuns);
      if (fetchedRuns.length > 0 && !latestRun) {
        const detailRes = await api.get(`/runs/${fetchedRuns[0].id}`);
        setLatestRun(detailRes.data.run);
      }

      setMetrics(metricsRes.data.metrics || null);
    } catch (err) {
      console.error('Falha ao carregar dados do Spectr:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunSuite = async (suiteId: string) => {
    try {
      setIsExecuting(true);
      const res = await api.post(`/suites/${suiteId}/run`);
      const runResult = res.data;

      const detailRes = await api.get(`/runs/${runResult.runId}`);
      setLatestRun(detailRes.data.run);

      await loadData();
    } catch (err) {
      console.error('Erro na execução da suíte:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSelectRun = async (runId: string) => {
    try {
      const detailRes = await api.get(`/runs/${runId}`);
      setLatestRun(detailRes.data.run);
      setActiveView('workstation');
    } catch (err) {
      console.error(err);
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

  const handleRunDemo = async () => {
    if (suites.length > 0) {
      setActiveView('workstation');
      await handleRunSuite(suites[0].id);
    }
  };

  return (
    <div className="h-screen w-screen bg-spectr-bg text-slate-100 flex overflow-hidden">
      
      {/* 1. Left Narrow Tool Rail (Sidebar) */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        onRunDemo={handleRunDemo}
        isExecuting={isExecuting}
      />

      {/* 2. Main Workstation Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Workbench Top Bar */}
        <WorkbenchHeader
          selectedSuite={selectedSuite}
          latestRun={latestRun}
          isExecuting={isExecuting}
          onRunSuite={() => selectedSuite && handleRunSuite(selectedSuite.id)}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
        />

        {/* Dynamic View Panel */}
        <div className="flex-1 flex overflow-hidden">
          {activeView === 'workstation' && (
            <Workstation
              suites={suites}
              selectedSuite={selectedSuite}
              onSelectSuite={setSelectedSuite}
              onRunSuite={handleRunSuite}
              latestRun={latestRun}
              isExecuting={isExecuting}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              onOpenCreateEndpointModal={() => setIsCreateEndpointModalOpen(true)}
            />
          )}

          {activeView === 'chaos' && (
            <ChaosLab />
          )}

          {activeView === 'ledger' && (
            <AuditLedger
              runs={runs}
              onSelectRun={handleSelectRun}
            />
          )}
        </div>

      </div>

      {/* Modal de Criação de Suíte */}
      <CreateSuiteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSuite}
      />

      {/* Modal de Criação de Endpoint */}
      <CreateEndpointModal
        isOpen={isCreateEndpointModalOpen}
        suiteName={selectedSuite?.name || ''}
        onClose={() => setIsCreateEndpointModalOpen(false)}
        onSubmit={handleCreateEndpoint}
      />

    </div>
  );
};
