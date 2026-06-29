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
import StorefrontView from './components/StorefrontView.tsx';
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
    { label: 'Admin Panel', email: 'admin@DukaLetuAssist.com', pass: 'admin123', color: 'bg-zinc-900/70 border-zinc-700 hover:border-zinc-600 text-zinc-400' },
    { label: 'Support Agent', email: 'agent@DukaLetuAssist.com', pass: 'agent123', color: 'bg-zinc-900/70 border-zinc-700 hover:border-zinc-600 text-zinc-400' },
    { label: 'Customer Portal', email: 'customer@DukaLetuAssist.com', pass: 'customer123', color: 'bg-zinc-900/70 border-zinc-700 hover:border-zinc-600 text-zinc-400' },
    { label: 'Website Inquiry Widget', email: 'guest@DukaLetuAssist.com', pass: 'guest123', color: 'bg-zinc-900/70 border-zinc-700 hover:border-zinc-600 text-zinc-400' }
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
        } else if (data.user.role === 'visitor') {
          setActiveTab('storefront');
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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none">
        {/* Subtle ambient background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_0.8px,transparent_1px)] bg-[length:4px_4px] opacity-40"></div>
        
        {/* Auth Container */}
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-10 shadow-xl relative z-10">
          
          {/* Brand Logo Header */}
          <div className="text-center mb-10">
            
            <h1 className="text-3xl font-semibold text-white tracking-tight">Duka Letu Agent</h1>
            <p className="text-xs text-zinc-500 mt-2">Multilingual Voice & Chat Support</p>
          </div>

          {authError && (
            <div className="bg-red-950/50 border border-red-900/50 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
              {authError}
            </div>
          )}

          <form onSubmit={(e) => handleLogin(e)} className="space-y-6">
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-2">Corporate Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-4 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@DukaLetuAssist.com"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 hover:border-zinc-700 rounded-xl pl-11 py-3.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-2">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-4 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 hover:border-zinc-700 rounded-xl pl-11 py-3.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-zinc-950 hover:bg-zinc-100 font-semibold py-3.5 rounded-xl text-sm transition-all duration-200 active:scale-[0.985] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Quick selectors */}
          <div className="mt-10 pt-8 border-t border-zinc-800">
            <span className="text-[10px] text-zinc-500 font-mono tracking-[0.5px] block text-center mb-4">REVIEWER SANDBOX LOGINS</span>
            <div className="space-y-2">
              {demoAccounts.map((acc, i) => (
                <button
                  key={i}
                  id={`quick-login-${acc.label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => handleLogin(undefined, acc.email, acc.pass)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-sm flex items-center justify-between transition-all group"
                >
                  <div>
                    <span className="text-white font-medium">{acc.label}</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono group-hover:text-zinc-400 transition-colors">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer credit */}
        <div className="absolute bottom-6 text-[10px] text-zinc-700 font-mono">Enterprise • Secure • Scalable</div>
      </div>
    );
  }

  // Bypass system design entirely for inquiry-level customers, routing them directly to the native embedded store-widget view
  if (currentUser.role === 'visitor') {
    return <StorefrontView onLogout={handleLogout} />;
  }

  return (
    <div className="h-screen w-screen bg-zinc-950 flex overflow-hidden font-sans" id="app-main">
      {/* Platform Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-zinc-950">
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