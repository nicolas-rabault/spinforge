/** Catalogue français — source de vérité des clés du jeu. `en.ts` est déclaré
 *  `Record<MessageKey, string>` : une clé oubliée ou en trop côté anglais casse
 *  le build. À ~170 clés, c'est la seule garantie qu'aucun écran ne reste à
 *  moitié traduit.
 *
 *  Deux conventions : `{nom}` est une variable interpolée (`t`, `tx`) ; un
 *  couple `.one`/`.other` est une forme plurielle résolue par `tn`. */
export const fr = {
  // Le français sépare le nombre de son suffixe, l'anglais le colle.
  'format.thousand': ' k',
  'format.million': ' M',

  'tab.combat': 'Combat',
  'tab.forge': 'Forge',
  'tab.coffres': 'Coffres',
  'tab.toupies': 'Toupies',
  'tab.chestsBadge.one': '{n} coffre à ouvrir',
  'tab.chestsBadge.other': '{n} coffres à ouvrir',

  'header.credits': 'Crédits',
  'header.gems': 'Gemmes',
  'header.mute': 'Couper le son',
  'header.unmute': 'Réactiver le son',
  // Nomme la langue vers laquelle le bouton fait basculer, pas la langue lue.
  'header.switchLang': 'Passer en anglais',
  'save.recovered': "Ta sauvegarde était illisible et n'a pas pu être chargée. Elle a été mise de côté ; une nouvelle partie a démarré.",

  'combat.chapter': 'Chapitre {n} — {name}',
  'combat.salle': 'SALLE {n} / {max}',
  'combat.bossAt': 'Boss : salle {n}',
  'combat.banner.salle': 'Salle {n} · {type}',
  'combat.hint.title': '▾ TA TOUPIE EST CELLE DU CHEVRON',
  'combat.hint.body': "Glisse le doigt n'importe où pour la piloter. {charge} : qui charge casse plus et encaisse moins.",
  'combat.hint.charge': "Fonce dans l'adversaire",
  'combat.spin': '▾ TON SPIN',
  'combat.retry': "Ta toupie s'est arrêtée — Retenter",

  'forge.title': 'Ta toupie',
  'forge.paused': 'Le combat est en pause pendant que tu améliores.',
  'forge.level': 'niv. {n}',

  'chest.title': 'Coffres',
  'chest.continue': 'Continuer',
  'chest.open': 'Ouvrir ×{n}',
  'chest.pulls.one': 'Ton tirage',
  'chest.pulls.other': 'Tes {n} tirages',
  'chest.bestRank': 'Meilleur rang obtenu : {rank}. Tout est rangé dans ton inventaire, onglet Forge.',
  'chest.loot.one': 'Butin — {n} coffre',
  'chest.loot.other': 'Butin — {n} coffres',
  'chest.pity.one': '{rank} garanti dans {n} tirage',
  'chest.pity.other': '{rank} garanti dans {n} tirages',
  'chest.bronze.name': 'Coffre Bronze',
  'chest.bronze.blurb': 'Disques et Pointes, du Commun au Rare.',
  'chest.arene.name': "Coffre d'Arène",
  'chest.arene.blurb': 'Les quatre emplacements, du Bon à l’Excellent.',
  'chest.mythique.name': 'Coffre Mythique',
  'chest.mythique.blurb': 'Les quatre emplacements, de l’Excellent à la Légende.',

  'inventory.title': 'Inventaire',
  'inventory.empty': "Rien ici pour l'instant. Ouvre un coffre pour trouver des pièces.",
  'inventory.fuse': 'Fusionner',
  'inventory.recipe.identical': '{n} identiques',
  // Le « + » et ses espaces font partie du message : la traduction en garde le contrôle.
  'inventory.recipe.sacrifice.one': ' + {n} sacrifice',
  'inventory.recipe.sacrifice.other': ' + {n} sacrifices',

  'toupies.title': 'Toupies',
  'toupies.waiting.dead': '{pending} monte sur le ring dès que tu relances la descente.',
  'toupies.waiting.alive': "Tu pilotes {piloted} jusqu'au bout de la descente. {pending} prend le relais à la mort ou au boss vaincu.",
  'toupies.composition.title': 'Chapitre 1 — composition',
  'toupies.composition.body': "Attaque bat Endurance, qui bat Défense, qui bat Attaque : +{dominant} % de dégâts infligés au type battu, subis en retour face au type qui bat. Équilibre ne domine ni n'est dominé : +{equilibre} % de dégâts sur chaque coup, jamais subis en retour.",
  'toupies.salle': 'Salle {n}',
  'toupies.salles': 'Salles {a}-{b}',
  'toupies.gift.title': 'Tu as franchi le mur !',
  'toupies.gift.body': "Choisis ton Fondateur — réclame-le sur l'une des fiches ci-dessous.",
  'toupies.badge.piloted': 'Pilotée',
  'toupies.badge.next': 'Au prochain run',
  'toupies.neutralChassis': 'Profil de châssis neutre — aucun bonus ni malus de stats.',
  'toupies.cancelSwap': 'Annuler le changement',
  'toupies.claim': 'Réclamer',
  'toupies.buy': 'Acheter · {n} 💎',

  // Partagé entre l'Inventaire et l'écran Toupies : le même geste, le même mot.
  'action.equip': 'Équiper',

  'currency.credits': 'crédits',
  'currency.gems': 'gemmes',

  'slot.lame': 'Lame',
  'slot.disque': 'Disque',
  'slot.pointe': 'Pointe',
  'slot.noyau': 'Noyau',

  // Pluriels de l'Inventaire — distincts des `slot.*` singuliers de la Forge.
  'filter.all': 'Tous',
  'filter.lame': 'Lames',
  'filter.disque': 'Disques',
  'filter.pointe': 'Pointes',
  'filter.noyau': 'Noyaux',

  'stat.attack': 'Attaque',
  'stat.defense': 'Défense',
  'stat.maxSpeed': 'Vitesse',
  'stat.spinMax': 'Spin max',

  'axis.attack': 'Attaque',
  'axis.defense': 'Défense',
  'axis.maxSpeed': 'Vitesse max',
  'axis.spinMax': 'Spin max',
  'axis.accel': 'Accélération',
  'axis.mass': 'Masse',
  'axis.spinDecay': 'Décroissance',
  // Le français met une espace devant le signe pourcent, l'anglais non.
  'axis.line': '{label} {sign}{pct} %',

  'type.attaque': 'Attaque',
  'type.endurance': 'Endurance',
  'type.defense': 'Défense',
  'type.equilibre': 'Équilibre',
  'type.bonus.equilibre': 'Équilibre : +{pct} % de dégâts sur chaque coup, jamais subis en retour.',
  'type.bonus.dominant': '+{pct} % de dégâts contre son type dominé, +{pct} % subis face à qui la domine.',

  'rank.commun': 'Commun',
  'rank.bon': 'Bon',
  'rank.rare': 'Rare',
  'rank.excellent': 'Excellent',
  'rank.excellent.1': 'Excellent +1',
  'rank.excellent.2': 'Excellent +2',
  'rank.epique': 'Épique',
  'rank.epique.1': 'Épique +1',
  'rank.epique.2': 'Épique +2',
  'rank.epique.3': 'Épique +3',
  'rank.legende': 'Légende',
  // « Rang infini » : la nomenclature se prolonge au-delà du catalogue.
  'rank.legende.plus': 'Légende +{n}',

  'talent.estoc': 'Estoc',
  'talent.riposte': 'Riposte',
  'talent.percee': 'Percée',
  'talent.ancrage': 'Ancrage',
  'talent.frolement': 'Frôlement',
  'talent.masse': 'Masse',
  'talent.glisse': 'Glisse',
  'talent.relance': 'Relance',
  'talent.toupieFolle': 'Toupie folle',
  'talent.reserve': 'Réserve',
  'talent.secondSouffle': 'Second souffle',
  'talent.coeurGyre': 'Cœur Gyre',

  'toupie.brasier-solaire': 'Brasier Solaire',
  'toupie.typhon-primal': 'Typhon Primal',
  'toupie.carapace-abyssale': 'Carapace Abyssale',
  'toupie.tigre-foudre': 'Tigre Foudre',

  'piece.lame.couronne-solaire': 'Couronne Solaire',
  'piece.lame.croc-de-tempete': 'Croc de Tempête',
  'piece.lame.ecaille-abyssale': 'Écaille Abyssale',
  'piece.lame.griffe-orageuse': 'Griffe Orageuse',
  'piece.noyau.fournaise': 'Fournaise',
  'piece.noyau.oeil-du-cyclone': 'Œil du Cyclone',
  'piece.noyau.caparacon': 'Caparaçon',
  'piece.noyau.arc-electrique': 'Arc Électrique',
  'piece.disque.lourd': 'Lourd',
  'piece.disque.gravite': 'Gravité',
  'piece.disque.eventail': 'Éventail',
  'piece.disque.axial': 'Axial',
  'piece.disque.colosse': 'Colosse',
  'piece.disque.meteorite': 'Météorite',
  'piece.pointe.plate': 'Plate',
  'piece.pointe.aiguille': 'Aiguille',
  'piece.pointe.orbitale': 'Orbitale',
  'piece.pointe.gyroscope': 'Gyroscope',
  'piece.pointe.furie': 'Furie',
  'piece.pointe.ressort': 'Ressort',

  'chapter.1.name': 'Hangar Rouillé',
  'chapter.1.boss': 'Gardien du Hangar',
  'chapter.2.name': 'Dojo Néon',
  'chapter.2.boss': 'Maître des Néons',
  'chapter.3.name': 'Marché Souterrain',
  'chapter.3.boss': 'Doyen des Piliers',
  'chapter.4.name': 'Cratère de Magma',
  'chapter.4.boss': 'Forgeron du Cratère',
  'chapter.5.name': 'Temple sous la Glace',
  'chapter.5.boss': 'Veilleur de Givre',
  'chapter.6.name': 'Jardin Suspendu',
  'chapter.6.boss': 'Sentinelle Suspendue',
  'chapter.7.name': 'Station Orbitale',
  'chapter.7.boss': 'Pilote Orbital',
  'chapter.8.name': 'Le Vortex',
  'chapter.8.boss': 'Cœur du Vortex',
} as const;

/** Défini ici et non dans `index.ts` : `en.ts` a besoin du type et `index.ts`
 *  importe `en` — le faire transiter par l'index créerait un cycle. */
export type MessageKey = keyof typeof fr;
