"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import Layout from '@/components/Layout';
import { shareService } from '@/lib/api';

function ExpiryCountdown({ createdAtStr }) {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const createdTime = new Date(createdAtStr.replace(/-/g, '/')).getTime();
      const expiryTime = createdTime + (15 * 60 * 1000); // 15 minutes
      const remainingMs = expiryTime - Date.now();

      if (remainingMs <= 0) {
        setCountdown('Expired');
      } else {
        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.floor((remainingMs % 60000) / 1000);
        setCountdown(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [createdAtStr]);

  return (
    <div style={{ fontSize: '0.8rem', color: '#d93025', marginTop: '4px', fontWeight: '600' }}>
      Expires in: {countdown}
    </div>
  );
}

function ShareCodeContent() {
  const [sharedCodes, setSharedCodes] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [authorized, setAuthorized] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      router.replace('/login');
    } else {
      setAuthorized(true);
      fetchSharedCodes();
    }
  }, [router]);

  const fetchSharedCodes = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await shareService.getSharedCodes();
      setSharedCodes(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch shared codes.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCode.trim()) return;
    setSaving(true);
    setError('');

    try {
      const created = await shareService.createSharedCode(newTitle.trim(), newCode);
      setSharedCodes([created, ...sharedCodes]);
      setNewTitle('');
      setNewCode('');
    } catch (err) {
      console.error(err);
      setError('Failed to share code snippet.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this shared snippet?')) {
      return;
    }
    setError('');
    try {
      await shareService.deleteSharedCode(id);
      setSharedCodes(sharedCodes.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
      setError('Failed to delete shared code.');
    }
  };

  // Filter out items that are locally expired (memoized)
  const activeShares = useMemo(() => {
    return sharedCodes.filter(item => {
      const createdTime = new Date(item.created_at.replace(/-/g, '/')).getTime();
      const expiryTime = createdTime + (15 * 60 * 1000);
      return expiryTime - Date.now() > 0;
    });
  }, [sharedCodes]);

  if (!authorized) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Checking authorization...</div>;
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-heading)', marginBottom: '4px' }}>Share Code Snippet</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Shared snippets are public and auto-expire after 15 minutes.</p>
      </div>

      {error && <div className="login-error">{error}</div>}

      {/* Share Code Form */}
      <form onSubmit={handleShare} style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '20px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontWeight: '600' }}>Snippet Title</label>
          <input
            type="text"
            placeholder="E.g., Quick Sort algorithm, Database connection test..."
            className="form-input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            style={{ maxWidth: '600px' }}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontWeight: '600', marginBottom: '8px' }}>Java Code</label>
          <div className="monaco-wrapper" style={{ height: '240px' }}>
            <Editor
              height="100%"
              defaultLanguage="java"
              theme="vs-dark"
              value={newCode}
              onChange={(val) => setNewCode(val || '')}
              options={{
                selectOnLineNumbers: true,
                lineNumbers: 'on',
                wordWrap: 'on',
                autoClosingBrackets: 'always',
                minimap: { enabled: false },
                fontSize: 13,
                automaticLayout: true
              }}
            />
          </div>
        </div>

        <div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Sharing...' : 'Share Snippet'}
          </button>
        </div>
      </form>

      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-heading)', marginBottom: '16px' }}>Active Shared Snippets</h3>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {[1].map((i) => (
              <div key={i} className="skeleton-card" style={{ height: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div className="skeleton skeleton-title" style={{ width: '180px' }}></div>
                    <div className="skeleton skeleton-text" style={{ width: '100px' }}></div>
                  </div>
                  <div className="skeleton" style={{ width: '60px', height: '30px' }}></div>
                </div>
                <div className="skeleton" style={{ flex: 1, height: '100%' }}></div>
              </div>
            ))}
          </div>
        ) : activeShares.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No code shared currently</div>
            <p>Write and share your code snippet above. It will appear here for 15 minutes.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {activeShares.map((item) => (
              <div 
                key={item.id} 
                style={{ 
                  border: '1px solid var(--card-border)', 
                  borderRadius: '8px', 
                  padding: '20px', 
                  boxShadow: '0 1px 2px var(--shadow-color)',
                  backgroundColor: 'var(--card-bg)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-heading)' }}>{item.title}</h4>
                    <ExpiryCountdown createdAtStr={item.created_at} />
                  </div>
                  <button 
                    className="btn btn-danger" 
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
                  </button>
                </div>
                <div className="monaco-wrapper" style={{ height: '200px' }}>
                  <Editor
                    height="100%"
                    defaultLanguage="java"
                    theme="vs-dark"
                    value={item.code}
                    options={{
                      readOnly: true,
                      selectOnLineNumbers: true,
                      lineNumbers: 'on',
                      wordWrap: 'on',
                      minimap: { enabled: false },
                      fontSize: 12,
                      automaticLayout: true
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ShareCodePage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
      <Layout searchQuery={searchQuery} setSearchQuery={setSearchQuery}>
        <ShareCodeContent />
      </Layout>
    </Suspense>
  );
}
