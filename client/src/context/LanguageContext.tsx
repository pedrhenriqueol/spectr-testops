import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'pt' | 'en';

interface Translations {
  // TopNav
  workspaceTitle: string;
  collectionsTab: string;
  chaosTab: string;
  auditTab: string;
  searchPlaceholder: string;
  runCollection: string;
  running: string;
  paystreamDemo: string;
  envProduction: string;
  envStaging: string;
  envLocal: string;
  themeLight: string;
  themeDark: string;

  // Workstation - Sidebar
  collectionsHeader: string;
  requestBtn: string;
  collectionBtn: string;
  filterPlaceholder: string;
  noRequestsFound: string;
  selectCollectionPrompt: string;
  endpointsReady: string;

  // Workstation - Workbench
  sendBtn: string;
  sendingBtn: string;
  noRequestSelected: string;
  expectedStatusLabel: string;
  slaTargetLabel: string;
  activeEnvLabel: string;
  enterToSendHint: string;
  clickToToggleUrl: string;

  // Tabs
  tabAssertions: string;
  tabHeaders: string;
  tabBody: string;
  tabSchema: string;

  // Assertions & Descriptions
  statusCodeCheck: string;
  latencySlaCheck: string;
  noBodyConfigured: string;
  autoContractValidation: string;

  // Response Pane
  modeSingleResponse: string;
  modeCollectionRunner: string;
  subtabBody: string;
  subtabTestResults: string;
  subtabHeaders: string;
  subtabCliStream: string;
  subtabBreakdown: string;
  exportReportBtn: string;
  exportJson: string;
  exportCsv: string;
  copyPayload: string;
  copied: string;
  noSingleResponseYet: string;
  clickSendHint: string;
  headerKey: string;
  headerValue: string;
  headerAction: string;
  statusLabel: string;
  timeLabel: string;
  sizeLabel: string;
  noCollectionRunYet: string;
  clickRunCollectionHint: string;
  resultPassed: string;
  successRate: string;
  p95Latency: string;
  totalDuration: string;

  // Chaos Lab
  chaosTitle: string;
  chaosSubtitle: string;
  chaosEngineActive: string;
  latencyInjectionTitle: string;
  injectLatencyBtn: string;
  faultOverrideTitle: string;
  triggerFaultBtn: string;
  stochasticTitle: string;
  stochasticSubtitle: string;
  testFlakyBtn: string;
  chaosConsoleTitle: string;
  noChaosFiredYet: string;
  injectingChaosWait: string;

  // Audit Ledger
  auditTitle: string;
  auditSubtitle: string;
  totalExecutions: string;
  auditVerifiedBadge: string;
  colRunId: string;
  colStatus: string;
  colTargetSuite: string;
  colPassTotal: string;
  colSuccessRate: string;
  colP95: string;
  colDuration: string;
  colDateTime: string;
  noExecutionsFound: string;

  // Modals
  createSuiteTitle: string;
  createSuiteSubtitle: string;
  suiteNameLabel: string;
  suiteNamePlaceholder: string;
  suiteDescLabel: string;
  suiteDescPlaceholder: string;
  suiteBaseUrlLabel: string;
  cancelBtn: string;
  saveSuiteBtn: string;
  createEndpointTitle: string;
  endpointNameLabel: string;
  endpointNamePlaceholder: string;
  methodLabel: string;
  pathLabel: string;
  saveEndpointBtn: string;

  // Toasts
  toastEnvChanged: string;
  toastReportExported: string;
  toastPayloadCopied: string;
  toastSuiteStarted: string;
}

