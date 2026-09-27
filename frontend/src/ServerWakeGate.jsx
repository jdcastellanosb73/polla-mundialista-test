import { useEffect, useRef, useState } from 'react';
import { API_BASE } from './api.js';
import { TrophyIcon, BallIcon } from './icons.jsx';
import { LangToggle, useLang } from './i18n.jsx';

// Free-tier hosts (Render) put the API to sleep after idle periods; the first
// request can take 30-60s. Without this gate the login just looks frozen.
// Strategy: probe /health quickly on load — if the server answers fast, render
// the app with zero flicker; if not, show a friendly wake-up screen and keep
// probing until it responds (or give up after ~2 minutes).

const QUICK_PROBE_MS = 2500;   // warm server answers well under this
const RETRY_EVERY_MS = 3000;
const GIVE_UP_AFTER_MS = 120000;

async function probe(timeoutMs) {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

export default function ServerWakeGate({ children }) {
  const { t } = useLang();
  const [status, setStatus] = useState('checking'); // checking | waking | ready | down
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (await probe(QUICK_PROBE_MS)) {
        if (!cancelled) setStatus('ready');
        return;
      }
      if (cancelled) return;
      setStatus('waking');
      startedAt.current = Date.now();

      while (!cancelled) {
        const waited = Date.now() - startedAt.current;
        setElapsed(Math.round(waited / 1000));
        if (waited > GIVE_UP_AFTER_MS) {
          setStatus('down');
          return;
        }
        if (await probe(5000)) {
          if (!cancelled) setStatus('ready');
          return;
        }
        await new Promise((r) => setTimeout(r, RETRY_EVERY_MS));
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (status === 'checking') return null; // brief: avoids flashing the overlay on a warm server
  if (status === 'ready') return children;

  return (
    <div className="wake-screen">
      <LangToggle float />
      <div className="hero-brand wake-brand">
        <span className="hero-brand-mark"><TrophyIcon size={24} /></span>
        <span className="hero-brand-name">polla<em>Mundial</em></span>
      </div>
      <div className="wake-card">
        <span className="wake-ball"><BallIcon size={32} /></span>
        {status === 'waking' ? (
          <>
            <h1>{t('wk.waking')}</h1>
            <p className="muted">{t('wk.text')}</p>
            <div className="wake-progress"><div className="wake-progress-bar" /></div>
            <p className="wake-elapsed">{t('wk.elapsed', { s: elapsed })}</p>
          </>
        ) : (
          <>
            <h1>{t('wk.down')}</h1>
            <p className="muted">{t('wk.down_text')}</p>
            <button className="login-cta wake-retry" onClick={() => window.location.reload()}>
              {t('wk.retry')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
