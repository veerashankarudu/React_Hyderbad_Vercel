import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import API from '../api';
import { useTranslation } from 'react-i18next';
import './Login.css';

export default function Login() {
  const [enterpriseId, setEnterpriseId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoUsers, setDemoUsers] = useState([]);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const fallback = [
      { label: 'Admin', id: 'divya.madhanasekar', password: 'Admin@123' },
      { label: 'SME 1', id: 'birendra.kumar.singh', password: 'Sme@1234' },
      { label: 'SME 2', id: 'swati.avinash.nikam', password: 'Sme@1234' },
      { label: 'SME 3', id: 'indugu.hari.prasad', password: 'Sme@1234' },
    ];
    API.get('/auth/demo-users')
      .then(({ data }) => {
        const admins = data.filter(u => u.role === 'ADMIN');
        const smes = data.filter(u => u.role === 'SME');
        const entries = [
          ...admins.map((u, i) => ({ label: admins.length === 1 ? 'Admin' : `Admin ${i + 1}`, id: u.enterpriseId, password: 'Admin@123' })),
          ...smes.map((u, i) => ({ label: `SME ${i + 1}`, id: u.enterpriseId, password: 'Sme@1234' })),
        ];
        setDemoUsers(entries.length > 0 ? entries : fallback);
      })
      .catch(() => setDemoUsers(fallback));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', { enterpriseId, password });
      login(data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (user) => { setEnterpriseId(user.id); setPassword(user.password); setError(''); };

  return (
    <div className="login-root">
      {/* LEFT — Form Panel */}
      <div className="login-left">
        <div className="login-brand-bar">
          <div className="login-logo-icon">🧠</div>
          <span className="login-brand-text">{t('login.appName')}</span>
        </div>
        <div className="login-form-section">
          <h2 className="login-heading">{t('login.welcomeBack')}</h2>
          <p className="login-sub">{t('login.signInPrompt')}</p>
          <div className="login-tabs">
            <span className="login-tab login-tab-active">{t('login.logIn')}</span>
            <Link to="/register" className="login-tab">{t('login.signUp')}</Link>
          </div>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>{t('login.enterpriseId')}</label>
              <input type="text" value={enterpriseId} onChange={(e) => setEnterpriseId(e.target.value)} placeholder="e.g. gaurav.a.bhola" required autoFocus />
            </div>
            <div className="form-group">
              <label>{t('login.password')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('login.passwordPlaceholder')} required />
            </div>
            {error && <div className="login-error">{error}</div>}
            <button type="submit" disabled={loading} className="login-submit-btn">
              {loading ? t('login.signingIn') : t('login.signIn')}
            </button>
          </form>
          {demoUsers.length > 0 && (
            <div className="login-demo-hints">
              <div className="login-demo-title">{t('login.demoCredentials')}</div>
              {demoUsers.map((u) => (
                <div key={u.id} className="login-demo-row">
                  <span className="login-demo-label">{u.label}</span>
                  <span className="login-demo-cred">{u.id}</span>
                  <button type="button" className="login-demo-btn" onClick={() => fillDemo(u)}>{t('login.use')}</button>
                </div>
              ))}
            </div>
          )}
          <div className="login-signup-link">
            {t('login.newSme')} <Link to="/register">{t('login.createAccount')}</Link>
          </div>
          <div className="login-signup-link" style={{ marginTop: '0.4rem', fontSize: '0.85rem' }}>
            <Link to="/forgot-password" style={{ color: '#6366f1' }}>Forgot your password?</Link>
          </div>
        </div>
      </div>

      {/* RIGHT — AI Visual Panel */}
      <div className="login-right">
        <svg className="login-ai-svg" viewBox="0 0 600 700" xmlns="http://www.w3.org/2000/svg">
          {[[80,120],[200,80],[350,140],[480,90],[540,220],[490,360],[400,480],[250,520],[120,440],[60,280],[300,300],[420,200],[180,340]].map(([cx,cy],i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r="3" fill="#6366f1" opacity="0.7">
                <animate attributeName="opacity" values="0.3;0.9;0.3" dur={`${2+i*0.4}s`} repeatCount="indefinite"/>
              </circle>
            </g>
          ))}
          {[[80,120,200,80],[200,80,350,140],[350,140,480,90],[480,90,540,220],[540,220,490,360],[490,360,400,480],[400,480,250,520],[250,520,120,440],[120,440,60,280],[60,280,80,120],[300,300,200,80],[300,300,480,90],[300,300,490,360],[300,300,250,520],[300,300,120,440],[420,200,350,140],[420,200,540,220],[180,340,60,280],[180,340,250,520]].map(([x1,y1,x2,y2],i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6366f1" strokeWidth="0.8" opacity="0.25"/>
          ))}
        </svg>
        <div className="login-right-content">
          <div className="login-acc-orb">
            <span className="login-acc-orb-icon">{'>'}</span>
          </div>
          <div className="login-ai-badge-tag">ACCENTURE × AI</div>
          <h2 className="login-ai-title">{t('login.aiTitle')}</h2>
          <p className="login-ai-desc">{t('login.aiDesc')}</p>
          <div className="login-ai-stats">
            <div className="login-ai-stat"><span className="las-num">10K+</span><span className="las-lbl">{t('login.statQuestions')}</span></div>
            <div className="login-ai-stat"><span className="las-num">500+</span><span className="las-lbl">{t('login.statSmeExperts')}</span></div>
            <div className="login-ai-stat"><span className="las-num">99%</span><span className="las-lbl">{t('login.statAiAccuracy')}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
