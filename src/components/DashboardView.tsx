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
      <div className="flex-1 flex items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zinc-400 mx-auto mb-4"></div>
          <p className="text-sm font-medium">Analyzing platform telemetry metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-zinc-950 p-8 overflow-y-auto" id="dashboard-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white">System Analytics & Telemetry</h2>
          <p className="text-zinc-400 mt-1">Real-time performance monitoring of support agents, prompts, and cost indicators.</p>
        </div>
        <button 
          onClick={fetchAnalytics}
          className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-zinc-300 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Now
        </button>
      </div>

      {/* Numerical Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Total Conversations */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl group">
          <div className="flex items-start justify-between">
            <div>
              <div className="p-3 bg-zinc-800 rounded-2xl inline-block">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="text-sm text-zinc-400 mt-6 font-medium">Total Conversations</p>
              <h3 className="text-4xl font-semibold text-white mt-1 tracking-tighter">{data.totalConversations}</h3>
            </div>
            <div className="text-emerald-400 text-xs flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" /> +14%
            </div>
          </div>
        </div>

        {/* CSAT Score */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl group">
          <div className="flex items-start justify-between">
            <div>
              <div className="p-3 bg-zinc-800 rounded-2xl inline-block">
                <Award className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-sm text-zinc-400 mt-6 font-medium">Average CSAT Rating</p>
              <h3 className="text-4xl font-semibold text-white mt-1 tracking-tighter">{data.avgCsat} <span className="text-xl text-zinc-500">/ 5</span></h3>
            </div>
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl group">
          <div className="flex items-start justify-between">
            <div>
              <div className="p-3 bg-zinc-800 rounded-2xl inline-block">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-sm text-zinc-400 mt-6 font-medium">AI Resolution Rate</p>
              <h3 className="text-4xl font-semibold text-white mt-1 tracking-tighter">{data.resolutionRate}%</h3>
            </div>
          </div>
        </div>

        {/* Token Cost */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl group">
          <div className="flex items-start justify-between">
            <div>
              <div className="p-3 bg-zinc-800 rounded-2xl inline-block">
                <DollarSign className="w-5 h-5 text-rose-400" />
              </div>
              <p className="text-sm text-zinc-400 mt-6 font-medium">Simulated AI Cost</p>
              <h3 className="text-4xl font-semibold text-white mt-1 tracking-tighter">${data.totalCost.toFixed(3)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Graph 1: Conversation Volume Area Chart */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-semibold text-white">Support Volume & Telemetry</h4>
            <span className="text-xs text-zinc-400">Last 7 Days</span>
          </div>
          <div className="h-80 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyMetrics} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEscal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#52525b" fontSize={12} />
                <YAxis stroke="#52525b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    border: 'none', 
                    borderRadius: '12px', 
                    color: '#e4e4e7' 
                  }} 
                />
                <Legend verticalAlign="top" height={36} />
                <Area type="monotone" name="Total Chats" dataKey="conversations" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorConv)" />
                <Area type="monotone" name="Human Escalations" dataKey="escalations" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorEscal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Topic distribution */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-semibold text-white">Inquiry Categories</h4>
          </div>
          <div className="h-80 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topicDistribution} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#27272a" horizontal={false} />
                <XAxis type="number" stroke="#52525b" fontSize={11} />
                <YAxis dataKey="topic" type="category" stroke="#52525b" fontSize={12} width={95} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px' }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
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
        <div className="bg-zinc-900 border border-zinc-800 p-7 rounded-3xl">
          <h4 className="font-semibold text-white mb-8">AI Performance Telemetry</h4>
          <div className="space-y-8">
            <div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-zinc-400">Average Response Latency</span>
                <span className="font-mono text-white">{data.avgLatencyMs} ms</span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full transition-all" style={{ width: `${Math.min(100, Math.round(data.avgLatencyMs / 6))}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-zinc-400">Escalation Transfer Rate</span>
                <span className="font-mono text-white">{data.escalationRate}%</span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${data.escalationRate}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Prompt Version Leaderboard */}
        <div className="bg-zinc-900 border border-zinc-800 p-7 rounded-3xl lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-semibold text-white">Prompt Leaderboard</h4>
            <div className="text-xs bg-zinc-800 text-cyan-400 px-3 py-1 rounded-full">Active Templates</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500 font-medium">
                  <th className="pb-4">Prompt Name</th>
                  <th className="pb-4">Lang</th>
                  <th className="pb-4">CSAT Score</th>
                  <th className="pb-4">Resolution</th>
                  <th className="pb-4">Latency</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-zinc-800">
                <tr className="hover:bg-zinc-900/70">
                  <td className="py-5 font-medium text-white flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    English Support System (V1)
                  </td>
                  <td className="py-5 font-mono text-cyan-400">EN</td>
                  <td className="py-5 font-semibold text-white">4.7</td>
                  <td className="py-5 text-emerald-400">85%</td>
                  <td className="py-5 text-zinc-400">340 ms</td>
                </tr>
                <tr className="hover:bg-zinc-900/70">
                  <td className="py-5 font-medium text-white flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    Swahili Support (V1)
                  </td>
                  <td className="py-5 font-mono text-indigo-400">SW</td>
                  <td className="py-5 font-semibold text-white">4.4</td>
                  <td className="py-5 text-emerald-400">81%</td>
                  <td className="py-5 text-zinc-400">380 ms</td>
                </tr>
                <tr className="hover:bg-zinc-900/70">
                  <td className="py-5 font-medium text-zinc-400 flex items-center gap-3">
                    <div className="w-2 h-2 bg-zinc-600 rounded-full" />
                    English Concise Support Pro (V2)
                  </td>
                  <td className="py-5 font-mono">EN</td>
                  <td className="py-5 text-zinc-400">Pending</td>
                  <td className="py-5 text-emerald-400">89%</td>
                  <td className="py-5 text-zinc-400">290 ms</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}