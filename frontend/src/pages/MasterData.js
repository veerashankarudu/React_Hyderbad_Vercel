import React, { useEffect, useState } from 'react';
import API from '../api';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import TablePagination from '../components/TablePagination';
import { useContentTranslation } from '../hooks/useContentTranslation';
import './MasterData.css';

const PAGE_SIZE = 5;

export default function MasterData() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isAdmin = user?.role === 'ADMIN';

  const [techStacks, setTechStacks] = useState([]);
  const [selectedTs, setSelectedTs] = useState(null);
  const [topics, setTopics] = useState([]);
  const [smes, setSmes] = useState([]);
  const [allSmes, setAllSmes] = useState([]);
  const [loadingTs, setLoadingTs] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingSmes, setLoadingSmes] = useState(false);
  const [error, setError] = useState('');

  // pagination
  const [tsPage, setTsPage] = useState(1);
  const [topicPage, setTopicPage] = useState(1);
  const [smePage, setSmePage] = useState(1);

  // inline-edit state
  const [editingTsId, setEditingTsId] = useState(null);
  const [editingTsName, setEditingTsName] = useState('');
  const [newTsName, setNewTsName] = useState('');
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [editingTopicName, setEditingTopicName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [selectedSmeId, setSelectedSmeId] = useState('');

  // ── Load tech stacks ─────────────────────────────────────────────────────
  const loadTechStacks = () => {
    setLoadingTs(true);
    API.get('/master/tech-stacks')
      .then(r => {
        setTechStacks(r.data);
        setTsPage(1);
        // Invalidate session cache so other pages (QuizBuilder etc.) reload fresh data
        try { sessionStorage.removeItem('master_techStacks'); sessionStorage.removeItem('master_allTopics'); } catch {}
        // Auto-select Spring Boot by default, fallback to first item
        if (r.data && r.data.length > 0) {
          setSelectedTs(prev => {
            if (prev) return prev;
            const springBoot = r.data.find(ts => ts.name.toLowerCase() === 'spring boot');
            return springBoot ?? r.data[0];
          });
        }
      })
      .catch(() => setError('Failed to load tech stacks'))
      .finally(() => setLoadingTs(false));
  };

  useEffect(loadTechStacks, []);

  // ── Load all SMEs once (for the assign dropdown) ──────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    API.get('/master/smes')
      .then(r => setAllSmes(r.data))
      .catch(() => {});
  }, [isAdmin]);

  // ── Load topics when selected tech stack changes ──────────────────────────
  useEffect(() => {
    if (!selectedTs) { setTopics([]); setSmes([]); return; }
    setLoadingTopics(true);
    setTopicPage(1);
    API.get(`/master/tech-stacks/${selectedTs.id}/topics`)
      .then(r => setTopics(r.data))
      .catch(() => setError('Failed to load topics'))
      .finally(() => setLoadingTopics(false));
    if (isAdmin) {
      setLoadingSmes(true);
      setSmePage(1);
      API.get(`/master/tech-stacks/${selectedTs.id}/smes`)
        .then(r => setSmes(r.data))
        .catch(() => setError('Failed to load SMEs'))
        .finally(() => setLoadingSmes(false));
    }
  }, [selectedTs, isAdmin]);

  // ── Tech Stack operations ─────────────────────────────────────────────────
  const handleCreateTs = async () => {
    if (!newTsName.trim()) return;
    try {
      await API.post('/master/tech-stacks', { name: newTsName.trim() });
      setNewTsName('');
      loadTechStacks();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create tech stack');
    }
  };

  const handleUpdateTs = async (id) => {
    if (!editingTsName.trim()) return;
    try {
      await API.put(`/master/tech-stacks/${id}`, { name: editingTsName.trim() });
      setEditingTsId(null);
      loadTechStacks();
      if (selectedTs?.id === id) setSelectedTs(s => ({ ...s, name: editingTsName.trim() }));
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update tech stack');
    }
  };

  const handleDeleteTs = async (id) => {
    if (!window.confirm(t('masterData.deleteTs'))) return;
    try {
      await API.delete(`/master/tech-stacks/${id}`);
      if (selectedTs?.id === id) { setSelectedTs(null); setTopics([]); }
      loadTechStacks();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete tech stack');
    }
  };

  // ── Topic operations ──────────────────────────────────────────────────────
  const handleCreateTopic = async () => {
    if (!newTopicName.trim() || !selectedTs) return;
    try {
      await API.post(`/master/tech-stacks/${selectedTs.id}/topics`, { name: newTopicName.trim() });
      setNewTopicName('');
      setSelectedTs({ ...selectedTs }); // trigger reload
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create topic');
    }
  };

  const handleUpdateTopic = async (topicId) => {
    if (!editingTopicName.trim()) return;
    try {
      await API.put(`/master/topics/${topicId}`, { name: editingTopicName.trim() });
      setEditingTopicId(null);
      setSelectedTs({ ...selectedTs });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update topic');
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm(t('masterData.deleteTopic'))) return;
    try {
      await API.delete(`/master/topics/${topicId}`);
      setSelectedTs({ ...selectedTs });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete topic');
    }
  };

  // ── SME operations ────────────────────────────────────────────────────────
  const handleAddSme = async () => {
    if (!selectedSmeId || !selectedTs) return;
    try {
      await API.post(`/master/tech-stacks/${selectedTs.id}/smes/${selectedSmeId}`);
      setSelectedSmeId('');
      setSelectedTs({ ...selectedTs }); // trigger reload
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to assign SME');
    }
  };

  const handleRemoveSme = async (userId) => {
    if (!window.confirm(t('masterData.removeSme'))) return;
    try {
      await API.delete(`/master/tech-stacks/${selectedTs.id}/smes/${userId}`);
      setSelectedTs({ ...selectedTs });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to remove SME');
    }
  };

  const assignableSmes = allSmes.filter(s => !smes.some(m => m.id === s.id));

  // paginated slices
  const tsTotalPages = Math.max(1, Math.ceil(techStacks.length / PAGE_SIZE));
  const pagedTs = techStacks.slice((tsPage - 1) * PAGE_SIZE, tsPage * PAGE_SIZE);
  const topicTotalPages = Math.max(1, Math.ceil(topics.length / PAGE_SIZE));
  const pagedTopics = topics.slice((topicPage - 1) * PAGE_SIZE, topicPage * PAGE_SIZE);
  const smeTotalPages = Math.max(1, Math.ceil(smes.length / PAGE_SIZE));
  const pagedSmes = smes.slice((smePage - 1) * PAGE_SIZE, smePage * PAGE_SIZE);

  // Translate DB names
  const txTsNames = useContentTranslation(pagedTs.map(ts => ts.name));
  const txTopicNames = useContentTranslation(pagedTopics.map(tp => tp.name));
  const txSelectedTsName = useContentTranslation([selectedTs?.name || ''])[0];

  return (
    <>
      <Navbar />
    <div className="md-container">
      <h1 className="md-title">{t('masterData.title')}</h1>
      <p className="md-subtitle">{isAdmin ? t('masterData.subtitleAdmin') : t('masterData.subtitleView')}</p>

      <div className="md-stats-bar">
        <div className="md-stat-card">
          <span className="md-stat-value">{techStacks.length}</span>
          <span className="md-stat-label">{t('masterData.techStacks')}</span>
        </div>
        <div className="md-stat-card">
          <span className="md-stat-value">{topics.length}</span>
          <span className="md-stat-label">{selectedTs ? t('masterData.topicsIn', { name: txSelectedTsName || selectedTs.name }) : t('masterData.topics')}</span>
        </div>
        <div className="md-stat-card">
          <span className="md-stat-value">{smes.length}</span>
          <span className="md-stat-label">{selectedTs ? t('masterData.smesFor', { name: txSelectedTsName || selectedTs.name }) : t('masterData.smes')}</span>
        </div>
      </div>

      {error && (
        <div className="md-error">
          {error}
          <button className="md-error-close" onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="md-grid">
        {/* ── Tech Stacks panel ─────────────────────────────────────────── */}
        <div className="md-panel">
          <div className="md-panel-header">
            <h2>{t('masterData.techStacks')}</h2>
            <span className="md-badge">{techStacks.length}</span>
          </div>

          {isAdmin && (
            <div className="md-add-row">
              <input
                className="md-input"
                placeholder={t('masterData.newTsPlaceholder')}
                value={newTsName}
                onChange={e => setNewTsName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateTs()}
              />
              <button className="md-btn md-btn-primary" onClick={handleCreateTs}>{t('masterData.add')}</button>
            </div>
          )}

          {loadingTs ? (
            <p className="md-loading">{t('masterData.loading')}</p>
          ) : techStacks.length === 0 ? (
            <p className="md-empty">{isAdmin ? t('masterData.noTechStacksAdmin') : t('masterData.noTechStacks')}</p>
          ) : (
            <>
              <ul className="md-list">
                {pagedTs.map((ts, i) => (
                  <li
                    key={ts.id}
                    className={`md-list-item ${selectedTs?.id === ts.id ? 'md-list-item--selected' : ''}`}
                    onClick={() => { if (editingTsId !== ts.id) setSelectedTs(ts); }}
                  >
                    {isAdmin && editingTsId === ts.id ? (
                      <div className="md-inline-edit" onClick={e => e.stopPropagation()}>
                        <input
                          className="md-input md-input-sm"
                          autoFocus
                          value={editingTsName}
                          onChange={e => setEditingTsName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleUpdateTs(ts.id);
                            if (e.key === 'Escape') setEditingTsId(null);
                          }}
                        />
                        <button className="md-btn md-btn-success md-btn-sm" onClick={() => handleUpdateTs(ts.id)}>{t('masterData.save')}</button>
                            <button className="md-btn md-btn-ghost md-btn-sm" onClick={() => setEditingTsId(null)}>{t('masterData.cancel')}</button>
                      </div>
                    ) : (
                      <div className="md-list-item-inner">
                        <span className="md-item-name">{txTsNames[i] || ts.name}</span>
                        {isAdmin && (
                          <div className="md-item-actions" onClick={e => e.stopPropagation()}>
                            <button
                              className="md-btn md-btn-ghost md-btn-sm"
                              title="Edit"
                              onClick={() => { setEditingTsId(ts.id); setEditingTsName(ts.name); }}
                            >✏️</button>
                            <button
                              className="md-btn md-btn-danger md-btn-sm"
                              title="Delete"
                              onClick={() => handleDeleteTs(ts.id)}
                            >🗑️</button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <TablePagination
                page={tsPage}
                totalPages={tsTotalPages}
                pageSize={PAGE_SIZE}
                totalItems={techStacks.length}
                onPageChange={setTsPage}
              />
            </>
          )}
        </div>

        {/* ── Topics panel ──────────────────────────────────────────────── */}
        <div className="md-panel">
          <div className="md-panel-header">
            <h2>{t('masterData.topics')}{selectedTs && <span className="md-panel-subtitle"> — {txSelectedTsName || selectedTs.name}</span>}</h2>
            {topics.length > 0 && <span className="md-badge">{topics.length}</span>}
          </div>

          {!selectedTs ? (
            <p className="md-empty">{t('masterData.selectTsForTopics')}</p>
          ) : (
            <>
              {isAdmin && (
                <div className="md-add-row">
                  <input
                    className="md-input"
                    placeholder={t('masterData.newTopicPlaceholder')}
                    value={newTopicName}
                    onChange={e => setNewTopicName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateTopic()}
                  />
                  <button className="md-btn md-btn-primary" onClick={handleCreateTopic}>{t('masterData.add')}</button>
                </div>
              )}

              {loadingTopics ? (
                <p className="md-loading">{t('masterData.loading')}</p>
              ) : topics.length === 0 ? (
                <p className="md-empty">{isAdmin ? t('masterData.noTopicsAdmin') : t('masterData.noTopics')}</p>
              ) : (
                <>
                  <ul className="md-list">
                    {pagedTopics.map((topic, i) => (
                      <li key={topic.id} className="md-list-item">
                        {isAdmin && editingTopicId === topic.id ? (
                          <div className="md-inline-edit">
                            <input
                              className="md-input md-input-sm"
                              autoFocus
                              value={editingTopicName}
                              onChange={e => setEditingTopicName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleUpdateTopic(topic.id);
                                if (e.key === 'Escape') setEditingTopicId(null);
                              }}
                            />
                            <button className="md-btn md-btn-success md-btn-sm" onClick={() => handleUpdateTopic(topic.id)}>{t('masterData.save')}</button>
                            <button className="md-btn md-btn-ghost md-btn-sm" onClick={() => setEditingTopicId(null)}>{t('masterData.cancel')}</button>
                          </div>
                        ) : (
                          <div className="md-list-item-inner">
                            <span className="md-item-name">{txTopicNames[i] || topic.name}</span>
                            {isAdmin && (
                              <div className="md-item-actions">
                                <button
                                  className="md-btn md-btn-ghost md-btn-sm"
                                  title="Edit"
                                  onClick={() => { setEditingTopicId(topic.id); setEditingTopicName(topic.name); }}
                                >✏️</button>
                                <button
                                  className="md-btn md-btn-danger md-btn-sm"
                                  title="Delete"
                                  onClick={() => handleDeleteTopic(topic.id)}
                                >🗑️</button>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <TablePagination
                    page={topicPage}
                    totalPages={topicTotalPages}
                    pageSize={PAGE_SIZE}
                    totalItems={topics.length}
                    onPageChange={setTopicPage}
                  />
                </>
              )}
            </>
          )}
        </div>

        {/* ── SMEs panel ────────────────────────────────────────────────── */}
        {isAdmin && (
        <div className="md-panel">
          <div className="md-panel-header">
            <h2>{t('masterData.smes')}{selectedTs && <span className="md-panel-subtitle"> — {txSelectedTsName || selectedTs.name}</span>}</h2>
            {smes.length > 0 && <span className="md-badge">{smes.length}</span>}
          </div>

          {!selectedTs ? (
            <p className="md-empty">{t('masterData.selectTsForSmes')}</p>
          ) : (
            <>
              <div className="md-add-row">
                <select
                  className="md-input"
                  value={selectedSmeId}
                  onChange={e => setSelectedSmeId(e.target.value)}
                >
                  <option value="">{t('masterData.selectSme')}</option>
                  {assignableSmes.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.enterpriseId})
                    </option>
                  ))}
                </select>
                <button
                  className="md-btn md-btn-primary"
                  onClick={handleAddSme}
                  disabled={!selectedSmeId}
                >{t('masterData.assignSme')}</button>
              </div>

              {loadingSmes ? (
                <p className="md-loading">{t('masterData.loading')}</p>
              ) : smes.length === 0 ? (
                <p className="md-empty">{t('masterData.noSmes')}</p>
              ) : (
                <>
                  <ul className="md-list">
                    {pagedSmes.map(sme => (
                      <li key={sme.id} className="md-list-item">
                        <div className="md-list-item-inner">
                          <div>
                            <span className="md-item-name">{sme.fullName}</span>
                            <span className="md-item-sub">{sme.enterpriseId}</span>
                          </div>
                          <div className="md-item-actions">
                            <button
                              className="md-btn md-btn-danger md-btn-sm"
                              title="Remove"
                              onClick={() => handleRemoveSme(sme.id)}
                            >🗑️</button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <TablePagination
                    page={smePage}
                    totalPages={smeTotalPages}
                    pageSize={PAGE_SIZE}
                    totalItems={smes.length}
                    onPageChange={setSmePage}
                  />
                </>
              )}
            </>
          )}
        </div>
        )}
      </div>
    </div>
    </>
  );
}
