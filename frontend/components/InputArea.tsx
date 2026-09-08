import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Calendar, FileText, Mail, MessageSquare, Mic, Plus, Smartphone, Square, X } from 'lucide-react';

interface InputAreaProps { onSend: (message: string) => void; onStop?: () => void; disabled?: boolean; value?: string; isGenerating?: boolean; }
const TOOLS = [{ id: 'gmail', name: 'Gmail', description: 'Draft and send emails', icon: Mail }, { id: 'slack', name: 'Slack', description: 'Write a team update', icon: MessageSquare }, { id: 'calendar', name: 'Calendar', description: 'Plan an event', icon: Calendar }, { id: 'docs', name: 'Docs', description: 'Create a document', icon: FileText }, { id: 'sms', name: 'SMS', description: 'Send a message', icon: Smartphone }];

export const InputArea: React.FC<InputAreaProps> = ({ onSend, onStop, disabled, value, isGenerating }) => {
  const [input, setInput] = useState(value || '');
  const [showTools, setShowTools] = useState(false);
  const [tool, setTool] = useState<typeof TOOLS[number] | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (value !== undefined && value !== input) setInput(value); }, [value]);
  useEffect(() => { const close = (event: MouseEvent) => { if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) setShowTools(false); }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close); }, []);
  useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`; } }, [input]);
  const submit = (event?: React.FormEvent) => { event?.preventDefault(); if (!input.trim() || disabled || isGenerating) return; onSend(tool ? `[Using ${tool.name}] ${input.trim()}` : input.trim()); setInput(''); setTool(null); };
  return <form className="composer" onSubmit={submit}><div className="composer-box" ref={toolsRef} style={{ position: 'relative' }}>
    {showTools && <div className="tool-menu"><div style={{ padding: '7px 10px', color: '#9aa3b5', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Add a tool</div>{TOOLS.map(({ id, name, description, icon: Icon }) => <button type="button" key={id} onClick={() => { setTool(TOOLS.find((item) => item.id === id) || null); setShowTools(false); textareaRef.current?.focus(); }}><Icon size={16} color="#6557ef" /><span><b>{name}</b><small>{description}</small></span></button>)}</div>}
    <button type="button" className="composer-tool" title="Add tool" onClick={() => setShowTools((open) => !open)}><Plus size={17} /></button>
    <div style={{ flex: 1, minWidth: 0 }}>{tool && <div style={{ fontSize: 11, color: '#6557ef', margin: '0 4px 2px', display: 'flex', alignItems: 'center', gap: 5 }}>{tool.name}<button type="button" className="icon-button" style={{ padding: 0 }} onClick={() => setTool(null)}><X size={12} /></button></div>}<textarea ref={textareaRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="Ask anything…" disabled={disabled && !isGenerating} rows={1} /></div>
    <button type="button" className="composer-tool" title="Voice input"><Mic size={16} /></button><button type={isGenerating ? 'button' : 'submit'} className="send-button" disabled={(!input.trim() && !isGenerating) || (disabled && !isGenerating)} onClick={isGenerating ? onStop : undefined}>{isGenerating ? <Square size={14} fill="currentColor" /> : <ArrowUp size={17} />}</button>
  </div><p className="composer-note">Commix can make mistakes. Check important details.</p></form>;
};
