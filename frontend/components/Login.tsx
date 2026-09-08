import React, { useState } from 'react';
import { ArrowRight, Calendar, Check, FileText, Mail, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService.ts';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const demoMode = new URLSearchParams(location.search).has('demo');
  const startDemo = async () => { setLoading(true); setError(''); try { await authService.devLogin(); navigate('/', { replace: true }); } catch (err: any) { setError(err.message || 'Could not start demo session'); } finally { setLoading(false); } };
  return <div className="login-page"><div className="login-art"><div className="brand-mark"><Sparkles size={18} /></div><div className="login-art-copy"><div className="eyebrow">Commix workspace</div><h1>Less noise.<br /><span>More momentum.</span></h1><p>A considered home for your questions, plans, and the work in between.</p></div><div className="login-orbit"><Sparkles size={22} /><div>Ask, organize, create</div></div></div><div className="login-panel"><div className="login-card"><div className="mobile-brand"><div className="brand-mark"><Sparkles size={17} /></div><b>commix</b></div><div className="eyebrow">Welcome back</div><h2>Pick up where<br />you left off.</h2><p className="login-copy">Sign in to keep your conversations and workflows together.</p><button className="google-button" onClick={() => authService.login(`${window.location.origin}/auth/callback`)}><span className="google-g">G</span> Continue with Google <ArrowRight size={16} /></button>{(demoMode || !import.meta.env.VITE_GOOGLE_AUTH) && <button className="demo-button" onClick={startDemo} disabled={loading}>{loading ? 'Starting workspace…' : 'Explore with a demo account'} {!loading && <ArrowRight size={15} />}</button>}{error && <div className="toast-error">{error}</div>}<div className="login-features"><div><Mail size={16} /><span><b>Work with context</b><small>Keep every thread in one place.</small></span></div><div><Calendar size={16} /><span><b>Plan clearly</b><small>Turn ideas into next steps.</small></span></div><div><FileText size={16} /><span><b>Create faster</b><small>Draft, refine, and ship.</small></span></div></div><div className="login-terms"><Check size={13} /> Your data stays yours. By continuing, you agree to our terms.</div></div></div></div>;
};

export default Login;
