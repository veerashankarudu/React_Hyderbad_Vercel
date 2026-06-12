import React, { useState, useCallback } from 'react';
import { getSoundSettings, saveSoundSettings, SoundEffects } from '../hooks/useSoundEffects';
import './SoundSettings.css';

export default function SoundSettings({ onClose }) {
  const [settings, setSettings] = useState(getSoundSettings);

  const update = useCallback((key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      saveSoundSettings(next);
      return next;
    });
  }, []);

  const testSound = (name) => {
    const fn = SoundEffects[name];
    if (fn) fn(settings.volume);
  };

  return (
    <div className="sound-settings-overlay" onClick={onClose}>
      <div className="sound-settings-panel" onClick={e => e.stopPropagation()}>
        <div className="ss-header">
          <h3>🔊 Sound & Audio Settings</h3>
          <button className="ss-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="ss-body">
          {/* Master toggle */}
          <div className="ss-row ss-master">
            <div className="ss-row-info">
              <span className="ss-label">🎵 Enable All Sounds</span>
              <span className="ss-desc">Master toggle for all audio feedback</span>
            </div>
            <label className="ss-switch">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => update('enabled', e.target.checked)}
              />
              <span className="ss-slider" />
            </label>
          </div>

          {settings.enabled && (
            <>
              {/* Volume slider */}
              <div className="ss-row">
                <div className="ss-row-info">
                  <span className="ss-label">🔈 Volume</span>
                  <span className="ss-desc">{Math.round(settings.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.volume}
                  onChange={(e) => update('volume', parseFloat(e.target.value))}
                  className="ss-volume-slider"
                />
              </div>

              {/* Typing sounds */}
              <div className="ss-row">
                <div className="ss-row-info">
                  <span className="ss-label">⌨️ Typing Sounds</span>
                  <span className="ss-desc">Typewriter tick-tick when composing questions</span>
                </div>
                <div className="ss-row-actions">
                  <button className="ss-test-btn" onClick={() => testSound('typeClick')}>Test</button>
                  <label className="ss-switch">
                    <input
                      type="checkbox"
                      checked={settings.typingSounds}
                      onChange={(e) => update('typingSounds', e.target.checked)}
                    />
                    <span className="ss-slider" />
                  </label>
                </div>
              </div>

              {/* Celebration sounds */}
              <div className="ss-row">
                <div className="ss-row-info">
                  <span className="ss-label">🎉 Celebration Sounds</span>
                  <span className="ss-desc">Fanfare on achievements, approvals, milestones</span>
                </div>
                <div className="ss-row-actions">
                  <button className="ss-test-btn" onClick={() => testSound('celebration')}>Test</button>
                  <label className="ss-switch">
                    <input
                      type="checkbox"
                      checked={settings.celebrationSounds}
                      onChange={(e) => update('celebrationSounds', e.target.checked)}
                    />
                    <span className="ss-slider" />
                  </label>
                </div>
              </div>

              {/* Notification sounds */}
              <div className="ss-row">
                <div className="ss-row-info">
                  <span className="ss-label">🔔 Notification Sounds</span>
                  <span className="ss-desc">Alerts, warnings, and status change tones</span>
                </div>
                <div className="ss-row-actions">
                  <button className="ss-test-btn" onClick={() => testSound('notification')}>Test</button>
                  <label className="ss-switch">
                    <input
                      type="checkbox"
                      checked={settings.notificationSounds}
                      onChange={(e) => update('notificationSounds', e.target.checked)}
                    />
                    <span className="ss-slider" />
                  </label>
                </div>
              </div>

              {/* Sound preview section */}
              <div className="ss-preview">
                <span className="ss-preview-title">🎧 Preview All Sounds</span>
                <div className="ss-preview-grid">
                  <button onClick={() => testSound('keyPress')}>Key Press</button>
                  <button onClick={() => testSound('enter')}>Enter</button>
                  <button onClick={() => testSound('success')}>Success</button>
                  <button onClick={() => testSound('celebration')}>Celebrate</button>
                  <button onClick={() => testSound('notification')}>Notify</button>
                  <button onClick={() => testSound('warning')}>Warning</button>
                  <button onClick={() => testSound('error')}>Error</button>
                  <button onClick={() => testSound('approve')}>Approve</button>
                  <button onClick={() => testSound('reject')}>Reject</button>
                  <button onClick={() => testSound('click')}>Click</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
