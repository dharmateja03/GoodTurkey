import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, setToken } from '../api/client';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await login(email, password);
      setToken(response.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-deep">
      {/* Background accent */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-30 blur-[120px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, var(--accent-primary) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="nav-brand-icon w-16 h-16 mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">GoodTurkey</h1>
          <p className="text-muted">Block distractions. Stay focused.</p>
        </div>

        {/* Form */}
        <div className="surface p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-lg animate-scale-in" style={{ background: 'var(--accent-danger-soft)', borderLeft: '3px solid var(--accent-danger)' }}>
                <p className="text-sm" style={{ color: 'var(--accent-danger)' }}>{error}</p>
              </div>
            )}

            <div>
              <label className="text-xs text-muted block mb-2 uppercase tracking-wider">Email</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="text-xs text-muted block mb-2 uppercase tracking-wider">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? (
                <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 text-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <p className="text-sm text-muted">
              Don't have an account?{' '}
              <Link to="/register" className="text-accent font-medium hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted">
            Demo: test@example.com / password123
          </p>
        </div>
      </div>
    </div>
  );
}
