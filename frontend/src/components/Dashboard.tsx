import { useState, useEffect } from 'react';
import { getSites, getCategories, createSite, BlockedSite, Category, logout } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { SiteList } from './SiteList';
import { CategoryManager } from './CategoryManager';
import { TimeWindowForm } from './TimeWindowForm';
import { QuotesManager } from './QuotesManager';

export function Dashboard() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<BlockedSite[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedSite, setSelectedSite] = useState<BlockedSite | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sitesData, categoriesData] = await Promise.all([
        getSites(),
        getCategories(),
      ]);
      setSites(sitesData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const newSite = await createSite(url, selectedCategoryId || undefined);
      setSites([...sites, newSite]);
      setUrl('');
      setSelectedCategoryId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add site');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const activeSites = sites.filter(s => s.isActive).length;
  const totalSites = sites.length;
  const sitesWithWindows = sites.filter(s => s.timeWindows && s.timeWindows.length > 0).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep">
        <div className="flex flex-col items-center gap-6 animate-fade-in-up">
          <div className="spinner" style={{ width: '32px', height: '32px' }} />
          <p className="text-secondary text-sm tracking-wide uppercase">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep">
      {/* Navigation */}
      <nav className="nav-bar">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <div className="nav-brand">
            <div className="nav-brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="nav-brand-text">GoodTurkey</span>
          </div>

          <button onClick={handleLogout} className="btn btn-ghost">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <div className="dashboard-layout">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 animate-fade-in-up">
            <div className="stat-card">
              <div className="stat-value">{totalSites}</div>
              <div className="stat-label">Sites</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ background: 'linear-gradient(135deg, var(--accent-success) 0%, #00a060 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{activeSites}</div>
              <div className="stat-label">Active</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, #ff8844 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{sitesWithWindows}</div>
              <div className="stat-label">Windows</div>
            </div>
          </div>

          {/* Add Site */}
          <div className="surface p-6 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
            <div className="section-header">
              <span className="section-title">Add Blocked Site</span>
            </div>

            <form onSubmit={handleAddSite} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="reddit.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="input select"
                >
                  <option value="">No category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting || !url}
                className="btn btn-primary w-full"
              >
                {submitting ? (
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    <span>Add Site</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Category Manager */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <CategoryManager
              categories={categories}
              onCategoryAdded={(cat) => setCategories([...categories, cat])}
              onCategoryDeleted={(id) =>
                setCategories(categories.filter((c) => c.id !== id))
              }
            />
          </div>

          {/* Quotes Manager */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <QuotesManager />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="surface p-4 animate-scale-in" style={{ borderLeft: '3px solid var(--accent-danger)' }}>
              <div className="flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-sm" style={{ color: 'var(--accent-danger)' }}>{error}</p>
              </div>
            </div>
          )}

          {/* Blocked Sites */}
          <div className="surface p-6 animate-fade-in-up" style={{ animationDelay: '0.08s' }}>
            <div className="section-header">
              <span className="section-title">Blocked Sites</span>
              <span className="text-sm text-muted">{sites.length} total</span>
            </div>

            <SiteList
              sites={sites}
              onSiteDeleted={(id) => setSites(sites.filter((s) => s.id !== id))}
              onSiteUpdated={(updated) => {
                setSites(sites.map((s) => (s.id === updated.id ? updated : s)));
              }}
              onSiteSelect={(site) => setSelectedSite(site)}
              selectedSiteId={selectedSite?.id}
            />
          </div>

          {/* Time Windows Panel */}
          {selectedSite && (
            <div className="surface p-6 animate-slide-in-right">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="section-title">Time Windows</span>
                  <p className="text-mono text-sm mt-1" style={{ color: 'var(--accent-primary)' }}>
                    {selectedSite.url}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSite(null)}
                  className="btn btn-ghost btn-icon-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <TimeWindowForm
                site={selectedSite}
                onWindowAdded={() => {
                  loadData();
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
