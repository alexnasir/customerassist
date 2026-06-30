import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { db } from './db.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

// Lazy initialization of the Supabase client to prevent application crash on startup if credentials are not configured yet
let supabaseClientInstance: any = null;

export function getSupabase() {
  if (!supabaseUrl) {
    return null;
  }
  if (!supabaseClientInstance && supabaseSecretKey) {
    try {
      supabaseClientInstance = createClient(supabaseUrl, supabaseSecretKey, {
        auth: {
          persistSession: false
        }
      });
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
    }
  }
  return supabaseClientInstance;
}

export interface SupabaseSyncStats {
  connected: boolean;
  url: string;
  lastSync: string | null;
  status: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage: string | null;
  tables: {
    conversations: number;
    messages: number;
    tickets: number;
    documents: number;
    logs: number;
  };
}

let lastSyncTime: string | null = null;
let currentSyncStatus: 'idle' | 'syncing' | 'success' | 'error' = 'idle';
let syncErrorMessage: string | null = null;

export const supabaseService = {
  /**
   * Get connection details and synchronization statistics
   */
  async getStatus(): Promise<SupabaseSyncStats> {
    const client = getSupabase();
    const stats = {
      users: (db as any).data?.users?.length || 0,
      conversations: db.getConversations().length,
      messages: db.getMessages().length,
      tickets: db.getSupportTickets ? db.getSupportTickets().length : (db as any).data?.supportTickets?.length || 0,
      prompts: (db as any).data?.promptVersions?.length || 0,
      documents: db.getKnowledgeDocuments().length,
      logs: db.getAuditLogs ? db.getAuditLogs().length : (db as any).data?.auditLogs?.length || 0,
    };

    if (!client) {
      return {
        connected: false,
        url: supabaseUrl || 'Not configured',
        lastSync: lastSyncTime,
        status: 'error',
        errorMessage: 'Supabase environment variables (SUPABASE_URL / SUPABASE_SECRET_KEY) are missing or invalid.',
        tables: stats as any
      };
    }

    // Attempt a quick ping to verify credentials are correct
    try {
      const { data, error } = await client.from('duka_letu_sync').select('updated_at').limit(1).maybeSingle();
      
      // If table doesn't exist, it's still "connected" (meaning URL/API Key worked, but SQL schema is missing)
      if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
        throw new Error(error.message);
      }

      return {
        connected: true,
        url: supabaseUrl!,
        lastSync: lastSyncTime,
        status: currentSyncStatus,
        errorMessage: syncErrorMessage,
        tables: stats as any
      };
    } catch (err: any) {
      return {
        connected: false,
        url: supabaseUrl!,
        lastSync: lastSyncTime,
        status: 'error',
        errorMessage: `Supabase connection failed: ${err.message || err}`,
        tables: stats as any
      };
    }
  },

  /**
   * Performs an on-demand sync by attempting to save the local database state to Supabase.
   * To prevent DB schema setup friction for the user, we try to write into a single centralized
   * JSON table 'duka_letu_sync', which holds the state of our tables. If that table is missing,
   * we give the user the exact SQL to run in their Supabase SQL Editor.
   */
  async syncNow(): Promise<{ success: boolean; message: string; sqlInstructions?: string }> {
    const client = getSupabase();
    if (!client) {
      currentSyncStatus = 'error';
      syncErrorMessage = 'Supabase client is not initialized. Please configure credentials.';
      return { success: false, message: syncErrorMessage };
    }

    currentSyncStatus = 'syncing';
    syncErrorMessage = null;

    // Master SQL schema script to generate all relational tables
    const sqlInstructions = `
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

    try {
      const dbData = (db as any).data;
      if (!dbData) {
        throw new Error('Local database state could not be read.');
      }

      // Sanitize large base64 audio data in clone to prevent connection statement timeouts
      const sanitizedData = JSON.parse(JSON.stringify(dbData));
      if (sanitizedData.messages && Array.isArray(sanitizedData.messages)) {
        sanitizedData.messages = sanitizedData.messages.map((msg: any) => {
          if (msg.audioUrl && (msg.audioUrl.startsWith('data:') || msg.audioUrl.length > 500)) {
            return {
              ...msg,
              audioUrl: msg.audioUrl.substring(0, 100) + '... [Truncated for sync efficiency]'
            };
          }
          return msg;
        });
      }

      // 1. Try to upsert the master backup file to duka_letu_sync table
      const syncPayload = {
        id: 'database_state',
        data: sanitizedData,
        updated_at: new Date().toISOString()
      };

      const { error: syncErr } = await client
        .from('duka_letu_sync')
        .upsert(syncPayload, { onConflict: 'id' });

      if (syncErr && syncErr.code === '42P01') {
        currentSyncStatus = 'error';
        syncErrorMessage = 'Tables do not exist in your Supabase database.';
        return { 
          success: false, 
          message: 'Sync failed: Relational tables are missing. Click "Copy SQL Query" below and run it in Supabase SQL Editor first!',
          sqlInstructions 
        };
      }

      // 2. Map and sync all individual relational tables
      const individualTables = [
        { name: 'users', key: 'users' },
        { name: 'conversations', key: 'conversations' },
        { name: 'messages', key: 'messages' },
        { name: 'support_tickets', key: 'supportTickets' },
        { name: 'prompt_versions', key: 'promptVersions' },
        { name: 'prompt_tests', key: 'promptTests' },
        { name: 'knowledge_documents', key: 'knowledgeDocuments' },
        { name: 'knowledge_gaps', key: 'knowledgeGaps' },
        { name: 'audit_logs', key: 'auditLogs' }
      ];

      const successTables: string[] = [];
      const failedTables: string[] = [];

      for (const table of individualTables) {
        const records = sanitizedData[table.key] || [];
        if (records.length === 0) {
          successTables.push(`${table.name} (0 records)`);
          continue;
        }

        try {
          const { error: upsertErr } = await client
            .from(table.name)
            .upsert(records, { onConflict: 'id' });

          if (upsertErr) {
            failedTables.push(`${table.name} (${upsertErr.message})`);
          } else {
            successTables.push(`${table.name} (${records.length} records)`);
          }
        } catch (e: any) {
          failedTables.push(`${table.name} (${e.message || e})`);
        }
      }

      lastSyncTime = new Date().toISOString();
      
      if (failedTables.length > 0) {
        currentSyncStatus = 'error';
        syncErrorMessage = `Some relational tables failed to sync: ${failedTables.join(', ')}`;
        return {
          success: false,
          message: `Synced master backup, but some individual tables failed. This is likely because those tables haven't been created in Supabase yet. Run the SQL script below! Failed: ${failedTables.join(' | ')}`,
          sqlInstructions
        };
      }

      currentSyncStatus = 'success';
      syncErrorMessage = null;

      // Log audit log
      db.createAuditLog({
        action: 'Supabase Synchronization',
        actor: 'System Daemon',
        role: 'admin',
        ipAddress: '127.0.0.1',
        details: `Successfully synced local database to 10 relational tables in Supabase: ${successTables.join(', ')}.`,
        severity: 'info',
        status: 'success'
      });

      return { 
        success: true, 
        message: `Successfully seeded all ${individualTables.length + 1} system tables in Supabase: ${successTables.join(', ')}!` 
      };
    } catch (err: any) {
      currentSyncStatus = 'error';
      syncErrorMessage = err.message || String(err);
      return { 
        success: false, 
        message: `Sync error: ${syncErrorMessage}`,
        sqlInstructions
      };
    }
  },

  /**
   * Attempts to pull/restore the database state from Supabase to overwrite local DB.
   */
  async pullNow(): Promise<{ success: boolean; message: string }> {
    const client = getSupabase();
    if (!client) {
      return { success: false, message: 'Supabase client is not configured.' };
    }

    try {
      const { data, error } = await client
        .from('duka_letu_sync')
        .select('data')
        .eq('id', 'database_state')
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data || !data.data) {
        return { success: false, message: 'No backup found in Supabase. Perform a push sync first!' };
      }

      // Restore data to local DB
      (db as any).data = data.data;
      db.save();

      db.createAuditLog({
        action: 'Supabase Data Pull',
        actor: 'System Daemon',
        role: 'admin',
        ipAddress: '127.0.0.1',
        details: 'Successfully pulled and restored database state from Supabase backup.',
        severity: 'info',
        status: 'success'
      });

      return { success: true, message: 'Successfully pulled and restored local database from Supabase!' };
    } catch (err: any) {
      return { success: false, message: `Restore error: ${err.message || err}` };
    }
  }
};
