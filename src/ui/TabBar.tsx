import { t, tn, type MessageKey } from '../i18n';

export type Tab = 'combat' | 'forge' | 'coffres' | 'toupies';

const LABELS: Record<Tab, MessageKey> = {
  combat: 'tab.combat', forge: 'tab.forge', coffres: 'tab.coffres', toupies: 'tab.toupies',
};

export function TabBar({ tab, onChange, pending }: { tab: Tab; onChange: (t: Tab) => void; pending: number }) {
  return (
    <nav style={{ display: 'flex', gap: 7 }}>
      {(['combat', 'forge', 'coffres', 'toupies'] as const).map((key) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            flex: '1 1 0', minHeight: 44, borderRadius: 10, cursor: 'pointer',
            fontFamily: 'Oswald, ui-sans-serif, sans-serif', fontSize: 15, letterSpacing: '.02em',
            border: `1px solid ${tab === key ? 'var(--ember)' : 'var(--line)'}`,
            background: tab === key ? 'var(--ember)' : 'var(--panel)',
            color: tab === key ? 'var(--ink)' : 'var(--text)',
            fontWeight: tab === key ? 600 : 500,
          }}
        >
          {t(LABELS[key])}
          {key === 'coffres' && pending > 0 ? (
            <span
              aria-label={tn('tab.chestsBadge', pending)}
              style={{
                marginLeft: 6, padding: '1px 6px', borderRadius: 999, fontSize: 11.5,
                background: 'var(--ember)', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums',
              }}
            >
              {pending}
            </span>
          ) : null}
        </button>
      ))}
    </nav>
  );
}
