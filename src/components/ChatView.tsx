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
    <div className="flex-1 bg-zinc-950 flex h-full" id="chat-view">
      {/* LEFT PANEL: Conversation List */}
      <div className="w-80 border-r border-zinc-800 bg-zinc-900 flex flex-col h-full shrink-0">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            Support Chats
          </h3>
          <button 
            onClick={startNewConversation}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl transition-all"
            title="Start New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {conversations.map((conv) => {
            const isActive = activeConv?.id === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`w-full text-left p-4 rounded-2xl transition-all border ${
                  isActive 
                    ? 'bg-zinc-800 border-zinc-700' 
                    : 'hover:bg-zinc-900 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white text-sm">{conv.customerName}</span>
                  <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded border ${
                    conv.status === 'escalated' 
                      ? 'bg-rose-950 text-rose-400 border-rose-900/30' 
                      : conv.status === 'resolved' 
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-900/30'
                        : 'bg-cyan-950 text-cyan-400 border-cyan-900/30'
                  }`}>
                    {conv.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">ID: {conv.id}</p>
                {conv.rating && (
                  <div className="flex items-center gap-1 mt-2 text-amber-400 text-xs">
                    <Star className="w-3 h-3 fill-current" />
                    {conv.rating}/5
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CENTER PANEL: Messages Arena */}
      <div className="flex-1 flex flex-col h-full bg-zinc-950">
        {activeConv ? (
          <>
            {/* Active chat header */}
            <div className="p-5 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-700 rounded-2xl flex items-center justify-center text-sm font-semibold text-white">
                  {activeConv.customerName.slice(0, 1)}
                </div>
                <div>
                  <h4 className="font-semibold text-white">{activeConv.customerName}</h4>
                  <div className="text-xs text-zinc-500 font-mono">ID: {activeConv.id}</div>
                </div>
              </div>

              {activeConv.status !== 'resolved' && (
                <button
                  onClick={resolveConversation}
                  className="text-sm px-5 py-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-900 rounded-2xl font-medium transition-all"
                >
                  Resolve Conversation
                </button>
              )}
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-7">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                const isAgent = msg.sender === 'agent';
                const isAi = msg.sender === 'ai';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-4 max-w-[70%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                  >
                    <div className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 text-xs font-semibold text-white ${
                      isUser 
                        ? 'bg-zinc-700' 
                        : isAgent 
                          ? 'bg-purple-700' 
                          : 'bg-gradient-to-br from-zinc-700 to-zinc-800'
                    }`}>
                      {isUser ? 'U' : isAgent ? 'AG' : 'AI'}
                    </div>

                    <div className={`px-5 py-4 rounded-3xl text-sm leading-relaxed border ${
                      isUser 
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-100 rounded-tr-none' 
                        : isAgent
                          ? 'bg-purple-950/50 border-purple-900/50 text-white rounded-tl-none'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-100 rounded-tl-none'
                    }`}>
                      <div className="text-[10px] text-zinc-500 mb-1.5 font-mono">
                        {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-4 max-w-[70%] mr-auto">
                  <div className="w-8 h-8 rounded-2xl bg-zinc-800 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-zinc-400 animate-pulse" />
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 px-5 py-4 rounded-3xl rounded-tl-none text-sm text-zinc-400 flex items-center gap-1">
                    <span className="animate-pulse">Thinking</span>
                    <span className="animate-pulse">.</span>
                    <span className="animate-pulse">.</span>
                    <span className="animate-pulse">.</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Warning Escalation notice */}
            {activeConv.status === 'escalated' && (
              <div className="bg-rose-950/30 border-y border-rose-900 p-4 text-sm text-rose-300 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                This conversation is escalated. AI automation is paused.
              </div>
            )}

            {/* Input field footer */}
            <form onSubmit={handleSendMessage} className="p-5 border-t border-zinc-800 bg-zinc-900 flex gap-3">
              <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-2xl px-4 text-xs">
                <Globe className="w-4 h-4 text-zinc-400 mr-2" />
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="bg-transparent outline-none text-zinc-200 py-3 pr-2 cursor-pointer"
                >
                  <option value="auto">Auto</option>
                  <option value="en">EN</option>
                  <option value="sw">SW</option>
                </select>
              </div>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={activeConv.status === 'escalated' ? 'AI is paused while escalated...' : 'Ask about shipping, refunds, orders...'}
                disabled={activeConv.status === 'escalated' || loading}
                className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-zinc-600 text-zinc-200 px-5 py-3.5 rounded-2xl outline-none disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || activeConv.status === 'escalated' || loading}
                className="bg-white text-zinc-950 px-6 rounded-2xl font-medium disabled:opacity-40 hover:bg-zinc-200 transition-all flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare className="w-12 h-12 text-zinc-700 mb-6" />
            <h4 className="text-white font-semibold text-xl">No Conversation Selected</h4>
            <p className="text-zinc-500 mt-2 max-w-xs">Select a chat from the list or start a new one.</p>
            <button
              onClick={startNewConversation}
              className="mt-6 bg-white text-zinc-950 px-6 py-2.5 rounded-2xl font-medium hover:bg-zinc-100 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Conversation
            </button>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: RAG Context & Citations */}
      {activeConv && (
        <div className="w-80 border-l border-zinc-800 bg-zinc-900 p-6 flex flex-col h-full overflow-y-auto shrink-0">
          <h3 className="uppercase text-xs tracking-widest font-semibold text-zinc-400 mb-6 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            RAG Retriever
          </h3>

          <div className="space-y-6">
            <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-3xl">
              <div className="text-xs font-mono text-cyan-400 mb-3 tracking-widest">STRATEGY</div>
              <p className="text-sm text-zinc-400">The agent queries the knowledge base and injects relevant context before generating each reply.</p>
            </div>

            {/* Active Strategy */}
            <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-3xl">
              <div className="text-xs font-mono text-emerald-400 mb-4 flex items-center gap-2 tracking-widest">
                ACTIVE STRATEGY
              </div>
              {activeStrategy ? (
                <div className="space-y-5 text-sm">
                  <div>
                    <div className="text-zinc-500 text-xs mb-1">TYPE</div>
                    <div className="font-medium text-white">{activeStrategy.strategyType}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500 text-xs mb-1">REASONING</div>
                    <p className="text-zinc-300 text-sm leading-relaxed border-l border-emerald-900 pl-3">{activeStrategy.reasoning}</p>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-500 text-sm italic">Send a message to activate strategy engine</p>
              )}
            </div>

            {/* Retrieved Sources */}
            <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-3xl">
              <div className="text-xs font-mono text-indigo-400 mb-4 tracking-widest">RETRIEVED SOURCES</div>
              {retrievedSources.length > 0 ? (
                <div className="space-y-2">
                  {retrievedSources.map((src, i) => (
                    <div key={i} className="text-xs bg-zinc-900 border border-zinc-800 p-3 rounded-2xl text-zinc-400 flex items-start gap-3">
                      <FileText className="w-4 h-4 mt-0.5 text-zinc-500" />
                      {src}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No sources retrieved yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK SATISFACTION MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl p-8">
            {feedbackSubmitted ? (
              <div className="py-12 text-center">
                <CheckCircle className="mx-auto w-12 h-12 text-emerald-400 mb-6" />
                <h3 className="font-semibold text-xl text-white">Thank you!</h3>
                <p className="text-zinc-400 mt-2">Your feedback has been recorded.</p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-white mb-1">How was your experience?</h3>
                <p className="text-sm text-zinc-400 mb-6">Help us improve our AI support.</p>

                <div className="flex justify-center gap-3 my-8">
                  {[1,2,3,4,5].map((s) => (
                    <button key={s} onClick={() => setRating(s)} className="transition-transform hover:scale-110">
                      <Star className={`w-9 h-9 ${rating >= s ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} />
                    </button>
                  ))}
                </div>

                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Any additional thoughts?"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded-2xl p-4 text-sm h-28 text-zinc-200 outline-none mb-6"
                />

                <button
                  onClick={submitFeedback}
                  className="w-full py-3.5 bg-white text-zinc-950 font-medium rounded-2xl hover:bg-zinc-100 transition-all"
                >
                  Submit Feedback
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}