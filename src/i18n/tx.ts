import { createElement, Fragment, type ReactElement, type ReactNode } from 'react';
import { raw, rawPlural, type MessageKey, type PluralKey } from './index';

/** Découpe le gabarit sur `{nom}` et y interfole des nœuds. C'est ce qui permet
 *  de garder un fragment coloré ou en gras *à l'intérieur* d'une phrase
 *  traduisible : la découper en trois clés figerait l'ordre des mots sur celui
 *  du français. Les segments vides — aux bords, entre deux variables collées —
 *  sont écartés. */
function split(template: string, vars: Record<string, ReactNode>): ReactNode[] {
  return template
    // Le groupe capturant fait alterner littéral, nom, littéral, nom…
    .split(/\{(\w+)\}/g)
    .map((piece, i) => (i % 2 === 0 ? piece : piece in vars ? vars[piece] : `{${piece}}`))
    .filter((piece) => piece !== '');
}

/** Les parts sont passées en arguments variadiques et non en tableau : React
 *  traite alors les enfants comme statiques et n'exige pas de `key`. */
export function tx(key: MessageKey, vars: Record<string, ReactNode>): ReactElement {
  return createElement(Fragment, null, ...split(raw(key), vars));
}

export function txn(
  base: PluralKey, count: number, vars: Record<string, ReactNode> = {},
): ReactElement {
  return createElement(Fragment, null, ...split(rawPlural(base, count), { n: count, ...vars }));
}
