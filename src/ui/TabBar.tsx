export type Tab = 'combat' | 'forge' | 'coffres' | 'toupies';

const LABELS: Record<Tab, string> = { combat: 'Combat', forge: 'Forge', coffres: 'Coffres', toupies: 'Toupies' };

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav style={{ display: 'flex', gap: 7 }}>
      {(['combat', 'forge', 'coffres', 'toupies'] as const).map((t) => (
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
    </nav>
  );
}
