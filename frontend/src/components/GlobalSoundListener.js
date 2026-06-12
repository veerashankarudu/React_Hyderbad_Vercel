import { useEffect, useRef } from 'react';
import { getSoundSettings, SoundEffects } from '../hooks/useSoundEffects';

// ═══════════════════════════════════════════════════════════════
// GLOBAL SOUND LISTENER
// Attaches to document to detect keystrokes in inputs/textareas
// and play typewriter sounds. Also hooks into toast notifications.
// ═══════════════════════════════════════════════════════════════

export default function GlobalSoundListener() {
  const lastKeyTime = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const settings = getSoundSettings();
      if (!settings.enabled || !settings.typingSounds) return;

      // Only play in text inputs / textareas / contenteditable
      const tag = e.target.tagName;
      const isEditable = e.target.isContentEditable;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

      if (!isInput && !isEditable) return;

      // Guard: e.key can be undefined for synthetic/autofill events
      if (typeof e.key !== 'string') return;

      // Skip modifier-only keys
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'].includes(e.key)) return;

      // Throttle to avoid overloading audio (min 30ms between sounds)
      const now = Date.now();
      if (now - lastKeyTime.current < 30) return;
      lastKeyTime.current = now;

      const vol = settings.volume;

      if (e.key === 'Backspace' || e.key === 'Delete') {
        SoundEffects.backspace(vol);
      } else if (e.key === 'Enter') {
        SoundEffects.enter(vol);
      } else if (e.key === ' ') {
        SoundEffects.keyPress(vol);
      } else if (e.key.length === 1) {
        // Regular character — alternate between typeClick and keyPress for variety
        if (Math.random() > 0.5) {
          SoundEffects.typeClick(vol);
        } else {
          SoundEffects.keyPress(vol);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for toast notifications to play sounds
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      const settings = getSoundSettings();
      if (!settings.enabled || !settings.notificationSounds) return;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1 && node.classList) {
            if (node.classList.contains('Toastify__toast--success')) {
              SoundEffects.success(settings.volume);
            } else if (node.classList.contains('Toastify__toast--error')) {
              SoundEffects.error(settings.volume);
            } else if (node.classList.contains('Toastify__toast--warning')) {
              SoundEffects.warning(settings.volume);
            } else if (node.classList.contains('Toastify__toast--info')) {
              SoundEffects.notification(settings.volume);
            }
          }
        }
      }
    });

    // Watch for toast container changes
    const startObserving = () => {
      const toastContainer = document.querySelector('.Toastify');
      if (toastContainer) {
        observer.observe(toastContainer, { childList: true, subtree: true });
      } else {
        // Retry after DOM is ready
        setTimeout(startObserving, 2000);
      }
    };

    startObserving();
    return () => observer.disconnect();
  }, []);

  return null; // This component renders nothing — it's just a listener
}
