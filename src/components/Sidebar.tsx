import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Mic, 
  Cpu, 
  BookOpen, 
  Ticket, 
  LogOut,
  Sparkles,
  Terminal
} from 'lucide-react';
import { User } from '../types.js';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'agent'] },
    { id: 'voice', label: 'Voice Assistant', icon: Mic, roles: ['admin', 'agent', 'customer'] },
    { id: 'chat', label: 'Chat Assistant', icon: MessageSquare, roles: ['admin', 'agent', 'customer'] },
    { id: 'prompts', label: 'Prompt Manager', icon: Cpu, roles: ['admin'] },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, roles: ['admin', 'agent'] },
    { id: 'tickets', label: 'Agent Workspace', icon: Ticket, roles: ['admin', 'agent'] },
    { id: 'logs', label: 'System Logs', icon: Terminal, roles: ['admin'] },
  ];

  const allowedItems = menuItems.filter(item => 
    !currentUser || item.roles.includes(currentUser.role)
  );

  return (
    <aside className="w-64 bg-zinc-950 text-zinc-300 border-r border-zinc-800 flex flex-col h-full shrink-0">
      {/* Brand Logo */}
      <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
       
        <div>
          <h1 className="font-semibold text-xl tracking-tighter text-white">Duka Letu Agent</h1>
          <span className="text-[10px] font-mono tracking-[1px] text-zinc-500 uppercase">Support SaaS</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="px-3 mb-3 text-xs font-mono uppercase tracking-widest text-zinc-500">
          Menu
        </div>
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-tab-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`group w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-zinc-900 text-white border border-zinc-700 shadow-sm'
                  : 'hover:bg-zinc-900/70 hover:text-zinc-100 border border-transparent'
              }`}
            >
              <div className={`p-1 rounded-lg transition-colors ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                <Icon className="w-4 h-4" />
              </div>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User Footer info */}
      {currentUser && (
        <div className="p-4 border-t border-zinc-800 bg-zinc-900">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-sm font-semibold text-white border border-zinc-700">
              {currentUser.name.slice(0, 2)}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="font-medium text-white truncate">{currentUser.name}</p>
              <p className="text-xs text-zinc-500 font-mono capitalize mt-0.5">{currentUser.role}</p>
            </div>
          </div>
          <button
            id="sidebar-logout"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-900/30 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}