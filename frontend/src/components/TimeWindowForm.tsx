import { useState } from 'react';
import { createTimeWindow, BlockedSite } from '../api/client';

interface TimeWindowFormProps {
  site: BlockedSite;
  onWindowAdded: (site: BlockedSite) => void;
}

const DAYS = [
  { value: '', label: 'Every Day' },
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const PRESETS = [
  { label: 'Work', start: '09:00', end: '17:00' },
  { label: 'Morning', start: '08:00', end: '12:00' },
  { label: 'Afternoon', start: '13:00', end: '17:00' },
  { label: 'Evening', start: '18:00', end: '22:00' },
];

export function TimeWindowForm({ site, onWindowAdded }: TimeWindowFormProps) {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [dayOfWeek, setDayOfWeek] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await createTimeWindow(
        site.id,
        startTime,
        endTime,
        dayOfWeek ? parseInt(dayOfWeek) : null
      );

      onWindowAdded(site);
      setStartTime('09:00');
      setEndTime('17:00');
      setDayOfWeek('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add time window');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg animate-scale-in" style={{ background: 'var(--accent-danger-soft)', borderLeft: '3px solid var(--accent-danger)' }}>
          <p className="text-sm" style={{ color: 'var(--accent-danger)' }}>{error}</p>
        </div>
      )}

      {/* Day Selector */}
      <div>
        <label className="text-xs text-muted block mb-2">Day</label>
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(e.target.value)}
          className="input select"
        >
          {DAYS.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
      </div>

      {/* Time Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted block mb-2">Start</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="input text-mono"
          />
        </div>
        <div>
          <label className="text-xs text-muted block mb-2">End</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="input text-mono"
          />
        </div>
      </div>

      {/* Presets */}
      <div>
        <label className="text-xs text-muted block mb-2">Quick presets</label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setStartTime(preset.start);
                setEndTime(preset.end);
              }}
              className="badge badge-neutral"
              style={{ cursor: 'pointer' }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary w-full"
      >
        {loading ? (
          <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>Add Window</span>
          </>
        )}
      </button>

      <p className="text-xs text-muted text-center">
        Access allowed during this time window
      </p>
    </form>
  );
}
