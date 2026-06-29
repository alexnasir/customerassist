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
      <div className="flex-1 flex items-center justify-center bg-[#0A0F1C]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#0A0F1C] flex h-full" id="tickets-view">
      
      {/* LEFT COLUMN: Escalated Tickets Index */}
      <div className="w-80 border-r border-slate-800 bg-[#111827] flex flex-col h-full shrink-0">
        <div className="p-5 border-b border-slate-800">
          <h3 className="font-semibold text-white text-sm uppercase tracking-[0.125em] flex items-center gap-2">
            <Ticket className="w-4 h-4 text-rose-400" />
            Escalation Tickets
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tickets.map((tkt) => {
            const isActive = activeTicket?.id === tkt.id;
            return (
              <button
                key={tkt.id}
                onClick={() => handleSelectTicket(tkt)}
                className={`w-full text-left p-4 rounded-2xl transition-all duration-200 border group ${
                  isActive 
                    ? 'bg-slate-900 border-rose-500/30 shadow-xl shadow-rose-950/20' 
                    : 'hover:bg-slate-900/70 border-transparent hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{tkt.customerName}</span>
                  <span className={`text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-widest ${
                    tkt.priority === 'high' ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'
                  }`}>
                    {tkt.priority}
                  </span>
                </div>
                
                <p className="text-sm text-slate-300 line-clamp-2 font-medium leading-snug">{tkt.description}</p>
                
                <div className="flex items-center justify-between mt-4 text-xs text-slate-500 font-medium">
                  <span>ID: {tkt.id}</span>
                  <span className={`capitalize ${tkt.status === 'resolved' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {tkt.status}
                  </span>
                </div>
              </button>
            );
          })}

          {tickets.length === 0 && (
            <div className="text-center text-slate-500 py-16 italic text-sm">
              No escalated tickets pending. AI support solved everything!
            </div>
          )}
        </div>
      </div>

      {/* CENTER: Conversation Interceptor Thread */}
      <div className="flex-1 flex flex-col h-full bg-[#0A0F1C]">
        {activeTicket ? (
          <>
            {/* Active Ticket Details TopBar */}
            <div className="p-5 border-b border-slate-800 bg-[#111827] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-white text-lg">Interfaced with: {activeTicket.customerName}</h4>
                  <span className="text-xs text-slate-500 font-mono tracking-tight">({activeTicket.id})</span>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  Category: <span className="text-sky-400 font-medium">{activeTicket.category}</span> • Reason: {activeTicket.description}
                </p>
              </div>

              {activeTicket.status !== 'resolved' ? (
                <button
                  onClick={handleResolveTicket}
                  className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 text-sm font-medium px-6 py-3 rounded-2xl border border-emerald-900/40 transition-all duration-200"
                >
                  Mark as Resolved & Close Ticket
                </button>
              ) : (
                <span className="bg-emerald-950/60 text-emerald-400 text-sm font-medium px-5 py-2.5 rounded-2xl border border-emerald-900/30">
                  Ticket Closed
                </span>
              )}
            </div>

            {/* Conversation History thread */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="bg-[#1C161F] border border-rose-900/40 p-5 rounded-3xl text-sm text-rose-300 flex items-start gap-4">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
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
                    className={`flex gap-4 max-w-2xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-white font-semibold text-xs uppercase ring-1 ring-offset-2 ring-offset-[#0A0F1C] ${
                      isUser 
                        ? 'bg-gradient-to-br from-sky-500 to-indigo-600 ring-sky-500/30' 
                        : isAgent 
                          ? 'bg-purple-600 ring-purple-500/30' 
                          : 'bg-slate-700 ring-slate-600'
                    }`}>
                      {isUser ? 'U' : isAgent ? 'AG' : 'DL'}
                    </div>

                    <div className={`px-5 py-4 rounded-3xl border max-w-lg ${
                      isUser 
                        ? 'bg-slate-800 border-slate-700 rounded-tr-none' 
                        : isAgent
                          ? 'bg-purple-950/30 border-purple-900/40 rounded-tl-none'
                          : 'bg-[#111827] border-slate-800 rounded-tl-none'
                    }`}>
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2.5">
                        <span>{msg.senderName}</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[15px] leading-relaxed text-slate-200">{msg.content}</p>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Agent Text Input bar */}
            {activeTicket.status !== 'resolved' && (
              <form onSubmit={handleSendAgentReply} className="p-5 border-t border-slate-800 bg-[#111827] flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl bg-purple-600 flex items-center justify-center text-white shrink-0 text-xs font-bold ring-1 ring-purple-500/30">
                  AG
                </div>
                
                <input
                  type="text"
                  value={agentText}
                  onChange={(e) => setAgentText(e.target.value)}
                  placeholder="Type manual agent response..."
                  className="flex-1 bg-[#0A0F1C] border border-slate-700 focus:border-purple-500 text-sm text-white px-5 py-4 rounded-3xl outline-none transition-all duration-200"
                />

                <button
                  type="submit"
                  disabled={!agentText.trim()}
                  className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white p-4 rounded-3xl font-medium shadow-lg shadow-purple-950/50 disabled:opacity-40 transition-all duration-200 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl text-rose-400 mb-6">
              <Ticket className="w-12 h-12" />
            </div>
            <h4 className="text-white font-semibold text-2xl">No Active Ticket Selected</h4>
            <p className="text-slate-400 max-w-sm mt-3 text-[15px]">Select an escalated customer ticket from the sidebar queue to intercept and reply in real-time.</p>
          </div>
        )}
      </div>

    </div>
  );
}