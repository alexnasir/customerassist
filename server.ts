import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db.js';
import { geminiService } from './src/server/gemini.js';
import { Message, Conversation, SupportTicket, PromptVersion, PromptTest, KnowledgeDocument } from './src/types.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsers (increased limit for base64 audio uploads)
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // --- HEALTH CHECK ---
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // --- AUTH ENDPOINTS ---
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = db.getUserByEmail(email);
    if (!user || user.passwordHash !== password) {
      db.createAuditLog({
        action: 'User Authentication',
        actor: email,
        role: 'customer',
        ipAddress: '192.168.1.99',
        details: `Failed login attempt for ${email}: Invalid credentials`,
        severity: 'warning',
        status: 'failure'
      });
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    db.createAuditLog({
      action: 'User Authentication',
      actor: user.name,
      role: user.role,
      ipAddress: '192.168.1.50',
      details: `Successful login for ${user.email} (${user.role}) via credentials`,
      severity: 'info',
      status: 'success'
    });

    res.json({
      token: `demo-jwt-token-for-${user.id}`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    const newUser = {
      id: `usr-${Math.floor(100 + Math.random() * 900)}`,
      name,
      email,
      passwordHash: password,
      role: (role as any) || 'customer',
      createdAt: new Date().toISOString()
    };

    db.createUser(newUser);

    res.status(201).json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });
  });

  // --- CONVERSATIONS & CHAT ---
  app.get('/api/conversations', (req, res) => {
    res.json(db.getConversations());
  });

  app.get('/api/conversations/:id', (req, res) => {
    const conv = db.getConversationById(req.params.id);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(conv);
  });

  app.post('/api/conversations', (req, res) => {
    const { customerId, customerName, language } = req.body;
    const newConv: Conversation = {
      id: `conv-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: customerId || 'cust-anon',
      customerName: customerName || 'Anonymous',
      language: language || 'en',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString()
    };
    db.createConversation(newConv);
    res.status(201).json(newConv);
  });

  app.get('/api/conversations/:id/messages', (req, res) => {
    res.json(db.getMessagesByConversationId(req.params.id));
  });

  // POST Chat Message (Core Chat Automation & Gemini RAG processing)
  app.post('/api/conversations/:id/messages', async (req, res) => {
    const { id } = req.params;
    const { sender, senderName, content, language } = req.body;

    const conv = db.getConversationById(id);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    // 1. Create User Message
    const userMsg: Message = {
      id: `msg-${Date.now()}-u`,
      conversationId: id,
      sender: sender || 'user',
      senderName: senderName || 'Customer',
      content,
      type: 'text',
      timestamp: new Date().toISOString()
    };
    db.createMessage(userMsg);

    // If conversation is already escalated to agent, don't auto-reply via Gemini
    if (conv.status === 'escalated') {
      res.json({ userMessage: userMsg, assistantMessage: null });
      return;
    }

    try {
      // 2. Generate Automated AI Response using Gemini + RAG
      const aiResponse = await geminiService.generateResponse(id, content, language);

      // 3. Create Assistant Message
      const aiMsg: Message = {
        id: `msg-${Date.now()}-ai`,
        conversationId: id,
        sender: 'ai',
        senderName: 'OmniAssist AI',
        content: aiResponse.content,
        type: 'text',
        latencyMs: aiResponse.latencyMs,
        timestamp: new Date().toISOString()
      };
      db.createMessage(aiMsg);

      res.json({
        userMessage: userMsg,
        assistantMessage: aiMsg,
        sources: aiResponse.sources,
        escalated: aiResponse.escalated
      });
    } catch (e: any) {
      console.error('Chat error:', e);
      res.status(500).json({ error: e.message || 'Gemini automation error' });
    }
  });

  // POST Agent Reply directly in chat
  app.post('/api/conversations/:id/agent-reply', (req, res) => {
    const { id } = req.params;
    const { senderName, content } = req.body;

    const conv = db.getConversationById(id);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const agentMsg: Message = {
      id: `msg-${Date.now()}-a`,
      conversationId: id,
      sender: 'agent',
      senderName: senderName || 'Support Agent',
      content,
      type: 'text',
      timestamp: new Date().toISOString()
    };
    db.createMessage(agentMsg);

    res.json(agentMsg);
  });

  // POST Conversation Feedback rating & comments
  app.post('/api/conversations/:id/feedback', (req, res) => {
    const { id } = req.params;
    const { rating, feedback } = req.body;

    const conv = db.updateConversation(id, { rating: Number(rating), feedback });
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    // Update global CSAT score
    const allConvsWithRating = db.getConversations().filter(c => c.rating !== undefined);
    if (allConvsWithRating.length > 0) {
      const avgCsat = Number((allConvsWithRating.reduce((sum, c) => sum + (c.rating || 0), 0) / allConvsWithRating.length).toFixed(1));
      db.updateAnalytics({ avgCsat });
    }

    res.json({ success: true, conversation: conv });
  });

  // --- VOICE AI ENDPOINTS ---
  app.post('/api/voice/process', async (req, res) => {
    const { conversationId, audio, language, voiceName } = req.body;
    if (!conversationId || !audio) {
      res.status(400).json({ error: 'conversationId and audio payload are required' });
      return;
    }

    const conv = db.getConversationById(conversationId);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    try {
      // 1. Transcribe incoming base64 voice input using Gemini Audio API
      const transcribedText = await geminiService.transcribeAudio(audio, language);
      if (!transcribedText) {
        res.status(400).json({ error: 'Speech was not detected or failed to transcribe' });
        return;
      }

      // 2. Create user message from transcript
      const userMsg: Message = {
        id: `msg-${Date.now()}-uv`,
        conversationId,
        sender: 'user',
        senderName: conv.customerName,
        content: transcribedText,
        type: 'voice',
        timestamp: new Date().toISOString()
      };
      db.createMessage(userMsg);

      // 3. Generate response using active prompts & RAG
      const aiResponse = await geminiService.generateResponse(conversationId, transcribedText, language);

      // 4. Synthesize answer text to speech via Gemini Speech Synthesis
      const synthVoice = voiceName || (language === 'sw' ? 'Zephyr' : 'Kore');
      const base64AudioOut = await geminiService.synthesizeSpeech(aiResponse.content, synthVoice);

      // 5. Create assistant message
      const aiMsg: Message = {
        id: `msg-${Date.now()}-aiv`,
        conversationId,
        sender: 'ai',
        senderName: 'OmniAssist AI',
        content: aiResponse.content,
        type: 'voice',
        audioUrl: base64AudioOut,
        latencyMs: aiResponse.latencyMs,
        timestamp: new Date().toISOString()
      };
      db.createMessage(aiMsg);

      res.json({
        userMessage: userMsg,
        assistantMessage: aiMsg,
        transcription: transcribedText,
        audioResponse: base64AudioOut,
        sources: aiResponse.sources,
        escalated: aiResponse.escalated
      });

    } catch (e: any) {
      console.error('Voice AI error:', e);
      res.status(500).json({ error: e.message || 'Voice processing error' });
    }
  });

  // --- ESCALATIONS & TICKETS ---
  app.get('/api/tickets', (req, res) => {
    res.json(db.getSupportTickets());
  });

  app.post('/api/tickets/:id/resolve', (req, res) => {
    const { id } = req.params;
    const tkt = db.updateSupportTicket(id, { status: 'resolved' });
    if (!tkt) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    // Set conversation to resolved as well
    db.updateConversation(tkt.conversationId, { status: 'resolved' });

    // Update global resolution rate
    const allConvs = db.getConversations();
    const resolvedCount = allConvs.filter(c => c.status === 'resolved').length;
    const totalCount = allConvs.length;
    const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 85;

    db.updateAnalytics({ resolutionRate });

    res.json({ success: true, ticket: tkt });
  });

  app.post('/api/conversations/:id/escalate', (req, res) => {
    const { id } = req.params;
    const conv = db.updateConversation(id, { status: 'escalated' });
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    // Create Support Ticket
    const ticketId = `tkt-${Math.floor(1000 + Math.random() * 9000)}`;
    const ticket = db.createSupportTicket({
      id: ticketId,
      conversationId: id,
      customerName: conv.customerName,
      email: `${conv.customerName.toLowerCase().replace(/\s+/g, '')}@omniassist.ai`,
      category: 'Manual Escalation',
      priority: 'high',
      status: 'open',
      description: 'Support agent or customer requested manual human transfer.',
      createdAt: new Date().toISOString()
    });

    db.createAuditLog({
      action: 'Conversation Escalation',
      actor: conv.customerName,
      role: 'customer',
      ipAddress: '192.168.1.12',
      details: `Chat session ${id} escalated to human agent. Support Ticket ${ticketId} generated.`,
      severity: 'warning',
      status: 'success'
    });

    res.json({ success: true, conversation: conv, ticket });
  });

  // --- PROMPT MANAGEMENT ---
  app.get('/api/prompts', (req, res) => {
    res.json(db.getPromptVersions());
  });

  app.post('/api/prompts', async (req, res) => {
    const { name, content, language } = req.body;
    if (!name || !content || !language) {
      res.status(400).json({ error: 'name, content, and language are required' });
      return;
    }

    try {
      // 1. Run dynamic evaluation score from Gemini on creation!
      const evalScore = await geminiService.evaluatePrompt(content, language);

      const allPrompts = db.getPromptVersions().filter(p => p.language === language);
      const nextVersion = allPrompts.reduce((max, p) => p.version > max ? p.version : max, 0) + 1;

      const newPrompt: PromptVersion = {
        id: `p-${language}-v${nextVersion}`,
        name,
        version: nextVersion,
        content,
        language,
        isActive: false, // Must be activated manually
        evaluationScore: evalScore,
        costPer1kTokens: language === 'sw' ? 0.0018 : 0.0015,
        resolutionRate: Math.round(75 + evalScore * 0.15),
        latencyMs: Math.round(250 + Math.random() * 150),
        createdAt: new Date().toISOString()
      };

      db.createPromptVersion(newPrompt);
      res.status(201).json(newPrompt);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Prompt evaluation failed' });
    }
  });

  app.post('/api/prompts/:id/activate', (req, res) => {
    const success = db.activatePromptVersion(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Prompt version not found' });
      return;
    }
    res.json({ success: true });
  });

  app.delete('/api/prompts/:id', (req, res) => {
    db.deletePromptVersion(req.params.id);
    res.json({ success: true });
  });

  // --- A/B PROMPT TESTING ---
  app.get('/api/prompts/tests', (req, res) => {
    res.json(db.getPromptTests());
  });

  app.post('/api/prompts/tests', (req, res) => {
    const { name, promptAId, promptBId } = req.body;
    if (!name || !promptAId || !promptBId) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    const test: PromptTest = {
      id: `test-${Math.floor(100 + Math.random() * 900)}`,
      name,
      promptAId,
      promptBId,
      status: 'running',
      startDate: new Date().toISOString(),
      promptAResults: {
        runs: 0,
        resolutions: 0,
        avgLatencyMs: 0,
        avgScore: 0,
        cost: 0,
        hallucinationRate: 0
      },
      promptBResults: {
        runs: 0,
        resolutions: 0,
        avgLatencyMs: 0,
        avgScore: 0,
        cost: 0,
        hallucinationRate: 0
      },
      createdAt: new Date().toISOString()
    };

    db.createPromptTest(test);
    res.status(201).json(test);
  });

  app.post('/api/prompts/tests/:id/complete', (req, res) => {
    const { id } = req.params;
    const test = db.getPromptTestById(id);
    if (!test) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    // Complete the test with simulated realistic high-quality metrics
    const finalTest = db.updatePromptTest(id, {
      status: 'completed',
      endDate: new Date().toISOString(),
      promptAResults: {
        runs: 250,
        resolutions: 210,
        avgLatencyMs: 335,
        avgScore: 92,
        cost: 0.22,
        hallucinationRate: 1.8
      },
      promptBResults: {
        runs: 250,
        resolutions: 232,
        avgLatencyMs: 285,
        avgScore: 96,
        cost: 0.17,
        hallucinationRate: 0.8
      }
    });

    res.json(finalTest);
  });

  // --- KNOWLEDGE BASE MANAGEMENT ---
  app.get('/api/documents', (req, res) => {
    res.json(db.getKnowledgeDocuments());
  });

  app.post('/api/documents', (req, res) => {
    const { name, category, content } = req.body;
    if (!name || !category || !content) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    const chunkCount = Math.max(1, Math.ceil(content.length / 400));
    const newDoc: KnowledgeDocument = {
      id: `doc-${Math.floor(100 + Math.random() * 900)}`,
      name,
      category,
      content,
      chunkCount,
      createdAt: new Date().toISOString()
    };

    db.createKnowledgeDocument(newDoc);
    res.status(201).json(newDoc);
  });

  app.delete('/api/documents/:id', (req, res) => {
    db.deleteKnowledgeDocument(req.params.id);
    res.json({ success: true });
  });

  // --- LIVE SYSTEM ANALYTICS ---
  app.get('/api/analytics', (req, res) => {
    const analytics = db.getAnalytics();
    const conversations = db.getConversations();
    const tickets = db.getSupportTickets();

    // Dynamically calculate live state metrics
    const totalConversations = conversations.length;
    const activeUsers = new Set(conversations.map(c => c.customerId)).size + 2;
    const openTickets = tickets.filter(t => t.status !== 'resolved').length;
    const escalationRate = totalConversations > 0 ? Math.round((tickets.length / totalConversations) * 100) : 12;

    res.json({
      ...analytics,
      totalConversations,
      activeUsers,
      openTickets,
      escalationRate
    });
  });

  // --- SYSTEM AUDIT & SECURITY LOGS ---
  app.get('/api/audit-logs', (req, res) => {
    res.json(db.getAuditLogs());
  });

  app.post('/api/audit-logs', (req, res) => {
    const { action, actor, role, ipAddress, details, severity, status } = req.body;
    if (!action || !actor || !details) {
      res.status(400).json({ error: 'Action, actor, and details are required' });
      return;
    }
    const log = db.createAuditLog({
      action,
      actor,
      role: role || 'system',
      ipAddress: ipAddress || '127.0.0.1',
      details,
      severity: severity || 'info',
      status: status || 'success'
    });
    res.status(201).json(log);
  });

  app.post('/api/audit-logs/clear', (req, res) => {
    db.clearAuditLogs();
    const log = db.createAuditLog({
      action: 'System Clear Logs',
      actor: 'OmniAdmin',
      role: 'admin',
      ipAddress: '192.168.1.50',
      details: 'Administrator cleared all system audit logs and security events',
      severity: 'warning',
      status: 'success'
    });
    res.json({ success: true, log });
  });

  // --- VITE DEV / PROD ASSETS ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OmniAssist] Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[OmniAssist] Failed to start server:', err);
});
