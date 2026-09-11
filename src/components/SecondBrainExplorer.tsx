import React, { useState, useEffect } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import {
  Brain, Sparkles, Search, Database, FileText, Share2, AlertTriangle,
  CheckCircle2, Plus, RefreshCw, Layers, ShieldCheck, Tag, Clock,
  ArrowRight, Filter, ChevronRight, Compass, BookOpen, AlertOctagon, HelpCircle,
  Trash2
} from 'lucide-react';
import { secondBrainClient, BrainHealthReport } from '../lib/secondBrainClient';
import { getApiUrl } from '../lib/apiConfig';

export const SecondBrainExplorer: React.FC = () => {
  const { activeBusiness, authUser, activeUser } = useVelcora();
  const tenantId = `velcora-${activeBusiness.id || 'default-store'}`;
  const userId = authUser?.uid || activeUser?.id || 'default-user';

  const [loading, setLoading] = useState(false);
  const [healthData, setHealthData] = useState<BrainHealthReport | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'memories' | 'wiki' | 'contradictions' | 'linter' | 'ingest'>('memories');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    memories: any[];
    wikiDocuments: any[];
    contradictions: any[];
  }>({ memories: [], wikiDocuments: [], contradictions: [] });

  // Delete & Clear confirm states
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Ingest form state
  const [newContent, setNewContent] = useState('');
  const [newClassification, setNewClassification] = useState<'knowledge' | 'decision' | 'memory' | 'insight'>('knowledge');
  const [newTier, setNewTier] = useState<'permanent' | 'contextual' | 'temporary'>('permanent');
  const [newAuthority, setNewAuthority] = useState<'PRIMARY' | 'USER_PROVIDED' | 'SYSTEM_GENERATED'>('PRIMARY');
  const [newTags, setNewTags] = useState('policy, operations');
  const [ingestSuccess, setIngestSuccess] = useState(false);

  // Lint state
  const [lintReport, setLintReport] = useState<any>(null);
  const [linting, setLinting] = useState(false);

  const handleDeleteMemory = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      await secondBrainClient.deleteMemory(id, tenantId);
      setConfirmDeleteId(null);
      await loadBrainData();
    } catch (err) {
      console.warn('Failed to delete memory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllMemories = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await secondBrainClient.clearUserMemories(tenantId, userId);
      setConfirmClearAll(false);
      await loadBrainData();
    } catch (err) {
      console.warn('Failed to clear memories:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial health and search
  const loadBrainData = async () => {
    setLoading(true);
    try {
      const [health, searchRes] = await Promise.all([
        secondBrainClient.getHealth(tenantId),
        secondBrainClient.search(searchQuery || 'business', tenantId),
      ]);

      if (health) setHealthData(health);
      if (searchRes) {
        setSearchResults({
          memories: searchRes.memories || [],
          wikiDocuments: searchRes.wikiDocuments || [],
          contradictions: searchRes.contradictions || [],
        });
      }
    } catch (err) {
      console.warn('Failed to load second brain data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrainData();
  }, [activeBusiness.id]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await secondBrainClient.search(searchQuery, tenantId);
      if (res) {
        setSearchResults({
          memories: res.memories || [],
          wikiDocuments: res.wikiDocuments || [],
          contradictions: res.contradictions || [],
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setLoading(true);
    try {
      const tagsArray = newTags.split(',').map(t => t.trim()).filter(Boolean);
      await secondBrainClient.storeMemory({
        tenantId,
        content: newContent.trim(),
        classification: newClassification,
        tier: newTier,
        authority: newAuthority,
        tags: tagsArray,
      });

      setNewContent('');
      setIngestSuccess(true);
      setTimeout(() => setIngestSuccess(false), 3000);
      await loadBrainData();
      setActiveSubTab('memories');
    } finally {
      setLoading(false);
    }
  };

  const handleRunLint = async () => {
    setLinting(true);
    try {
      const res = await fetch(getApiUrl('/api/second-brain/memory/lint'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
      });
      const data = await res.json();
      if (data.success) {
        setLintReport(data.report);
      }
    } catch (err) {
      console.warn('Linter error:', err);
    } finally {
      setLinting(false);
    }
  };

  return (
    <div id="velcora-second-brain-explorer" className="space-y-5">
      {/* Top Banner & Quick Metrics */}
      <div className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-[#19253F] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-cyan-500/10 border border-blue-200 dark:border-cyan-500/30 flex items-center justify-center text-blue-600 dark:text-[#06B6D4]">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
                  Velcora Second Brain & Knowledge Core
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-cyan-500/10 dark:text-cyan-400 border border-blue-200 dark:border-cyan-500/30">
                  TENANT ISOLATED
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                Deterministic hierarchical memory, wiki documents, cross-entity relationships, and contradiction tracking.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {confirmClearAll ? (
              <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/20 p-1.5 rounded-xl border border-red-200 dark:border-red-900/30">
                <span className="text-[10px] text-red-600 dark:text-red-400 font-bold px-1">Are you sure?</span>
                <button
                  onClick={handleClearAllMemories}
                  className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold transition cursor-pointer"
                >
                  Yes, Clear All
                </button>
                <button
                  onClick={() => setConfirmClearAll(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1E2E4A] text-slate-700 dark:text-[#94A3B8] text-[10px] font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClearAll(true)}
                disabled={loading}
                className="px-3.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-900/30 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Memories</span>
              </button>
            )}
            <button
              onClick={loadBrainData}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#18233B] hover:bg-slate-200 dark:hover:bg-[#1E2E4A] text-slate-700 dark:text-[#F8FAFC] text-xs font-bold border border-slate-200 dark:border-[#19253F] flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Brain</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8] text-[11px] font-bold">
              <span>Structured Memories</span>
              <Database className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">
              {healthData?.stats.memoriesCount ?? searchResults.memories.length}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Tiered & Deduplicated</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8] text-[11px] font-bold">
              <span>Wiki Documents</span>
              <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">
              {healthData?.stats.wikiDocsCount ?? searchResults.wikiDocuments.length}
            </div>
            <div className="text-[10px] text-blue-600 dark:text-cyan-400 font-semibold">Wikilinks & Backlinks</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8] text-[11px] font-bold">
              <span>Relationships</span>
              <Share2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">
              {healthData?.stats.relationshipsCount ?? 8}
            </div>
            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">Directed Graph Edges</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8] text-[11px] font-bold">
              <span>Contradictions</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">
              {healthData?.stats.contradictionsCount ?? searchResults.contradictions.length}
            </div>
            <div className="text-[10px] text-amber-500 font-semibold">Preserved & Traced</div>
          </div>
        </div>
      </div>

      {/* Sub Tabs & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#1F2E4D] pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveSubTab('memories')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'memories'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#111C30] text-slate-600 dark:text-[#94A3B8] border border-slate-200 dark:border-[#1F2E4D]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Memories ({searchResults.memories.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('wiki')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'wiki'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#111C30] text-slate-600 dark:text-[#94A3B8] border border-slate-200 dark:border-[#1F2E4D]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Wiki Docs ({searchResults.wikiDocuments.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('contradictions')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'contradictions'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#111C30] text-slate-600 dark:text-[#94A3B8] border border-slate-200 dark:border-[#1F2E4D]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Contradictions ({searchResults.contradictions.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('ingest')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'ingest'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#111C30] text-slate-600 dark:text-[#94A3B8] border border-slate-200 dark:border-[#1F2E4D]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Memory</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('linter');
              if (!lintReport) handleRunLint();
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'linter'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#111C30] text-slate-600 dark:text-[#94A3B8] border border-slate-200 dark:border-[#1F2E4D]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Health Linter</span>
          </button>
        </div>

        <form onSubmit={handleSearch} className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories & wiki..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
          />
        </form>
      </div>

      {/* Tab 1: Structured Memories */}
      {activeSubTab === 'memories' && (
        <div className="space-y-3">
          {searchResults.memories.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-[#19253F] rounded-3xl space-y-2">
              <Database className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-[#94A3B8]">No memories matched your query</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Interact with Ask Velcora AI or use the "Add Memory" tab above to record durable business facts.
              </p>
            </div>
          ) : (
            searchResults.memories.map((mem, idx) => (
              <div
                key={mem.id || idx}
                className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-[#19253F] rounded-2xl p-4 space-y-2.5 shadow-2xs hover:border-blue-300 dark:hover:border-cyan-500/40 transition"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-cyan-400 uppercase">
                      {mem.classification || 'knowledge'}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700 dark:bg-[#152644] dark:text-[#94A3B8]">
                      Tier: {mem.tier || 'permanent'}
                    </span>
                    {mem.authority && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        {mem.authority}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {mem.updatedAt ? new Date(mem.updatedAt).toLocaleDateString() : 'Active'}
                    </span>
                    {confirmDeleteId === mem.id ? (
                      <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded-lg border border-red-200 dark:border-red-900/30">
                        <button
                          onClick={() => handleDeleteMemory(mem.id)}
                          className="px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold transition cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1E2E4A] text-slate-700 dark:text-[#94A3B8] text-[9px] font-bold transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(mem.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-[#19253F] transition cursor-pointer"
                        title="Delete memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-800 dark:text-[#F8FAFC] leading-relaxed">
                  {mem.content}
                </p>

                {mem.tags && mem.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <Tag className="w-3 h-3 text-slate-400" />
                    {mem.tags.map((t: string, i: number) => (
                      <span key={i} className="text-[10px] bg-slate-100 dark:bg-[#18233B] text-slate-600 dark:text-[#94A3B8] px-2 py-0.5 rounded-full">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Wiki Documents */}
      {activeSubTab === 'wiki' && (
        <div className="space-y-3">
          {searchResults.wikiDocuments.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-[#19253F] rounded-3xl space-y-2">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-[#94A3B8]">No wiki documents found</p>
              <p className="text-xs text-slate-500">
                Documents are created automatically across Entities, Concepts, and System Categories.
              </p>
            </div>
          ) : (
            searchResults.wikiDocuments.map((doc, idx) => (
              <div
                key={doc.id || idx}
                className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-[#19253F] rounded-2xl p-4 space-y-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                    <span>{doc.title}</span>
                  </h4>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 uppercase">
                    {doc.category}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed line-clamp-3">
                  {doc.content}
                </p>

                {doc.wikilinks && doc.wikilinks.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-blue-600 dark:text-cyan-400">
                    <span className="text-slate-400 text-[10px]">Wikilinks:</span>
                    {doc.wikilinks.map((link: string, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 bg-blue-50 dark:bg-[#152644] rounded-md font-mono text-[10px]">
                        [[{link}]]
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Contradictions */}
      {activeSubTab === 'contradictions' && (
        <div className="space-y-3">
          {searchResults.contradictions.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-[#19253F] rounded-3xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-[#94A3B8]">No active contradictions recorded</p>
              <p className="text-xs text-slate-500">
                When conflicting business statements arise, Second Brain logs both claims without destructive overwrite.
              </p>
            </div>
          ) : (
            searchResults.contradictions.map((item, idx) => (
              <div
                key={item.id || idx}
                className="bg-white dark:bg-[#0B101D] border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 space-y-3 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-[#F8FAFC]">
                      Topic: {item.topic}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 uppercase">
                    {item.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Claim A (Historical)</span>
                    <p className="text-slate-700 dark:text-[#94A3B8]">{item.oldClaim}</p>
                    <span className="text-[9px] text-slate-400 font-mono">Authority: {item.oldAuthority || 'PRIMARY'}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] space-y-1">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-cyan-400 uppercase">Claim B (Newer)</span>
                    <p className="text-slate-700 dark:text-[#94A3B8]">{item.newClaim}</p>
                    <span className="text-[9px] text-slate-400 font-mono">Authority: {item.newAuthority || 'PRIMARY'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Health Linter */}
      {activeSubTab === 'linter' && (
        <div className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-[#19253F] rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-[#F8FAFC]">Second Brain Health Diagnostics</h4>
            </div>
            <button
              onClick={handleRunLint}
              disabled={linting}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${linting ? 'animate-spin' : ''}`} />
              <span>Run Linter</span>
            </button>
          </div>

          {lintReport ? (
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D]">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-slate-800 dark:text-[#F8FAFC]">
                  Linter Status: {lintReport.valid ? 'All Schemas & Backlinks Valid' : 'Warnings Detected'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 bg-slate-50 dark:bg-[#111C30] rounded-xl border border-slate-200 dark:border-[#1F2E4D]">
                  <span className="text-[10px] text-slate-400">Total Memories</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white">{lintReport.stats?.totalMemories ?? 0}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#111C30] rounded-xl border border-slate-200 dark:border-[#1F2E4D]">
                  <span className="text-[10px] text-slate-400">Wiki Documents</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white">{lintReport.stats?.totalWikiDocuments ?? 0}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#111C30] rounded-xl border border-slate-200 dark:border-[#1F2E4D]">
                  <span className="text-[10px] text-slate-400">Broken Links</span>
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{lintReport.stats?.brokenWikilinksCount ?? 0}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#111C30] rounded-xl border border-slate-200 dark:border-[#1F2E4D]">
                  <span className="text-[10px] text-slate-400">Contradictions</span>
                  <div className="text-base font-bold text-amber-500">{lintReport.stats?.activeContradictionsCount ?? 0}</div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Running diagnostic audit...</p>
          )}
        </div>
      )}

      {/* Tab 5: Ingest New Memory */}
      {activeSubTab === 'ingest' && (
        <form onSubmit={handleIngest} className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-[#19253F] rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-[#1F2E4D]">
            <Plus className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-[#F8FAFC]">Record Structured Store Knowledge</h4>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">
                Knowledge Statement / Policy / Decision Content
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="e.g. Free shipping minimum order value is set to $75 for all VIP customer accounts."
                rows={3}
                required
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Classification</label>
                <select
                  value={newClassification}
                  onChange={(e: any) => setNewClassification(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-800 dark:text-[#F8FAFC]"
                >
                  <option value="knowledge">Knowledge (Fact)</option>
                  <option value="decision">Decision (Policy)</option>
                  <option value="memory">General Memory</option>
                  <option value="insight">Insight</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Retention Tier</label>
                <select
                  value={newTier}
                  onChange={(e: any) => setNewTier(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-800 dark:text-[#F8FAFC]"
                >
                  <option value="permanent">Permanent (Core Store Knowledge)</option>
                  <option value="contextual">Contextual (Session/Quarterly)</option>
                  <option value="temporary">Temporary (Scratchpad)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Authority Level</label>
                <select
                  value={newAuthority}
                  onChange={(e: any) => setNewAuthority(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-800 dark:text-[#F8FAFC]"
                >
                  <option value="PRIMARY">PRIMARY (Executive Directive)</option>
                  <option value="USER_PROVIDED">USER_PROVIDED (Store Operator)</option>
                  <option value="SYSTEM_GENERATED">SYSTEM_GENERATED (AI Inferred)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="shipping, vip, pricing"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-800 dark:text-[#F8FAFC]"
              />
            </div>

            {ingestSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Memory stored and indexed successfully!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-2xs transition active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Commit to Second Brain</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
