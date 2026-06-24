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
    { id: 'chat', label: 'Chat Assistant', icon: MessageSquare, roles: ['admin', 'agent', 'customer'] },
    { id: 'voice', label: 'Voice Assistant', icon: Mic, roles: ['admin', 'agent', 'customer'] },
    { id: 'prompts', label: 'Prompt Manager', icon: Cpu, roles: ['admin'] },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, roles: ['admin', 'agent'] },
    { id: 'tickets', label: 'Agent Workspace', icon: Ticket, roles: ['admin', 'agent'] },
    { id: 'logs', label: 'System Logs', icon: Terminal, roles: ['admin'] },
  ];

  const allowedItems = menuItems.filter(item => 
    !currentUser || item.roles.includes(currentUser.role)
  );

  return (
    <aside className="w-64 bg-[#0B0F19] text-gray-300 border-r border-[#1E293B] flex flex-col h-full shrink-0">
      {/* Brand Logo */}
      <div className="p-6 border-b border-[#1E293B] flex items-center gap-3">
        <div className="bg-gradient-to-tr from-cyan-500 to-indigo-500 p-2 rounded-xl text-white shadow-lg shadow-cyan-500/10">
          // <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h1 className="font-bold text-white text-lg tracking-tight leading-none">Duka Letu Assist</h1>
          <span className="text-[10px] text-cyan-400 font-medium tracking-widest uppercase">Support SaaS</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 mb-2 text-[10px] text-gray-500 font-semibold tracking-wider uppercase">
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600/15 to-indigo-600/15 text-cyan-400 border-l-2 border-cyan-400 pl-2.5 shadow-md shadow-cyan-950/20'
                  : 'hover:bg-gray-800/40 hover:text-white border-l-2 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-white'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User Footer info */}
      {currentUser && (
        <div className="p-4 border-t border-[#1E293B] bg-[#0E1321] flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-bold uppercase shadow-inner text-sm">
              {currentUser.name.slice(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate leading-tight">{currentUser.name}</p>
              <p className="text-xs text-cyan-400 font-medium capitalize mt-0.5 tracking-wider bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/20 inline-block">
                {currentUser.role}
              </p>
            </div>
          </div>
          <button
            id="sidebar-logout"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:text-white hover:bg-red-950/30 border border-red-900/20 transition-all duration-150"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
