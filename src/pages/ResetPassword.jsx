import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }

    try {
      setLoading(true);
      const res = await resetPassword(token, password);
      setMessage(res.message || 'Password reset successful. Please login.');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message || 'Reset password failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="resetPage">
      <div className="resetShell">
        <div className="resetBrandPanel">
          <div className="resetLogoBox">
            <img src="/takora-logo.png" alt="Takora Mart" />
          </div>
          <h1>Takora Mart Task Management</h1>
          <p>Create a new secure password for your Work OS account.</p>
        </div>

        <form className="resetCard" onSubmit={submit}>
          <div className="resetCardTop">
            <img src="/takora-logo.png" alt="Takora Mart" />
            <div>
              <h2>Reset Password</h2>
              <p>Enter your new password below.</p>
            </div>
          </div>

          <label>
            New Password
            <div className="resetInputIcon">
              <LockKeyhole size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="resetEyeBtn"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label>
            Confirm Password
            <div className="resetInputIcon">
              <LockKeyhole size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          </label>

          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}

          <button className="primary resetSubmit" type="submit" disabled={loading}>
            <ShieldCheck size={18} /> {loading ? 'Resetting...' : 'Reset Password'}
          </button>

          <Link className="resetBackLink" to="/login">Back To Login</Link>
        </form>
      </div>
    </div>
  );
}
