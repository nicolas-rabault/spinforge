export type Tab = 'combat' | 'forge' | 'coffres' | 'toupies';

const LABELS: Record<Tab, string> = { combat: 'Combat', forge: 'Forge', coffres: 'Coffres', toupies: 'Toupies' };

/** Un pictogramme par onglet. Ils portent la moitié du travail que faisait le
 *  libellé seul : à l'usage on vise l'icône, pas le mot. Traits uniquement, même
 *  épaisseur pour les quatre — un jeu mélangeant aplats et contours se lit comme
 *  quatre icônes empruntées à quatre endroits. */
function TabIcon({ tab, color }: { tab: Tab; color: string }) {
  const common = {
    width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth: 1.7, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const,
  };
  if (tab === 'combat') {
    // Une toupie de trois quarts : couronne, corps, pointe.
    return (
      <svg {...common} aria-hidden="true">
        <path d="M3.5 9 L12 5 L20.5 9 L12 13 Z" />
        <path d="M12 13 L12 19.5" />
        <path d="M6.5 11 Q12 15 17.5 11" />
      </svg>
    );
  }
  if (tab === 'forge') {
    // Une enclume.
    return (
      <svg {...common} aria-hidden="true">
        <path d="M3 8 h11 a4 4 0 0 0 4 3 v2 a7 7 0 0 1 -7 3 h-2 z" />
        <path d="M7 16 h8 l1.5 3 h-11 z" />
      </svg>
    );
  }
  if (tab === 'coffres') {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M4 10 a8 5 0 0 1 16 0 z" />
        <path d="M4 10 h16 v8 h-16 z" />
        <path d="M11 12.5 h2 v3 h-2 z" />
      </svg>
    );
  }
  // Toupies : deux corps encochés, vus de dessus.
  return (
    <svg {...common} aria-hidden="true">
      <circle cx="9" cy="9" r="5" />
      <path d="M9 4 v2 M14 9 h-2 M9 14 v-2 M4 9 h2" />
      <circle cx="16" cy="16" r="4" />
    </svg>
  );
}

export function TabBar({
  tab, onChange, pending, floating,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  pending: number;
  /** En combat, la barre se pose SUR l'arène plein écran, sur un voile dégradé. */
  floating: boolean;
}) {
  return (
    <nav
      style={{
        display: 'flex', gap: 7,
        ...(floating
          ? {
              position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 3,
              padding: '18px 16px 12px',
              background: 'linear-gradient(0deg, rgba(6,8,12,.92) 0%, rgba(6,8,12,.7) 55%, rgba(6,8,12,0) 100%)',
            }
          : {}),
      }}
    >
      {(['combat', 'forge', 'coffres', 'toupies'] as const).map((t) => {
        const on = tab === t;
        const color = on ? 'var(--ink)' : 'var(--muted)';
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            style={{
              position: 'relative', flex: '1 1 0', minHeight: 50, borderRadius: 11, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
              fontFamily: 'Oswald, ui-sans-serif, sans-serif', fontSize: 11.5, letterSpacing: '.04em',
              border: `1px solid ${on ? 'var(--ember)' : 'var(--line)'}`,
              background: on ? 'var(--ember)' : 'rgba(19,25,34,.92)',
              color: on ? 'var(--ink)' : 'var(--text)',
              fontWeight: on ? 600 : 500,
              // L'onglet actif se soulève : la sélection se voit avant d'être lue.
              transform: on ? 'translateY(-3px)' : 'none',
              boxShadow: on ? '0 4px 12px rgba(0,0,0,.45)' : 'none',
            }}
          >
            <TabIcon tab={t} color={color} />
            {LABELS[t]}
            {t === 'coffres' && pending > 0 ? (
              <span
                aria-label={`${pending} coffre${pending > 1 ? 's' : ''} à ouvrir`}
                style={{
                  position: 'absolute', top: 4, right: 6, minWidth: 17, height: 17, borderRadius: 999,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', fontSize: 11, fontVariantNumeric: 'tabular-nums',
                  background: on ? 'var(--ink)' : 'var(--ember)', color: on ? 'var(--ember)' : 'var(--ink)',
                }}
              >
                {pending}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
