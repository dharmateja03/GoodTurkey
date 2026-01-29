import { useState, useEffect } from 'react';
import { getQuotes, createQuote, updateQuote, deleteQuote, Quote } from '../api/client';

interface QuotesManagerProps {
  onQuoteAdded?: () => void;
}

export function QuotesManager({ onQuoteAdded }: QuotesManagerProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newQuote, setNewQuote] = useState({ text: '', author: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getQuotes();
      setQuotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quotes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuote.text.trim() || !newQuote.author.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const created = await createQuote(newQuote.text.trim(), newQuote.author.trim());
      setQuotes([...quotes, created]);
      setNewQuote({ text: '', author: '' });
      setShowAddForm(false);
      onQuoteAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add quote');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (quote: Quote) => {
    try {
      const updated = await updateQuote(quote.id, { isActive: !quote.isActive });
      setQuotes(quotes.map(q => q.id === updated.id ? updated : q));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quote');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this quote?')) return;
    try {
      await deleteQuote(id);
      setQuotes(quotes.filter(q => q.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete quote');
    }
  };

  const activeQuotes = quotes.filter(q => q.isActive).length;
  const systemQuotes = quotes.filter(q => q.isSystem);
  const userQuotes = quotes.filter(q => !q.isSystem);

  if (loading) {
    return (
      <div className="surface p-6">
        <div className="flex items-center justify-center py-8">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="surface p-6">
      <div className="section-header">
        <div>
          <span className="section-title">Motivation</span>
          <p className="text-xs text-muted mt-1">{activeQuotes} active quotes</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-ghost btn-icon-sm"
        >
          {showAddForm ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-lg animate-scale-in" style={{ background: 'var(--accent-danger-soft)', borderLeft: '3px solid var(--accent-danger)' }}>
          <p className="text-sm" style={{ color: 'var(--accent-danger)' }}>{error}</p>
        </div>
      )}

      {/* Add Quote Form */}
      {showAddForm && (
        <form onSubmit={handleAddQuote} className="mb-6 space-y-3 animate-fade-in-up">
          <textarea
            placeholder="Enter a motivating quote..."
            value={newQuote.text}
            onChange={(e) => setNewQuote({ ...newQuote, text: e.target.value })}
            className="input"
            rows={3}
            style={{ resize: 'none' }}
            required
          />
          <input
            type="text"
            placeholder="Author"
            value={newQuote.author}
            onChange={(e) => setNewQuote({ ...newQuote, author: e.target.value })}
            className="input"
            required
          />
          <button
            type="submit"
            disabled={submitting || !newQuote.text.trim() || !newQuote.author.trim()}
            className="btn btn-primary w-full"
          >
            {submitting ? (
              <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
            ) : (
              'Add Quote'
            )}
          </button>
        </form>
      )}

      {/* Quotes List */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {quotes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted text-sm">No quotes yet</p>
          </div>
        ) : (
          <>
            {/* System Quotes */}
            {systemQuotes.length > 0 && (
              <div className="space-y-2">
                {systemQuotes.slice(0, 5).map((quote) => (
                  <div
                    key={quote.id}
                    className="quote-card animate-fade-in-up"
                    style={{ opacity: quote.isActive ? 1 : 0.5 }}
                  >
                    <p className="quote-text">"{quote.text}"</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <span className="quote-author">— {quote.author}</span>
                        <span className="badge badge-neutral text-xs">System</span>
                      </div>
                      <button
                        onClick={() => handleToggleActive(quote)}
                        className={`badge ${quote.isActive ? 'badge-success' : 'badge-neutral'}`}
                        style={{ cursor: 'pointer' }}
                      >
                        {quote.isActive ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                ))}
                {systemQuotes.length > 5 && (
                  <p className="text-xs text-muted text-center py-2">
                    +{systemQuotes.length - 5} more system quotes
                  </p>
                )}
              </div>
            )}

            {/* User Quotes */}
            {userQuotes.map((quote) => (
              <div
                key={quote.id}
                className="quote-card animate-fade-in-up"
                style={{ opacity: quote.isActive ? 1 : 0.5 }}
              >
                <p className="quote-text">"{quote.text}"</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="quote-author">— {quote.author}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(quote)}
                      className={`badge ${quote.isActive ? 'badge-success' : 'badge-neutral'}`}
                      style={{ cursor: 'pointer' }}
                    >
                      {quote.isActive ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={() => handleDelete(quote.id)}
                      className="btn btn-ghost btn-icon-sm"
                      style={{ color: 'var(--accent-danger)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
