import React, { useEffect, useState } from 'react';
import { api } from './api/client';
import { TestSuite, TestRun, OverviewMetrics } from './types';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { TestRunner } from './components/TestRunner';
import { ChaosPlayground } from './components/ChaosPlayground';
import { CreateSuiteModal } from './components/CreateSuiteModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'runner' | 'chaos'>('dashboard');
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [latestRun, setLatestRun] = useState<TestRun | null>(null);
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
        // Carrega asserções detalhadas da primeira execução
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

      // Carrega os detalhes com as asserções completas
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
      setActiveTab('runner');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSuite = async (data: { name: string; description?: string; baseUrl: string }) => {
    await api.post('/suites', data);
    await loadData();
  };

  const handleRunDemo = async () => {
    if (suites.length > 0) {
      setActiveTab('runner');
      await handleRunSuite(suites[0].id);
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col selection:bg-purple-600/30 selection:text-purple-200">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRunDemo={handleRunDemo}
        isExecuting={isExecuting}
      />

      <main className="flex-1 p-6 lg:p-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            metrics={metrics}
            runs={runs}
            loading={loading}
            onSelectRun={handleSelectRun}
            onNavigateToRunner={() => setActiveTab('runner')}
          />
        )}

        {activeTab === 'runner' && (
          <TestRunner
            suites={suites}
            selectedSuite={selectedSuite}
            onSelectSuite={setSelectedSuite}
            onRunSuite={handleRunSuite}
            latestRun={latestRun}
            isExecuting={isExecuting}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        )}

        {activeTab === 'chaos' && (
          <ChaosPlayground />
        )}
      </main>

      <CreateSuiteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSuite}
      />
    </div>
  );
};
