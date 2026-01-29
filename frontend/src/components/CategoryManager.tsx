import { useState } from 'react';
import { Category, createCategory, deleteCategory } from '../api/client';

interface CategoryManagerProps {
  categories: Category[];
  onCategoryAdded: (category: Category) => void;
  onCategoryDeleted: (id: string) => void;
}

const COLORS = [
  '#ff4d00', // Orange (Primary)
  '#ff3344', // Red
  '#00d47e', // Green
  '#0099ff', // Blue
  '#9933ff', // Purple
  '#ffb800', // Yellow
  '#ff6b9d', // Pink
  '#00d4d4', // Cyan
  '#8b5cf6', // Violet
  '#64748b', // Slate
];

export function CategoryManager({ categories, onCategoryAdded, onCategoryDeleted }: CategoryManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const category = await createCategory(name.trim(), selectedColor);
      onCategoryAdded(category);
      setName('');
      setSelectedColor(COLORS[0]);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category? Sites will be uncategorized.')) return;

    setDeletingId(id);
    try {
      await deleteCategory(id);
      onCategoryDeleted(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="surface p-6">
      <div className="section-header">
        <div>
          <span className="section-title">Categories</span>
          <p className="text-xs text-muted mt-1">{categories.length} categories</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-ghost btn-icon-sm"
        >
          {showForm ? (
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

      {/* Add Category Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-4 animate-fade-in-up">
          <input
            type="text"
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            required
          />

          <div>
            <p className="text-xs text-muted mb-3">Select color</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color, color: color }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn btn-primary w-full"
          >
            {loading ? (
              <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
            ) : (
              'Create Category'
            )}
          </button>
        </form>
      )}

      {/* Categories List */}
      <div className="space-y-2">
        {categories.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted text-sm">No categories yet</p>
          </div>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              className="group flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-hover"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm font-medium">{cat.name}</span>
              </div>
              <button
                onClick={() => handleDelete(cat.id)}
                disabled={deletingId === cat.id}
                className="btn btn-ghost btn-icon-sm opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-muted)' }}
              >
                {deletingId === cat.id ? (
                  <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '1.5px' }} />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
