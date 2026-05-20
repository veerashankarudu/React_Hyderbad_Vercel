import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import StatusBadge from '../components/StatusBadge';
import Navbar from '../components/Navbar';
import './MyQuestions.css';

const DIFFICULTY_OPTIONS = ['', 'EASY', 'MEDIUM', 'HARD'];
const STATUS_OPTIONS = ['', 'DRAFT', 'READY_FOR_REVIEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];

export default function MyQuestions() {
  const [mcqs, setMcqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', difficulty: '' });
  const navigate = useNavigate();

  const fetchMcqs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      const { data } = await API.get('/mcqs', { params });
      setMcqs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMcqs(); }, [filters]);

  const handleSubmit = async (id) => {
    if (!window.confirm('Submit this MCQ for review?')) return;
    try {
      await API.post(`/mcqs/${id}/submit`);
      fetchMcqs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit');
    }
  };

  const canEdit = (status) => ['DRAFT', 'REJECTED'].includes(status);
  const canSubmit = (status) => status === 'DRAFT';

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="page-header">
          <h2>My Questions</h2>
          <button className="btn-primary" onClick={() => navigate('/mcq/create')}>
            + Create MCQ
          </button>
        </div>

        <div className="filter-bar">
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}>
            <option value="">All Difficulties</option>
            {DIFFICULTY_OPTIONS.filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : mcqs.length === 0 ? (
          <div className="empty-state">No questions found. Create your first MCQ!</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Question</th>
                  <th>Tech Stack</th>
                  <th>Topic</th>
                  <th>Difficulty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mcqs.map((mcq, idx) => (
                  <tr key={mcq.id}>
                    <td>{idx + 1}</td>
                    <td className="question-cell">{mcq.questionStem}</td>
                    <td>{mcq.techStackName}</td>
                    <td>{mcq.topicName}</td>
                    <td><span className={`diff-badge ${mcq.difficulty?.toLowerCase()}`}>{mcq.difficulty}</span></td>
                    <td><StatusBadge status={mcq.status} /></td>
                    <td className="action-cell">
                      <button className="btn-sm btn-outline" onClick={() => navigate(`/mcq/${mcq.id}`)}>View</button>
                      {canEdit(mcq.status) && (
                        <button className="btn-sm btn-outline" onClick={() => navigate(`/mcq/${mcq.id}/edit`)}>Edit</button>
                      )}
                      {canSubmit(mcq.status) && (
                        <button className="btn-sm btn-blue" onClick={() => handleSubmit(mcq.id)}>Submit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
