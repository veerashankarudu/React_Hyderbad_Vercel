import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import API from '../api';
import './Login.css';

export default function Register() {
  const [form, setForm] = useState({ enterpriseId: '', fullName: '', email: '', password: '', confirmPassword: '', techStackIds: [] });
  const [techStacks, setTechStacks] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    API.get('/master/tech-stacks').then(({ data }) => setTechStacks(Array.isArray(data) ? data : (data.content || []))).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setError('');
  };

  const toggleStack = (id) => {
    setForm((f) => {
      const ids = f.techStackIds.includes(id) ? f.techStackIds.filter(i => i !== id) : [...f.techStackIds, id];
      return { ...f, techStackIds: ids };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/(?=.*[0-9])(?=.*[a-zA-Z])/.test(form.password)) { setError('Password must contain at least one letter and one number.'); return; }
    if (form.techStackIds.length === 0) { setError('Please select at least one tech stack expertise.'); return; }
    setLoading(true);
    try {
      await API.post('/auth/register', {
        enterpriseId: form.enterpriseId,
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        techStackIds: form.techStackIds,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reg-root">
      {/* LEFT — AI Visual Panel (NeuroFox style) */}
      <div className="reg-visual">
        <svg style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',opacity:0.35}} viewBox="0 0 600 700" xmlns="http://www.w3.org/2000/svg">
          {[[60,100],[180,60],[320,120],[460,80],[530,210],[500,360],[410,490],[260,530],[110,440],[50,270],[300,280],[440,180],[170,320]].map(([cx,cy],i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r="3" fill="#8BA0FF" opacity="0.7">
                <animate attributeName="opacity" values="0.2;0.9;0.2" dur={`${2.5+i*0.35}s`} repeatCount="indefinite"/>
              </circle>
            </g>
          ))}
          {[[60,100,180,60],[180,60,320,120],[320,120,460,80],[460,80,530,210],[530,210,500,360],[500,360,410,490],[410,490,260,530],[260,530,110,440],[110,440,50,270],[50,270,60,100],[300,280,180,60],[300,280,460,80],[300,280,500,360],[300,280,260,530],[440,180,320,120],[440,180,530,210]].map(([x1,y1,x2,y2],i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8BA0FF" strokeWidth="0.8" opacity="0.22"/>
          ))}
        </svg>
        <div className="reg-visual-content">
          <div className="reg-orb"><span className="reg-orb-icon">✨</span></div>
          <div className="reg-badge">{t('reg.badge')}</div>
          <h2 className="reg-visual-title">{t('reg.visualTitle')}</h2>
          <p className="reg-visual-sub">{t('reg.visualSub')}</p>
          <div className="reg-features-list">
            <div className="reg-feat"><span className="reg-feat-icon">✍️</span>{t('reg.feat1')}</div>
            <div className="reg-feat"><span className="reg-feat-icon">🔁</span>{t('reg.feat2')}</div>
            <div className="reg-feat"><span className="reg-feat-icon">🏆</span>{t('reg.feat3')}</div>
          </div>
        </div>
      </div>

      {/* RIGHT — Form Panel */}
      <div className="reg-form-panel">
        <div className="reg-form-inner">
        <div className="login-card">
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ color: '#34d399', marginBottom: '0.75rem' }}>{t('reg.submitted')}</h2>
              <p style={{ color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                {t('reg.pendingApproval')}<br />
                {t('reg.pendingApprovalDetail')}
              </p>
              <Link to="/login" style={{ display: 'inline-block', padding: '0.7rem 1.75rem', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', background: 'linear-gradient(135deg,#6983FF,#8BA0FF)', color: 'white', boxShadow: '0 4px 18px rgba(105,131,255,0.4)' }}>
                {t('reg.backToLogin')}
              </Link>
            </div>
          ) : (
            <>
              <div className="login-right-header">
                <h2>{t('reg.createAccount')}</h2>
                <p>{t('reg.registerPrompt')}</p>
              </div>

              {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="enterpriseId">{t('reg.enterpriseId')}</label>
              <input id="enterpriseId" name="enterpriseId" type="text" value={form.enterpriseId} onChange={handleChange} placeholder="e.g. john.doe" required autoComplete="username" />
            </div>
            <div className="form-group">
              <label htmlFor="fullName">{t('reg.fullName')}</label>
              <input id="fullName" name="fullName" type="text" value={form.fullName} onChange={handleChange} placeholder="e.g. John Doe" required autoComplete="name" />
            </div>
            <div className="form-group">
              <label htmlFor="email">{t('reg.email')}</label>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@valkey.com" required autoComplete="email" />
            </div>
            <div className="form-group">
              <label htmlFor="password">{t('reg.password')}</label>
              <input id="password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min 8 chars, letters + numbers" required autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">{t('reg.confirmPassword')}</label>
              <input id="confirmPassword" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Repeat your password" required autoComplete="new-password" />
            </div>

            {techStacks.length > 0 && (
              <div className="form-group">
                <label htmlFor="techStacks">{t('reg.techStackExpertise')} <span style={{color:'#ef4444'}}>*</span> <span style={{fontSize:'0.75rem',color:'var(--text-muted)',fontWeight:400}}>(select all that apply)</span></label>
                <div id="techStacks" className="reg-stacks">
                  {techStacks.map(ts => (
                    <button
                      key={ts.id}
                      type="button"
                      className={`reg-stack-chip${form.techStackIds.includes(ts.id) ? ' selected' : ''}`}
                      onClick={() => toggleStack(ts.id)}
                    >
                      {ts.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? t('reg.creatingAccount') : t('reg.createAccount')}
            </button>
          </form>

          <div className="reg-footer">
            Already have an account?{' '}
            <Link to="/login">{t('reg.signIn')}</Link>
          </div>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
