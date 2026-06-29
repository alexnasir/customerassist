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
  ChevronRight,
  Database,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Check
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

const MASTER_SQL_SCHEMA = `
-- MASTER SCHEMA DEFINITIONS FOR DUKA LETU AGENT
-- Run this whole script in your Supabase SQL Editor to create all system tables!

-- 1. Sync State Table
CREATE TABLE IF NOT EXISTS duka_letu_sync (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "email" TEXT,
  "passwordHash" TEXT,
  "role" TEXT,
  "createdAt" TIMESTAMPTZ
);

-- 3. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  "id" TEXT PRIMARY KEY,
  "customerId" TEXT,
  "customerName" TEXT,
  "language" TEXT,
  "status" TEXT NOT NULL,
  "activePromptId" TEXT,
  "rating" INTEGER,
  "feedback" TEXT,
  "intent" TEXT,
  "sentiment" TEXT,
  "overallConfidence" NUMERIC,
  "strategy" JSONB,
  "customerMemory" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "lastMessageAt" TIMESTAMPTZ NOT NULL
);

-- 4. Messages Table
CREATE TABLE IF NOT EXISTS messages (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT REFERENCES conversations("id") ON DELETE CASCADE,
  "sender" TEXT NOT NULL,
  "senderName" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "audioUrl" TEXT,
  "latencyMs" INTEGER,
  "timestamp" TIMESTAMPTZ NOT NULL,
  "intent" TEXT,
  "intentConfidence" NUMERIC,
  "sentiment" TEXT,
  "sentimentConfidence" NUMERIC,
  "routedAgent" TEXT,
  "confidenceScore" NUMERIC,
  "toolsCalled" JSONB,
  "strategy" JSONB,
  "evaluation" JSONB
);

-- 5. Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT,
  "customerName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "priority" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "description" TEXT,
  "assignedAgentId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL
);

-- 6. Prompt Versions Table
CREATE TABLE IF NOT EXISTS prompt_versions (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "evaluationScore" NUMERIC,
  "costPer1kTokens" NUMERIC,
  "resolutionRate" NUMERIC,
  "latencyMs" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL
);

-- 7. Prompt Tests Table
CREATE TABLE IF NOT EXISTS prompt_tests (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "promptAId" TEXT,
  "promptBId" TEXT,
  "status" TEXT NOT NULL,
  "startDate" TIMESTAMPTZ NOT NULL,
  "endDate" TIMESTAMPTZ,
  "promptAResults" JSONB,
  "promptBResults" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL
);

-- 8. Knowledge Documents Table
CREATE TABLE IF NOT EXISTS knowledge_documents (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "chunkCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL
);

-- 9. Knowledge Gaps Table
CREATE TABLE IF NOT EXISTS knowledge_gaps (
  "id" TEXT PRIMARY KEY,
  "question" TEXT NOT NULL,
  "intent" TEXT NOT NULL,
  "timesAsked" INTEGER NOT NULL DEFAULT 1,
  "timestamp" TIMESTAMPTZ NOT NULL
);

-- 10. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  "id" TEXT PRIMARY KEY,
  "timestamp" TIMESTAMPTZ NOT NULL,
  "action" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "ipAddress" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "payload" TEXT,
  "stackTrace" TEXT
);

-- Enable Row Level Security (RLS) on all tables for database security
ALTER TABLE duka_letu_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access for demonstration/application reads and writes
DROP POLICY IF EXISTS "Allow public access" ON duka_letu_sync;
CREATE POLICY "Allow public access" ON duka_letu_sync FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access" ON users;
CREATE POLICY "Allow public access" ON users FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access" ON conversations;
CREATE POLICY "Allow public access" ON conversations FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access" ON messages;
CREATE POLICY "Allow public access" ON messages FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access" ON support_tickets;
CREATE POLICY "Allow public access" ON support_tickets FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access" ON prompt_versions;
CREATE POLICY "Allow public access" ON prompt_versions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access" ON prompt_tests;
CREATE POLICY "Allow public access" ON prompt_tests FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access" ON knowledge_documents;
CREATE POLICY "Allow public access" ON knowledge_documents FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access" ON knowledge_gaps;
CREATE POLICY "Allow public access" ON knowledge_gaps FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access" ON audit_logs;
CREATE POLICY "Allow public access" ON audit_logs FOR ALL USING (true);
`.trim();

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

  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [pullLoading, setPullLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success?: boolean; message?: string; sqlInstructions?: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showMasterSql, setShowMasterSql] = useState(false);

  const fetchSupabaseStatus = async () => {
    try {
      const res = await fetch('/api/supabase/status');
      if (res.ok) {
        const json = await res.json();
        setSupabaseStatus(json);
      }
    } catch (e) {
      console.error('Failed to load Supabase status:', e);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/supabase/sync', { method: 'POST' });
      const json = await res.json();
      setSyncResult(json);
      fetchSupabaseStatus();
    } catch (e) {
      console.error('Sync failed:', e);
      setSyncResult({ success: false, message: 'Failed to contact sync server endpoint.' });
    } finally {
      setSyncLoading(false);
    }
  };

  const handlePull = async () => {
    if (!window.confirm("Warning: Restoring from Supabase will overwrite all current local data with the cloud backup. Do you want to continue?")) {
      return;
    }
    setPullLoading(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/supabase/pull', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setSyncResult(json);
        fetchAnalytics(); // reload stats
      } else {
        setSyncResult({ success: false, message: json.message });
      }
      fetchSupabaseStatus();
    } catch (e) {
      console.error('Pull failed:', e);
      setSyncResult({ success: false, message: 'Failed to contact sync server endpoint.' });
    } finally {
      setPullLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchSupabaseStatus();
    const interval = setInterval(() => {
      fetchAnalytics();
      fetchSupabaseStatus();
    }, 10000); // refresh every 10s
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

      {/* Supabase Cloud Synchronization Card */}
     

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
