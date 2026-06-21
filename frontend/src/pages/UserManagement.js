/* global globalThis */
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import API, { cachedGet, isCacheWarm, getCacheSync } from '../api';
import Navbar from '../components/Navbar';
import SortableTh from '../components/SortableTh';
import TablePagination from '../components/TablePagination';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import './MyQuestions.css';
import './UserManagement.css';

const ROLE_COLOR = { ADMIN: '#6983FF', SME: '#059669', PENDING: '#D97706' };

function buildCoverageInitials(name) {
  return name.trim().split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// Sortable columns config
const COLUMNS = [
  { key: 'enterpriseId', label: 'Enterprise ID', labelKey: 'um.colEnterpriseId' },
  { key: 'fullName',     label: 'Full Name',      labelKey: 'um.colFullName' },
  { key: 'email',        label: 'Email',           labelKey: 'um.colEmail' },
  { key: 'role',         label: 'Role',            labelKey: 'um.colRole' },
  { key: 'techStacks',   label: 'Tech Stacks',     labelKey: 'um.colTechStacks' },
];

function getVal(u, key) {
  if (key === 'techStacks') return (u.techStacks || []).join(', ').toLowerCase();
  return (u[key] || '').toString().toLowerCase();
}

const ACTION_LABEL = {
  USER_REGISTERED:    { labelKey: 'um2.actSelfRegistered',  color: '#3B82F6' },
  USER_APPROVED:      { labelKey: 'um2.actApproved',        color: '#059669' },
  USER_REJECTED:      { labelKey: 'um2.actRejected',        color: '#EF4444' },
  ROLE_CHANGED:       { labelKey: 'um2.actRoleChanged',     color: '#6983FF' },
  USER_ADDED_BY_ADMIN:{ labelKey: 'um2.actAddedByAdmin',    color: '#0891B2' },
};

function applyUserUpdate(prev, updated) {
  return prev.map(u => (u.id === updated.id ? updated : u));
}

function removeUser(prev, id) {
  return prev.filter(u => u.id !== id);
}

function ConfirmModal({ message, onConfirm, onCancel, t }) {
  return (
    <div className="um-overlay">
      <div className="um-modal">
        <p className="um-modal-msg">{message}</p>
        <div className="um-modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
          <button type="button" className="btn-danger" onClick={onConfirm}>{t('common.confirm')}</button>
        </div>
      </div>
    </div>
  );
}
ConfirmModal.propTypes = {
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

function AddUserModal({ techStacks, onSave, onCancel, saving, saveError, t }) {
  const [form, setForm] = useState({ enterpriseId: '', fullName: '', email: '', role: 'SME', techStackIds: [] });
  const handleChange = (e) => { const { name, value } = e.target; setForm(f => ({ ...f, [name]: value })); };
  const toggleStack = (id) => setForm(f => ({
    ...f,
    techStackIds: f.techStackIds.includes(id) ? f.techStackIds.filter(x => x !== id) : [...f.techStackIds, id],
  }));
  return (
    <div className="um-overlay">
      <div className="um-modal um-modal-lg">
        <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>{t('um.addNewUser')}</h3>
        <div className="um-form-grid">
          <div className="form-group">
            <label htmlFor="au-eid">{t('um.colEnterpriseId')}</label>
            <input id="au-eid" name="enterpriseId" value={form.enterpriseId} onChange={handleChange} placeholder="e.g. john.doe" />
          </div>
          <div className="form-group">
            <label htmlFor="au-name">{t('um.colFullName')}</label>
            <input id="au-name" name="fullName" value={form.fullName} onChange={handleChange} placeholder="e.g. John Doe" />
          </div>
          <div className="form-group">
            <label htmlFor="au-email">{t('um.colEmail')}</label>
            <input id="au-email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="e.g. john.doe@valkey.com" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <p style={{ margin: 0, padding: '0.5rem 0.75rem', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', fontSize: '0.85rem', color: '#1E40AF' }}>
              🔑 {t('um.defaultPassword')}
            </p>
          </div>
          <div className="form-group">
            <label htmlFor="au-role">{t('um.colRole')}</label>
            <select id="au-role" name="role" value={form.role} onChange={handleChange}>
              <option value="SME">SME</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
        </div>
        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--text)' }}>{t('um.colTechStacks')}</legend>
            <div className="um-stack-chips">
              {techStacks.map(ts => (
                <button
                  key={ts.id}
                  type="button"
                  className={`um-chip${form.techStackIds.includes(ts.id) ? ' selected' : ''}`}
                  onClick={() => toggleStack(ts.id)}
                >
                  {ts.name}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        {saveError && <div style={{ color: 'var(--error)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{saveError}</div>}
        <div className="um-modal-actions" style={{ marginTop: '1.25rem' }}>
          <button type="button" className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
          <button type="button" className="btn-primary" disabled={saving} onClick={() => onSave(form)}>
            {saving ? t('um.creating') : t('um.createUser')}
          </button>
        </div>
      </div>
    </div>
  );
}
AddUserModal.propTypes = {
  techStacks: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number, name: PropTypes.string })).isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
  saveError: PropTypes.string.isRequired,
  t: PropTypes.func.isRequired,
};

export default function UserManagement() {
  const [users, setUsers]           = useState(() => { const d = getCacheSync('/admin/users'); return Array.isArray(d) ? d : (d?.content || []); });
  const [auditLog, setAuditLog]     = useState(() => { const d = getCacheSync('/admin/audit-log'); return Array.isArray(d) ? d : (d?.content || []); });
  const [techStacks, setTechStacks] = useState(() => { const d = getCacheSync('/master/tech-stacks'); return Array.isArray(d) ? d : (d?.content || []); });
  const [loading, setLoading]       = useState(() => !isCacheWarm('/admin/users'));
  const [error, setError]           = useState('');
  const [tab, setTab]               = useState('Users');
  const [search, setSearch]         = useState('');
  const [sortCol, setSortCol]       = useState('enterpriseId'); // active column key
  const [sortDir, setSortDir]       = useState('asc');          // 'asc' | 'desc'
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(10);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [confirm, setConfirm]       = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [addSaving, setAddSaving]   = useState(false);
  const [addError, setAddError]     = useState('');

  const { user: me, updateUser } = useAuth();
  const { t } = useTranslation();

  const loadAll = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([
      cachedGet('/admin/users'),
      cachedGet('/admin/audit-log'),
      cachedGet('/master/tech-stacks'),
    ])
      .then(([usersRes, auditRes, stacksRes]) => {
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
        setAuditLog(Array.isArray(auditRes.data) ? auditRes.data : []);
        const sd = stacksRes.data;
        setTechStacks(Array.isArray(sd) ? sd : (sd?.content || []));
      })
      .catch(err => {
        const msg = err?.response?.data?.error || 'Failed to load data';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const askConfirm = (message, onConfirm) => setConfirm({ message, onConfirm });
  const closeConfirm = () => setConfirm(null);
  const doConfirmed = () => { if (confirm) { confirm.onConfirm(); closeConfirm(); } };

  const applyRoleChangeResult = useCallback((data) => {
    setUsers(prev => applyUserUpdate(prev, data));
    if (me && data.enterpriseId === me.enterpriseId) {
      updateUser({ role: data.role });
    }
  }, [me, updateUser]);

  const applyApproveResult = useCallback((data) => {
    setUsers(prev => applyUserUpdate(prev, data));
  }, []);

  const applyRejectResult = useCallback((id) => {
    setUsers(prev => removeUser(prev, id));
  }, []);

  const handleRoleChange = (u, newRole) => {
    askConfirm(
      `Change ${u.fullName}'s role from ${u.role} → ${newRole}?`,
      () => {
        setActionInProgress(u.id);
        API.put(`/admin/users/${u.id}/role?role=${newRole}`)
          .then(res => applyRoleChangeResult(res.data))
          .catch(err => setError(err?.response?.data?.error || 'Role change failed'))
          .finally(() => setActionInProgress(null));
      }
    );
  };

  const handleApprove = (u) => {
    askConfirm(
      `Approve ${u.fullName} (${u.enterpriseId}) and grant login access?`,
      () => {
        setActionInProgress(u.id);
        API.put(`/admin/users/${u.id}/approve`)
          .then(res => applyApproveResult(res.data))
          .catch(err => setError(err?.response?.data?.error || 'Approval failed'))
          .finally(() => setActionInProgress(null));
      }
    );
  };

  const handleReject = (u) => {
    askConfirm(
      `Reject and permanently DELETE ${u.fullName}'s registration? This cannot be undone.`,
      () => {
        setActionInProgress(u.id);
        API.delete(`/admin/users/${u.id}/reject`)
          .then(() => applyRejectResult(u.id))
          .catch(err => setError(err?.response?.data?.error || 'Rejection failed'))
          .finally(() => setActionInProgress(null));
      }
    );
  };

  const handleAddUser = (form) => {
    if (!form.enterpriseId || !form.fullName || !form.email) {
      setAddError('Enterprise ID, Full Name, and Email are required.');
      return;
    }
    setAddSaving(true); setAddError('');
    API.post('/admin/users', form)
      .then(({ data }) => {
        setUsers(prev => [data, ...prev]);
        setShowAddUser(false);
      })
      .catch(err => setAddError(err?.response?.data?.error || err?.response?.data?.message || 'Failed to create user'))
      .finally(() => setAddSaving(false));
  };

  const activeUsers  = users.filter(u => u.approved !== false && u.role !== 'PENDING');
  const pendingUsers = users.filter(u => u.approved === false || u.role === 'PENDING');
  const adminCount   = activeUsers.filter(u => u.role === 'ADMIN').length;
  const smeCount     = activeUsers.filter(u => u.role === 'SME').length;

  // Search across ALL columns including role and tech stacks
  const q = search.toLowerCase();
  let filtered = activeUsers.filter(u => {
    if (!q) return true;
    return (
      u.enterpriseId?.toLowerCase().includes(q)
      || u.fullName?.toLowerCase().includes(q)
      || u.email?.toLowerCase().includes(q)
      || u.role?.toLowerCase().includes(q)
      || (u.techStacks || []).some(ts => ts.toLowerCase().includes(q))
    );
  });

  // Column sort
  filtered = [...filtered].sort((a, b) => {
    const av = getVal(a, sortCol);
    const bv = getVal(b, sortCol);
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleColSort = (key) => {
    if (sortCol === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{t('um.title')}</h2>
          <button type="button" className="btn-primary" onClick={() => { setAddError(''); setShowAddUser(true); }}>{t('um.addUser')}</button>
        </div>

        <div className="qb-stats-bar" style={{ marginBottom: '1.25rem' }}>
          <div className="qb-stat-pill">
            <span className="qb-stat-num" style={{ color: '#1F2937' }}>{activeUsers.length}</span>
            <span className="qb-stat-label">{t('um.statActive')}</span>
          </div>
          <div className="qb-stat-pill">
            <span className="qb-stat-num" style={{ color: '#6983FF' }}>{adminCount}</span>
            <span className="qb-stat-label">{t('um.statAdmins')}</span>
          </div>
          <div className="qb-stat-pill">
            <span className="qb-stat-num" style={{ color: '#059669' }}>{smeCount}</span>
            <span className="qb-stat-label">{t('um.statSmes')}</span>
          </div>
          <div className="qb-stat-pill">
            <span className="qb-stat-num" style={{ color: '#D97706' }}>{pendingUsers.length}</span>
            <span className="qb-stat-label">{t('um.statPending')}</span>
          </div>
        </div>

        <div className="status-tabs" style={{ marginBottom: '1rem' }}>
          {[t('um.tabUsers'), t('um.tabPending'), t('um.tabHistory')].map((label, i) => {
            const tabKeys = ['Users', 'Pending Approval', 'History'];
            const tabKey = tabKeys[i];
            return (
            <button key={tabKey} type="button" className={`status-tab${tab === tabKey ? ' active' : ''}`} onClick={() => setTab(tabKey)}>
              {label}
              {tabKey === 'Pending Approval' && pendingUsers.length > 0 && (
                <span style={{ marginLeft: '0.4rem', background: '#D97706', color: 'white', borderRadius: '10px', padding: '0 0.4rem', fontSize: '0.7rem' }}>
                  {pendingUsers.length}
                </span>
              )}
            </button>
          );})}
        </div>

        {error && (
          <div className="error-banner" style={{ marginBottom: '1rem', color: 'var(--error)', background: 'var(--error-light)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
            {error}
          </div>
        )}

        {loading && <div className="loading">{t('common.loading')}</div>}

        {!loading && tab === 'Users' && (() => {
          return (
          <>
            <div className="filter-bar" style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder={t('um.searchPlaceholder')}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            {filtered.length === 0
              ? <div className="empty-state"><div>{t('common.noData')}</div></div>
              : (
                <>
                  <div className="results-count">{filtered.length} user{filtered.length === 1 ? '' : 's'}</div>
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>#</th>
                          {COLUMNS.map(col => (
                            <SortableTh key={col.key} colKey={col.key} label={t(col.labelKey)}
                              sortCol={sortCol} sortDir={sortDir} onSort={handleColSort} />
                          ))}
                          <th>{t('um.changeRole')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map((u, idx) => {
                          const isSelf = u.enterpriseId === me?.enterpriseId;
                          const otherRole = u.role === 'ADMIN' ? 'SME' : 'ADMIN';
                          return (
                            <tr key={u.id}>
                              <td>{(page - 1) * pageSize + idx + 1}</td>
                              <td><code style={{ fontSize: '0.82rem' }}>{u.enterpriseId}</code></td>
                              <td>{u.fullName}</td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>{u.email || '—'}</td>
                              <td>
                                <span style={{ background: ROLE_COLOR[u.role] || '#6B7280', color: 'white', borderRadius: '20px', padding: '0.2rem 0.7rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  {u.role}
                                </span>
                              </td>
                              <td>
                                {u.techStacks && u.techStacks.length > 0
                                  ? u.techStacks.map(ts => (
                                      <span key={ts} style={{ marginRight: '0.35rem', background: '#F3E8FF', color: '#30176E', borderRadius: '4px', padding: '0.1rem 0.45rem', fontSize: '0.72rem', fontWeight: 600 }}>{ts}</span>
                                    ))
                                  : <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>}
                              </td>
                              <td>
                                {isSelf
                                  ? <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t('um.you')}</span>
                                  : (
                                    <button
                                      type="button"
                                      disabled={actionInProgress === u.id}
                                      onClick={() => handleRoleChange(u, otherRole)}
                                      style={{ border: `1.5px solid ${ROLE_COLOR[otherRole]}`, color: ROLE_COLOR[otherRole], background: 'transparent', borderRadius: '6px', padding: '0.22rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, cursor: actionInProgress === u.id ? 'not-allowed' : 'pointer', opacity: actionInProgress === u.id ? 0.6 : 1 }}
                                    >
                                      {actionInProgress === u.id ? '...' : `Make ${otherRole}`}
                                    </button>
                                  )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <TablePagination
                    page={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onSizeChange={n => { setPageSize(n); setPage(1); }}
                    totalItems={filtered.length}
                  />
                </>
              )}
          </>
          );
        })()}

        {!loading && tab === 'Pending Approval' && (() => {
          if (pendingUsers.length === 0) return <div className="empty-state"><div>{t('um.noPending')}</div></div>;
          return (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>{t('um.colEnterpriseId')}</th><th>{t('um.colFullName')}</th><th>{t('um.colEmail')}</th><th>{t('um.colTechStacks')}</th><th>{t('common.actions')}</th></tr>
                </thead>
                <tbody>
                  {pendingUsers.map(u => (
                    <tr key={u.id}>
                      <td><code style={{ fontSize: '0.82rem' }}>{u.enterpriseId}</code></td>
                      <td>{u.fullName}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>{u.email || '—'}</td>
                      <td>
                        {u.techStacks && u.techStacks.length > 0
                          ? u.techStacks.map(ts => (
                              <span key={ts} style={{ marginRight: '0.35rem', background: '#F3E8FF', color: '#30176E', borderRadius: '4px', padding: '0.1rem 0.45rem', fontSize: '0.72rem', fontWeight: 600 }}>{ts}</span>
                            ))
                          : <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>}
                      </td>
                      <td style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" disabled={actionInProgress === u.id} onClick={() => handleApprove(u)} style={{ background: '#059669', color: 'white', border: 'none', borderRadius: '6px', padding: '0.25rem 0.75rem', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', opacity: actionInProgress === u.id ? 0.6 : 1 }}>
                          {actionInProgress === u.id ? '...' : `✓ ${t('pr.approve')}`}
                        </button>
                        <button type="button" disabled={actionInProgress === u.id} onClick={() => handleReject(u)} style={{ background: '#EF4444', color: 'white', border: 'none', borderRadius: '6px', padding: '0.25rem 0.75rem', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', opacity: actionInProgress === u.id ? 0.6 : 1 }}>
                          {actionInProgress === u.id ? '...' : `✕ ${t('pr.reject')}`}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}

        {!loading && tab === 'History' && (() => {
          if (auditLog.length === 0) return <div className="empty-state"><div>{t('um.noHistory')}</div></div>;
          return (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>{t('um.histWhen')}</th><th>{t('um.histDoneBy')}</th><th>{t('um.histAction')}</th><th>{t('um.histTarget')}</th><th>{t('um.histDetails')}</th></tr>
                </thead>
                <tbody>
                  {auditLog.map((a, idx) => {
                    const info = ACTION_LABEL[a.action] || { labelKey: null, color: '#6B7280' };
                    return (
                      <tr key={a.id}>
                        <td>{idx + 1}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {new Date(a.timestamp).toLocaleString()}
                        </td>
                        <td><code style={{ fontSize: '0.8rem' }}>{a.actorEnterpriseId}</code></td>
                        <td>
                          <span style={{ background: `${info.color}20`, color: info.color, borderRadius: '20px', padding: '0.15rem 0.6rem', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {info.labelKey ? t(info.labelKey) : a.action}
                          </span>
                        </td>
                        <td><code style={{ fontSize: '0.8rem' }}>{a.targetEnterpriseId || '—'}</code></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{a.details || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* ── Team Coverage Overview (always visible below tabs) ── */}
        {!loading && tab === 'Users' && techStacks.length > 0 && (() => {
          // Build tech stack → user list map from assigned users
          const stackMap = {};
          activeUsers.forEach(u => {
            (u.techStacks || []).forEach(ts => {
              if (!stackMap[ts]) stackMap[ts] = [];
              stackMap[ts].push(u.fullName);
            });
          });
          // Merge with ALL master data stacks (including uncovered ones)
          techStacks.forEach(ts => {
            if (!stackMap[ts.name]) stackMap[ts.name] = [];
          });
          const stacks = Object.entries(stackMap).sort((a, b) => b[1].length - a[1].length);
          const COLORS = ['#6983FF','#3B82F6','#10B981','#F59E0B','#EF4444','#8BA0FF','#06B6D4'];
          const maxCount = Math.max(1, stacks[0]?.[1].length || 1);
          const coveredCount = stacks.filter(([, m]) => m.length > 0).length;
          return (
            <div className="um-coverage-card">
              <div className="um-coverage-header">
                <span className="um-coverage-title">📊 Tech Stack Coverage</span>
                <span className="um-coverage-sub">{coveredCount}/{stacks.length} stacks covered · {activeUsers.length} contributors</span>
              </div>
              <div className="um-coverage-grid">
                {stacks.map(([stack, members], i) => (
                  <div key={stack} className="um-coverage-row">
                    <div className="um-coverage-label">
                      <span className="um-coverage-stack">{stack}</span>
                      <span className="um-coverage-count" style={{ color: members.length === 0 ? '#ef4444' : undefined }}>
                        {members.length === 0 ? '⚠ 0' : members.length}
                      </span>
                    </div>
                    <div className="um-coverage-track">
                      <div
                        className="um-coverage-fill"
                        style={{
                          width: members.length === 0 ? '4px' : `${Math.round((members.length / maxCount) * 100)}%`,
                          background: members.length === 0 ? '#ef4444' : COLORS[i % COLORS.length],
                          opacity: members.length === 0 ? 0.4 : 1,
                        }}
                        title={members.length === 0 ? 'No contributor assigned' : members.join(', ')}
                      />
                    </div>
                    <div className="um-coverage-avatars">
                      {members.length === 0
                        ? <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600 }}>{t('common.uncovered')}</span>
                        : members.slice(0, 4).map((name, mi) => (
                            <div key={name} className="um-coverage-avatar" style={{ background: COLORS[(i + mi) % COLORS.length] }} title={name}>
                              {buildCoverageInitials(name)}
                            </div>
                          ))}
                      {members.length > 4 && <span className="um-coverage-more">+{members.length - 4}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {confirm && <ConfirmModal message={confirm.message} onConfirm={doConfirmed} onCancel={closeConfirm} t={t} />}
      {showAddUser && <AddUserModal techStacks={techStacks} onSave={handleAddUser} onCancel={() => setShowAddUser(false)} saving={addSaving} saveError={addError} t={t} />}
    </>
  );
}