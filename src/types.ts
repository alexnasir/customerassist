/**
 * Shared Type Definitions for OmniAssist AI
 */

export type UserRole = 'admin' | 'agent' | 'customer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export type ConversationStatus = 'active' | 'escalated' | 'resolved';

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  language: 'en' | 'sw' | 'auto';
  status: ConversationStatus;
  activePromptId?: string;
  rating?: number;
  feedback?: string;
  createdAt: string;
  lastMessageAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: 'user' | 'ai' | 'agent';
  senderName: string;
  content: string;
  type: 'text' | 'voice';
  audioUrl?: string; // Base64 audio or direct URL
  latencyMs?: number;
  timestamp: string;
}

export type Priority = 'low' | 'medium' | 'high';
export type TicketStatus = 'open' | 'pending' | 'resolved';

export interface SupportTicket {
  id: string;
  conversationId: string;
  customerName: string;
  email: string;
  category: string;
  priority: Priority;
  status: TicketStatus;
  description: string;
  assignedAgentId?: string;
  createdAt: string;
}

export interface PromptVersion {
  id: string;
  name: string;
  version: number;
  content: string;
  language: 'en' | 'sw' | 'multilingual';
  isActive: boolean;
  evaluationScore: number; // 0 - 100
  costPer1kTokens: number; // USD
  resolutionRate: number; // percentage
  latencyMs: number;
  createdAt: string;
}

export interface PromptTestMetrics {
  runs: number;
  resolutions: number;
  avgLatencyMs: number;
  avgScore: number;
  cost: number;
  hallucinationRate: number; // percentage
}

export interface PromptTest {
  id: string;
  name: string;
  promptAId: string;
  promptBId: string;
  status: 'running' | 'completed';
  startDate: string;
  endDate?: string;
  promptAResults: PromptTestMetrics;
  promptBResults: PromptTestMetrics;
  createdAt: string;
}

export interface KnowledgeDocument {
  id: string;
  name: string;
  content: string;
  category: string;
  chunkCount: number;
  createdAt: string;
}

export interface SystemAnalytics {
  totalConversations: number;
  activeUsers: number;
  avgCsat: number;
  resolutionRate: number;
  totalTokens: number;
  totalCost: number;
  avgLatencyMs: number;
  escalationRate: number;
  dailyMetrics: {
    date: string;
    conversations: number;
    escalations: number;
    cost: number;
    latencyMs: number;
  }[];
  topicDistribution: {
    topic: string;
    count: number;
  }[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  role: string;
  ipAddress: string;
  details: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'success' | 'failure';
  payload?: string;
  stackTrace?: string;
}

