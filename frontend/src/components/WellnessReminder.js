import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import './WellnessReminder.css';

const WELLNESS_TIPS = [
  { icon: '💧', title: 'Stay Hydrated!', message: 'Drink a glass of water. Your brain works better when hydrated.' },
  { icon: '🧘', title: 'Stretch Break!', message: 'Stand up and stretch your arms, neck, and shoulders for 30 seconds.' },
  { icon: '👀', title: 'Rest Your Eyes!', message: 'Look at something 20 feet away for 20 seconds. Your eyes will thank you.' },
  { icon: '🖐️', title: 'Hand Exercise!', message: 'Spread your fingers wide, hold for 5 seconds, then make a fist. Repeat 5 times.' },
  { icon: '🚶', title: 'Walk Around!', message: 'Take a quick 2-minute walk. Movement boosts your creativity and focus.' },
  { icon: '🫁', title: 'Deep Breathing!', message: 'Breathe in for 4 seconds, hold for 4, exhale for 4. Repeat 3 times.' },
  { icon: '💪', title: 'Posture Check!', message: 'Sit up straight, relax your shoulders, and uncross your legs.' },
  { icon: '🧠', title: 'Mental Reset!', message: 'Close your eyes for 10 seconds. Clear your mind. Fresh start!' },
  { icon: '🤸', title: 'Desk Exercise!', message: 'Do 10 seated leg raises or desk push-ups. Small moves, big energy!' },
  { icon: '☕', title: 'Snack Time!', message: 'Grab a healthy snack — nuts, fruit, or dark chocolate for brain power.' },
  { icon: '🌿', title: 'Look at Nature!', message: 'Glance at a plant or out the window. Green reduces stress instantly.' },
  { icon: '🎵', title: 'Music Break!', message: 'Play your favourite song. A 3-minute mood boost works wonders.' },
  { icon: '🙂', title: 'Smile!', message: 'Smiling — even on purpose — releases endorphins. Try it right now!' },
  { icon: '🦴', title: 'Neck Rolls!', message: 'Slowly roll your head in circles — 5 clockwise, 5 counter-clockwise.' },
  { icon: '🫶', title: 'Wrist Stretch!', message: 'Extend one arm, pull fingers back gently with the other hand. Hold 15 seconds each.' },
];

// Defaults (used if admin hasn't configured or API unavailable)
const DEFAULTS = {
  enabled: true,
  intervalMinutes: 30,
  dismissSeconds: 15,
  firstDelaySeconds: 5,
};

export default function WellnessReminder() {
  const [visible, setVisible] = useState(false);
  const [tip, setTip] = useState(null);
  const [exiting, setExiting] = useState(false);
  const [config, setConfig] = useState(DEFAULTS);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Fetch admin settings
  useEffect(() => {
    API.get('/admin/settings').then(({ data }) => {
      setConfig({
        enabled: data.wellness_enabled !== 'false',
        intervalMinutes: Number.parseInt(data.wellness_interval_minutes, 10) || DEFAULTS.intervalMinutes,
        dismissSeconds: Number.parseInt(data.wellness_dismiss_seconds, 10) || DEFAULTS.dismissSeconds,
        firstDelaySeconds: Number.parseInt(data.wellness_first_delay_seconds, 10) || DEFAULTS.firstDelaySeconds,
      });
      setConfigLoaded(true);
    }).catch(() => {
      // Use defaults if API fails (user not logged in, etc.)
      setConfigLoaded(true);
    });
  }, []);

  const showTip = useCallback(() => {
    const randomTip = WELLNESS_TIPS[Math.floor(Math.random() * WELLNESS_TIPS.length)];
    setTip(randomTip);
    setExiting(false);
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
    }, 350);
  }, []);

  // Schedule reminders based on admin config
  useEffect(() => {
    if (!configLoaded || !config.enabled) return;

    const firstDelay = config.firstDelaySeconds * 1000;
    const interval = config.intervalMinutes * 60 * 1000;

    const initial = setTimeout(showTip, firstDelay);
    const recurring = setInterval(showTip, interval);
    return () => { clearTimeout(initial); clearInterval(recurring); };
  }, [configLoaded, config.enabled, config.firstDelaySeconds, config.intervalMinutes, showTip]);

  // Auto-dismiss based on admin config
  useEffect(() => {
    if (visible && !exiting) {
      const timer = setTimeout(dismiss, config.dismissSeconds * 1000);
      return () => clearTimeout(timer);
    }
  }, [visible, exiting, dismiss, config.dismissSeconds]);

  if (!config.enabled || !visible || !tip) return null;

  return (
    <div className={`wellness-reminder ${exiting ? 'wellness-exit' : 'wellness-enter'}`}>
      <div className="wellness-glow" />
      <div className="wellness-content">
        <span className="wellness-icon">{tip.icon}</span>
        <div className="wellness-text">
          <strong className="wellness-title">{tip.title}</strong>
          <p className="wellness-message">{tip.message}</p>
        </div>
        <button className="wellness-close" onClick={dismiss} aria-label="Dismiss">✕</button>
      </div>
      <div className="wellness-progress">
        <div className="wellness-progress-bar" style={{ animationDuration: `${config.dismissSeconds}s` }} />
      </div>
    </div>
  );
}
