import { useState, useEffect } from 'react';
import { BlockedSite, deleteSite, updateSite, deleteTimeWindow, requestUnlock, cancelUnlock } from '../api/client';

interface SiteListProps {
  sites: BlockedSite[];
  onSiteDeleted: (id: string) => void;
  onSiteUpdated: (site: BlockedSite) => void;
  onSiteSelect: (site: BlockedSite) => void;
  selectedSiteId?: string | null;
}

function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}

export function SiteList({ sites, onSiteDeleted, onSiteUpdated, onSiteSelect, selectedSiteId }: SiteListProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingWindow, setDeletingWindow] = useState<string | null>(null);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});

  useEffect(() => {
    const sitesWithUnlock = sites.filter(s => s.unlockRequestedAt && s.timeRemaining && s.timeRemaining > 0);

    if (sitesWithUnlock.length === 0) return;

    const initial: Record<string, number> = {};
    sitesWithUnlock.forEach(site => {
      if (site.timeRemaining) {
        initial[site.id] = site.timeRemaining;
      }
    });
    setCountdowns(initial);

    const interval = setInterval(() => {
      setCountdowns(prev => {
        const updated: Record<string, number> = {};
        Object.entries(prev).forEach(([id, time]) => {
          const newTime = time - 1000;
          if (newTime > 0) {
            updated[id] = newTime;
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sites]);

  const handleToggleActive = async (site: BlockedSite) => {
    if (site.isActive) {
      if (site.unlockReady || (countdowns[site.id] !== undefined && countdowns[site.id] <= 0)) {
        setLoading(site.id);
        setError(null);
        try {
          const updated = await updateSite(site.id, { isActive: false });
          onSiteUpdated(updated);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to deactivate site');
        } finally {
          setLoading(null);
        }
      } else {
        setError('Request unlock first and wait 6 hours');
      }
      return;
    }

    setLoading(site.id);
    setError(null);
    try {
      const updated = await updateSite(site.id, { isActive: true });
      onSiteUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update site');
    } finally {
      setLoading(null);
    }
  };

  const handleRequestUnlock = async (site: BlockedSite) => {
    setLoading(site.id);
    setError(null);
    try {
      const updated = await requestUnlock(site.id);
      onSiteUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request unlock');
    } finally {
      setLoading(null);
    }
  };

  const handleCancelUnlock = async (site: BlockedSite) => {
    setLoading(site.id);
    setError(null);
    try {
      const updated = await cancelUnlock(site.id);
      onSiteUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel unlock');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (site: BlockedSite) => {
    const isReady = site.unlockReady || (countdowns[site.id] !== undefined && countdowns[site.id] <= 0);

    if (!isReady) {
      setError('Wait for the 6-hour unlock period');
      return;
    }

    if (!confirm('Delete this blocked site?')) return;

    setLoading(site.id);
    setError(null);
    try {
      await deleteSite(site.id);
      onSiteDeleted(site.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete site');
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteTimeWindow = async (windowId: string, site: BlockedSite) => {
    if (!confirm('Remove this time window?')) return;

    setDeletingWindow(windowId);
    try {
      await deleteTimeWindow(windowId);
      const updatedSite = {
        ...site,
        timeWindows: site.timeWindows.filter(tw => tw.id !== windowId)
      };
      onSiteUpdated(updatedSite as BlockedSite);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete time window');
    } finally {
      setDeletingWindow(null);
    }
  };

  if (sites.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
        </div>
        <p className="empty-state-title">No blocked sites</p>
        <p className="empty-state-text">Add a website above to start blocking distractions</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="surface p-3 animate-scale-in" style={{ borderLeft: '3px solid var(--accent-danger)', background: 'var(--accent-danger-soft)' }}>
          <p className="text-sm" style={{ color: 'var(--accent-danger)' }}>{error}</p>
        </div>
      )}

      <div className="animate-stagger space-y-3">
        {sites.map((site) => {
          const hasPendingUnlock = site.unlockRequestedAt && (countdowns[site.id] > 0 || (site.timeRemaining && site.timeRemaining > 0));
          const isUnlockReady = site.unlockReady || (countdowns[site.id] !== undefined && countdowns[site.id] <= 0);

          return (
            <div
              key={site.id}
              onClick={() => onSiteSelect(site)}
              className={`site-card ${selectedSiteId === site.id ? 'selected' : ''}`}
            >
              {/* Header Row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className={`status-dot ${site.isActive ? 'status-active' : 'status-inactive'}`} />
                    <span className="site-card-url truncate">{site.url}</span>
                  </div>

                  {/* Time Windows */}
                  {site.timeWindows && site.timeWindows.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {site.timeWindows.map((tw) => (
                        <div key={tw.id} className="time-tag group" onClick={(e) => e.stopPropagation()}>
                          <span className="time-tag-day">
                            {tw.dayOfWeek !== null
                              ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][tw.dayOfWeek]
                              : 'Daily'}
                          </span>
                          <span>{tw.startTime.slice(0, 5)}-{tw.endTime.slice(0, 5)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTimeWindow(tw.id, site);
                            }}
                            disabled={deletingWindow === tw.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                            style={{ color: 'var(--accent-danger)' }}
                          >
                            {deletingWindow === tw.id ? '...' : '×'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs mt-2 text-muted flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      Blocked 24/7
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {/* Status Toggle */}
                  <button
                    onClick={() => handleToggleActive(site)}
                    disabled={loading === site.id}
                    className={`badge ${site.isActive ? 'badge-success' : 'badge-neutral'}`}
                    style={{ cursor: 'pointer' }}
                  >
                    {loading === site.id ? (
                      <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '1.5px' }} />
                    ) : (
                      site.isActive ? 'ACTIVE' : 'OFF'
                    )}
                  </button>

                  {/* Vault Timer / Lock Controls */}
                  {hasPendingUnlock ? (
                    <div className="vault-timer">
                      <span className="vault-timer-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                      </span>
                      <span className="vault-timer-text">
                        {formatTimeRemaining(countdowns[site.id] || site.timeRemaining || 0)}
                      </span>
                      <button
                        onClick={() => handleCancelUnlock(site)}
                        disabled={loading === site.id}
                        className="text-muted hover:text-primary transition-colors ml-1"
                        title="Cancel unlock"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ) : isUnlockReady ? (
                    <button
                      onClick={() => handleDelete(site)}
                      disabled={loading === site.id}
                      className="btn btn-danger btn-icon-sm"
                      title="Delete (unlock complete)"
                    >
                      {loading === site.id ? (
                        <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '1.5px' }} />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRequestUnlock(site)}
                      disabled={loading === site.id}
                      className="btn btn-ghost btn-icon-sm"
                      title="Request unlock (6h wait)"
                    >
                      {loading === site.id ? (
                        <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '1.5px' }} />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
