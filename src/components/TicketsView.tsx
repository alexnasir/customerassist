import React, { useEffect, useState, useRef } from 'react';
import { 
  Ticket, 
  CheckCircle, 
  AlertTriangle, 
  MessageSquare, 
  Send, 
  Clock, 
  User as UserIcon,
  HelpCircle,
  FileText
} from 'lucide-react';
import { SupportTicket, Message, Conversation } from '../types.js';

export default function TicketsView() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentText, setAgentText] = useState('');
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
        if (data.length > 0 && !activeTicket) {
          handleSelectTicket(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTicket = async (tkt: SupportTicket) => {
    setActiveTicket(tkt);
    try {
      const res = await fetch(`/api/conversations/${tkt.conversationId}/messages`);
      if (res.ok) {
        setMessages(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendAgentReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentText.trim() || !activeTicket) return;

    const replyContent = agentText;
    setAgentText('');

    try {
      const res = await fetch(`/api/conversations/${activeTicket.conversationId}/agent-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: 'Agent Sarah',
          content: replyContent
        })
      });

      if (res.ok) {
        const realMsg = await res.json();
        setMessages(prev => [...prev, realMsg]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleResolveTicket = async () => {
    if (!activeTicket) return;
    try {
      const res = await fetch(`/api/tickets/${activeTicket.id}/resolve`, { method: 'POST' });
      if (res.ok) {
        setActiveTicket(prev => prev ? { ...prev, status: 'resolved' } : null);
        loadTickets();
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 8000); // Poll escalated ticket statuses
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#090D16]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#090D16] flex h-full animate-fade-in" id="tickets-view">
      
      {/* LEFT COLUMN: Escalated Tickets Index */}
      <div className="w-80 border-r border-[#1E293B] bg-[#0E1424] flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-[#1E293B]">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
            <Ticket className="w-4 h-4 text-rose-400" />
            Escalation Tickets
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {tickets.map((tkt) => {
            const isActive = activeTicket?.id === tkt.id;
            return (
              <button
                key={tkt.id}
                onClick={() => handleSelectTicket(tkt)}
                className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 border ${
                  isActive 
                    ? 'bg-[#1E293B]/70 border-rose-500/20 shadow-lg shadow-rose-950/10' 
                    : 'hover:bg-slate-800/20 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white leading-none">{tkt.customerName}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    tkt.priority === 'high' ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'
                  }`}>
                    {tkt.priority}
                  </span>
                </div>
                
                <p className="text-xs text-gray-300 line-clamp-1 mt-1 font-medium">{tkt.description}</p>
                
                <div className="flex items-center justify-between mt-3 text-[10px] text-gray-500 font-medium">
                  <span>ID: {tkt.id}</span>
                  <span className={`capitalize ${tkt.status === 'resolved' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {tkt.status}
                  </span>
                </div>
              </button>
            );
          })}

          {tickets.length === 0 && (
            <div className="text-center text-gray-500 py-12 italic text-xs">
              No escalated tickets pending. AI support solved everything!
            </div>
          )}
        </div>
      </div>

      {/* CENTER: Conversation Interceptor Thread */}
      <div className="flex-1 flex flex-col h-full bg-[#090D16]">
        {activeTicket ? (
          <>
            {/* Active Ticket Details TopBar */}
            <div className="p-4 border-b border-[#1E293B] bg-[#0E1424] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-base leading-none">Interfaced with: {activeTicket.customerName}</h4>
                  <span className="text-xs text-gray-400 font-mono">({activeTicket.id})</span>
                </div>
                <p className="text-xs text-gray-400 mt-1.5 font-medium">
                  Category: <strong className="text-cyan-400">{activeTicket.category}</strong> • Reason: {activeTicket.description}
                </p>
              </div>

              {activeTicket.status !== 'resolved' ? (
                <button
                  onClick={handleResolveTicket}
                  className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-xs font-bold px-4 py-2.5 rounded-lg border border-emerald-800/30 transition-all duration-150"
                >
                  Mark as Resolved & Close Ticket
                </button>
              ) : (
                <span className="bg-emerald-950/40 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-800/20">
                  Ticket Closed
                </span>
              )}
            </div>

            {/* Conversation History thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-[#1C161F] border border-rose-950/30 p-3.5 rounded-xl text-xs text-rose-300 font-medium flex items-start gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>
                  <strong>Escalation Mode Active:</strong> You are intercepting the AI. The customer is currently waiting for your manual agent response.
                </span>
              </div>

              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                const isAgent = msg.sender === 'agent';
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
                          : 'bg-[#1E293B]'
                    }`}>
                      {isUser ? 'U' : isAgent ? 'AG' : 'AI'}
                    </div>

                    <div className={`p-4 rounded-2xl border ${
                      isUser 
                        ? 'bg-[#1E293B] border-[#334155] text-white rounded-tr-none' 
                        : isAgent
                          ? 'bg-purple-950/20 border-purple-900/30 text-white rounded-tl-none'
                          : 'bg-[#0F172A] border-[#1E293B] text-gray-400 rounded-tl-none'
                    }`}>
                      <div className="flex items-center justify-between gap-4 mb-1 border-b border-white/5 pb-1 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                        <span>{msg.senderName}</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Agent Text Input bar */}
            {activeTicket.status !== 'resolved' && (
              <form onSubmit={handleSendAgentReply} className="p-4 border-t border-[#1E293B] bg-[#0E1424] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white shrink-0 text-xs font-bold font-mono">
                  AG
                </div>
                
                <input
                  type="text"
                  value={agentText}
                  onChange={(e) => setAgentText(e.target.value)}
                  placeholder="Type manual agent response..."
                  className="flex-1 bg-[#090D16] border border-[#1E293B] hover:border-purple-500/20 focus:border-purple-400 text-sm text-white px-4 py-3 rounded-xl outline-none transition-all duration-200"
                />

                <button
                  type="submit"
                  disabled={!agentText.trim()}
                  className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-xl font-semibold shadow-lg shadow-purple-950/40 disabled:opacity-30 transition-all duration-200"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="bg-[#0F172A] border border-[#1E293B] p-4 rounded-2xl text-rose-400 mb-4 shadow-lg">
              <Ticket className="w-8 h-8" />
            </div>
            <h4 className="text-white font-bold text-lg">No Active Ticket Selected</h4>
            <p className="text-sm text-gray-400 max-w-sm mt-1">Select an escalated customer ticket from the sidebar queue to intercept and reply in real-time.</p>
          </div>
        )}
      </div>

    </div>
  );
}
