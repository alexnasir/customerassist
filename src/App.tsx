import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Mail, Lock, LogIn, Cpu, Globe } from 'lucide-react';
import Sidebar from './components/Sidebar.tsx';
import DashboardView from './components/DashboardView.tsx';
import ChatView from './components/ChatView.tsx';
import VoiceView from './components/VoiceView.tsx';
import PromptView from './components/PromptView.tsx';
import KnowledgeBaseView from './components/KnowledgeBaseView.tsx';
import TicketsView from './components/TicketsView.tsx';
import SystemLogsView from './components/SystemLogsView.tsx';
import { User } from './types.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  // Quick Account Select for Reviewers
  const demoAccounts = [
    { label: 'Admin Panel', email: 'admin@DukaLetuAssist.com', pass: 'admin123', color: 'bg-cyan-500/10 border-cyan-800/20 text-cyan-400' },
    { label: 'Support Agent', email: 'agent@DukaLetuAssist.com', pass: 'agent123', color: 'bg-purple-500/10 border-purple-800/20 text-purple-400' },
    { label: 'Customer Portal', email: 'customer@DukaLetuAssist.com', pass: 'customer123', color: 'bg-emerald-500/10 border-emerald-800/20 text-emerald-400' }
  ];

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setAuthError('');
    setLoading(true);

    const targetEmail = customEmail || email;
    const targetPass = customPass || password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPass })
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        
        // Auto route to appropriate view based on role
        if (data.user.role === 'customer') {
          setActiveTab('chat');
        } else {
          setActiveTab('dashboard');
        }
      } else {
        const err = await res.json();
        setAuthError(err.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      setAuthError('Connection failed. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setEmail('');
    setPassword('');
    setActiveTab('dashboard');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#060813] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
        {/* Abstract futuristic blur background */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-cyan-600/10 to-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-indigo-600/10 to-pink-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Auth Box */}
        <div className="w-full max-w-md bg-[#0D1120] border border-[#1E293B] rounded-2xl p-8 shadow-2xl relative z-10 transition-all duration-300">
          
          {/* Brand Logo Header */}
          <div className="text-center mb-8">

            <h1 className="text-2xl font-black text-white tracking-tight">Duka Letu Assist</h1>
            <p className="text-xs text-gray-400 mt-1.5 max-w-xs mx-auto">Multilingual Voice & Chat Support</p>
          </div>

          {authError && (
            <div className="bg-red-950/20 border border-red-900/30 text-red-400 text-xs p-3 rounded-xl text-center mb-5 font-semibold">
              {authError}
            </div>
          )}

          <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5">Corporate Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@DukaLetuAssist.com"
                  className="w-full bg-[#070913] border border-[#1E293B] hover:border-[#334155] focus:border-cyan-400 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white outline-none transition-all duration-150"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#070913] border border-[#1E293B] hover:border-[#334155] focus:border-cyan-400 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white outline-none transition-all duration-150"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl text-sm shadow-xl shadow-cyan-950/50 transition-all duration-150 disabled:opacity-40"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Quick selectors */}
          <div className="mt-8 pt-6 border-t border-[#1E293B]">
            <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block text-center mb-3">Reviewer Sandbox Logins</span>
            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.map((acc, i) => (
                <button
                  key={i}
                  id={`quick-login-${acc.label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => handleLogin(undefined, acc.email, acc.pass)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all duration-150 ${acc.color} hover:brightness-110`}
                >
                  <span>{acc.label}</span>
                  <span className="opacity-60 text-[10px] font-mono">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#090D16] flex overflow-hidden font-sans" id="app-main">
      {/* Platform Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'voice' && <VoiceView />}
        {activeTab === 'prompts' && <PromptView />}
        {activeTab === 'knowledge' && <KnowledgeBaseView />}
        {activeTab === 'tickets' && <TicketsView />}
        {activeTab === 'logs' && <SystemLogsView currentUser={currentUser} />}
      </main>
    </div>
  );
}
