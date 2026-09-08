import React from 'react';
import { BookOpen, Grid2X2, LogOut, MessageSquare, Plus, Settings, Sparkles, Zap } from 'lucide-react';
import { User } from '../services/authService.ts';

interface SidebarProps { isOpen: boolean; activeNav: string; setActiveNav: (id: string) => void; onNewChat: () => void; onPromptSelect: (prompt: string) => void; onSettings: () => void; onLogout: () => void; user: User | null; children?: React.ReactNode; }

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeNav, setActiveNav, onNewChat, onSettings, onLogout, user, children }) => {
  const initials = (user?.name || user?.email || 'U').charAt(0).toUpperCase();
  const navigation = [{ id: 'home', label: 'Overview', icon: Grid2X2 }, { id: 'chat', label: 'Conversations', icon: MessageSquare }, { id: 'library', label: 'Prompt library', icon: BookOpen }, { id: 'integrations', label: 'Integrations', icon: Zap }];
  return <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
    <div className="sidebar-brand"><div className="brand-mark"><Sparkles size={17} /></div><div><div className="brand-name">commix</div><div className="brand-caption">AI workspace</div></div></div>
    <button className="new-chat" onClick={onNewChat}><Plus size={16} /> New conversation</button>
    <nav className="nav-section"><div className="nav-label">Workspace</div>{navigation.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${activeNav === id ? 'active' : ''}`} onClick={() => setActiveNav(id)}><Icon size={16} />{label}</button>)}</nav>
    <div className="sidebar-history">{children}</div>
    <div className="sidebar-footer"><div className="avatar">{initials}</div><div className="footer-user"><strong>{user?.name || user?.email || 'Signed-in user'}</strong><span>{user?.email || 'Account'}</span></div><button className="icon-button" title="Settings" onClick={onSettings}><Settings size={15} /></button><button className="icon-button" title="Sign out" onClick={onLogout}><LogOut size={15} /></button></div>
  </aside>;
};
