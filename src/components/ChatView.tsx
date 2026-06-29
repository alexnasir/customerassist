import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  Globe, 
  HelpCircle, 
  Star, 
  User as UserIcon, 
  AlertCircle,
  FileText,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  Plus,
  CheckCircle
} from 'lucide-react';
import { Conversation, Message } from '../types.js';

export default function ChatView() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [language, setLanguage] = useState<'en' | 'sw' | 'auto'>('auto');
  const [loading, setLoading] = useState(false);
  const [retrievedSources, setRetrievedSources] = useState<string[]>([]);
  
  // Feedback CSAT State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0 && !activeConv) {
          // Default to the first conversation
          handleSelectConversation(data[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load conversations', e);
    }
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    try {
      const res = await fetch(`/api/conversations/${conv.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        setRetrievedSources([]);
      }
    } catch (e) {
      console.error('Failed to load messages', e);
    }
  };

  const startNewConversation = async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'usr-3',
          customerName: 'Alex Customer',
          language: 'en'
        })
      });
      if (res.ok) {
        const newConv = await res.json();
        setConversations(prev => [newConv, ...prev]);
        setActiveConv(newConv);
        setMessages([]);
        setRetrievedSources([]);
      }
    } catch (e) {
      console.error('Failed to start conversation', e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConv || loading) return;

    const userText = inputText;
    setInputText('');
    setLoading(true);

    // Optimistic user message append
    const tempUserMsg: Message = {
      id: `msg-temp-${Date.now()}`,
      conversationId: activeConv.id,
      sender: 'user',
      senderName: 'Alex Customer',
      content: userText,
      type: 'text',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'user',
          senderName: 'Alex Customer',
          content: userText,
          language: language === 'auto' ? undefined : language
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Replace temp and append real messages
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempUserMsg.id);
          return [...filtered, data.userMessage, ...(data.assistantMessage ? [data.assistantMessage] : [])];
        });

        if (data.sources) {
          setRetrievedSources(data.sources);
        }

        if (data.escalated) {
          // If escalated, update active conversation status locally
          setActiveConv(prev => prev ? { ...prev, status: 'escalated' } : null);
          fetchConversations();
        }
      }
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!activeConv) return;
    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback: feedbackText })
      });
      if (res.ok) {
        setFeedbackSubmitted(true);
        setTimeout(() => {
          setShowFeedbackModal(false);
          setFeedbackSubmitted(false);
          setFeedbackText('');
          fetchConversations();
        }, 2000);
      }
    } catch (e) {
      console.error('Feedback failed:', e);
    }
  };

  // Resolve active conversation
  const resolveConversation = async () => {
    if (!activeConv) return;
    try {
      // Simulate ticket list check and resolve ticket/conv on server
      const ticketsRes = await fetch('/api/tickets');
      if (ticketsRes.ok) {
        const tickets = await ticketsRes.json();
        const relatedTicket = tickets.find((t: any) => t.conversationId === activeConv.id);
        if (relatedTicket) {
          await fetch(`/api/tickets/${relatedTicket.id}/resolve`, { method: 'POST' });
        } else {
          // Call direct conversation feedback / resolved updater
          await fetch(`/api/conversations/${activeConv.id}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: 5, feedback: 'Resolved by customer' })
          });
        }
      }
      
      // Update local state
      setActiveConv(prev => prev ? { ...prev, status: 'resolved' } : null);
      setShowFeedbackModal(true);
      fetchConversations();
    } catch (e) {
      console.error('Failed to resolve conversation:', e);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Get latest assistant strategy
  const latestAiMsg = [...messages].reverse().find(m => m.sender === 'ai' && m.strategy);
  const activeStrategy = latestAiMsg?.strategy || activeConv?.strategy;

  return (
    <div className="flex-1 bg-[#090D16] flex h-full" id="chat-view">
      {/* LEFT PANEL: Conversation List */}
      <div className="w-80 border-r border-[#1E293B] bg-[#0E1424] flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            Support Chats
          </h3>
          <button 
            onClick={startNewConversation}
            className="p-1.5 bg-cyan-950/40 text-cyan-400 hover:bg-cyan-900/40 rounded border border-cyan-800/30 transition-all duration-150"
            title="Start New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {conversations.map((conv) => {
            const isActive = activeConv?.id === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 border ${
                  isActive 
                    ? 'bg-[#1E293B]/70 border-cyan-500/30 shadow-lg shadow-cyan-950/20' 
                    : 'hover:bg-slate-800/20 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white leading-none">{conv.customerName}</span>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded uppercase ${
                    conv.status === 'escalated' 
                      ? 'bg-rose-950/50 text-rose-400 border border-rose-800/20' 
                      : conv.status === 'resolved' 
                        ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/20'
                        : 'bg-cyan-950/40 text-cyan-400 border border-cyan-800/20'
                  }`}>
                    {conv.status}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 truncate">ID: {conv.id} • Last active: {new Date(conv.lastMessageAt).toLocaleTimeString()}</p>
                {conv.rating && (
                  <div className="flex items-center gap-1 mt-1.5 text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span className="text-[10px] font-bold">{conv.rating}/5 CSAT</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CENTER PANEL: Messages Arena */}
      <div className="flex-1 flex flex-col h-full bg-[#090D16]">
        {activeConv ? (
          <>
            {/* Active chat header */}
            <div className="p-4 border-b border-[#1E293B] bg-[#0E1424] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-base leading-none">{activeConv.customerName}</h4>
                  <span className="text-xs text-gray-400 font-mono">({activeConv.id})</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-cyan-400 flex items-center gap-1 font-semibold">
                    <Globe className="w-3 h-3" />
                    Language: {activeConv.language.toUpperCase()}
                  </span>
                  {activeConv.status === 'escalated' && (
                    <span className="text-xs text-rose-400 font-medium flex items-center gap-1 animate-pulse">
                      <AlertCircle className="w-3 h-3" />
                      Live Agent Queue Active
                    </span>
                  )}
                </div>
              </div>

              {activeConv.status !== 'resolved' && (
                <button
                  onClick={resolveConversation}
                  className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-xs font-bold px-4 py-2 rounded-lg border border-emerald-800/30 transition-all duration-150"
                >
                  Resolve Conversation
                </button>
              )}
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                const isAgent = msg.sender === 'agent';
                const isAi = msg.sender === 'ai';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xs uppercase ${
                      isUser 
                        ? 'bg-gradient-to-tr from-cyan-600 to-indigo-600' 
                        : isAgent 
                          ? 'bg-purple-600' 
                          : 'bg-gradient-to-tr from-indigo-600 to-pink-600'
                    }`}>
                      {isUser ? 'U' : isAgent ? 'AG' : <Sparkles className="w-3.5 h-3.5" />}
                    </div>

                    <div>
                      <div className={`p-4 rounded-2xl border ${
                        isUser 
                          ? 'bg-[#1E293B] border-[#334155] text-white rounded-tr-none' 
                          : isAgent
                            ? 'bg-purple-950/20 border-purple-900/30 text-white rounded-tl-none'
                            : 'bg-[#0F172A] border-[#1E293B] text-gray-200 rounded-tl-none'
                      }`}>
                        <div className="flex items-center justify-between gap-4 mb-1 border-b border-white/5 pb-1 text-[10px] text-gray-400 font-semibold tracking-wider uppercase">
                          <span>{msg.senderName}</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        
                        {/* Audio Wave for Voice Messages */}
                        {msg.type === 'voice' && (
                          <div className="mt-3 flex items-center gap-2 bg-[#090D16]/50 p-2 rounded-lg border border-white/5">
                            <span className="text-[10px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded uppercase font-bold">Voice Playback</span>
                            <div className="flex items-center gap-1">
                              <span className="w-1 h-3 bg-cyan-400 rounded-full animate-pulse"></span>
                              <span className="w-1 h-5 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></span>
                              <span className="w-1 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                              <span className="w-1 h-4 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></span>
                            </div>
                          </div>
                        )}
                      </div>

                
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-3 max-w-xl mr-auto">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div className="bg-[#0F172A] border border-[#1E293B] p-4 rounded-2xl rounded-tl-none">
                    <div className="flex gap-1 items-center py-1">
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Warning Escalation notice */}
            {activeConv.status === 'escalated' && (
              <div className="bg-[#1C161F] border-t border-b border-rose-950/40 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <p className="text-xs text-rose-300 font-medium">
                    This conversation is escalated. AI automation is paused. Go to **Agent Workspace** to reply as Agent Sarah.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest bg-rose-950/50 px-2 py-0.5 rounded">
                  Manual State
                </span>
              </div>
            )}

            {/* Input field footer */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-[#1E293B] bg-[#0E1424] flex items-center gap-3">
              <div className="flex items-center gap-2 border border-[#1E293B] bg-[#090D16] px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 shrink-0">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="bg-transparent border-none outline-none text-white font-medium cursor-pointer"
                >
                  <option value="auto" className="bg-[#090D16]">Language: Auto</option>
                  <option value="en" className="bg-[#090D16]">English Only</option>
                  <option value="sw" className="bg-[#090D16]">Kiswahili</option>
                </select>
              </div>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={activeConv.status === 'escalated' ? 'AI is paused while escalated...' : 'Ask about shipping, refunds, orders...'}
                disabled={activeConv.status === 'escalated' || loading}
                className="flex-1 bg-[#090D16] border border-[#1E293B] hover:border-cyan-500/20 focus:border-cyan-400 text-sm text-white px-4 py-3 rounded-xl outline-none transition-all duration-200 disabled:opacity-40"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || activeConv.status === 'escalated' || loading}
                className="bg-gradient-to-tr from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white p-3 rounded-xl font-semibold shadow-lg shadow-cyan-950/40 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="bg-[#0F172A] border border-[#1E293B] p-4 rounded-2xl text-cyan-400 mb-4 shadow-lg">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h4 className="text-white font-bold text-lg">No Conversation Selected</h4>
            <p className="text-sm text-gray-400 max-w-sm mt-1">Select an active chat from the sidebar, or click below to launch a new automated customer assistance flow.</p>
            <button
              onClick={startNewConversation}
              className="mt-5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-6 py-2.5 rounded-lg shadow-md transition-all duration-200"
            >
              Start New Flow
            </button>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: RAG Context & Citations */}
      {activeConv && (
        <div className="w-80 border-l border-[#1E293B] bg-[#0E1424] p-4 flex flex-col h-full shrink-0 overflow-y-auto">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            RAG Retriever Agent
          </h3>

          <div className="space-y-4">
            <div className="bg-[#090D16] border border-[#1E293B] p-4 rounded-xl">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block mb-2">Retrieval Strategy</span>
              <p className="text-xs text-gray-400 leading-relaxed">The AI agent auto-queries the Knowledge Base FAQ and injects specific paragraphs into the system prompt context on each turn.</p>
            </div>

            {/* Conversation Strategy Engine UI Card */}
            <div className="bg-[#090D16] border border-[#1E293B] p-4 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Active Support Strategy
              </span>
              
              {activeStrategy ? (
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Strategy Type:</span>
                    <div className="text-xs font-semibold px-2 py-1 bg-emerald-950/40 text-emerald-400 border border-emerald-800/20 rounded-md inline-block">
                      {activeStrategy.strategyType}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Reasoning:</span>
                    <p className="text-[11px] text-gray-300 leading-relaxed bg-[#0E1424] p-2 rounded border border-[#1E293B]/60">
                      {activeStrategy.reasoning}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Recommended Tactics:</span>
                    <ul className="space-y-1 bg-[#0E1424] p-2 rounded border border-[#1E293B]/60">
                      {activeStrategy.recommendedTactics.map((tactic, idx) => (
                        <li key={idx} className="text-[10px] text-gray-300 flex items-start gap-1.5">
                          <span className="text-emerald-400 font-bold mt-0.5">•</span>
                          <span>{tactic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t border-[#1E293B] pt-3 mt-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Milestone Goals:</span>
                    <ul className="space-y-2">
                      {activeStrategy.goals.map((goal, idx) => (
                        <li key={idx} className="flex items-center justify-between text-[11px] bg-[#0E1424] px-2.5 py-1.5 rounded border border-[#1E293B]/60">
                          <span className={goal.achieved ? 'text-gray-500 line-through font-medium' : 'text-gray-300 font-medium'}>
                            {goal.description}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide shrink-0 ${
                            goal.achieved 
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/20' 
                              : 'bg-amber-950/40 text-amber-400 border border-amber-800/20'
                          }`}>
                            {goal.achieved ? 'Done' : 'Pending'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 italic py-3 text-center bg-[#0E1424] rounded-lg border border-[#1E293B]/40">
                  Send a message to let the strategy engine determine the optimal support path.
                </div>
              )}
            </div>

            <div className="bg-[#090D16] border border-[#1E293B] p-4 rounded-xl">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-2.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Retrieved Context Sources
              </span>
              
              {retrievedSources.length > 0 ? (
                <div className="space-y-2">
                  {retrievedSources.map((src, i) => (
                    <div key={i} className="bg-[#0E1424] border border-[#1E293B] p-2.5 rounded-lg flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-xs text-gray-200 truncate font-semibold">{src}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-500 italic py-2 text-center bg-[#0E1424] rounded-lg border border-[#1E293B]/40">
                  No sources active in this step. Send a query to fetch facts.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK SATISFACTION MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F172A] border border-[#1E293B] p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            <h3 className="font-bold text-white text-lg">Rate Your Experience</h3>
            <p className="text-xs text-gray-400 mt-1">Please help us optimize our automated support prompts by providing feedback.</p>

            {feedbackSubmitted ? (
              <div className="my-8 text-center text-emerald-400 font-bold flex flex-col items-center gap-2 animate-bounce">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
                Thank you for your rating!
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 my-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition-all duration-100"
                    >
                      <Star className={`w-8 h-8 ${rating >= star ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`} />
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 font-medium block mb-1">Additional Feedback (Optional)</label>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="How can we improve?"
                      className="w-full bg-[#090D16] border border-[#1E293B] rounded-xl p-3 text-sm text-white outline-none focus:border-cyan-400 h-24 resize-none"
                    />
                  </div>

                  <button
                    onClick={submitFeedback}
                    className="w-full bg-gradient-to-tr from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all duration-150"
                  >
                    Submit CSAT
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
