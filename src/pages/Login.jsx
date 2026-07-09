import React, { useState } from 'react';
import { Mail, LockKeyhole, ShieldCheck, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, forgotPassword } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const eyeStyle = {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'transparent', border: 0, padding: 4, color: '#334155', display: 'grid', placeItems: 'center', boxShadow: 'none'
  };

  async function submit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (mode === 'login' && !password) {
      setError('Please enter your password.');
      return;
    }
    try {
      setLoading(true);
      if (mode === 'login') await login(email, password);
      else {
        const res = await forgotPassword(email);
        setMessage(res.devResetLink ? `${res.message} Development Reset Link: ${res.devResetLink}` : res.message);
      }
    } catch (err) {
      setError(err.message || 'Something Went Wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginPage proLogin">
      <div className="loginShell">
        <div className="loginHeroPanel">
          <div className="loginLogoBox"><img src="/takora-logo.png" alt="Takora Mart" /></div>
          <h1>Takora Mart Task Management</h1>
          {/* <p>Priority SLA, Hierarchy Access, Tickets, Reports And Bell Notifications In One Modern Work OS.</p> */}
          <div className="loginFeatureGrid">
            {/* <span>Official SLA Time</span><span>Hierarchy Workflow</span><span>Excel Import</span><span>Smart Alerts</span> */}
          </div>
        </div>

        <form className="loginCard premiumLoginCard" onSubmit={submit} autoComplete="off">
          <div className="loginCardTop">
            <img src="/takora-logo.png" alt="Takora Mart" />
            <div>
              <h2>{mode === 'login' ? 'Login' : 'Reset Password'}</h2>
              <p>{mode === 'login' ? 'Enter Your Takora Mart Account Details' : 'Enter Your Email Address To Receive A Reset Link'}</p>
            </div>
          </div>

          {/* <div className="loginWelcome"><Sparkles size={18} /> Secure Team Workspace</div> */}

          <label>Email Address
            <div className="inputIcon">
              <Mail size={18} />
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Enter Email Address" autoComplete="off" required />
            </div>
          </label>

          {mode === 'login' && <label>Password
            <div className="inputIcon" style={{ position: 'relative' }}>
              <LockKeyhole size={18} />
              <input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Enter Password" autoComplete="new-password" style={{ paddingRight: 48, color: '#111827' }} required />
              <button type="button" style={eyeStyle} onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide Password' : 'Show Password'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>}

          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}

          <button className="primary loginSubmit" type="submit" disabled={loading}><ShieldCheck size={18} /> {loading ? (mode === 'login' ? 'Logging in...' : 'Sending...') : (mode === 'login' ? 'Login' : 'Send Reset Link')}</button>
          <button type="button" className="linkBtn" onClick={() => { setMode(mode === 'login' ? 'forgot' : 'login'); setEmail(''); setPassword(''); setError(''); setMessage(''); setShowPassword(false); }}>
            {mode === 'login' ? 'Forgot Password?' : 'Back To Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
