import type { SimState } from '../sim/types';

export function Hud({ stateRef }: { stateRef: { current: SimState } }) {
  return <div>Salle {stateRef.current.salle}</div>;
}
