import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, Check, CheckCircle2, ChevronDown, Copy, FileCode2, FileSpreadsheet, Loader2, Orbit, RotateCcw, Terminal, XCircle } from 'lucide-react';
import { TestCase, TestRun, SingleResponse, TestAssertion } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { JsonCodeView } from './JsonCodeView';

type ResponseMode = 'single' | 'collection';
type SingleTab = 'body' | 'tests' | 'headers';
type CollectionTab = 'cli' | 'breakdown';

export interface ResponsePanelProps {
  currentCase: TestCase | null;
  singleResponse: SingleResponse | null;
  latestRun: TestRun | null;
  isSendingSingle: boolean;
  isExecuting: boolean;
  requestError: string | null;
  requestUrl: string;
  responseMode: ResponseMode;
  onResponseModeChange: (mode: ResponseMode) => void;
  activeSingleTab: SingleTab;
  onSingleTabChange: (tab: SingleTab) => void;
  activeCollectionTab: CollectionTab;
  onCollectionTabChange: (tab: CollectionTab) => void;
  onRetry: () => void;
  onCopy: (text: string, label?: string) => void;
  copied: boolean;
  onExport: (format: 'json' | 'csv') => void;
}

const muted = 'text-pm-light-textMuted dark:text-pm-dark-textMuted';
const border = 'border-pm-light-border dark:border-pm-dark-border';
const success = 'text-emerald-700 dark:text-emerald-400';
const failure = 'text-rose-600 dark:text-rose-400';
const passed = (assertion: Pick<TestAssertion, 'statusMatch' | 'slaPassed' | 'schemaValid' | 'errorMessage'>) =>
  assertion.statusMatch && assertion.slaPassed && assertion.schemaValid && !assertion.errorMessage;

function navigateTabs<T extends string>(event: React.KeyboardEvent<HTMLButtonElement>, tabs: readonly T[], active: T, onChange: (tab: T) => void) {
  const index = tabs.indexOf(active);
  const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
    : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
      : event.key === 'Home' ? 0
        : event.key === 'End' ? tabs.length - 1 : null;
  if (next === null) return;
  event.preventDefault();
  onChange(tabs[next]);
  event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
}

function ResultLabel({ state }: { state: 'PASS' | 'FAIL' | 'SKIP' }) {
  return <span className={`inline-flex w-14 shrink-0 items-center gap-1.5 font-mono text-[10px] font-medium ${state === 'PASS' ? success : state === 'FAIL' ? failure : muted}`}>
    {state === 'PASS' ? <CheckCircle2 className="h-3.5 w-3.5" /> : state === 'FAIL' ? <XCircle className="h-3.5 w-3.5" /> : <span className="h-px w-3.5 bg-current" />}
    {state}
  </span>;
}

