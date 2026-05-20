import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import API from '../api';
import './Login.css';

export default function Login() {
  const [enterpriseId, setEnterpriseId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', { enterpriseId, password });
      login(data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Smart Quiz AI Hub</h1>
          <p>Accenture Hack-N-Stack 2026</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Enterprise ID</label>
            <input
              type="text"
              value={enterpriseId}
              onChange={(e) => setEnterpriseId(e.target.value)}
              placeholder="e.g. gaurav.a.bhola"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="login-hint">
          <small>Admin: divya.madhanasekar / Admin@123</small><br/>
          <small>SME: gaurav.a.bhola / Sme@1234</small>
        </div>
      </div>
    </div>
  );
}
