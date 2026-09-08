import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Moon, Plus, Settings, Sparkles, Sun, Wrench, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar.tsx';
import { InputArea } from './components/InputArea.tsx';
import { ToolsModal } from './components/ToolsModal.tsx';
import { MessageContent } from './components/MessageContent.tsx';
import { ConversationHistory } from './components/ConversationHistory.tsx';
import { Message } from './types.ts';
import { streamChatResponse } from './services/backendService.ts';
import { getConversationMessages } from './services/conversationService.ts';
import { authService } from './services/authService.ts';
import { SettingsModal } from './components/SettingsModal.tsx';

export default function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(authService.getUser());
  const userId = user?.user_id || '';
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 800);
  const [activeNav, setActiveNav] = useState('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [historyVersion, setHistoryVersion] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const onResize = () => setSidebarOpen(window.innerWidth > 800);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    authService.getCurrentUser().then((currentUser) => {
      if (currentUser) setUser(currentUser);
    });
  }, []);

  const resetChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(null);
    setConversationId(undefined);
    setInputValue('');
    setIsLoading(false);
  };

  const sendMessage = async (text: string) => {
    const clean = text.trim();
    if (!clean || isLoading) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', content: clean, timestamp: new Date() };
    const assistantId = `assistant-${Date.now()}`;
    setMessages((current) => [...current, userMessage, { id: assistantId, role: 'model', content: '', timestamp: new Date() }]);
    setIsLoading(true);
    try {
      const response = await streamChatResponse(messages, clean, userId, sessionId, (chunk) => {
        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: message.content + chunk } : message));
      }, controller.signal);
      setSessionId(response.session_id);
      setConversationId(response.metadata?.conversation_id as string | undefined);
      setHistoryVersion((value) => value + 1);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: error?.message || 'Something went wrong. Please try again.', isError: true } : message));
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const selectConversation = async (id: string) => {
    try {
      const result = await getConversationMessages(id);
      setMessages(result.messages.map((item) => ({ id: item.id, role: item.role === 'assistant' ? 'model' : 'user', content: item.content, timestamp: new Date(item.timestamp) })));
      setConversationId(id);
      const conversation = result.messages[0];
      setSessionId(conversation ? id : null);
      setSidebarOpen(window.innerWidth > 800);
    } catch (error) { console.error(error); }
  };

  const logout = async () => { await authService.logout(); setUser(null); navigate('/login', { replace: true }); };
  const initials = (user?.name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <div className={`app-shell ${darkMode ? 'dark-theme' : ''}`}>
      <Sidebar isOpen={sidebarOpen} activeNav={activeNav} setActiveNav={setActiveNav} onNewChat={resetChat} onPromptSelect={setInputValue} onSettings={() => setSettingsOpen(true)} onLogout={logout} user={user}>
        {activeNav === 'chat' && <ConversationHistory key={historyVersion} userId={userId} currentConversationId={conversationId} onSelectConversation={selectConversation} onNewConversation={resetChat} />}
      </Sidebar>
      {sidebarOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}
      <main className="main-shell">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setSidebarOpen(true)}><Menu size={19} /></button></div>
          <div className="topbar-actions">
            <button className="icon-button" title="Toggle theme" onClick={() => setDarkMode((value) => !value)}>{darkMode ? <Sun size={17} /> : <Moon size={17} />}</button>
          </div>
        </header>
        <div className="content-scroll">
          {messages.length === 0 ? (
            <section className="welcome">
              <div className="welcome-kicker">Your calm command center</div>
              <h1>Make room for <span>better work.</span></h1>
              <p className="welcome-copy">Commix brings your conversations, ideas, and everyday workflows into one focused space. What are we solving today?</p>
              <InputArea onSend={sendMessage} onStop={() => abortRef.current?.abort()} value={inputValue} isGenerating={isLoading} />
              <div className="workspace-grid">
                <div className="info-card"><h3>Start with a direction</h3><p>Use a prompt below or write naturally. Commix will keep the thread clear and actionable.</p><div className="quick-list">{['Plan my priorities for today', 'Draft a concise email', 'Turn notes into a checklist', 'Explain a tricky concept'].map((prompt) => <button className="quick-button" key={prompt} onClick={() => setInputValue(prompt)}>{prompt} <span>→</span></button>)}</div></div>
                <div className="info-card"><h3>Connected by design</h3><p>Bring your tools into the conversation when you are ready. Nothing gets in the way until you need it.</p><div style={{ display: 'flex', gap: 8, marginTop: 17 }}><button className="quick-button" onClick={() => setToolsOpen(true)}><Wrench size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Browse tools</button><button className="quick-button" onClick={() => setToolsOpen(true)}><Settings size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Manage</button></div></div>
              </div>
            </section>
          ) : (
            <div className="chat-wrap">{messages.map((message) => <div className={`message-row ${message.role === 'user' ? 'user' : 'model'}`} key={message.id}><div className="message-avatar">{message.role === 'user' ? initials : <Sparkles size={16} />}</div><div><div className={`message-bubble ${message.isError ? 'toast-error' : ''}`}><MessageContent content={message.content || (isLoading ? 'Thinking…' : '')} /></div>{message.role === 'user' && <div className="message-actions"><button className="icon-button" onClick={() => setInputValue(message.content)}><Plus size={13} /></button></div>}</div></div>)}</div>
          )}
        </div>
        {messages.length > 0 && <div className="composer-dock"><InputArea onSend={sendMessage} onStop={() => abortRef.current?.abort()} isGenerating={isLoading} /></div>}
      </main>
      <ToolsModal isOpen={toolsOpen} onClose={() => setToolsOpen(false)} />
      {settingsOpen && <SettingsModal user={user} darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)} onLogout={logout} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
