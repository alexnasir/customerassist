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
      <div className="flex-1 flex items-center justify-center bg-[#0A0F1C]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#0A0F1C] p-8 overflow-y-auto" id="prompt-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-10 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-semibold text-white tracking-tighter">Prompt Versioning & A/B Testing</h2>
          <p className="text-sm text-slate-400 mt-1.5">Manage system prompts dynamically, run automated evaluation scores, and launch A/B comparisons.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateTest(true)}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2"
          >
            Launch A/B Test
          </button>
          <button
            onClick={() => setShowCreatePrompt(true)}
            className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-sky-950/50 transition-all duration-200 flex items-center gap-2 active:scale-[0.985]"
          >
            <Plus className="w-4 h-4" />
            Add New Version
          </button>
        </div>
      </div>

      {/* Grid: Left - Prompts / Right - A/B Tests */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Prompt Version Ledger (Span 2) */}
        <div className="xl:col-span-2 space-y-6">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-[0.125em] flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4 text-sky-400" />
            Prompt Templates Registry
          </h3>

          <div className="space-y-5">
            {prompts.map((p) => (
              <div 
                key={p.id}
                className={`bg-[#111827] border rounded-2xl p-6 relative overflow-hidden transition-all duration-200 group ${
                  p.isActive 
                    ? 'border-sky-500/30 shadow-xl shadow-sky-950/30' 
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {p.isActive && (
                  <div className="absolute top-0 right-0 bg-sky-600 text-white text-[10px] font-semibold px-4 py-1 rounded-bl-2xl tracking-widest uppercase">
                    Active System
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-white text-lg flex items-center gap-3">
                      {p.name}
                      <span className="text-xs bg-slate-900 px-3 py-1 rounded-full text-slate-400 font-mono tracking-tight">v{p.version}</span>
                      <span className={`text-[10px] font-semibold uppercase px-3 py-1 rounded-full ${
                        p.language === 'sw' 
                          ? 'bg-indigo-950 text-indigo-400' 
                          : 'bg-sky-950 text-sky-400'
                      }`}>
                        {p.language.toUpperCase()}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">Created: {new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                    {!p.isActive && (
                      <button
                        onClick={() => handleActivate(p.id)}
                        className="bg-sky-950 hover:bg-sky-900 text-sky-400 hover:text-sky-300 text-xs font-medium px-4 py-2 rounded-xl border border-sky-900/50 transition-all duration-150"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>

                {/* Prompt block preview */}
                <div className="mt-6 bg-[#0A0F1C] p-5 rounded-2xl border border-slate-800 text-sm font-mono text-slate-400 max-h-28 overflow-y-auto leading-relaxed whitespace-pre-wrap tracking-tight">
                  {p.content}
                </div>

                {/* Evaluator metrics underneath */}
                <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div className="bg-[#0F1724] p-4 rounded-2xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest block">Eval Score</span>
                    <span className="text-xl font-semibold text-sky-400 mt-1 block tabular-nums">{p.evaluationScore} <span className="text-xs align-super text-slate-500">/100</span></span>
                  </div>
                  <div className="bg-[#0F1724] p-4 rounded-2xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest block">CSAT Target</span>
                    <span className="text-xl font-semibold text-indigo-400 mt-1 block tabular-nums">{p.language === 'sw' ? '4.4' : '4.7'} <span className="text-xs align-super text-slate-500">/5</span></span>
                  </div>
                  <div className="bg-[#0F1724] p-4 rounded-2xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest block">Est. Latency</span>
                    <span className="text-xl font-semibold text-rose-400 mt-1 block tabular-nums">{p.latencyMs} <span className="text-xs align-super text-slate-500">ms</span></span>
                  </div>
                  <div className="bg-[#0F1724] p-4 rounded-2xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest block">Token Cost</span>
                    <span className="text-xl font-semibold text-slate-300 mt-1 block tabular-nums">${p.costPer1kTokens.toFixed(4)}<span className="text-xs align-super text-slate-500">/1k</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Active A/B Testing Lab */}
        <div className="bg-[#111827] border border-slate-800 p-8 rounded-3xl h-fit">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-[0.125em] flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-indigo-400" />
            A/B Testing Laboratory
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed mb-8">Create comparative models to test different systemic prompts under similar traffic conditions. Measure success ratios dynamically.</p>

          <div className="space-y-6">
            {tests.map((test) => (
              <div key={test.id} className="bg-[#0A0F1C] border border-slate-800 p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-sm font-semibold text-white">{test.name}</span>
                  <span className={`text-xs font-medium px-4 py-1 rounded-2xl uppercase tracking-widest border ${
                    test.status === 'running' 
                      ? 'bg-amber-950/70 text-amber-400 border-amber-800/40' 
                      : 'bg-emerald-950/70 text-emerald-400 border-emerald-800/40'
                  }`}>
                    {test.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-6 border-b border-slate-800 pb-6">
                  {/* Prompt A */}
                  <div>
                    <span className="text-xs text-sky-400 font-medium uppercase block mb-3 tracking-wider">Prompt A ({test.promptAId})</span>
                    <div className="space-y-3 text-sm text-slate-400">
                      <div className="flex justify-between">
                        <span>Runs</span>
                        <span className="font-medium text-white tabular-nums">{test.status === 'completed' ? test.promptAResults.runs : 145}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CSAT Score</span>
                        <span className="font-medium text-white tabular-nums">{(test.status === 'completed' ? test.promptAResults.avgScore : 92)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Latency</span>
                        <span className="font-medium text-white tabular-nums">{test.status === 'completed' ? test.promptAResults.avgLatencyMs : 340} ms</span>
                      </div>
                    </div>
                  </div>

                  {/* Prompt B */}
                  <div>
                    <span className="text-xs text-indigo-400 font-medium uppercase block mb-3 tracking-wider">Prompt B ({test.promptBId})</span>
                    <div className="space-y-3 text-sm text-slate-400">
                      <div className="flex justify-between">
                        <span>Runs</span>
                        <span className="font-medium text-white tabular-nums">{test.status === 'completed' ? test.promptBResults.runs : 138}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CSAT Score</span>
                        <span className="font-medium text-white tabular-nums">{(test.status === 'completed' ? test.promptBResults.avgScore : 95)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Latency</span>
                        <span className="font-medium text-white tabular-nums">{test.status === 'completed' ? test.promptBResults.avgLatencyMs : 290} ms</span>
                      </div>
                    </div>
                  </div>
                </div>

                {test.status === 'running' ? (
                  <button
                    onClick={() => handleCompleteTest(test.id)}
                    className="w-full mt-6 bg-indigo-600/10 hover:bg-indigo-600/15 text-indigo-400 hover:text-indigo-300 text-sm font-medium py-3 rounded-2xl border border-indigo-900/40 transition-all duration-200"
                  >
                    Declare Winner & Conclude
                  </button>
                ) : (
                  <div className="mt-6 bg-emerald-950/40 border border-emerald-900/40 p-4 rounded-2xl text-center">
                    <span className="text-emerald-400 font-medium text-sm">Winner: Prompt B (95.4% CSAT)</span>
                  </div>
                )}
              </div>
            ))}

            {tests.length === 0 && (
              <div className="text-sm text-slate-500 italic py-12 text-center border border-dashed border-slate-800 rounded-3xl">
                No comparative tests launched. Click "Launch A/B Test" above to start.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Create Prompt Version */}
      {showCreatePrompt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-50 p-6">
          <form onSubmit={handleCreatePrompt} className="bg-[#111827] border border-slate-700 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8">
              <h3 className="font-semibold text-white text-2xl">Add New Prompt Version</h3>
              
              <div className="grid grid-cols-2 gap-5 mt-8">
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-2">Friendly Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Concise Returns Handler"
                    className="w-full bg-[#0A0F1C] border border-slate-700 focus:border-sky-500 rounded-2xl px-5 py-3.5 text-sm text-white outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-2">Dialect/Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full bg-[#0A0F1C] border border-slate-700 focus:border-sky-500 rounded-2xl px-5 py-3.5 text-sm text-white outline-none transition-colors font-medium"
                  >
                    <option value="en">English (en)</option>
                    <option value="sw">Kiswahili (sw)</option>
                  </select>
                </div>
              </div>

              <div className="mt-5">
                <label className="text-xs text-slate-400 font-medium block mb-2">Prompt Instructions (System Prompt Template)</label>
                <textarea
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write system role guidelines, guardrails, tone specifications, and few-shot variables here..."
                  className="w-full bg-[#0A0F1C] border border-slate-700 focus:border-sky-500 rounded-3xl px-5 py-4 text-sm text-white outline-none h-52 resize-y font-mono leading-relaxed transition-colors"
                />
              </div>
            </div>

            <div className="border-t border-slate-800 bg-[#0A0F1C] p-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreatePrompt(false)}
                className="px-6 py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-2xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-8 py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white text-sm font-medium rounded-2xl shadow-lg shadow-sky-950/50 transition-all duration-200 disabled:cursor-not-allowed"
              >
                {creating ? 'Analyzing & Scoring...' : 'Submit Version'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Launch A/B Test */}
      {showCreateTest && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-50 p-6">
          <form onSubmit={handleCreateABTest} className="bg-[#111827] border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8">
              <h3 className="font-semibold text-white text-2xl">Launch Comparative A/B Test</h3>
              
              <div className="mt-8">
                <label className="text-xs text-slate-400 font-medium block mb-2">Experiment Name</label>
                <input
                  type="text"
                  required
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="e.g. Tone Optimizations (EN)"
                  className="w-full bg-[#0A0F1C] border border-slate-700 focus:border-indigo-500 rounded-2xl px-5 py-3.5 text-sm text-white outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-5 mt-5">
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-2">Select Prompt A</label>
                  <select
                    required
                    value={promptA}
                    onChange={(e) => setPromptA(e.target.value)}
                    className="w-full bg-[#0A0F1C] border border-slate-700 focus:border-indigo-500 rounded-2xl px-5 py-3.5 text-sm text-white outline-none transition-colors font-medium"
                  >
                    <option value="">Choose...</option>
                    {prompts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (v{p.version})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-2">Select Prompt B</label>
                  <select
                    required
                    value={promptB}
                    onChange={(e) => setPromptB(e.target.value)}
                    className="w-full bg-[#0A0F1C] border border-slate-700 focus:border-indigo-500 rounded-2xl px-5 py-3.5 text-sm text-white outline-none transition-colors font-medium"
                  >
                    <option value="">Choose...</option>
                    {prompts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (v{p.version})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 bg-[#0A0F1C] p-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateTest(false)}
                className="px-6 py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-2xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-2xl shadow-lg shadow-indigo-950/50 transition-all duration-200"
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