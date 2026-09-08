import React from 'react';
import { LogOut, Moon, Sun, UserRound, X } from 'lucide-react';
import { User } from '../services/authService.ts';

interface Props { user: User | null; darkMode: boolean; onToggleTheme: () => void; onLogout: () => void; onClose: () => void; }

export const SettingsModal: React.FC<Props> = ({ user, darkMode, onToggleTheme, onLogout, onClose }) => (
  <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="modal settings-modal">
      <div className="modal-header"><div><div className="eyebrow">Preferences</div><h2>Settings</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div>
      <div className="settings-body">
        <div className="settings-profile"><div className="avatar">{(user?.name || user?.email || 'U').charAt(0).toUpperCase()}</div><div><strong>{user?.name || 'Your account'}</strong><span>{user?.email || 'Signed-in account'}</span></div></div>
        <button className="settings-row" onClick={onToggleTheme}><span><span className="settings-icon">{darkMode ? <Sun size={16} /> : <Moon size={16} />}</span><span><b>Appearance</b><small>{darkMode ? 'Dark theme' : 'Light theme'}</small></span></span><span>Change</span></button>
        <button className="settings-row danger" onClick={onLogout}><span><span className="settings-icon"><LogOut size={16} /></span><span><b>Sign out</b><small>End this session on this device</small></span></span><span>→</span></button>
      </div>
    </div>
  </div>
);