export const translations: Record<Language, Translations> = {
  pt: {
    workspaceTitle: 'Enterprise QA Workspace',
    collectionsTab: 'Coleções & Requisições',
    chaosTab: 'Laboratório de Caos',
    auditTab: 'Livro de Auditoria',
    searchPlaceholder: 'Buscar endpoints, rotas (Ctrl+K)...',
    runCollection: 'Executar Coleção',
    running: 'Executando...',
    paystreamDemo: 'Demo PayStream',
    envProduction: 'Produção (Render Cloud)',
    envStaging: 'Cluster de Staging',
    envLocal: 'Localhost (Porta 3334)',
    themeLight: 'Claro',
    themeDark: 'Escuro',

    collectionsHeader: 'Coleções',
    requestBtn: 'Requisição',
    collectionBtn: 'Coleção',
    filterPlaceholder: 'Filtrar por nome, rota ou método...',
    noRequestsFound: 'Nenhum endpoint coincide com a busca.',
    selectCollectionPrompt: 'Selecione uma coleção.',
    endpointsReady: 'endpoints prontos',

    sendBtn: 'Enviar',
    sendingBtn: 'Enviando...',
    noRequestSelected: 'Nenhuma requisição selecionada',
    expectedStatusLabel: 'Status Esperado',
    slaTargetLabel: 'Alvo SLA',
    activeEnvLabel: 'AMBIENTE',
    enterToSendHint: 'Enter ↵ para Enviar',
    clickToToggleUrl: 'Clique para alternar entre {{BASE_URL}} e URL resolvida',

    tabAssertions: 'Asserções & SLA',
    tabHeaders: 'Cabeçalhos',
    tabBody: 'Corpo (JSON)',
    tabSchema: 'Esquema de Contrato',

    statusCodeCheck: 'Verificação de Código de Status',
    latencySlaCheck: 'Limite de Latência e SLA',
    noBodyConfigured: 'Nenhum payload JSON configurado para este endpoint.',
    autoContractValidation: 'Validação automática de contrato ativa (status 200 OK).',

    modeSingleResponse: '⚡ Resposta Individual',
    modeCollectionRunner: '📋 Executor de Coleção',
    subtabBody: 'Corpo (JSON)',
    subtabTestResults: 'Resultados dos Testes',
    subtabHeaders: 'Cabeçalhos',
    subtabCliStream: 'Fluxo CLI',
    subtabBreakdown: 'Detalhamento',
    exportReportBtn: 'Exportar Relatório SLA',
    exportJson: 'Exportar JSON (.json)',
    exportCsv: 'Exportar Planilha (.csv)',
    copyPayload: 'Copiar Payload',
    copied: 'Copiado!',
    noSingleResponseYet: 'Nenhuma resposta individual recebida.',
    clickSendHint: 'Clique no botão "Enviar" (ou tecle Enter) na barra de endereço para disparar.',
    headerKey: 'Chave do Cabeçalho',
    headerValue: 'Valor do Cabeçalho',
    headerAction: 'Ação',
    statusLabel: 'Status',
    timeLabel: 'Tempo',
    sizeLabel: 'Tamanho',
    noCollectionRunYet: 'Nenhuma bateria de coleção executada ainda.',
    clickRunCollectionHint: 'Clique em "Executar Coleção" no topo para disparar toda a suíte.',
    resultPassed: 'APROVADOS',
    successRate: 'Taxa de Sucesso',
    p95Latency: 'Latência p95',
    totalDuration: 'Duração Total',

    chaosTitle: 'Laboratório de Engenharia do Caos',
    chaosSubtitle: 'Simule falhas de infraestrutura, alta latência de rede e intermitências controladas contra APIs e microsserviços.',
    chaosEngineActive: 'Motor de Caos v10.4 Ativo',
    latencyInjectionTitle: 'Injeção de Latência de Rede',
    injectLatencyBtn: 'Injetar Atraso de Rede',
    faultOverrideTitle: 'Substituição de Código de Falha',
    triggerFaultBtn: 'Disparar Falha de Infraestrutura',
    stochasticTitle: 'Simulação Estocástica Instável',
    stochasticSubtitle: 'Simula oscilações aleatórias na rota com taxa de descarte de 50%.',
    testFlakyBtn: 'Testar Conexão Instável',
    chaosConsoleTitle: 'Console de Resposta do Caos',
    noChaosFiredYet: 'Nenhum teste de caos disparado. Escolha um dos controles à esquerda para testar.',
    injectingChaosWait: 'Injetando caos e aguardando resposta da camada de rede...',

    auditTitle: 'Livro de Auditoria & Histórico de Execuções',
    auditSubtitle: 'Registro histórico imutável das baterias de testes com telemetria p95, taxas de sucesso e conformidade SLA.',
    totalExecutions: 'Total Execuções',
    auditVerifiedBadge: 'Livro de Auditoria Verificado',
    colRunId: 'ID da Execução',
    colStatus: 'Status',
    colTargetSuite: 'Suíte Alvo',
    colPassTotal: 'Pass/Total',
    colSuccessRate: 'Taxa (%)',
    colP95: 'p95 Latência',
    colDuration: 'Duração',
    colDateTime: 'Data / Hora',
    noExecutionsFound: 'Nenhum registro de execução encontrado.',

    createSuiteTitle: 'Criar Nova Coleção',
    createSuiteSubtitle: 'Agrupe endpoints de testes e defina a Base URL do ambiente de destino.',
    suiteNameLabel: 'Nome da Coleção',
    suiteNamePlaceholder: 'Ex: PayStream Core Banking',
    suiteDescLabel: 'Descrição Técnica (Opcional)',
    suiteDescPlaceholder: 'Ex: Testes de concorrência, split de pagamento e idempotência.',
    suiteBaseUrlLabel: 'Base URL Alvo',
    cancelBtn: 'Cancelar',
    saveSuiteBtn: 'Criar Coleção',
    createEndpointTitle: 'Adicionar Endpoint à Coleção',
    endpointNameLabel: 'Nome do Caso de Teste',
    endpointNamePlaceholder: 'Ex: Autenticação de Merchant',
    methodLabel: 'Método HTTP',
    pathLabel: 'Caminho do Endpoint',
    saveEndpointBtn: 'Salvar Endpoint',

    toastEnvChanged: 'Ambiente ativo alterado',
    toastReportExported: 'Relatório SLA exportado com sucesso!',
    toastPayloadCopied: 'Payload copiado para a área de transferência.',
    toastSuiteStarted: 'Executando suíte de testes...'
  },
  en: {
    workspaceTitle: 'Enterprise QA Workspace',
    collectionsTab: 'Collections & Requests',
    chaosTab: 'Chaos Lab',
    auditTab: 'Audit Ledger',
    searchPlaceholder: 'Search endpoints, routes (Ctrl+K)...',
    runCollection: 'Run Collection',
    running: 'Running...',
    paystreamDemo: 'PayStream Demo',
    envProduction: 'Production (Render Cloud)',
    envStaging: 'Staging Cluster',
    envLocal: 'Localhost (Port 3334)',
    themeLight: 'Light',
    themeDark: 'Dark',

    collectionsHeader: 'Collections',
    requestBtn: 'Request',
    collectionBtn: 'Collection',
    filterPlaceholder: 'Filter by name, route or method...',
    noRequestsFound: 'No endpoints match your search.',
    selectCollectionPrompt: 'Select a collection.',
    endpointsReady: 'endpoints ready',

    sendBtn: 'Send',
    sendingBtn: 'Sending...',
    noRequestSelected: 'No request selected',
    expectedStatusLabel: 'Expected Status',
    slaTargetLabel: 'SLA Target',
    activeEnvLabel: 'ENVIRONMENT',
    enterToSendHint: 'Enter ↵ to Send',
    clickToToggleUrl: 'Click to toggle between {{BASE_URL}} and resolved URL',

    tabAssertions: 'Assertions & SLA',
    tabHeaders: 'Headers',
    tabBody: 'Body (JSON)',
    tabSchema: 'Contract Schema',

    statusCodeCheck: 'Status Code Check',
    latencySlaCheck: 'Response Time SLA Threshold',
    noBodyConfigured: 'No JSON payload configured for this endpoint.',
    autoContractValidation: 'Automatic contract validation active (200 OK).',

    modeSingleResponse: '⚡ Single Response',
    modeCollectionRunner: '📋 Collection Runner',
    subtabBody: 'Body (JSON)',
    subtabTestResults: 'Test Results',
    subtabHeaders: 'Headers',
    subtabCliStream: 'CLI Stream',
    subtabBreakdown: 'Breakdown',
    exportReportBtn: 'Export SLA Report',
    exportJson: 'Export JSON (.json)',
    exportCsv: 'Export Spreadsheet (.csv)',
    copyPayload: 'Copy Payload',
    copied: 'Copied!',
    noSingleResponseYet: 'No individual response received yet.',
    clickSendHint: 'Click "Send" (or press Enter) in the address bar to dispatch.',
    headerKey: 'Header Key',
    headerValue: 'Header Value',
    headerAction: 'Action',
    statusLabel: 'Status',
    timeLabel: 'Time',
    sizeLabel: 'Size',
    noCollectionRunYet: 'No collection run executed yet.',
    clickRunCollectionHint: 'Click "Run Collection" on top to dispatch the whole suite.',
    resultPassed: 'PASSED',
    successRate: 'Success Rate',
    p95Latency: 'p95 Latency',
    totalDuration: 'Total Duration',

    chaosTitle: 'Postman Chaos Engineering Lab',
    chaosSubtitle: 'Simulate infrastructure failures, network latency spikes, and controlled intermittency against APIs and microservices.',
    chaosEngineActive: 'Chaos Engine v10.4 Active',
    latencyInjectionTitle: 'Network Latency Injection',
    injectLatencyBtn: 'Inject Network Latency',
    faultOverrideTitle: 'Fault Status Code Override',
    triggerFaultBtn: 'Trigger Infrastructure Fault',
    stochasticTitle: 'Stochastic Flaky Simulation',
    stochasticSubtitle: 'Simulate random packet drops with 50% discard rate.',
    testFlakyBtn: 'Test Flaky Connection',
    chaosConsoleTitle: 'Chaos Response Console',
    noChaosFiredYet: 'No chaos test fired yet. Choose one of the controls on the left to test.',
    injectingChaosWait: 'Injecting chaos and awaiting network response...',

    auditTitle: 'Audit Ledger & Test Run History',
    auditSubtitle: 'Immutable historical ledger of test runs with p95 telemetry, success rates, and SLA compliance metrics.',
    totalExecutions: 'Total Executions',
    auditVerifiedBadge: 'Audit Ledger Verified',
    colRunId: 'Run ID',
    colStatus: 'Status',
    colTargetSuite: 'Target Suite',
    colPassTotal: 'Pass/Total',
    colSuccessRate: 'Rate (%)',
    colP95: 'p95 Latency',
    colDuration: 'Duration',
    colDateTime: 'Date / Time',
    noExecutionsFound: 'No execution records found.',

    createSuiteTitle: 'Create New Collection',
    createSuiteSubtitle: 'Group API test endpoints and configure the target environment Base URL.',
    suiteNameLabel: 'Collection Name',
    suiteNamePlaceholder: 'e.g., PayStream Core Banking',
    suiteDescLabel: 'Technical Description (Optional)',
    suiteDescPlaceholder: 'e.g., Concurrency tests, payment splits, and idempotency.',
    suiteBaseUrlLabel: 'Target Base URL',
    cancelBtn: 'Cancel',
    saveSuiteBtn: 'Create Collection',
    createEndpointTitle: 'Add Endpoint to Collection',
    endpointNameLabel: 'Test Case Name',
    endpointNamePlaceholder: 'e.g., Merchant Authentication',
    methodLabel: 'HTTP Method',
    pathLabel: 'Endpoint Path',
    saveEndpointBtn: 'Save Endpoint',

    toastEnvChanged: 'Active environment changed',
    toastReportExported: 'SLA Report exported successfully!',
    toastPayloadCopied: 'Payload copied to clipboard.',
    toastSuiteStarted: 'Running test suite...'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('spectr_lang') as Language;
    if (saved === 'pt' || saved === 'en') return saved;
    return 'pt'; // Default em Português conforme solicitado
  });

  useEffect(() => {
    localStorage.setItem('spectr_lang', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'pt' ? 'en' : 'pt'));
  };

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
