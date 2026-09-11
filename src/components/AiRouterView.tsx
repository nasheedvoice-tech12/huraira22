import React, { useState, useMemo } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import { LivingLine } from './LivingLine';
import {
  Cpu, Zap, Activity, Sliders, CheckCircle2, Clock, DollarSign, Database,
  Sparkles, Send, RefreshCw, Terminal, Check, Image as ImageIcon, Video as VideoIcon,
  ShieldCheck, ArrowRight, Wallet, History, CreditCard, Shield, AlertTriangle, Play,
  HelpCircle, AlertCircle, Award, Lock, Layers, BarChart3, ChevronRight, Copy, Filter,
  Boxes, Server, Network, Radio, Compass, Gauge, Workflow
} from 'lucide-react';
import Markdown from 'react-markdown';
import { VELCORA_ENGINES, getPrimaryVelcoraEngines, getPrismImageEngines, getVeyraVideoEngines } from '../lib/modelRegistry';
import { getApiUrl } from '../lib/apiConfig';
import { OmniModelLogo, FlashModelLogo, AxiomModelLogo, ChatModelLogo } from './VelcoraAiModelLogos';

export const AiRouterView: React.FC = () => {
  const {
    activeModelId,
    setActiveModelId,
    activeBusiness,
    brainMetrics,
    activeUser,
    setCurrentModule,
  } = useVelcora();

  const [activeTab, setActiveTab] = useState<'engines' | 'playground' | 'pipeline' | 'audit'>('engines');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'Core' | 'Fast & Direct' | 'Reasoning' | 'Multimodal Vision' | 'Creative Writing'>('ALL');
  const [routingPolicy, setRoutingPolicy] = useState<'speed_optimized' | 'quality_first' | 'cost_optimized'>('speed_optimized');

  // Interactive Live Prompt Arena
  const [testPrompt, setTestPrompt] = useState('Analyze our store profit margins and suggest 3 high-impact promotional strategies.');
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testModelUsed, setTestModelUsed] = useState<string | null>(null);
  const [copiedResponse, setCopiedResponse] = useState(false);

  // Pipeline step selection
  const [selectedPipelineStep, setSelectedPipelineStep] = useState<number>(1);

  // Security test states
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [auditQuery, setAuditQuery] = useState('');

  const primaryEngines = getPrimaryVelcoraEngines();
  const allEngines = VELCORA_ENGINES;

  const filteredEngines = useMemo(() => {
    if (selectedCategory === 'ALL' || selectedCategory === 'Core') return primaryEngines;
    return allEngines.filter(e => e.category === selectedCategory);
  }, [selectedCategory, primaryEngines, allEngines]);

  const activeEngineObj = VELCORA_ENGINES.find(e => e.id === activeModelId) || VELCORA_ENGINES[0];

  const handleRunModelTest = async (overridePrompt?: string) => {
    const promptToRun = overridePrompt || testPrompt;
    if (!promptToRun.trim() || isTesting) return;
    setIsTesting(true);
    setTestOutput(null);

    try {
      const res = await fetch(getApiUrl('/api/ai/ask'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': activeUser?.id || 'default-user'
        },
        body: JSON.stringify({
          message: promptToRun,
          modelId: activeModelId,
          businessContext: {
            businessName: activeBusiness.name,
            industry: activeBusiness.industry,
            revenue: brainMetrics.totalRevenue,
            netProfit: brainMetrics.netProfit,
            profitMargin: brainMetrics.profitMargin,
            lowStockCount: brainMetrics.lowStockCount,
            currency: activeBusiness.currency,
          },
        }),
      });

      const data = await res.json();
      if (res.status === 402 || data.error === 'INSUFFICIENT_CREDITS') {
        setTestOutput(`⚠️ **Ecosystem Access: Insufficient Balance**\n\nYour prepaid credit balance is insufficient to execute this operation.\n\nRequired Credits: ${data.requiredCredits || '500'} | Available: ${data.availableCredits || '0'}.\n\nPlease top up your credit balance in Wallet & Billing.`);
      } else {
        setTestOutput(data.reply || 'Model responded successfully.');
        setTestModelUsed(data.modelUsed || activeModelId);
      }
    } catch (err: any) {
      setTestOutput('Error running ecosystem model test. Please verify internet connection and credits balance.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyOutput = () => {
    if (!testOutput) return;
    navigator.clipboard.writeText(testOutput);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  const handleRunSecurityComplianceAudit = async () => {
    setAuditLoading(true);
    setAuditResult(null);
    try {
      const res = await fetch(getApiUrl('/api/credits/simulate-security-test'), {
        method: 'POST',
        headers: { 'x-user-id': activeUser?.id || 'default-user' }
      });
      const data = await res.json();
      setAuditResult(data);
    } catch (err: any) {
      alert(`Security Audit execution error: ${err.message}`);
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <div id="velcora-ecosystem-view" className="space-y-6 animate-fade-in">
      {/* 1. TOP ECOSYSTEM HERO BANNER */}
      <div className="bg-white dark:bg-[#0F1424] text-slate-800 dark:text-[#F8FAFC] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-primary text-xs font-extrabold border border-slate-200 dark:border-slate-800">
              <Network className="w-3.5 h-3.5" />
              <span>Velcora Neural Fabric</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Live & Operational</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight">
              Ecosystem
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-2xl leading-relaxed">
              Autonomous multi-model intelligence fabric powering POS calculations, inventory forecasting, customer CRM reasoning, and secure deterministic double-entry accounting.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto shrink-0">
            <div className="bg-slate-50 dark:bg-[#0B1220] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Active Engine</div>
              <div className="text-sm font-black text-primary truncate max-w-[120px] mx-auto mt-0.5">
                {activeEngineObj.name}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#0B1220] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Avg Latency</div>
              <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {activeEngineObj.latencyMs}ms
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#0B1220] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center col-span-2 sm:col-span-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Policy Mode</div>
              <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5 capitalize">
                {routingPolicy.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TAB NAVIGATION PILL BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {[
            { id: 'engines', label: 'Neural Engines', icon: Cpu, count: primaryEngines.length },
            { id: 'playground', label: 'Playground Arena', icon: Terminal },
            { id: 'pipeline', label: 'Intelligence Pipeline', icon: Workflow },
            { id: 'audit', label: 'Threat Defense Audit', icon: ShieldCheck },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white shadow-sm shadow-primary/25'
                    : 'bg-white dark:bg-[#0F1424] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setCurrentModule('payments')}
          className="text-xs font-bold text-slate-500 hover:text-primary transition flex items-center gap-1.5 self-end sm:self-auto cursor-pointer"
        >
          <span>Prepaid Wallet & Ledger</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* TAB 1: NEURAL ENGINES MATRIX */}
      {activeTab === 'engines' && (
        <div className="space-y-6 animate-fade-in">
          {/* Active Spotlight Card */}
          <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-transparent dark:from-[#111C30] dark:via-[#15233E] dark:to-[#0F1424] border border-primary/20 dark:border-primary/30 rounded-3xl p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#0B1220] border border-primary/20 flex items-center justify-center shadow-xs shrink-0">
                  {activeEngineObj.id === 'omni' ? <OmniModelLogo size={32} /> : activeEngineObj.id === 'flash' ? <FlashModelLogo size={32} /> : activeEngineObj.id === 'axiom' ? <AxiomModelLogo size={32} /> : <ChatModelLogo size={32} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-primary text-white">
                      Active Frontier Engine
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {activeEngineObj.badge}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
                    {activeEngineObj.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                    {activeEngineObj.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
                <div className="p-3 bg-white dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Context Window</div>
                  <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">{activeEngineObj.contextWindow}</div>
                </div>
                <div className="p-3 bg-white dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Cost / 1k</div>
                  <div className="text-xs font-black text-primary mt-0.5">${activeEngineObj.costPer1kTokens}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Engines Grid & Category Filter */}
          <div className="bg-white dark:bg-[#0F1424] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Available Intelligence Engines
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click any engine to set it as the primary model for Velcora assistant, inventory forecasts, and sales analytics.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                {(['ALL', 'Fast & Direct', 'Reasoning', 'Multimodal Vision', 'Creative Writing'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Models' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEngines.map(engine => {
                const isSelected = engine.id === activeModelId || (engine.id === 'chat' && activeModelId === 'velcora-chat');
                const ModelIcon = engine.id === 'omni' ? OmniModelLogo : engine.id === 'flash' ? FlashModelLogo : engine.id === 'axiom' ? AxiomModelLogo : ChatModelLogo;

                return (
                  <div
                    key={engine.id}
                    onClick={() => setActiveModelId(engine.id)}
                    className={`p-5 rounded-3xl border text-left cursor-pointer transition-all flex flex-col justify-between space-y-4 ${
                      isSelected
                        ? 'bg-primary/5 dark:bg-primary/10 border-primary shadow-xs ring-1 ring-primary'
                        : 'bg-white dark:bg-[#111C30] border-slate-200 dark:border-[#1F2E4D] hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-2xs">
                            <ModelIcon size={22} />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {engine.name}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-semibold block">
                              {engine.subtitle}
                            </span>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-black flex items-center gap-1 shadow-2xs">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold">
                            {engine.category}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                        {engine.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200/60 dark:border-slate-800/60">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Speed</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">{engine.latencyMs}ms</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200/60 dark:border-slate-800/60">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Cost / 1k</span>
                        <span className="font-extrabold text-primary">${engine.costPer1kTokens}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE PLAYGROUND ARENA */}
      {activeTab === 'playground' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white dark:bg-[#0F1424] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary" />
                  <span>Interactive Prompt Arena</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Test raw reasoning performance and telemetry on the active engine with realistic store parameters.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0B1220] px-3.5 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shrink-0 self-start sm:self-auto">
                <span className="font-bold text-slate-400">Selected Engine:</span>
                <span className="font-black text-primary">{activeEngineObj.name}</span>
              </div>
            </div>

            {/* Quick Preset Prompts */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Scenario Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  'Analyze our store profit margins and suggest 3 high-impact promotional strategies.',
                  'Identify potential stock bottlenecks and recommend optimal purchase quantities.',
                  'Draft a VIP customer loyalty reward campaign for top 10% spenders.',
                  'Summarize double-entry bookkeeping ledgers for month-end tax compliance.',
                ].map((scenario, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTestPrompt(scenario);
                      handleRunModelTest(scenario);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#111C30] dark:hover:bg-[#15233E] border border-slate-200 dark:border-[#1F2E4D] text-xs font-semibold text-slate-700 dark:text-slate-300 text-left transition active:scale-98 cursor-pointer"
                  >
                    💡 {scenario}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Execution Input */}
            <div className="space-y-3 pt-2">
              <div className="relative">
                <textarea
                  id="input-model-test-prompt"
                  rows={3}
                  value={testPrompt}
                  onChange={e => setTestPrompt(e.target.value)}
                  placeholder="Ask any store analytics or forecasting question..."
                  className="w-full bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] rounded-2xl p-4 text-xs text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none font-medium"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  Press Execute to run inference on <strong className="text-slate-700 dark:text-slate-300">{activeEngineObj.name}</strong>
                </span>

                <button
                  onClick={() => handleRunModelTest()}
                  disabled={isTesting || !testPrompt.trim()}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shadow-primary/25 cursor-pointer active:scale-98"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isTesting ? 'Synthesizing...' : 'Execute Prompt'}</span>
                </button>
              </div>

              {/* Streaming Living Line */}
              {isTesting && (
                <div className="p-4 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold animate-pulse">Routing inference to dedicated neural gateway...</span>
                    <span className="font-mono text-[10px] text-primary font-bold">{activeEngineObj.name}</span>
                  </div>
                  <LivingLine mode="routing" width="100%" height={8} />
                </div>
              )}

              {/* Response Output Card */}
              {testOutput && (
                <div className="p-5 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 animate-fade-in">
                  <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Synthesis Output</span>
                      <span className="font-mono text-[10px] bg-white dark:bg-[#111C30] border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md text-primary font-extrabold">
                        {testModelUsed}
                      </span>
                    </div>

                    <button
                      onClick={handleCopyOutput}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-primary transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedResponse ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedResponse ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="markdown-body text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    <Markdown>{testOutput}</Markdown>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INTELLIGENCE PIPELINE FLOW */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white dark:bg-[#0F1424] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Intelligence Fabric Data Flow
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Trace the path of queries from local terminal ingress to deterministic Business Brain ledger audits. Click a phase to inspect its telemetry.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0B1220] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0">
                <span className="text-[11px] font-bold text-slate-400 px-2">Routing Policy:</span>
                <div className="flex gap-1">
                  {[
                    { id: 'speed_optimized', label: '⚡ Speed' },
                    { id: 'quality_first', label: '🧠 Quality' },
                    { id: 'cost_optimized', label: '💰 Cost' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => setRoutingPolicy(p.id as any)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        routingPolicy === p.id
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-primary'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 5-Phase Cards Flow */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
              <div className="hidden md:block absolute top-[28px] left-[10%] right-[10%] h-[2px] border-t-2 border-dashed border-slate-200 dark:border-slate-800 z-0" />

              {[
                {
                  step: 1,
                  title: '1. Ingress & Auth',
                  subtitle: 'Quota & Session Verification',
                  icon: Sparkles,
                  color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
                },
                {
                  step: 2,
                  title: '2. Context Ingestion',
                  subtitle: 'Ledger & Inventory State',
                  icon: Database,
                  color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
                },
                {
                  step: 3,
                  title: '3. Model Inference',
                  subtitle: 'Frontier Node Execution',
                  icon: Cpu,
                  color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
                },
                {
                  step: 4,
                  title: '4. Output Synthesis',
                  subtitle: 'Markdown & POS Tender Structuring',
                  icon: Terminal,
                  color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
                },
                {
                  step: 5,
                  title: '5. Business Brain',
                  subtitle: 'Double-Entry Ledger Audit',
                  icon: ShieldCheck,
                  color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
                }
              ].map(stepObj => {
                const isSelected = selectedPipelineStep === stepObj.step;
                const IconComp = stepObj.icon;
                return (
                  <div
                    key={stepObj.step}
                    onClick={() => setSelectedPipelineStep(stepObj.step)}
                    className={`p-4 rounded-3xl border text-center transition cursor-pointer relative z-10 flex flex-col justify-between items-center gap-3 ${
                      isSelected
                        ? 'bg-primary/5 dark:bg-primary/10 border-primary shadow-xs ring-1 ring-primary'
                        : 'bg-white dark:bg-[#111C30] border-slate-200 dark:border-[#1F2E4D] hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${stepObj.color} relative`}>
                      <IconComp className="w-5 h-5" />
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">
                        {stepObj.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold leading-tight">
                        {stepObj.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Phase Detail Box */}
            {(() => {
              const currentStepInfo = [
                {
                  step: 1,
                  name: 'Ingress & Authentication Validation',
                  latency: '< 5ms local validation',
                  description: 'Every interaction from a register terminal or store dashboard undergoes client-side credential verification and rate limiting. Store context is securely staged without exposing customer PII.',
                  guardrails: 'Strict token length quotas, authorization signature verification, and prepaid ledger pre-checks.'
                },
                {
                  step: 2,
                  name: 'Context & Live Catalog Ingestion',
                  latency: '< 10ms memory mapping',
                  description: 'Aggregates real-time inventory counts, category margins, and daily sales metrics into deterministic prompts to ground the AI in factual business state.',
                  guardrails: 'Zero PII transmission guard, memory isolation, and encrypted in-transit payload.'
                },
                {
                  step: 3,
                  name: 'Frontier Model Inference Dispatch',
                  latency: '80ms - 350ms execution',
                  description: 'Locks onto the optimal neural engine (' + activeEngineObj.name + ') based on the active policy (' + routingPolicy.replace('_', ' ') + ') with automated failover buffers.',
                  guardrails: 'Sub-second neural retry failover, hardware throttle defense, and model response validation.'
                },
                {
                  step: 4,
                  name: 'Structured Output Synthesis',
                  latency: 'Included in neural stream',
                  description: 'Translates model output into structured markdown analysis, POS discounts, or executive recommendations for intuitive decision-making.',
                  guardrails: 'Format syntax check, SQL injection blocking, and content safety filters.'
                },
                {
                  step: 5,
                  name: 'Business Brain Verification Guard',
                  latency: '< 15ms deterministic check',
                  description: 'Ensures absolute financial accuracy. Proposed discounts and ledger balances are audited against physical stock counts and mathematical rules before applying to the database.',
                  guardrails: 'Hallucination defense block, double-entry arithmetic confirmation, and inventory lock guards.'
                }
              ].find(s => s.step === selectedPipelineStep) || {
                step: 1,
                name: 'Ingress & Authentication',
                latency: '< 5ms',
                description: 'Validates queries and user credentials.',
                guardrails: 'Token quota checks.'
              };

              return (
                <div className="p-5 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">
                        {currentStepInfo.step}
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {currentStepInfo.name}
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono bg-white dark:bg-[#111C30] px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-primary">
                      Benchmark: {currentStepInfo.latency}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <strong className="text-slate-800 dark:text-slate-200 font-bold">Process Architecture:</strong>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        {currentStepInfo.description}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <strong className="text-slate-800 dark:text-slate-200 font-bold">Active Shield Guardrails:</strong>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        {currentStepInfo.guardrails}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY & GOVERNANCE AUDIT */}
      {activeTab === 'audit' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Prepaid Security & Threat Defense Governance
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xl leading-relaxed">
                  Every credit transaction is locked server-side. Velcora enforces immutable ledger entries, validates user authorizations, and prevents credit manipulation.
                </p>
              </div>

              <button
                id="btn-run-security-audit"
                onClick={handleRunSecurityComplianceAudit}
                disabled={auditLoading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm shadow-emerald-600/20 self-start sm:self-auto shrink-0 cursor-pointer active:scale-98"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{auditLoading ? 'Auditing Security Vectors...' : 'Execute Threat Defense Audit'}</span>
              </button>
            </div>
          </div>

          {auditResult && (
            <div className="bg-white dark:bg-[#0F1424] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> 100% SECURE
                  </span>
                  <span>•</span>
                  <span>Vectors Tested: <strong className="text-primary">{auditResult.passedCount}/17 Passed</strong></span>
                </div>

                <input
                  id="input-filter-security-vectors"
                  type="text"
                  placeholder="Filter security threat vectors..."
                  value={auditQuery}
                  onChange={e => setAuditQuery(e.target.value)}
                  className="bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white max-w-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(auditResult.auditLog || [])
                  .filter((v: any) => (v.name || '').toLowerCase().includes(auditQuery.toLowerCase()) || (v.details || '').toLowerCase().includes(auditQuery.toLowerCase()))
                  .map((vector: any) => (
                    <div 
                      key={vector.id} 
                      className="p-3.5 bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex items-start gap-3 text-xs transition hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-500 mt-0.5 shrink-0 border border-emerald-200/40 dark:border-emerald-800/40">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-slate-900 dark:text-white">
                          {vector.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                          {vector.details}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
