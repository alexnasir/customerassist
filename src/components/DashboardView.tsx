import React, { useEffect, useState } from 'react';
import { 
  Users, 
  MessageSquare, 
  CheckCircle, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Award,
  ChevronRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { SystemAnalytics } from '../types.js';

const COLORS = ['#06b6d4', '#6366f1', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function DashboardView() {
  const [data, setData] = useState<SystemAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#090D16] text-gray-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-sm font-medium">Analyzing platform telemetry metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#090D16] p-8 overflow-y-auto" id="dashboard-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">System Analytics & Telemetry</h2>
          <p className="text-sm text-gray-400 mt-1">Real-time performance monitoring of support agents, prompts, and cost indicators.</p>
        </div>
        <button 
          onClick={fetchAnalytics}
          className="bg-[#1E293B] hover:bg-[#334155] text-cyan-400 text-xs font-semibold px-4 py-2 rounded-lg border border-[#334155] transition-all duration-200"
        >
          Refresh Now
        </button>
      </div>

      {/* Firebase Enterprise Integration Status */}
      <div className="mb-8 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm shadow-emerald-950/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9s2.015-9 4.5-9m0 0c5.523 0 10 4.477 10 10s-4.477 10-10 10M12 3a9 9 0 000 18" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Firebase cloud integrated</h3>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/30 uppercase tracking-wider">Enterprise Mode</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Active connections on Firestore database <code className="text-[11px] text-cyan-400 bg-[#0B0F19] px-1.5 py-0.5 rounded border border-gray-800">ai-studio-9c260d35-68d5-40e6-9f2e-a407eb34e4e4</code>. Secure ABAC controls enforced.
            </p>
          </div>
        </div>
        <div className="flex gap-2 text-xs font-medium text-gray-400 self-stretch sm:self-auto justify-end">
          <span className="px-2.5 py-1 bg-[#1E293B] rounded-lg border border-gray-800 flex items-center gap-1.5 text-gray-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span> Auth: Google Single Sign-On
          </span>
          <span className="px-2.5 py-1 bg-[#1E293B] rounded-lg border border-gray-800 flex items-center gap-1.5 text-gray-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span> Firestore Sync: Live
          </span>
        </div>
      </div>

      {/* Numerical Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Conversations */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-6 rounded-xl relative overflow-hidden group shadow-lg">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl group-hover:scale-125 transition-all duration-300"></div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-950/40 text-cyan-400 rounded-lg border border-cyan-800/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Conversations</p>
              <h3 className="text-2xl font-bold text-white mt-1">{data.totalConversations}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] text-emerald-400 font-medium">
            <TrendingUp className="w-3 h-3" />
            <span>+14.2% since yesterday</span>
          </div>
        </div>

        {/* CSAT Score */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-6 rounded-xl relative overflow-hidden group shadow-lg">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl group-hover:scale-125 transition-all duration-300"></div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-950/40 text-indigo-400 rounded-lg border border-indigo-800/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Average CSAT Rating</p>
              <h3 className="text-2xl font-bold text-white mt-1">{data.avgCsat} / 5.0</h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] text-indigo-400 font-medium">
            <span>94.8% satisfactory index</span>
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-6 rounded-xl relative overflow-hidden group shadow-lg">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:scale-125 transition-all duration-300"></div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-950/40 text-emerald-400 rounded-lg border border-emerald-800/30">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">AI Resolution Rate</p>
              <h3 className="text-2xl font-bold text-white mt-1">{data.resolutionRate}%</h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] text-emerald-400 font-medium">
            <span>Target Goal: &gt;85.0%</span>
          </div>
        </div>

        {/* Token Cost */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-6 rounded-xl relative overflow-hidden group shadow-lg">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 bg-pink-500/5 rounded-full blur-xl group-hover:scale-125 transition-all duration-300"></div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-pink-950/40 text-pink-400 rounded-lg border border-pink-800/30">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Simulated AI Cost</p>
              <h3 className="text-2xl font-bold text-white mt-1">${data.totalCost.toFixed(3)}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] text-pink-400 font-medium">
            <span>Tokens used: {(data.totalTokens / 1000).toFixed(1)}k</span>
          </div>
        </div>
      </div>

      {/* Main Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Graph 1: Conversation Volume Area Chart */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-6 rounded-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Support Volume & Telemetry</h4>
            <span className="text-xs text-gray-400 font-medium">Last 7 Days</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEscal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', color: '#fff', borderRadius: '8px' }}
                  labelStyle={{ color: '#06b6d4', fontWeight: 'bold' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Area type="monotone" name="Total Chats" dataKey="conversations" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorConv)" />
                <Area type="monotone" name="Human Escalations" dataKey="escalations" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorEscal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Topic distribution */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-6 rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Inquiry Categories</h4>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topicDistribution} layout="vertical" margin={{ top: 5, right: 15, left: 15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                <XAxis type="number" stroke="#64748B" fontSize={10} hide />
                <YAxis dataKey="topic" type="category" stroke="#64748B" fontSize={11} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', color: '#fff', borderRadius: '8px' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={12}>
                  {data.topicDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Extra Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AI Performance Statistics */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-6 rounded-xl">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-6">AI Performance Telemetry</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-medium">
                <span>Average Response Latency</span>
                <span className="text-white font-semibold">{data.avgLatencyMs} ms</span>
              </div>
              <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${Math.min(100, (data.avgLatencyMs / 600) * 100)}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-medium">
                <span>Escalation Transfer Rate</span>
                <span className="text-white font-semibold">{data.escalationRate}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${data.escalationRate}%` }}></div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#1E293B] space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Model Engine</span>
                </div>
                <span className="text-white font-semibold">Gemini 3.5 Flash</span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-pink-400" />
                  <span>Simulated Hallucination Index</span>
                </div>
                <span className="text-white font-semibold">&lt; 1.4%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Prompt Version Leaderboard */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-6 rounded-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Prompt Leaderboard</h4>
            <span className="text-xs text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/30">Active Templates</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-400">
              <thead>
                <tr className="border-b border-[#1E293B] text-gray-500 font-semibold">
                  <th className="pb-3 uppercase tracking-wider">Prompt Name</th>
                  <th className="pb-3 uppercase tracking-wider">Lang</th>
                  <th className="pb-3 uppercase tracking-wider">CSAT Score</th>
                  <th className="pb-3 uppercase tracking-wider">Resolution</th>
                  <th className="pb-3 uppercase tracking-wider">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                <tr className="hover:bg-slate-800/20">
                  <td className="py-3 font-medium text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    English Support System (V1)
                  </td>
                  <td className="py-3 font-semibold uppercase text-cyan-400">EN</td>
                  <td className="py-3 text-white font-bold">4.7 / 5</td>
                  <td className="py-3 font-medium text-emerald-400">85%</td>
                  <td className="py-3">340 ms</td>
                </tr>
                <tr className="hover:bg-slate-800/20">
                  <td className="py-3 font-medium text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Swahili Support (V1)
                  </td>
                  <td className="py-3 font-semibold uppercase text-indigo-400">SW</td>
                  <td className="py-3 text-white font-bold">4.4 / 5</td>
                  <td className="py-3 font-medium text-emerald-400">81%</td>
                  <td className="py-3">380 ms</td>
                </tr>
                <tr className="hover:bg-slate-800/20 text-gray-500">
                  <td className="py-3 font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                    English Concise Support Pro (V2)
                  </td>
                  <td className="py-3 font-semibold uppercase">EN</td>
                  <td className="py-3 font-bold">Pending</td>
                  <td className="py-3 font-medium text-emerald-500/50">89%</td>
                  <td className="py-3">290 ms</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
