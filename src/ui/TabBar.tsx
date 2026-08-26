export type Tab = 'combat' | 'forge' | 'coffres';

const LABELS: Record<Tab, string> = { combat: 'Combat', forge: 'Forge', coffres: 'Coffres' };
const LOCKED = ['Toupies'];

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav style={{ display: 'flex', gap: 7 }}>
      {(['combat', 'forge', 'coffres'] as const).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            flex: '1 1 0', minHeight: 44, borderRadius: 10, cursor: 'pointer',
            fontFamily: 'Oswald, ui-sans-serif, sans-serif', fontSize: 15, letterSpacing: '.02em',
            border: `1px solid ${tab === t ? 'var(--ember)' : 'var(--line)'}`,
            background: tab === t ? 'var(--ember)' : 'var(--panel)',
            color: tab === t ? 'var(--ink)' : 'var(--text)',
            fontWeight: tab === t ? 600 : 500,
          }}
        >
          {LABELS[t]}
        </button>
      ))}
      {LOCKED.map((label) => (
        <div
          key={label}
          aria-disabled="true"
          style={{
            flex: '1 1 0', minHeight: 44, borderRadius: 10,
            border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--muted)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Oswald, ui-sans-serif, sans-serif', fontSize: 15, gap: 1,
          }}
        >
          <span>{label}</span>
          <span style={{ fontSize: 10 }} aria-label="verrouillé">🔒</span>
        </div>
      ))}
    </nav>
  );
}
