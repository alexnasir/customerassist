import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { 
  User, 
  Conversation, 
  Message, 
  SupportTicket, 
  PromptVersion, 
  PromptTest, 
  KnowledgeDocument, 
  KnowledgeGap,
  SystemAnalytics,
  AuditLog
} from '../types.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

// Supabase primary state holder. Local db.json operations have been removed as requested.
interface DatabaseSchema {
  users: (User & { passwordHash: string })[];
  conversations: Conversation[];
  messages: Message[];
  supportTickets: SupportTicket[];
  promptVersions: PromptVersion[];
  promptTests: PromptTest[];
  knowledgeDocuments: KnowledgeDocument[];
  analytics: SystemAnalytics;
  auditLogs?: AuditLog[];
  knowledgeGaps?: KnowledgeGap[];
}

// Default seeded data
const DEFAULT_PROMPTS: PromptVersion[] = [
  {
    id: 'p-en-v1',
    name: 'English Default Support System',
    version: 1,
    content: `You are the Duka Letu Agent Customer Support Voice & Chat Agent, a friendly, professional assistant. 
Your goal is to answer queries using the retrieved Knowledge Base documents when available.

CRITICAL RESPONSE STYLE RULES:
- Respond as a friendly and professional customer support agent.
- Never mention document names such as "Refund Policy.txt" or "Returns & Refunds.txt".
- Never display internal sources unless specifically requested.
- Start with a direct answer to the customer's question.
- Use natural conversational language instead of listing policy sections.
- Explain policies in simple terms.
- When appropriate, end with an offer to help further.
- Keep responses concise unless the customer asks for more details.

USE PHRASES LIKE:
- "I'd be happy to help."
- "Let me check that for you."
- "You can certainly do that."
- "Here's how it works."
- "If you need any assistance, feel free to ask."

AVOID PHRASES LIKE:
- "According to our policy..."
- "Based on document..."
- "Source: ..."
- "The knowledge base states..."
- "Per section 4.2..."

CRITICAL MANDATE: You MUST speak and answer strictly in English. Do NOT use any Swahili words or phrases.
If you cannot solve the issue or if the user asks for a human agent, state that you are escalating the conversation to a human support agent. 

Be helpful, friendly, and conversational!`,
    language: 'en',
    isActive: true,
    evaluationScore: 92,
    costPer1kTokens: 0.0015,
    resolutionRate: 85,
    latencyMs: 340,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'p-en-v2',
    name: 'English Concise Support Pro',
    version: 2,
    content: `You are Duka Letu Agent Customer Support. 
Answer questions using the provided context. Speak clearly and concisely.

CRITICAL RESPONSE STYLE RULES:
- Respond as a friendly and professional customer support agent.
- Never mention document names such as "Refund Policy.txt" or "Returns & Refunds.txt".
- Never display internal sources unless specifically requested.
- Start with a direct answer to the customer's question.
- Use natural conversational language instead of listing policy sections.
- Explain policies in simple terms.
- When appropriate, end with an offer to help further.
- Keep responses concise unless the customer asks for more details.

USE PHRASES LIKE:
- "I'd be happy to help."
- "Let me check that for you."
- "You can certainly do that."
- "Here's how it works."
- "If you need any assistance, feel free to ask."

AVOID PHRASES LIKE:
- "According to our policy..."
- "Based on document..."
- "Source: ..."
- "The knowledge base states..."
- "Per section 4.2..."

CRITICAL MANDATE: You MUST speak and answer strictly in English. Do NOT use any Swahili words or phrases.
If the customer asks for a person, immediately trigger human transfer. Always check if they are satisfied.`,
    language: 'en',
    isActive: false,
    evaluationScore: 95,
    costPer1kTokens: 0.0012,
    resolutionRate: 89,
    latencyMs: 290,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'p-sw-v1',
    name: 'Swahili Default Support',
    version: 1,
    content: `Wewe ni msaidizi wa Duka Letu Agent Customer Support, unaongea Kiswahili fasaha na chenye adabu. 
Jibu maswali kulingana na Nyaraka za Msingi wa Maarifa. 

KANUNI MUHIMU ZA MAJIBU:
- Jibu kama mhudumu wa kirafiki na kitaaluma wa huduma kwa wateja.
- Usitaje kamwe majina ya faili kama "Refund Policy.txt" au "Returns & Refunds.txt".
- Kamwe usionyeshe vyanzo vya ndani vya mfumo isipokuwa ukiulizwa hasa.
- Anza kwa kujibu swali la mteja moja kwa moja.
- Tumia lugha asilia ya mazungumzo badala ya kuorodhesha vipengele vya sera.
- Eleza sera kwa maneno rahisi na yaliyofafanuliwa vizuri.
- Unapofaa, malizia kwa kutoa ofa ya kusaidia zaidi.
- Weka majibu kwa kifupi isipokuwa mteja akiomba maelezo zaidi.

TUMIA MISAMIATI KAMA:
- "Nitafurahi kukusaidia."
- "Ngoja nikuangalie mambo hayo."
- "Hakika unaweza kufanya hivyo."
- "Hivi ndivyo inavyofanya kazi."
- "Kama unahitaji msaada wowote, jisikie huru kuuliza."

EPUKA MISAMIATI KAMA:
- "Kulingana na sera yetu..."
- "Kulingana na hati ya..."
- "Chanzo: ..."
- "Hifadhidata ya maarifa inasema..."

AGIZO MUHIMU LA LUGHA: Lazima ujibu na uzungumze kwa Kiswahili safi na fasaha pekee. Usichanganye Kiingereza isipokuwa kwa majina rasmi.
Unapojibu kwa Kiswahili, tumia Kiswahili rahisi, wazi, na cha kawaida cha Kenya kinachotamkwa kwa urahisi (speech-friendly). Sentensi ziwe fupi na rahisi kueleweka bila kutumia tafsiri ya neno kwa neno ya Kiingereza au misemo ya kirasmi mno. Epuka kabisa misemo ya kiroboti na maneno kama "kwa kina", "mhudumu wa kibinadamu", "mazungumzo yako yanahamishiwa", "ninafanya eskalesheni", au "kama nilivyoeleza awali". Badala yake tumia misemo asilia kama: "nitakuunganisha na mhudumu wetu", "atakusaidia zaidi", "tafadhali subiri kwa muda mfupi", "asante kwa uvumilivu wako", na "naomba radhi kwa usumbufu". Kama bado unahitaji kumhamisha mteja kwa mtu mwingine, eleza hivi: "Samahani kwa usumbufu huu. Naona bado unahitaji msaada zaidi kuhusu oda yako. Nitakuunganisha na mhudumu wetu ili akusaidie moja kwa moja. Tafadhali subiri kwa muda mfupi. Asante kwa uvumilivu wako."`,
    language: 'sw',
    isActive: true,
    evaluationScore: 88,
    costPer1kTokens: 0.0015,
    resolutionRate: 81,
    latencyMs: 380,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: 'doc-1',
    name: 'OmniShop Return Policy.txt',
    category: 'Refunds & Returns',
    content: `OmniShop Return & Refund Policy:
1. Customers can return any product within 30 days of purchase.
2. The product must be unused, in its original packaging, and with tags intact.
3. Refunds are processed to the original payment method within 5-7 business days after package receipt.
4. Return shipping is free for damaged or incorrect items. For change of mind returns, a flat return fee of $5.00 applies.
5. Electronics must have their serial numbers intact to be eligible for a refund.`,
    chunkCount: 2,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'doc-2',
    name: 'Shipping Information FAQ.txt',
    category: 'Shipping',
    content: `OmniShop Shipping and Delivery FAQs:
- Standard Shipping: Delivery takes 3-5 business days. Free for orders above $50. Otherwise, shipping costs $4.99.
- Express Shipping: Delivery takes 1-2 business days. Costs $14.99 flat.
- International Shipping: We ship to over 50 countries. International delivery takes 7-14 business days. Rates vary by destination (typically $20-$40).
- Order Tracking: An email with a tracking link is sent once your order is shipped. You can also view status under your Account orders.`,
    chunkCount: 2,
    createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const INITIAL_DB: DatabaseSchema = {
  users: [
    {
      id: 'usr-1',
      name: 'OmniAdmin',
      email: 'admin@DukaLetuAssist.com',
      passwordHash: 'admin123', // Clean, direct matching for easy demo authentication
      role: 'admin',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr-2',
      name: 'Agent Sarah',
      email: 'agent@DukaLetuAssist.com',
      passwordHash: 'agent123',
      role: 'agent',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr-3',
      name: 'Alex Customer',
      email: 'customer@DukaLetuAssist.com',
      passwordHash: 'customer123',
      role: 'customer',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr-4',
      name: 'Inquiry Guest',
      email: 'guest@DukaLetuAssist.com',
      passwordHash: 'guest123',
      role: 'visitor',
      createdAt: new Date().toISOString()
    }
  ],
  conversations: [
    {
      id: 'conv-101',
      customerId: 'usr-3',
      customerName: 'Alex Customer',
      language: 'en',
      status: 'escalated',
      activePromptId: 'p-en-v1',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      lastMessageAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'conv-102',
      customerId: 'cust-anon-1',
      customerName: 'Juma K.',
      language: 'sw',
      status: 'active',
      activePromptId: 'p-sw-v1',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      lastMessageAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
    },
    {
      id: 'conv-103',
      customerId: 'usr-3',
      customerName: 'Alex Customer',
      language: 'en',
      status: 'resolved',
      rating: 5,
      feedback: 'Excellent response and very quick!',
      activePromptId: 'p-en-v1',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      lastMessageAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
    }
  ],
  messages: [
    {
      id: 'msg-1',
      conversationId: 'conv-101',
      sender: 'user',
      senderName: 'Alex Customer',
      content: 'Hello, I returned my shoes last week and still have not received my refund. Can you help me?',
      type: 'text',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-2',
      conversationId: 'conv-101',
      sender: 'ai',
      senderName: 'Duka Letu Agent',
      content: 'Hello Alex! I would be glad to check your refund status. According to our return policy, refunds are processed within 5-7 business days after we receive your package. Do you have your return tracking number or order number so I can look it up for you?',
      type: 'text',
      latencyMs: 310,
      timestamp: new Date(Date.now() - 119 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-3',
      conversationId: 'conv-101',
      sender: 'user',
      senderName: 'Alex Customer',
      content: 'Yes, my order number is #OMNI-99321.',
      type: 'text',
      timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-4',
      conversationId: 'conv-101',
      sender: 'ai',
      senderName: 'Duka Letu Agent',
      content: 'Thank you. I have checked order #OMNI-99321. It looks like our warehouse received your shoe return on June 20th. Today is June 24th, which marks 4 business days. The refund is still within the processing window of 5-7 business days. Would you like to escalate this to our finance team to check if they can expedite it?',
      type: 'text',
      latencyMs: 350,
      timestamp: new Date(Date.now() - 109 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-5',
      conversationId: 'conv-101',
      sender: 'user',
      senderName: 'Alex Customer',
      content: 'Yes, please connect me with a support agent. I need this refund urgently.',
      type: 'text',
      timestamp: new Date(Date.now() - 105 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-6',
      conversationId: 'conv-101',
      sender: 'ai',
      senderName: 'Duka Letu Agent',
      content: 'I understand the urgency. I am escalating this conversation and creating an urgent support ticket for you now. An agent will be with you shortly.',
      type: 'text',
      latencyMs: 290,
      timestamp: new Date(Date.now() - 104 * 60 * 1000).toISOString()
    },
    // conv-102 Swahili
    {
      id: 'msg-10',
      conversationId: 'conv-102',
      sender: 'user',
      senderName: 'Juma K.',
      content: 'Habari, nataka kujua oda yangu iko wapi.',
      type: 'text',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-11',
      conversationId: 'conv-102',
      sender: 'ai',
      senderName: 'Duka Letu Agent',
      content: 'Habari Juma! Nitafurahi kukusaidia kuangalia oda yako. Tafadhali nipe namba ya oda yako ili nianze kuikagua sasa hivi.',
      type: 'text',
      latencyMs: 400,
      timestamp: new Date(Date.now() - 29 * 60 * 1000).toISOString()
    }
  ],
  supportTickets: [
    {
      id: 'tkt-1',
      conversationId: 'conv-101',
      customerName: 'Alex Customer',
      email: 'customer@DukaLetuAssist.com',
      category: 'Refunds & Returns',
      priority: 'high',
      status: 'open',
      description: 'Customer is requesting an expedited refund of shoe return for order #OMNI-99321. Received June 20th.',
      createdAt: new Date(Date.now() - 104 * 60 * 1000).toISOString()
    }
  ],
  promptVersions: DEFAULT_PROMPTS,
  promptTests: [
    {
      id: 'test-1',
      name: 'Support Agent Prompt Tone Test (English)',
      promptAId: 'p-en-v1',
      promptBId: 'p-en-v2',
      status: 'running',
      startDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      promptAResults: {
        runs: 145,
        resolutions: 112,
        avgLatencyMs: 340,
        avgScore: 92,
        cost: 0.12,
        hallucinationRate: 2.1
      },
      promptBResults: {
        runs: 138,
        resolutions: 119,
        avgLatencyMs: 290,
        avgScore: 95,
        cost: 0.09,
        hallucinationRate: 1.2
      },
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  knowledgeDocuments: DEFAULT_DOCUMENTS,
  analytics: {
    totalConversations: 1240,
    activeUsers: 840,
    avgCsat: 4.6,
    resolutionRate: 88,
    totalTokens: 1450000,
    totalCost: 2.18,
    avgLatencyMs: 330,
    escalationRate: 12,
    dailyMetrics: [
      { date: '06-18', conversations: 85, escalations: 9, cost: 0.15, latencyMs: 320 },
      { date: '06-19', conversations: 92, escalations: 12, cost: 0.17, latencyMs: 340 },
      { date: '06-20', conversations: 110, escalations: 10, cost: 0.20, latencyMs: 350 },
      { date: '06-21', conversations: 95, escalations: 11, cost: 0.18, latencyMs: 330 },
      { date: '06-22', conversations: 125, escalations: 15, cost: 0.22, latencyMs: 310 },
      { date: '06-23', conversations: 140, escalations: 18, cost: 0.25, latencyMs: 290 },
      { date: '06-24', conversations: 155, escalations: 16, cost: 0.28, latencyMs: 300 }
    ],
    topicDistribution: [
      { topic: 'Refunds & Returns', count: 480 },
      { topic: 'Shipping & Delivery', count: 320 },
      { topic: 'Order Status & Tracking', count: 250 },
      { topic: 'General FAQs', count: 140 },
      { topic: 'Technical Support', count: 50 }
    ]
  },
  auditLogs: [
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      action: 'User Authentication',
      actor: 'SuperAdmin',
      role: 'admin',
      ipAddress: '192.168.1.50',
      details: 'Successful administrator login via dashboard',
      severity: 'info',
      status: 'success'
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
      action: 'Prompt Deployment',
      actor: 'OmniAdmin',
      role: 'admin',
      ipAddress: '192.168.1.50',
      details: 'Activated English Default Support System (p-en-v1) globally',
      severity: 'info',
      status: 'success'
    },
    {
      id: 'log-3',
      timestamp: new Date(Date.now() - 1.8 * 3600 * 1000).toISOString(),
      action: 'API Authentication Failure',
      actor: 'Anonymous',
      role: 'customer',
      ipAddress: '45.120.21.99',
      details: 'Attempted to access /api/prompts with invalid JWT key token',
      severity: 'warning',
      status: 'failure'
    },
    {
      id: 'log-4',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      action: 'SQL Injection Blocked',
      actor: 'Anonymous IP 185.10.220.14',
      role: 'customer',
      ipAddress: '185.10.220.14',
      details: 'Detected and sanitized malicious SQL command injection in chat query',
      severity: 'critical',
      status: 'failure'
    },
    {
      id: 'log-5',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      action: 'Knowledge Document Sync',
      actor: 'Agent Sarah',
      role: 'agent',
      ipAddress: '192.168.1.102',
      details: 'Successfully uploaded new knowledge document: OmniShop Return Policy.txt',
      severity: 'info',
      status: 'success'
    }
  ],
  knowledgeGaps: []
};

class LocalDB {
  private data: DatabaseSchema;
  private isSyncingToSupabase = false;

  constructor() {
    this.data = INITIAL_DB;
    this.initSupabase();
  }

  private async initSupabase() {
    if (!supabaseUrl || !supabaseSecretKey) {
      console.log('Supabase credentials not configured in environment. Operating in memory-only mode.');
      return;
    }

    try {
      const client = createClient(supabaseUrl, supabaseSecretKey, {
        auth: { persistSession: false }
      });

      console.log('Connecting to Supabase... Fetching primary database state...');
      const { data, error } = await client
        .from('duka_letu_sync')
        .select('data')
        .eq('id', 'database_state')
        .maybeSingle();

      if (error) {
        if (error.code === '42P01') {
          console.log('Supabase sync tables do not exist yet. Operating in-memory with default seed data.');
        } else {
          console.error('Failed to query master state from Supabase:', error.message);
        }
        return;
      }

      if (data && data.data) {
        console.log('Successfully loaded and synchronized state from Supabase Cloud as primary DB!');
        this.data = data.data;

        // Ensure all seeded users are present (to support adding new demo accounts seamlessly)
        INITIAL_DB.users.forEach(seededUser => {
          const exists = this.data.users.some(u => u.email.toLowerCase() === seededUser.email.toLowerCase());
          if (!exists) {
            this.data.users.push(seededUser);
          }
        });
        
        // Background push any updates/additions back
        this.save();
      } else {
        console.log('No existing state found in Supabase. Back-seeding current default data...');
        await this.saveToSupabase();
      }
    } catch (e) {
      console.error('Error connecting to Supabase on startup:', e);
    }
  }

  public async saveToSupabase() {
    if (!supabaseUrl || !supabaseSecretKey || this.isSyncingToSupabase) return;

    try {
      this.isSyncingToSupabase = true;
      const client = createClient(supabaseUrl, supabaseSecretKey, {
        auth: { persistSession: false }
      });

      // 1. Save master state JSON backup
      const syncPayload = {
        id: 'database_state',
        data: this.data,
        updated_at: new Date().toISOString()
      };

      const { error: syncErr } = await client
        .from('duka_letu_sync')
        .upsert(syncPayload, { onConflict: 'id' });

      if (syncErr) {
        // If sync table doesn't exist yet, we won't try syncing relational tables
        if (syncErr.code !== '42P01') {
          console.error('Supabase background sync backup error:', syncErr.message);
        }
        this.isSyncingToSupabase = false;
        return;
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

      for (const table of individualTables) {
        const records = (this.data as any)[table.key] || [];
        if (records.length === 0) continue;

        // Run non-blocking background upserts with safe async/await
        (async () => {
          try {
            const { error } = await client.from(table.name).upsert(records, { onConflict: 'id' });
            if (error) {
              console.error(`Background sync failed for table "${table.name}":`, error.message);
            }
          } catch (err) {
            console.error(`Error in background sync for table "${table.name}":`, err);
          }
        })();
      }
    } catch (err) {
      console.error('Failed background-sync to Supabase:', err);
    } finally {
      this.isSyncingToSupabase = false;
    }
  }

  public save() {
    // Local db.json has been deleted.
    // Trigger real-time non-blocking persistent update in Supabase
    this.saveToSupabase();
  }

  // --- Users ---
  getUsers() { return this.data.users; }
  getUserById(id: string) { return this.data.users.find(u => u.id === id); }
  getUserByEmail(email: string) { return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase()); }
  createUser(user: User & { passwordHash: string }) {
    this.data.users.push(user);
    this.save();
    return user;
  }

  // --- Conversations ---
  getConversations() { return this.data.conversations; }
  getConversationById(id: string) { return this.data.conversations.find(c => c.id === id); }
  createConversation(conv: Conversation) {
    this.data.conversations.push(conv);
    this.save();
    return conv;
  }
  updateConversation(id: string, updates: Partial<Conversation>) {
    const idx = this.data.conversations.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.data.conversations[idx] = { ...this.data.conversations[idx], ...updates };
      this.save();
      return this.data.conversations[idx];
    }
    return null;
  }

  // --- Messages ---
  getMessages() { return this.data.messages; }
  getMessagesByConversationId(convId: string) {
    return this.data.messages.filter(m => m.conversationId === convId);
  }
  createMessage(msg: Message) {
    this.data.messages.push(msg);
    // Update conversation lastMessageAt
    this.updateConversation(msg.conversationId, { lastMessageAt: msg.timestamp });
    this.save();
    return msg;
  }

  // --- Support Tickets ---
  getSupportTickets() { return this.data.supportTickets; }
  getTicketById(id: string) { return this.data.supportTickets.find(t => t.id === id); }
  createSupportTicket(tkt: SupportTicket) {
    this.data.supportTickets.push(tkt);
    this.save();
    return tkt;
  }
  updateSupportTicket(id: string, updates: Partial<SupportTicket>) {
    const idx = this.data.supportTickets.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.supportTickets[idx] = { ...this.data.supportTickets[idx], ...updates };
      this.save();
      return this.data.supportTickets[idx];
    }
    return null;
  }

  // --- Prompt Versions ---
  getPromptVersions() { return this.data.promptVersions; }
  getPromptVersionById(id: string) { return this.data.promptVersions.find(p => p.id === id); }
  getActivePrompt(language: 'en' | 'sw' | 'multilingual') {
    return this.data.promptVersions.find(p => p.isActive && p.language === language) || 
           this.data.promptVersions.find(p => p.isActive) || 
           this.data.promptVersions[0];
  }
  createPromptVersion(prompt: PromptVersion) {
    if (prompt.isActive) {
      // Set others in the same language to inactive
      this.data.promptVersions.forEach(p => {
        if (p.language === prompt.language) p.isActive = false;
      });
    }
    this.data.promptVersions.push(prompt);
    this.save();
    return prompt;
  }
  activatePromptVersion(id: string) {
    const prompt = this.getPromptVersionById(id);
    if (prompt) {
      this.data.promptVersions.forEach(p => {
        if (p.language === prompt.language) p.isActive = false;
      });
      prompt.isActive = true;
      this.save();
      return true;
    }
    return false;
  }
  deletePromptVersion(id: string) {
    this.data.promptVersions = this.data.promptVersions.filter(p => p.id !== id);
    this.save();
  }

  // --- Prompt Tests (A/B testing) ---
  getPromptTests() { return this.data.promptTests; }
  getPromptTestById(id: string) { return this.data.promptTests.find(t => t.id === id); }
  createPromptTest(test: PromptTest) {
    this.data.promptTests.push(test);
    this.save();
    return test;
  }
  updatePromptTest(id: string, updates: Partial<PromptTest>) {
    const idx = this.data.promptTests.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.promptTests[idx] = { ...this.data.promptTests[idx], ...updates };
      this.save();
      return this.data.promptTests[idx];
    }
    return null;
  }

  // --- Knowledge Documents (RAG) ---
  getKnowledgeDocuments() { return this.data.knowledgeDocuments; }
  getKnowledgeDocumentById(id: string) { return this.data.knowledgeDocuments.find(d => d.id === id); }
  createKnowledgeDocument(doc: KnowledgeDocument) {
    this.data.knowledgeDocuments.push(doc);
    this.save();
    return doc;
  }
  deleteKnowledgeDocument(id: string) {
    this.data.knowledgeDocuments = this.data.knowledgeDocuments.filter(d => d.id !== id);
    this.save();
  }

  // --- Analytics ---
  getAnalytics() { return this.data.analytics; }
  updateAnalytics(updates: Partial<SystemAnalytics>) {
    this.data.analytics = { ...this.data.analytics, ...updates };
    this.save();
    return this.data.analytics;
  }

  // --- Audit & Security Logs ---
  getAuditLogs() {
    if (!this.data.auditLogs) {
      this.data.auditLogs = [];
    }

    // Real-time audit log generation simulation:
    // With 30% probability when requested, append a new automated system audit log or security event.
    // Ensure we don't grow infinitely (limit to max 100 entries).
    if (Math.random() < 0.30 && this.data.auditLogs.length < 100) {
      const actions = [
        { action: 'User Authentication', actor: 'System Monitor', role: 'system', details: 'Automated IP blacklist check completed. No hits.', severity: 'info', status: 'success' },
        { action: 'Database Health Check', actor: 'System Admin', role: 'admin', details: 'Database connection pool optimization executed.', severity: 'info', status: 'success' },
        { action: 'Security Vulnerability Scan', actor: 'Cloud SecurBot', role: 'system', details: 'Weekly static dependency security check completed. 0 critical vulnerabilities found.', severity: 'info', status: 'success' },
        { action: 'API Rate Limiting', actor: 'Gateway Warden', role: 'system', details: 'IP 185.220.101.5 rate limited for exceeding 120 reqs/min.', severity: 'warning', status: 'failure' },
        { action: 'Unauthorized Route Access', actor: 'Anonymous', role: 'customer', details: 'Blocked attempt to access private API path /api/prompts/delete.', severity: 'critical', status: 'failure' },
        { action: 'Prompt Evaluation', actor: 'OmniAdmin', role: 'admin', details: 'New prompt evaluation score calculated: 94% on test runner.', severity: 'info', status: 'success' },
        { action: 'RAG Embedding Sync', actor: 'Embedding Service', role: 'system', details: 'Chunking and vector sync finished for document: Returns FAQ.', severity: 'info', status: 'success' }
      ];

      const chosen = actions[Math.floor(Math.random() * actions.length)];
      const randIP = `192.168.1.${Math.floor(10 + Math.random() * 240)}`;
      const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: chosen.action,
        actor: chosen.actor,
        role: chosen.role,
        ipAddress: randIP,
        details: chosen.details,
        severity: chosen.severity as any,
        status: chosen.status as any
      };
      this.data.auditLogs.unshift(newLog); // push to top so user sees it instantly
      this.save();
    }

    return this.data.auditLogs;
  }

  createAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    if (!this.data.auditLogs) {
      this.data.auditLogs = [];
    }
    const newLog: AuditLog = {
      ...log,
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    this.data.auditLogs.unshift(newLog);
    this.save();
    return newLog;
  }

  clearAuditLogs() {
    this.data.auditLogs = [];
    this.save();
  }

  // --- Knowledge Gaps ---
  getKnowledgeGaps() {
    if (!this.data.knowledgeGaps) {
      this.data.knowledgeGaps = [];
    }
    return this.data.knowledgeGaps;
  }

  recordKnowledgeGap(question: string, intent: string) {
    if (!this.data.knowledgeGaps) {
      this.data.knowledgeGaps = [];
    }
    const normalized = question.trim().toLowerCase();
    const existing = this.data.knowledgeGaps.find(g => g.question.toLowerCase().trim() === normalized);
    if (existing) {
      existing.timesAsked += 1;
      existing.timestamp = new Date().toISOString();
    } else {
      const newGap: KnowledgeGap = {
        id: `gap-${Date.now()}`,
        question: question.trim(),
        intent,
        timesAsked: 1,
        timestamp: new Date().toISOString()
      };
      this.data.knowledgeGaps.push(newGap);
    }
    this.save();
  }

  // --- Customer Memory ---
  getCustomerMemory(customerId: string, customerName: string) {
    const previousConvs = this.data.conversations.filter(c => c.customerId === customerId);
    
    const recentOrders = [
      { orderId: 'OMNI-99321', item: 'Leather Running Shoes', status: 'Out for Delivery', date: '2026-06-25', amount: 89.99 },
      { orderId: 'OMNI-88221', item: 'Cotton Comfort Hoodie', status: 'Delivered', date: '2026-06-10', amount: 45.00 },
      { orderId: 'OMNI-77110', item: 'Wireless Sport Earbuds', status: 'Delivered', date: '2026-05-20', amount: 59.99 }
    ];

    const previousTickets = this.data.supportTickets
      .filter(t => t.conversationId && previousConvs.some(c => c.id === t.conversationId))
      .map(t => ({
        id: t.id,
        category: t.category,
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt
      }));

    const previousIntents = previousConvs.map(c => c.intent).filter(Boolean) as string[];
    const previousSentiments = previousConvs.map(c => c.sentiment).filter(Boolean) as string[];

    return {
      customerName,
      languagePreference: previousConvs.length > 0 ? previousConvs[previousConvs.length - 1].language : 'en',
      recentOrders,
      previousTickets,
      previousIntents: previousIntents.slice(-5),
      previousSentiments: previousSentiments.slice(-5)
    };
  }
}

export const db = new LocalDB();
