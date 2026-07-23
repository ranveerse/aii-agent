'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MR_MARKET_COMPONENT_NAMES } from '@/lib/mrMarket';

type SubmitResult = { ok: boolean; message: string };

type ZodIssue = { path: (string | number)[]; message: string };

// Loosely typed on purpose — this page just needs to display/delete whatever
// ANALYSIS_ENGINE.md-shaped JSON was submitted, not re-validate it (the API
// already does that via src/lib/validation/report.ts).
type Report = {
  ticker: string;
  company_name: string;
  investment_grade: string;
  composite_score: number;
  [key: string]: unknown;
};

type MrMarketReadingFull = {
  as_of: string;
  composite_score: number;
  zone: string;
  reading: string;
  components: unknown;
};

function errorMessageFrom(data: unknown): string {
  if (data && typeof data === 'object' && Array.isArray((data as { issues?: unknown }).issues)) {
    const issues = (data as { issues: ZodIssue[] }).issues;
    return issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  }
  if (data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string') {
    return (data as { error: string }).error;
  }
  return 'Request failed.';
}

type StockRequest = { id: number; ticker: string; requested_at: string };

export default function AdminPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<'report' | 'mrMarket' | 'requests' | 'sandbox'>('report');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/session')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setAuthed(Boolean(data?.authed));
        setAuthChecked(true);
      })
      .catch(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    setAuthed(false);
  }

  if (!authChecked) {
    return <div className="page" />;
  }

  if (!authed) {
    return <LoginForm onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="page">
      <div className="wrap">
        <header className="site">
          <div className="brand">
            <div className="brand-name">Admin</div>
            <div className="brand-tag">Post stock reports &amp; Mr. Market readings</div>
          </div>
          <button className="back-btn" onClick={handleLogout}>
            Log out
          </button>
        </header>
        <nav className="site">
          <button className={`nav-btn${tab === 'report' ? ' active' : ''}`} onClick={() => setTab('report')}>
            Stock report
          </button>
          <button className={`nav-btn${tab === 'mrMarket' ? ' active' : ''}`} onClick={() => setTab('mrMarket')}>
            Mr. Market reading
          </button>
          <button className={`nav-btn${tab === 'requests' ? ' active' : ''}`} onClick={() => setTab('requests')}>
            Stock requests
          </button>
          <button className={`nav-btn${tab === 'sandbox' ? ' active' : ''}`} onClick={() => setTab('sandbox')}>
            Sandbox
          </button>
        </nav>
        <Link href="/" className="back-btn">
          ← Back to site
        </Link>
        {tab === 'report' ? (
          <ReportForm />
        ) : tab === 'mrMarket' ? (
          <MrMarketForm />
        ) : tab === 'requests' ? (
          <RequestsPanel />
        ) : (
          <SandboxForm />
        )}
      </div>
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(errorMessageFrom(data));
      }
    } catch {
      setError('Network error — is the dev server running?');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="wrap" style={{ maxWidth: 420, paddingTop: 80 }}>
        <h1 className="page-title" style={{ marginBottom: 6 }}>
          Admin login
        </h1>
        <p className="page-desc">Enter the admin password to post or delete reports and Mr. Market readings.</p>
        <form onSubmit={handleSubmit}>
          <label className="field-label">Password</label>
          <input
            className="field"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <div className="flag-item" style={{ marginBottom: 12 }}>
              ▪ {error}
            </div>
          )}
          <button className="btn-dark" type="submit" disabled={submitting}>
            {submitting ? 'Checking…' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ReportForm() {
  const [companyName, setCompanyName] = useState('');
  const [json, setJson] = useState('');
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stored, setStored] = useState<Report[]>([]);
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [deletingTicker, setDeletingTicker] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function refreshStored() {
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      setStored(Array.isArray(data) ? data : []);
    } catch {
      setStored([]);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/reports')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setStored(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setStored([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit() {
    setResult(null);

    if (!companyName.trim()) {
      setResult({ ok: false, message: 'Company name is required.' });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setResult({ ok: false, message: 'That is not valid JSON.' });
      return;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      setResult({ ok: false, message: 'Pasted JSON must be an object.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(parsed as Record<string, unknown>), company_name: companyName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: errorMessageFrom(data) });
      } else {
        setResult({ ok: true, message: `Saved ${data.ticker} — ${data.investment_grade}.` });
        setJson('');
        setCompanyName('');
        refreshStored();
      }
    } catch {
      setResult({ ok: false, message: 'Network error — is the dev server / database running?' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(ticker: string) {
    if (!confirm(`Delete the ${ticker} report? This can’t be undone.`)) return;
    setDeleteError(null);
    setDeletingTicker(ticker);
    try {
      const res = await fetch(`/api/reports/${ticker}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(errorMessageFrom(data));
      } else {
        if (expandedTicker === ticker) setExpandedTicker(null);
        await refreshStored();
      }
    } catch {
      setDeleteError('Network error — is the dev server / database running?');
    } finally {
      setDeletingTicker(null);
    }
  }

  return (
    <section className="analyze-card" style={{ marginTop: 24 }}>
      <h1 className="page-title" style={{ marginBottom: 6 }}>
        Post a stock report
      </h1>
      <p className="page-desc">
        Paste the raw JSON output from the analysis engine (docs/ANALYSIS_ENGINE.md&apos;s Phase 3 schema). Add the company name
        below — the engine&apos;s output has no field for it. Submitting again with the same ticker overwrites that report.
      </p>
      <label className="field-label">Company name</label>
      <input className="field" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Apple Inc." />
      <label className="field-label">Report JSON</label>
      <textarea
        className="field"
        style={{ height: 340, fontFamily: 'var(--mono)', fontSize: 12.5 }}
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder='{ "ticker": "AAPL", "current_price": 195.30, "investment_grade": "FAIR VALUE", ... }'
      />
      {result && (
        <div className={result.ok ? 'no-flags' : 'flag-item'} style={{ margin: '12px 0' }}>
          {result.ok ? '✓ ' : '▪ '}
          {result.message}
        </div>
      )}
      <button className="btn-dark" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Saving…' : 'Save report'}
      </button>

      <div className="recent-box" style={{ marginTop: 24 }}>
        <div className="recent-title">Currently stored ({stored.length})</div>
        {deleteError && (
          <div className="flag-item" style={{ marginBottom: 10 }}>
            ▪ {deleteError}
          </div>
        )}
        {stored.length > 0 ? (
          <div className="flags-list">
            {stored.map((r) => {
              const isExpanded = expandedTicker === r.ticker;
              return (
                <div key={r.ticker} className="stat-cell" style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      style={{ flex: 1, textAlign: 'left' }}
                      onClick={() => setExpandedTicker(isExpanded ? null : r.ticker)}
                    >
                      <span className="ticker-mono">{r.ticker}</span>{' '}
                      <span className="name-muted">
                        {r.company_name} · {r.investment_grade} · composite {r.composite_score}
                      </span>{' '}
                      <span style={{ color: 'var(--muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                    </button>
                    <button className="btn-outline" onClick={() => handleDelete(r.ticker)} disabled={deletingTicker === r.ticker}>
                      {deletingTicker === r.ticker ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                  {isExpanded && (
                    <pre
                      style={{
                        marginTop: 10,
                        fontSize: 11.5,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      {JSON.stringify(r, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <span className="empty-state-text">No reports yet.</span>
        )}
      </div>
    </section>
  );
}

function MrMarketForm() {
  const [json, setJson] = useState('');
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<MrMarketReadingFull[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [deletingDate, setDeletingDate] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function refreshHistory() {
    try {
      const res = await fetch('/api/mr-market/history');
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/mr-market/history')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setHistory(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit() {
    setResult(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setResult({ ok: false, message: 'That is not valid JSON.' });
      return;
    }
    const obj = parsed as { as_of?: unknown; components?: unknown };
    if (typeof obj !== 'object' || obj === null || typeof obj.as_of !== 'string' || !Array.isArray(obj.components)) {
      setResult({ ok: false, message: 'Expected an object with "as_of" (string) and a "components" array.' });
      return;
    }

    const components = obj.components.map((c) => {
      const comp = c as { name?: unknown; raw?: unknown };
      return { name: comp.name, raw: comp.raw };
    });

    setSubmitting(true);
    try {
      const res = await fetch('/api/mr-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ as_of: obj.as_of, components }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: errorMessageFrom(data) });
      } else {
        setResult({ ok: true, message: `Saved ${data.as_of} — composite ${data.composite_score}, zone ${data.zone}.` });
        setJson('');
        refreshHistory();
      }
    } catch {
      setResult({ ok: false, message: 'Network error — is the dev server / database running?' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(asOf: string) {
    if (!confirm(`Delete the ${asOf} reading? This can’t be undone.`)) return;
    setDeleteError(null);
    setDeletingDate(asOf);
    try {
      const res = await fetch(`/api/mr-market/${asOf}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(errorMessageFrom(data));
      } else {
        if (expandedDate === asOf) setExpandedDate(null);
        await refreshHistory();
      }
    } catch {
      setDeleteError('Network error — is the dev server / database running?');
    } finally {
      setDeletingDate(null);
    }
  }

  return (
    <section className="analyze-card" style={{ marginTop: 24 }}>
      <h1 className="page-title" style={{ marginBottom: 6 }}>
        Post a Mr. Market reading
      </h1>
      <p className="page-desc">
        Paste JSON with <code>as_of</code> (YYYY-MM-DD) and a <code>components</code> array of the 5 components below — each needs
        just <code>name</code> and <code>raw</code> (the current reading — no history lookup required). The score, orientation,
        composite, and zone are all computed server-side against the spec&apos;s fixed calibration bounds — you don&apos;t need to
        include them, and they&apos;re ignored if you do. Submitting again with the same <code>as_of</code> overwrites that
        day&apos;s reading.
      </p>
      <div className="field-note">Exact component names required: {MR_MARKET_COMPONENT_NAMES.join(', ')}</div>
      <label className="field-label">Reading JSON</label>
      <textarea
        className="field"
        style={{ height: 280, fontFamily: 'var(--mono)', fontSize: 12.5 }}
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder='{ "as_of": "2026-07-21", "components": [ { "name": "VIX", "raw": 15.7 }, ... ] }'
      />
      {result && (
        <div className={result.ok ? 'no-flags' : 'flag-item'} style={{ margin: '12px 0' }}>
          {result.ok ? '✓ ' : '▪ '}
          {result.message}
        </div>
      )}
      <button className="btn-dark" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Saving…' : 'Save reading'}
      </button>

      <div className="recent-box" style={{ marginTop: 24 }}>
        <div className="recent-title">Currently stored ({history.length})</div>
        {deleteError && (
          <div className="flag-item" style={{ marginBottom: 10 }}>
            ▪ {deleteError}
          </div>
        )}
        {history.length > 0 ? (
          <div className="flags-list">
            {history.map((h) => {
              const isExpanded = expandedDate === h.as_of;
              return (
                <div key={h.as_of} className="stat-cell" style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button style={{ flex: 1, textAlign: 'left' }} onClick={() => setExpandedDate(isExpanded ? null : h.as_of)}>
                      <span className="ticker-mono">{h.as_of}</span>{' '}
                      <span className="name-muted">
                        composite {h.composite_score} · {h.zone}
                      </span>{' '}
                      <span style={{ color: 'var(--muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                    </button>
                    <button className="btn-outline" onClick={() => handleDelete(h.as_of)} disabled={deletingDate === h.as_of}>
                      {deletingDate === h.as_of ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                  {isExpanded && (
                    <pre
                      style={{
                        marginTop: 10,
                        fontSize: 11.5,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      {JSON.stringify(h, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <span className="empty-state-text">No reading yet.</span>
        )}
      </div>
    </section>
  );
}

function RequestsPanel() {
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch('/api/requests');
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setRequests([]);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/requests')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setRequests(Array.isArray(data) ? data : []);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setRequests([]);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: number, ticker: string) {
    if (!confirm(`Delete this ${ticker} request? This can’t be undone.`)) return;
    setDeleteError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(errorMessageFrom(data));
      } else {
        await refresh();
      }
    } catch {
      setDeleteError('Network error — is the dev server / database running?');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="analyze-card" style={{ marginTop: 24 }}>
      <h1 className="page-title" style={{ marginBottom: 6 }}>
        Stock requests
      </h1>
      <p className="page-desc">
        Tickers submitted from the site&apos;s &quot;Request a stock&quot; tab, newest first. Live analysis isn&apos;t wired up yet
        — this is just the raw interest log to prioritize what to analyze next.
      </p>

      <div className="recent-box" style={{ marginTop: 8 }}>
        <div className="recent-title">
          {loaded ? `Currently stored (${requests.length})` : 'Loading…'}
        </div>
        {deleteError && (
          <div className="flag-item" style={{ marginBottom: 10 }}>
            ▪ {deleteError}
          </div>
        )}
        {requests.length > 0 ? (
          <div className="flags-list">
            {requests.map((r) => (
              <div key={r.id} className="stat-cell" style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1 }}>
                    <span className="ticker-mono">{r.ticker}</span>{' '}
                    <span className="name-muted">{new Date(r.requested_at).toLocaleString()}</span>
                  </span>
                  <button className="btn-outline" onClick={() => handleDelete(r.id, r.ticker)} disabled={deletingId === r.id}>
                    {deletingId === r.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          loaded && <span className="empty-state-text">No requests yet.</span>
        )}
      </div>
    </section>
  );
}

const SANDBOX_FILES = ['ANALYSIS_ENGINE.md', 'MR_MARKET_INDEX_SPEC.md'] as const;

type SandboxResult = {
  text: string;
  thinking: string | null;
  stop_reason: string;
  usage: unknown;
};

function SandboxForm() {
  const [files, setFiles] = useState<string[]>(['ANALYSIS_ENGINE.md']);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleFile(name: string) {
    setFiles((prev) => (prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]));
  }

  async function handleSubmit() {
    setError(null);
    setResult(null);

    if (files.length === 0) {
      setError('Select at least one .md file to use as the system prompt.');
      return;
    }
    if (!message.trim()) {
      setError('Enter a prompt or data dump to send.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(errorMessageFrom(data));
      } else {
        setResult(data);
      }
    } catch {
      setError('Network error — is the dev server running?');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="analyze-card" style={{ marginTop: 24 }}>
      <h1 className="page-title" style={{ marginBottom: 6 }}>
        Sandbox
      </h1>
      <p className="page-desc">
        Send a prompt straight to Claude using one or more of this project&apos;s own .md files as the system prompt — a quick way
        to test <code>ANALYSIS_ENGINE.md</code> or <code>MR_MARKET_INDEX_SPEC.md</code> against real input before wiring up the
        production pipeline. Nothing here is saved.
      </p>

      <label className="field-label">System prompt files</label>
      <div className="grade-filter-group" style={{ marginBottom: 18 }}>
        {SANDBOX_FILES.map((name) => {
          const active = files.includes(name);
          return (
            <button
              key={name}
              type="button"
              className="grade-toggle"
              style={{
                borderColor: active ? '#1f6b47' : 'rgba(23,21,15,.25)',
                background: active ? '#1f6b47' : 'transparent',
                color: active ? '#fdfcf9' : '#6b675c',
              }}
              onClick={() => toggleFile(name)}
            >
              {name}
            </button>
          );
        })}
      </div>

      <label className="field-label">Prompt / data dump</label>
      <textarea
        className="field"
        style={{ height: 220, fontFamily: 'var(--mono)', fontSize: 12.5 }}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="e.g. ticker + financials data dump for ANALYSIS_ENGINE.md, or today's component readings for MR_MARKET_INDEX_SPEC.md"
      />

      {error && (
        <div className="flag-item" style={{ margin: '12px 0' }}>
          ▪ {error}
        </div>
      )}

      <button className="btn-dark" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Running…' : 'Send to Claude →'}
      </button>

      {result && (
        <div className="recent-box" style={{ marginTop: 24 }}>
          <div className="recent-title">
            Response · stop_reason: {result.stop_reason}
            {result.usage != null ? ` · ${JSON.stringify(result.usage)}` : ''}
          </div>
          {result.thinking && (
            <details style={{ marginBottom: 14 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--muted)' }}>Thinking (summarized)</summary>
              <pre
                style={{
                  marginTop: 10,
                  fontSize: 11.5,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'var(--mono)',
                  color: 'var(--muted)',
                }}
              >
                {result.thinking}
              </pre>
            </details>
          )}
          <pre
            style={{
              fontSize: 12,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'var(--mono)',
            }}
          >
            {result.text}
          </pre>
        </div>
      )}
    </section>
  );
}
