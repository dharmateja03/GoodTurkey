import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="min-h-screen bg-deep flex flex-col">
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-primary)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="font-semibold">GoodTurkey</span>
        </div>
        <Link to="/login" className="btn btn-ghost">
          Login
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="max-w-xl text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Block distractions.<br />
            <span style={{ color: 'var(--accent-primary)' }}>Stay focused.</span>
          </h1>

          <p className="text-secondary text-lg mb-8">
            Website blocker with a 6-hour unlock delay.<br />
            No more impulsive unblocking.
          </p>

          <div className="flex gap-3 justify-center">
            <Link to="/register" className="btn btn-primary">
              Get Started
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Sign In
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 mt-16 text-left">
            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
              <div className="text-xl mb-2">🔒</div>
              <div className="text-sm font-medium">6-Hour Lock</div>
              <div className="text-xs text-muted mt-1">Can't unblock impulsively</div>
            </div>
            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
              <div className="text-xl mb-2">⏰</div>
              <div className="text-sm font-medium">Time Windows</div>
              <div className="text-xs text-muted mt-1">Schedule allowed access</div>
            </div>
            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
              <div className="text-xl mb-2">💪</div>
              <div className="text-sm font-medium">Motivation</div>
              <div className="text-xs text-muted mt-1">Quotes when blocked</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-muted">
        Built for focus
      </footer>
    </div>
  );
}
