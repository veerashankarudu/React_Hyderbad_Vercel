import React, { useState, useEffect, useCallback } from 'react';
import { Server, Database, Activity, BarChart3, RefreshCw, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import './SystemHealth.css';

const SERVICES = [
  {
    key: 'backend',
    label: 'Backend',
    icon: <Server size={13} />,
    check: async () => {
      const res = await fetch('http://localhost:8080/actuator/health', { signal: AbortSignal.timeout(4000) });
      const data = await res.json();
      return { up: data.status === 'UP', detail: data.status };
    },
  },
  {
    key: 'redis',
    label: 'Redis',
    icon: <Database size={13} />,
    check: async () => {
      // Redis health is reported inside the Spring Boot actuator health components
      const res = await fetch('http://localhost:8080/actuator/health', { signal: AbortSignal.timeout(4000) });
      const data = await res.json();
      const redisStatus = data?.components?.redis?.status || data?.components?.cache?.status;
      if (redisStatus) return { up: redisStatus === 'UP', detail: redisStatus };
      // fallback: if backend is UP, assume Redis OK (it has in-memory fallback)
      return { up: data.status === 'UP', detail: 'via backend' };
    },
  },
  {
    key: 'prometheus',
    label: 'Prometheus',
    icon: <Activity size={13} />,
    check: async () => {
      const res = await fetch('http://localhost:9090/-/healthy', { signal: AbortSignal.timeout(4000) });
      return { up: res.ok, detail: res.ok ? 'UP' : `${res.status}` };
    },
  },
  {
    key: 'grafana',
    label: 'Grafana',
    icon: <BarChart3 size={13} />,
    check: async () => {
      const res = await fetch('http://localhost:3001/api/health', { signal: AbortSignal.timeout(4000) });
      const data = await res.json();
      return { up: data.database === 'ok' || res.ok, detail: data.database === 'ok' ? 'UP' : data.database };
    },
  },
];

const STATUS = { loading: 'loading', up: 'up', down: 'down' };

export default function SystemHealth() {
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(SERVICES.map(s => [s.key, { status: STATUS.loading, detail: '' }]))
  );
  const [lastChecked, setLastChecked] = useState(null);
  const [spinning, setSpinning] = useState(false);

  const checkAll = useCallback(async () => {
    setSpinning(true);
    const results = await Promise.allSettled(SERVICES.map(s => s.check()));
    const next = {};
    SERVICES.forEach((s, i) => {
      const r = results[i];
      if (r.status === 'fulfilled') {
        next[s.key] = { status: r.value.up ? STATUS.up : STATUS.down, detail: r.value.detail };
      } else {
        next[s.key] = { status: STATUS.down, detail: 'unreachable' };
      }
    });
    setStatuses(next);
    setLastChecked(new Date());
    setSpinning(false);
  }, []);

  useEffect(() => {
    checkAll();
    const id = setInterval(checkAll, 30000);
    return () => clearInterval(id);
  }, [checkAll]);

  const allUp = Object.values(statuses).every(s => s.status === STATUS.up);
  const anyDown = Object.values(statuses).some(s => s.status === STATUS.down);
  const anyLoading = Object.values(statuses).some(s => s.status === STATUS.loading);

  function getOverallLabel() {
    if (anyLoading) return 'Checking…';
    if (allUp) return 'All systems operational';
    if (anyDown) return 'Degraded';
    return 'Partial';
  }
  function getOverallColor() {
    if (anyLoading) return 'loading';
    if (allUp) return 'up';
    return 'down';
  }

  const overallLabel = getOverallLabel();
  const overallColor = getOverallColor();

  return (
    <div className={`sh-bar sh-bar--${overallColor}`}>
      <div className="sh-overall">
        <span className={`sh-overall-dot sh-dot--${overallColor}`} />
        <span className="sh-overall-label">{overallLabel}</span>
      </div>

      <div className="sh-divider" />

      <div className="sh-services">
        {SERVICES.map(svc => {
          const s = statuses[svc.key];
          return (
            <div key={svc.key} className={`sh-svc sh-svc--${s.status}`} title={`${svc.label}: ${s.detail}`}>
              <span className="sh-svc-icon">{svc.icon}</span>
              <span className={`sh-svc-dot sh-dot--${s.status}`} />
              <span className="sh-svc-label">{svc.label}</span>
              {s.status === STATUS.loading && <Loader size={11} className="sh-spin" />}
              {s.status === STATUS.up && <CheckCircle2 size={11} className="sh-ok" />}
              {s.status === STATUS.down && <AlertCircle size={11} className="sh-err" />}
            </div>
          );
        })}
      </div>

      <div className="sh-divider" />

      <div className="sh-meta">
        {lastChecked && (
          <span className="sh-time">
            {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
        <button
          className={`sh-refresh${spinning ? ' sh-refresh--spin' : ''}`}
          onClick={checkAll}
          title="Refresh health checks"
          type="button"
        >
          <RefreshCw size={12} />
        </button>
      </div>
    </div>
  );
}
