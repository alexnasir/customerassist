import React, { useEffect, useState } from 'react';
import { 
  Cpu, 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  Trash2, 
  ShieldAlert, 
  Clock, 
  DollarSign, 
  TrendingUp,
  Activity,
  Award,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { PromptVersion, PromptTest } from '../types.js';

export default function PromptView() {
  const [prompts, setPrompts] = useState<PromptVersion[]>([]);
  const [tests, setTests] = useState<PromptTest[]>([]);
  const [loading, setLoading] = useState(true);

  // New prompt input form
  const [showCreatePrompt, setShowCreatePrompt] = useState(false);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState<'en' | 'sw'>('en');
  const [creating, setCreating] = useState(false);

  // New A/B Test input form
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [testName, setTestName] = useState('');
  const [promptA, setPromptA] = useState('');
  const [promptB, setPromptB] = useState('');

  const loadPromptData = async () => {
    try {
      const pRes = await fetch('/api/prompts');
      const tRes = await fetch('/api/prompts/tests');
      if (pRes.ok && tRes.ok) {
        setPrompts(await pRes.json());
        setTests(await tRes.json());
      }
    } catch (e) {
      console.error('Failed to load prompt data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !content || creating) return;

    setCreating(true);
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content, language })
      });
      if (res.ok) {
        setShowCreatePrompt(false);
        setName('');
        setContent('');
        loadPromptData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      const res = await fetch(`/api/prompts/${id}/activate`, { method: 'POST' });
      if (res.ok) {
        loadPromptData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/prompts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadPromptData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateABTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName || !promptA || !promptB) return;

    try {
      const res = await fetch('/api/prompts/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: testName, promptAId: promptA, promptBId: promptB })
      });
      if (res.ok) {
        setShowCreateTest(false);
        setTestName('');
        setPromptA('');
        setPromptB('');
        loadPromptData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteTest = async (id: string) => {
    try {
      const res = await fetch(`/api/prompts/tests/${id}/complete`, { method: 'POST' });
      if (res.ok) {
        loadPromptData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadPromptData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#090D16]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#090D16] p-8 overflow-y-auto" id="prompt-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b border-[#1E293B] pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Prompt Versioning & A/B Testing</h2>
          <p className="text-sm text-gray-400 mt-1">Manage system prompts dynamically, run automated evaluation scores, and launch A/B comparisons.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateTest(true)}
            className="bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-indigo-400 text-xs font-bold px-4 py-2.5 rounded-lg transition-all duration-150"
          >
            Launch A/B Test
          </button>
          <button
            onClick={() => setShowCreatePrompt(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md shadow-cyan-950/40 transition-all duration-150"
          >
            Add New Version
          </button>
        </div>
      </div>

      {/* Grid: Left - Prompts / Right - A/B Tests */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Prompt Version Ledger (Span 2) */}
        <div className="xl:col-span-2 space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Prompt Templates Registry
          </h3>

          <div className="space-y-4">
            {prompts.map((p) => (
              <div 
                key={p.id}
                className={`bg-[#0F172A] border rounded-xl p-5 relative overflow-hidden transition-all duration-200 ${
                  p.isActive ? 'border-cyan-500/40 shadow-lg shadow-cyan-950/20' : 'border-[#1E293B]'
                }`}
              >
                {p.isActive && (
                  <div className="absolute top-0 right-0 bg-cyan-600 text-white text-[9px] font-bold px-3 py-1 rounded-bl-lg tracking-wider uppercase">
                    Active System
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white text-base flex items-center gap-2">
                      {p.name}
                      <span className="text-xs bg-[#1E293B] px-2 py-0.5 rounded text-gray-400 font-mono">v{p.version}</span>
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        p.language === 'sw' ? 'bg-indigo-950/50 text-indigo-400' : 'bg-cyan-950/40 text-cyan-400'
                      }`}>
                        {p.language.toUpperCase()}
                      </span>
                    </h4>
                    <p className="text-[10px] text-gray-500 font-medium mt-1">Created: {new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!p.isActive && (
                      <>
                        <button
                          onClick={() => handleActivate(p.id)}
                          className="bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-cyan-800/30 transition-all duration-150"
                        >
                          Activate
                        </button>
                        {/* <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 bg-rose-950/20 text-rose-400 hover:text-white hover:bg-rose-950 border border-rose-900/20 rounded-lg transition-all duration-150"
                          title="Delete Version"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button> */}
                      </>
                    )}
                  </div>
                </div>

                {/* Prompt block preview */}
                <div className="mt-4 bg-[#090D16] p-3.5 rounded-lg border border-[#1E293B] text-xs font-mono text-gray-400 max-h-24 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                  {p.content}
                </div>

                {/* Evaluator metrics underneath */}
                <div className="mt-4 pt-3 border-t border-[#1E293B] grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="bg-[#101726] p-2 rounded-lg border border-[#1E293B]">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Eval Score</span>
                    <span className="text-sm font-bold text-cyan-400 mt-0.5 block">{p.evaluationScore} / 100</span>
                  </div>
                  <div className="bg-[#101726] p-2 rounded-lg border border-[#1E293B]">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">CSAT Target</span>
                    <span className="text-sm font-bold text-indigo-400 mt-0.5 block">{p.language === 'sw' ? '4.4' : '4.7'} / 5</span>
                  </div>
                  <div className="bg-[#101726] p-2 rounded-lg border border-[#1E293B]">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Est. Latency</span>
                    <span className="text-sm font-bold text-pink-400 mt-0.5 block">{p.latencyMs} ms</span>
                  </div>
                  <div className="bg-[#101726] p-2 rounded-lg border border-[#1E293B]">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Token Cost</span>
                    <span className="text-sm font-bold text-gray-300 mt-0.5 block">${p.costPer1kTokens.toFixed(4)}/1k</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Active A/B Testing Lab */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-6 rounded-2xl h-fit">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-indigo-400" />
            A/B Testing Laboratory
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed mb-6">Create comparative models to test different systemic prompts under similar traffic conditions. Measure success ratios dynamically.</p>

          <div className="space-y-6">
            {tests.map((test) => (
              <div key={test.id} className="bg-[#090D16] border border-[#1E293B] p-5 rounded-xl">
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-xs font-bold text-white">{test.name}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    test.status === 'running' 
                      ? 'bg-amber-950/60 text-amber-400 border border-amber-800/20 animate-pulse'
                      : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/20'
                  }`}>
                    {test.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-[#1E293B] pb-4">
                  {/* Prompt A */}
                  <div>
                    <span className="text-[10px] text-cyan-400 font-bold uppercase block mb-1">Prompt A ({test.promptAId})</span>
                    <div className="text-[11px] space-y-1 text-gray-400 font-medium">
                      <p>Runs: <strong className="text-white">{test.status === 'completed' ? test.promptAResults.runs : 145}</strong></p>
                      <p>CSAT Score: <strong className="text-white">{(test.status === 'completed' ? test.promptAResults.avgScore : 92)}%</strong></p>
                      <p>Latency: <strong className="text-white">{test.status === 'completed' ? test.promptAResults.avgLatencyMs : 340} ms</strong></p>
                    </div>
                  </div>

                  {/* Prompt B */}
                  <div>
                    <span className="text-[10px] text-indigo-400 font-bold uppercase block mb-1">Prompt B ({test.promptBId})</span>
                    <div className="text-[11px] space-y-1 text-gray-400 font-medium">
                      <p>Runs: <strong className="text-white">{test.status === 'completed' ? test.promptBResults.runs : 138}</strong></p>
                      <p>CSAT Score: <strong className="text-white">{(test.status === 'completed' ? test.promptBResults.avgScore : 95)}%</strong></p>
                      <p>Latency: <strong className="text-white">{test.status === 'completed' ? test.promptBResults.avgLatencyMs : 290} ms</strong></p>
                    </div>
                  </div>
                </div>

                {test.status === 'running' ? (
                  <button
                    onClick={() => handleCompleteTest(test.id)}
                    className="w-full mt-4 bg-indigo-600/15 hover:bg-indigo-600/20 text-indigo-400 text-xs font-bold py-2 rounded-lg border border-indigo-900/30 transition-all duration-150"
                  >
                    Declare Winner & Conclude
                  </button>
                ) : (
                  <div className="mt-4 bg-emerald-950/30 border border-emerald-900/30 p-2.5 rounded-lg text-center">
                    <span className="text-emerald-400 font-bold text-xs">Winner: Prompt B (95.4% CSAT)</span>
                  </div>
                )}
              </div>
            ))}

            {tests.length === 0 && (
              <div className="text-xs text-gray-500 italic py-8 text-center bg-[#090D16] border border-[#1E293B]/40 rounded-xl">
                No comparative tests launched. Click "Launch A/B Test" above to start.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Create Prompt Version */}
      {showCreatePrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreatePrompt} className="bg-[#0F172A] border border-[#1E293B] p-6 rounded-2xl w-full max-w-xl shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-lg">Add New Prompt Version</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Friendly Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Concise Returns Handler"
                  className="w-full bg-[#090D16] border border-[#1E293B] rounded-xl p-3 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Dialect/Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full bg-[#090D16] border border-[#1E293B] rounded-xl p-3 text-sm text-white outline-none focus:border-cyan-400 font-medium"
                >
                  <option value="en">English (en)</option>
                  <option value="sw">Kiswahili (sw)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Prompt Instructions (System Prompt Template)</label>
              <textarea
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write system role guidelines, guardrails, tone specifications, and few-shot variables here..."
                className="w-full bg-[#090D16] border border-[#1E293B] rounded-xl p-3 text-sm text-white outline-none focus:border-cyan-400 h-44 resize-none font-mono"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreatePrompt(false)}
                className="bg-[#1E293B] hover:bg-[#334155] text-gray-300 text-xs font-bold px-4 py-2 rounded-xl border border-[#334155]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-md disabled:opacity-45"
              >
                {creating ? 'Analyzing & Scoring...' : 'Submit Version'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Launch A/B Test */}
      {showCreateTest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateABTest} className="bg-[#0F172A] border border-[#1E293B] p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-lg">Launch Comparative A/B Test</h3>
            
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Experiment Name</label>
              <input
                type="text"
                required
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g. Tone Optimizations (EN)"
                className="w-full bg-[#090D16] border border-[#1E293B] rounded-xl p-3 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Select Prompt A</label>
                <select
                  required
                  value={promptA}
                  onChange={(e) => setPromptA(e.target.value)}
                  className="w-full bg-[#090D16] border border-[#1E293B] rounded-xl p-3 text-xs text-white outline-none focus:border-cyan-400 font-medium"
                >
                  <option value="">Choose...</option>
                  {prompts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (v{p.version})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Select Prompt B</label>
                <select
                  required
                  value={promptB}
                  onChange={(e) => setPromptB(e.target.value)}
                  className="w-full bg-[#090D16] border border-[#1E293B] rounded-xl p-3 text-xs text-white outline-none focus:border-cyan-400 font-medium"
                >
                  <option value="">Choose...</option>
                  {prompts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (v{p.version})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateTest(false)}
                className="bg-[#1E293B] hover:bg-[#334155] text-gray-300 text-xs font-bold px-4 py-2 rounded-xl border border-[#334155]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-md"
              >
                Launch Test Run
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