export function ResponsePanel({
  currentCase, singleResponse, latestRun, isSendingSingle, isExecuting, requestError, requestUrl,
  responseMode, onResponseModeChange, activeSingleTab, onSingleTabChange, activeCollectionTab,
  onCollectionTabChange, onRetry, onCopy, copied, onExport
}: ResponsePanelProps) {
  const { t, language } = useLanguage();
  const text = (pt: string, en: string) => language === 'pt' ? pt : en;
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const singleMode = responseMode === 'single';
  const hasResult = singleMode ? !!singleResponse : !!latestRun;
  const busy = singleMode ? isSendingSingle : isExecuting;

  useEffect(() => {
    setExportOpen(false);
  }, [responseMode, singleResponse, latestRun]);

  useEffect(() => {
    if (!exportOpen) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !exportRef.current?.contains(event.target)) setExportOpen(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setExportOpen(false);
        exportRef.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', keyboard);
    };
  }, [exportOpen]);

  const selectExport = (format: 'json' | 'csv') => {
    setExportOpen(false);
    onExport(format);
    exportRef.current?.querySelector('button')?.focus();
  };
  const tabClass = (active: boolean) => `relative h-9 shrink-0 border-b-2 px-3 text-[12px] transition-colors ${active ? 'border-pm-orange text-pm-light-text dark:text-pm-dark-text font-medium' : `border-transparent ${muted} hover:text-pm-light-text dark:hover:text-pm-dark-text`}`;

  return (
    <section aria-label={text('Painel de resposta', 'Response panel')} className="flex h-full min-h-0 min-w-0 flex-col bg-pm-light-surface dark:bg-pm-dark-surface">
      <div className={`flex h-10 shrink-0 items-center justify-between gap-2 border-b ${border} px-2 sm:px-3`}>
        <div className="flex h-full min-w-0 items-center" role="tablist" aria-label={text('Tipo de resultado', 'Result type')}>
          <button type="button" role="tab" aria-selected={singleMode} tabIndex={singleMode ? 0 : -1} onKeyDown={event => navigateTabs(event, ['single', 'collection'], responseMode, onResponseModeChange)} onClick={() => onResponseModeChange('single')} className={tabClass(singleMode)}>{text('Resposta', 'Response')}</button>
          <button type="button" role="tab" aria-selected={!singleMode} tabIndex={singleMode ? -1 : 0} onKeyDown={event => navigateTabs(event, ['single', 'collection'], responseMode, onResponseModeChange)} onClick={() => onResponseModeChange('collection')} className={`${tabClass(!singleMode)} max-w-[145px] truncate sm:max-w-none`} title={text('Execução da coleção', 'Collection run')}>
            <span className="sm:hidden">{text('Coleção', 'Collection')}</span><span className="hidden sm:inline">{text('Execução da coleção', 'Collection run')}</span>
            {isExecuting && <Loader2 className="ml-1.5 inline h-3 w-3 animate-spin" />}
          </button>
        </div>
        <div className={`flex shrink-0 items-center gap-3 font-mono text-[11px] ${muted}`}>
          {singleMode && singleResponse && !busy && <>
            <span className={singleResponse.statusMatch ? success : failure} title={singleResponse.statusText}>{singleResponse.actualStatus || text('Erro', 'Error')}<span className="hidden md:inline"> {singleResponse.statusText}</span></span>
            <span>{singleResponse.latencyMs} ms</span>
            <span className="hidden lg:inline">{singleResponse.responseSize}</span>
          </>}
          {!singleMode && latestRun && !busy && <>
            <span className={latestRun.status === 'PASSED' ? success : latestRun.status === 'FAILED' ? failure : muted}>{latestRun.passedTests}/{latestRun.totalTests}<span className="hidden sm:inline"> {latestRun.status === 'PASSED' ? 'PASS' : latestRun.status === 'FAILED' ? 'FAIL' : latestRun.status}</span></span>
            <span>{latestRun.totalDurationMs} ms</span>
            <span className="hidden lg:inline">p95 {latestRun.p95LatencyMs} ms</span>
          </>}
          {hasResult && !busy && <div ref={exportRef} className="relative font-sans">
            <button type="button" aria-label={text('Exportar resultado', 'Export result')} title={text('Exportar resultado', 'Export result')} aria-expanded={exportOpen} aria-controls="response-export-options" aria-haspopup="true" onClick={() => setExportOpen(open => !open)} className={`flex h-7 items-center gap-1 rounded px-1.5 ${muted} hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover`}>
              <ArrowDownToLine className="h-3.5 w-3.5" /><ChevronDown className="hidden h-3 w-3 sm:block" />
            </button>
            {exportOpen && <div id="response-export-options" className={`absolute right-0 top-full z-40 mt-1 w-48 rounded border ${border} bg-pm-light-surface dark:bg-pm-dark-sidebar py-1 shadow-lg`}>
              <button type="button" onClick={() => selectExport('json')} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover"><FileCode2 className="h-3.5 w-3.5" />{t.exportJson}</button>
              <button type="button" onClick={() => selectExport('csv')} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover"><FileSpreadsheet className="h-3.5 w-3.5" />{t.exportCsv}</button>
            </div>}
          </div>}
        </div>
      </div>

      {hasResult && !busy && <div className={`flex h-8 shrink-0 items-center justify-between gap-2 border-b ${border} px-3 text-[11px]`}>
        <div className="flex min-w-0 items-center gap-4 overflow-x-auto whitespace-nowrap" role="tablist" aria-label={text('Detalhes do resultado', 'Result details')}>
          {singleMode ? ([
            { id: 'body', label: 'Body' },
            { id: 'headers', label: `Headers (${Object.keys(singleResponse!.responseHeaders).length})` },
            { id: 'tests', label: text('Testes', 'Tests') }
          ] as const).map(tab => <button key={tab.id} type="button" role="tab" aria-selected={activeSingleTab === tab.id} tabIndex={activeSingleTab === tab.id ? 0 : -1} onKeyDown={event => navigateTabs(event, ['body', 'headers', 'tests'], activeSingleTab, onSingleTabChange)} onClick={() => onSingleTabChange(tab.id)} className={`h-8 shrink-0 ${activeSingleTab === tab.id ? 'font-medium text-pm-light-text dark:text-pm-dark-text' : muted}`}>{tab.label}</button>)
            : ([{ id: 'cli', label: text('Console', 'Console') }, { id: 'breakdown', label: text('Resultados', 'Results') }] as const).map(tab => <button key={tab.id} type="button" role="tab" aria-selected={activeCollectionTab === tab.id} tabIndex={activeCollectionTab === tab.id ? 0 : -1} onKeyDown={event => navigateTabs(event, ['cli', 'breakdown'], activeCollectionTab, onCollectionTabChange)} onClick={() => onCollectionTabChange(tab.id)} className={`h-8 ${activeCollectionTab === tab.id ? 'font-medium text-pm-light-text dark:text-pm-dark-text' : muted}`}>{tab.label}</button>)}
        </div>
        {singleMode && activeSingleTab === 'body' && singleResponse && <button type="button" aria-label={copied ? t.copied : t.copyPayload} onClick={() => onCopy(singleResponse.rawBody, 'Payload')} className={`flex h-7 shrink-0 items-center gap-1.5 rounded px-1.5 ${muted} hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover`}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}<span className="hidden sm:inline">{copied ? t.copied : text('Copiar', 'Copy')}</span>
        </button>}
      </div>}

      <div className="min-h-0 min-w-0 flex-1 overflow-auto" aria-busy={busy}>
        {busy ? <div className={`flex h-full min-h-[140px] flex-col items-center justify-center gap-3 p-6 text-center ${muted}`} role="status">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-[13px]">{singleMode ? text('Enviando requisição…', 'Sending request…') : text('Executando coleção…', 'Running collection…')}</p>
          {singleMode && <p className="max-w-lg break-all font-mono text-[11px] opacity-70">{requestUrl}</p>}
        </div> : singleMode ? requestError ? <div role="alert" className="flex min-h-full flex-col items-center justify-center gap-3 px-6 py-8 text-center">
          <XCircle className={`h-7 w-7 ${failure}`} />
          <h3 className="text-sm font-medium">{text('Não foi possível obter a resposta', 'Unable to get a response')}</h3>
          <p className={`max-w-md text-xs leading-5 ${muted}`}>{requestError}</p>
          <button type="button" onClick={onRetry} className={`mt-1 inline-flex items-center gap-1.5 rounded border ${border} px-3 py-1.5 text-xs hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover`}><RotateCcw className="h-3.5 w-3.5" />{text('Tentar novamente', 'Try again')}</button>
        </div> : !singleResponse ? <EmptyResponse kind="single" /> : <>
          {singleResponse.errorMessage && <p role="alert" className={`border-b ${border} px-4 py-3 text-xs ${failure}`}>{singleResponse.errorMessage}</p>}
          {activeSingleTab === 'body' && <JsonCodeView data={singleResponse.responseBody} raw={singleResponse.rawBody} />}
          {activeSingleTab === 'headers' && <table className="w-full table-fixed text-left text-xs">
            <thead className={`${muted} text-[11px]`}><tr className={`border-b ${border}`}><th className="w-[38%] px-4 py-2 font-medium">{text('Chave', 'Key')}</th><th className="px-4 py-2 font-medium">{text('Valor', 'Value')}</th><th className="w-10"><span className="sr-only">{text('Copiar', 'Copy')}</span></th></tr></thead>
            <tbody>{Object.entries(singleResponse.responseHeaders).map(([key, value]) => <tr key={key} className={`border-b ${border} hover:bg-pm-light-panel/60 dark:hover:bg-pm-dark-panel/50`}>
              <td className="break-all px-4 py-2 align-top font-mono text-[11px]">{key}</td><td className={`break-all px-4 py-2 align-top font-mono text-[11px] select-text ${muted}`}>{value}</td><td className="align-top"><button type="button" aria-label={`${text('Copiar', 'Copy')} ${key}`} onClick={() => onCopy(value, key)} className={`mt-1.5 rounded p-1.5 ${muted} hover:bg-pm-light-panelHover dark:hover:bg-pm-dark-panelHover`}><Copy className="h-3 w-3" /></button></td>
            </tr>)}</tbody>
          </table>}
          {activeSingleTab === 'tests' && <div className="px-4 py-2 text-xs">
            <TestRow state={singleResponse.statusMatch ? 'PASS' : 'FAIL'} label={text('Status HTTP esperado', 'Expected HTTP status')} detail={`${singleResponse.actualStatus || 'ERROR'} / ${singleResponse.expectedStatus}`} />
            <TestRow state={singleResponse.slaPassed ? 'PASS' : 'FAIL'} label={text('Tempo de resposta dentro do SLA', 'Response time within SLA')} detail={`${singleResponse.latencyMs} ms / ${singleResponse.maxLatencyMs} ms`} />
            <TestRow state={!currentCase?.expectedSchema ? 'SKIP' : singleResponse.schemaValid ? 'PASS' : 'FAIL'} label={text('Validação do contrato', 'Contract validation')} detail={!currentCase?.expectedSchema ? text('Não configurado', 'Not configured') : singleResponse.schemaValid ? '[SCHEMA_VALID]' : '[SCHEMA_INVALID]'} />
          </div>}
        </> : !latestRun ? <EmptyResponse kind="collection" /> : activeCollectionTab === 'cli' ? <div className="min-w-max px-4 py-4 font-mono text-[11px] leading-6">
          <p className={`mb-3 ${muted}`}>{new Date(latestRun.createdAt).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US')} · {latestRun.suite?.name || text('Coleção', 'Collection')}</p>
          {(latestRun.assertions || []).map((assertion, index) => <div key={assertion.id} className="flex items-start gap-3">
            <span className={`w-4 shrink-0 text-right ${muted}`}>{index + 1}</span>
            <span className={`w-9 shrink-0 font-medium ${passed(assertion) ? success : failure}`}>{passed(assertion) ? 'PASS' : 'FAIL'}</span>
            <span className={`w-12 shrink-0 ${muted}`}>{assertion.method}</span>
            <span>{assertion.endpoint}</span><span className={assertion.statusMatch ? success : failure}>{assertion.actualStatus || 'ERROR'}</span><span className={assertion.slaPassed ? muted : failure}>{assertion.latencyMs} ms</span>
            {assertion.errorMessage && <span className={failure}>{assertion.errorMessage}</span>}
          </div>)}
          <div className={`mt-4 border-t ${border} pt-3`}>
            <p className={latestRun.status === 'PASSED' ? success : latestRun.status === 'FAILED' ? failure : muted}>{latestRun.passedTests}/{latestRun.totalTests} {text('aprovados', 'passed')} · {latestRun.successRate}%</p>
            <p className={muted}>p95 {latestRun.p95LatencyMs} ms · p99 {latestRun.p99LatencyMs} ms · {latestRun.totalDurationMs} ms {text('no total', 'total')}</p>
          </div>
        </div> : <div className="min-w-[360px] px-4 text-xs">
          {(latestRun.assertions || []).map(assertion => <div key={assertion.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-b ${border} py-3`}>
            <ResultLabel state={passed(assertion) ? 'PASS' : 'FAIL'} /><span className="min-w-0 flex-1">{assertion.name}<span className={`mt-1 block break-all font-mono text-[10px] ${muted}`}>{assertion.method} {assertion.endpoint}</span></span>
            <span className={`font-mono text-[11px] ${assertion.statusMatch ? success : failure}`}>{assertion.actualStatus || 'ERROR'}</span><span className={`font-mono text-[11px] ${assertion.slaPassed ? muted : failure}`}>{assertion.latencyMs} ms</span>
            {assertion.errorMessage && <p className={`w-full pl-[68px] text-[11px] ${failure}`}>{assertion.errorMessage}</p>}
          </div>)}
        </div>}
      </div>
    </section>
  );
}

function TestRow({ state, label, detail }: { state: 'PASS' | 'FAIL' | 'SKIP'; label: string; detail: string }) {
  return <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-b ${border} py-3`}>
    <ResultLabel state={state} /><span className="min-w-0 flex-1">{label}</span><span className={`font-mono text-[11px] ${state === 'FAIL' ? failure : muted}`}>{detail}</span>
  </div>;
}

function EmptyResponse({ kind }: { kind: ResponseMode }) {
  const { language } = useLanguage();
  const single = kind === 'single';
  return <div className={`flex h-full min-h-[150px] flex-col items-center justify-center px-6 py-8 text-center ${muted}`}>
    <div className="relative mb-5 text-pm-light-textMuted/40 dark:text-pm-dark-textMuted/40">
      {single ? <Orbit className="h-14 w-14 stroke-[1]" /> : <Terminal className="h-12 w-12 stroke-[1]" />}
      {single && <span className="absolute -right-2 top-1 h-1.5 w-1.5 rounded-full bg-pm-orange/60" />}
    </div>
    <p className="text-[13px] font-medium text-pm-light-text dark:text-pm-dark-text">{language === 'pt' ? single ? 'Envie uma requisição para ver a resposta' : 'Nenhuma execução nesta coleção' : single ? 'Send a request to see the response' : 'No collection run yet'}</p>
    <p className="mt-2 max-w-sm text-xs leading-5">{language === 'pt' ? single ? 'Status, headers e resultados dos testes aparecerão aqui.' : 'Execute a coleção para acompanhar as requisições e seus resultados.' : single ? 'Status, headers and test results will appear here.' : 'Run the collection to inspect its requests and test results.'}</p>
  </div>;
}
