import type { Language } from '../../../shared/preferences'

export const fr = {
  nav: {
    home: 'Accueil',
    updates: 'Mises à jour',
    shop: 'Boutique',
    accounts: 'Comptes',
    settings: 'Paramètres',
    logs: 'Journaux',
    mods: 'Mods',
    pack: 'Pack',
    system: 'Système'
  },
  topbar: {
    search: 'Rechercher',
    quick: 'Accès rapide',
    playingAs: 'Connecté en tant que'
  },
  integrity: {
    disabled: (count: number): string => `${count} mod${count > 1 ? 's' : ''} non autorisé${count > 1 ? 's' : ''} désactivé${count > 1 ? 's' : ''}.`,
    removed: (count: number): string => `${count} ancien${count > 1 ? 's' : ''} fichier${count > 1 ? 's' : ''} supprimé${count > 1 ? 's' : ''}.`,
    needsRepair: (count: number): string => `${count} fichier${count > 1 ? 's' : ''} à réparer. Le lancement les corrigera.`
  },
  mods: {
    title: 'Mods',
    verified: 'Vérifié',
    missing: 'Manquant',
    corrupt: 'Altéré',
    disabledTitle: 'Mods non autorisés désactivés',
    removedTitle: 'Anciens fichiers supprimés',
    recheck: 'Revérifier',
    summary: (ok: number, total: number): string => `${ok} / ${total} fichiers valides`,
    empty: 'Rien à afficher.',
    notInstalled: "Le jeu n'est pas encore installé.",
    filter: 'Filtrer les mods...',
  },
  window: {
    minimize: 'Réduire',
    maximize: 'Agrandir',
    restore: 'Restaurer',
    close: 'Fermer',
  },
  stage: {
    metadata: 'Recherche de mises à jour...',
    minecraft: 'Téléchargement de Minecraft...',
    java: 'Téléchargement de Java...',
    loader: 'Installation du chargeur de mods...',
    libraries: 'Téléchargement des bibliothèques...',
    assets: 'Téléchargement des ressources...',
    pack: 'Synchronisation des mods...',
    ready: 'Prêt à jouer',
    launching: 'Lancement du jeu...'
  },
  home: {
    updates: 'Mises à jour',
    featured: 'Une de la boutique',
    links: 'Liens',
    noNews: 'Aucune nouveauté pour le moment.',
    noLinks: 'Aucun lien pour le moment.',
    allNews: 'Toutes les mises à jour',
    cached: 'Informations en cache : le serveur de mises à jour est injoignable.',
    running: "Minecraft est en cours d'exécution.",
    welcome: (name: string): string => `Bon retour, ${name}`,
    guest: 'Bienvenue',
    ready: 'Prêt à lancer',
    needsUpdate: 'Mise à jour requise',
    signInHint: 'Connecte-toi pour jouer',
    modpack: 'Modpack',
    version: 'Version',
    loader: 'Chargeur',
    files: 'Fichiers',
    integrity: 'Intégrité',
    verified: 'Vérifié',
    problems: (count: number): string => `${count} à réparer`,
    latestNews: 'Dernières nouvelles',
    account: 'Compte',
    notSignedIn: 'Non connecté',
    packVersion: 'Version du pack',
    releaseDate: 'Date de sortie',
    security: 'Sécurité',
    metadataSigned: 'Métadonnées signées',
    metadataCached: 'Métadonnées signées en cache',
    validUntil: (date: string): string => `Valide jusqu'au ${date}`,
    noShop: 'Aucun article à afficher.',
    readMore: 'Lire la suite',
    shopNow: 'Voir la boutique',
  },
  news: {
    title: 'Actualités',
    featured: 'À la une',
    read: 'Lire l’article',
    close: 'Fermer',
    published: 'Publié le'
  },
  logs: {
    title: 'Journaux',
    empty: 'Aucun journal pour le moment. Lance le jeu une fois pour en créer.',
    filter: 'Filtrer...',
    follow: 'Suivre',
    clear: 'Vider',
    copy: 'Copier',
    copied: 'Journal copié.',
    live: 'En direct',
    lines: (count: number): string => `${count} ligne${count > 1 ? 's' : ''}`,
    groups: {
      launcher: 'Lanceur',
      game: 'Jeu',
      crash: 'Plantages',
      archive: 'Archives'
    },
    levels: {
      error: 'Erreurs',
      warn: 'Alertes',
      info: 'Infos',
      debug: 'Debug'
    },
    search: 'Rechercher dans tous les journaux...',
    results: (count: number): string => `${count} fichier${count > 1 ? 's' : ''} correspondent`,
    noResults: 'Aucun résultat.',
    delete: 'Supprimer',
    confirmDelete: 'Confirmer',
    deleted: 'Journal supprimé.',
    clearedGroup: (count: number): string => `${count} journal${count > 1 ? 'aux' : ''} supprimé${count > 1 ? 's' : ''}.`,
    inUse: 'Utilisé par le jeu en cours.'
  },
  menu: {
    accounts: 'Gérer les comptes',
    verify: 'Vérifier le compte',
    add: 'Ajouter un compte',
    verified: 'Vérifié en ligne'
  },
  palette: {
    placeholder: 'Rechercher une page, un thème, une action...',
    empty: 'Aucun résultat.',
    navigate: 'Navigation',
    actions: 'Actions',
    appearance: 'Apparence'
  },
  action: {
    play: 'Lancer',
    stop: 'Arrêter',
    installing: 'Installation...',
    launching: 'Lancement...',
    signIn: 'Se connecter',
    repair: 'Réparer'
  },
  login: {
    lead: 'Connecte-toi avec ton compte Microsoft pour jouer. La possession de Minecraft Java est vérifiée en ligne à chaque lancement.',
    button: 'Se connecter avec Microsoft',
    offline: "Le mode hors-ligne n'est pas disponible."
  },
  dialog: {
    title: 'Connexion Microsoft',
    lead: "Ton navigateur s'est ouvert sur une page Microsoft. Saisis ce code pour continuer.",
    expires: (minutes: number, seconds: number): string => `Le code expire dans ${minutes}:${String(seconds).padStart(2, '0')}`,
    copy: 'Copier le code',
    open: 'Ouvrir la page',
    cancel: 'Annuler',
    copied: 'Code copié.',
    copyManual: 'Sélectionne le code et copie-le à la main.'
  },
  shop: {
    title: 'Boutique',
    search: 'Rechercher un article...',
    empty: 'La boutique est vide pour le moment.',
    noMatch: 'Aucun article ne correspond.',
    only: 'À la une seulement',
    buy: 'Voir sur la boutique',
    available: 'Disponible',
    unavailable: 'Indisponible',
    category: 'Catégorie',
    tags: 'Tags',
    discount: 'Promotion',
    featured: 'À la une',
  },
  accounts: {
    title: 'Comptes',
    add: 'Ajouter un compte',
    empty: 'Aucun compte pour le moment.',
    active: 'Actif',
    verify: 'Vérifier',
    use: 'Utiliser',
    remove: 'Retirer',
    confirm: 'Confirmer',
    note: "Les comptes sont vérifiés en ligne à chaque lancement. Le mode hors-ligne n'est pas disponible."
  },
  settings: {
    title: 'Paramètres',
    language: 'Langue',
    languageNote: 'La page se recharge pour appliquer la langue.',
    theme: 'Thème',
    themeNote: "Le thème s'applique immédiatement.",
    memory: 'Mémoire',
    memoryLabel: 'Mémoire allouée au jeu',
    memoryNote: (total: string): string => `Ton ordinateur dispose de ${total}. La limite en laisse un quart au système.`,
    maintenance: 'Maintenance',
    maintenanceNote: 'Revérifie chaque fichier du jeu et des mods, et retélécharge ce qui manque ou est abîmé.',
    repair: "Réparer l'installation",
    about: 'À propos',
    aboutNote: (title: string, version: string): string => `${title} ${version}. La connexion passe uniquement par Microsoft et la possession du jeu est vérifiée en ligne à chaque lancement.`,
    appearance: 'Apparence',
    appearanceNote: 'Langue et thème du lanceur.',
    game: 'Jeu',
    gameNote: 'Ressources allouées au jeu.',
    java: 'Arguments Java',
    javaNote: 'Lecture seule. Survole un argument pour comprendre son rôle.',
    javaPending: 'Les arguments complets apparaîtront après la première préparation du jeu.',
    sources: {
      launcher: 'Lanceur',
      minecraft: 'Minecraft',
      loader: 'Chargeur',
      pack: 'Pack'
    },
  },
  themes: {
    system: 'Système',
    cosmos: 'Cosmos',
    obsidian: 'Obsidienne',
    ember: 'Braise',
    ocean: 'Océan',
    forest: 'Forêt',
    light: 'Clair',
    classic: 'Classique'
  },
  boot: {
    loading: 'Chargement...',
    ready: 'Prêt'
  },
  languages: {
    fr: 'Français',
    en: 'English'
  },
  toast: {
    verified: (name: string): string => `${name} est vérifié et possède Minecraft.`,
    repaired: 'Installation vérifiée.',
    signedIn: (name: string): string => `Connecté en tant que ${name}.`,
    signedInPlain: 'Connecté.',
    linkFailed: "Ce lien n'a pas pu être ouvert.",
    gameClosed: (code: number): string => `Le jeu s'est fermé avec le code ${code}. Consulte logs/launcher-stderr.log dans le dossier de l'instance.`
  },
  eggs: {
    achievement: 'Succès débloqué !',
    cosmicTitle: 'Mode cosmique',
    starsTitle: 'Observateur d\'étoiles',
    creeperTitle: 'Ça sentait la poudre',
    herobrineTitle: 'Rien à signaler',
    netherTitle: 'Plus profond',
    magicTitle: 'Le mot magique',
    classicTitle: 'Retour aux sources',
    classicUnlocked: 'Thème Classique débloqué. Tu peux en changer dans les paramètres.',
    hiss: 'Ssssss...',
    credits: (title: string): string => `${title} -- fait avec soin.`,
    blockTitle: 'Inventaire',
    dropsLost: "Les objets t'ont échappé. Le bloc est revenu, réessaie.",
  },
  player: {
    default: 'Skin par défaut',
    hint: 'Glisse pour tourner | clique pour saluer',
    unsupported: 'Aperçu 3D indisponible sur cet appareil.'
  },
  content: {
    imageUnavailable: 'Image indisponible',
    mediaUnavailable: 'Le média n’a pas pu être chargé.'
  },
}

export type Dictionary = typeof fr

export const en: Dictionary = {
  nav: {
    home: 'Home',
    updates: 'Updates',
    shop: 'Shop',
    accounts: 'Accounts',
    settings: 'Settings',
    logs: 'Logs',
    mods: 'Mods',
    pack: 'Pack',
    system: 'System'
  },
  topbar: {
    search: 'Search',
    quick: 'Quick access',
    playingAs: 'Playing as'
  },
  integrity: {
    disabled: (count: number): string => `${count} unauthorized mod${count === 1 ? '' : 's'} disabled.`,
    removed: (count: number): string => `${count} old file${count === 1 ? '' : 's'} removed.`,
    needsRepair: (count: number): string => `${count} file${count === 1 ? '' : 's'} need repair. Launching will fix them.`
  },
  mods: {
    title: 'Mods',
    verified: 'Verified',
    missing: 'Missing',
    corrupt: 'Altered',
    disabledTitle: 'Unauthorized mods disabled',
    removedTitle: 'Old files removed',
    recheck: 'Re-check',
    summary: (ok: number, total: number): string => `${ok} / ${total} files valid`,
    empty: 'Nothing to show.',
    notInstalled: 'The game is not installed yet.',
    filter: 'Filter mods...'
  },
  window: {
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore',
    close: 'Close'
  },
  stage: {
    metadata: 'Checking for updates...',
    minecraft: 'Downloading Minecraft...',
    java: 'Downloading Java...',
    loader: 'Installing the mod loader...',
    libraries: 'Downloading libraries...',
    assets: 'Downloading assets...',
    pack: 'Syncing mods...',
    ready: 'Ready to play',
    launching: 'Starting the game...'
  },
  home: {
    updates: 'Updates',
    featured: 'Shop highlight',
    links: 'Links',
    noNews: 'Nothing new right now.',
    noLinks: 'No links yet.',
    allNews: 'All updates',
    cached: 'Showing cached information: the update server is unreachable.',
    running: 'Minecraft is running.',
    welcome: (name: string): string => `Welcome back, ${name}`,
    guest: 'Welcome',
    ready: 'Ready to launch',
    needsUpdate: 'Update required',
    signInHint: 'Sign in to play',
    modpack: 'Modpack',
    version: 'Version',
    loader: 'Loader',
    files: 'Files',
    integrity: 'Integrity',
    verified: 'Verified',
    problems: (count: number): string => `${count} to repair`,
    latestNews: 'Latest news',
    account: 'Account',
    notSignedIn: 'Not signed in',
    packVersion: 'Pack version',
    releaseDate: 'Release date',
    security: 'Security',
    metadataSigned: 'Signed metadata',
    metadataCached: 'Cached signed metadata',
    validUntil: (date: string): string => `Valid until ${date}`,
    noShop: 'No items to display.',
    readMore: 'Read more',
    shopNow: 'View shop',
  },
  news: {
    title: 'News',
    featured: 'Featured',
    read: 'Read article',
    close: 'Close',
    published: 'Published'
  },
  logs: {
    title: 'Logs',
    empty: 'No logs yet. Launch the game once to create them.',
    filter: 'Filter...',
    follow: 'Follow',
    clear: 'Clear',
    copy: 'Copy',
    copied: 'Log copied.',
    live: 'Live',
    lines: (count: number): string => `${count} line${count === 1 ? '' : 's'}`,
    groups: {
      launcher: 'Launcher',
      game: 'Game',
      crash: 'Crashes',
      archive: 'Archives'
    },
    levels: {
      error: 'Errors',
      warn: 'Warnings',
      info: 'Info',
      debug: 'Debug'
    },
    search: 'Search all logs...',
    results: (count: number): string => `${count} file${count === 1 ? '' : 's'} match`,
    noResults: 'No results.',
    delete: 'Delete',
    confirmDelete: 'Confirm',
    deleted: 'Log deleted.',
    clearedGroup: (count: number): string => `${count} log${count === 1 ? '' : 's'} deleted.`,
    inUse: 'In use by the running game.'
  },
  menu: {
    accounts: 'Manage accounts',
    verify: 'Verify account',
    add: 'Add account',
    verified: 'Verified online'
  },
  palette: {
    placeholder: 'Search a page, theme or action...',
    empty: 'No results.',
    navigate: 'Navigate',
    actions: 'Actions',
    appearance: 'Appearance'
  },
  action: {
    play: 'Play',
    stop: 'Stop',
    installing: 'Installing...',
    launching: 'Launching...',
    signIn: 'Sign in',
    repair: 'Repair'
  },
  login: {
    lead: 'Sign in with your Microsoft account to play. Minecraft Java ownership is verified online on every launch.',
    button: 'Sign in with Microsoft',
    offline: 'Offline mode is not available.'
  },
  dialog: {
    title: 'Microsoft sign-in',
    lead: 'Your browser opened a Microsoft page. Enter this code to continue.',
    expires: (minutes: number, seconds: number): string => `Code expires in ${minutes}:${String(seconds).padStart(2, '0')}`,
    copy: 'Copy code',
    open: 'Open page',
    cancel: 'Cancel',
    copied: 'Code copied.',
    copyManual: 'Select the code and copy it manually.'
  },
  shop: {
    title: 'Shop',
    search: 'Search items...',
    empty: 'The shop is empty for now.',
    noMatch: 'No item matches.',
    only: 'Featured only',
    buy: 'View in shop',
    available: 'Available',
    unavailable: 'Unavailable',
    category: 'Category',
    tags: 'Tags',
    discount: 'Discount',
    featured: 'Featured',
  },
  accounts: {
    title: 'Accounts',
    add: 'Add account',
    empty: 'No account yet.',
    active: 'Active',
    verify: 'Verify',
    use: 'Use',
    remove: 'Remove',
    confirm: 'Confirm',
    note: 'Accounts are verified online on every launch. Offline mode is not available.'
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    languageNote: 'The page reloads to apply the language.',
    theme: 'Theme',
    themeNote: 'The theme applies immediately.',
    memory: 'Memory',
    memoryLabel: 'Memory for the game',
    memoryNote: (total: string): string => `Your computer has ${total}. The limit leaves a quarter free for the system.`,
    maintenance: 'Maintenance',
    maintenanceNote: 'Re-checks every game and mod file and downloads anything missing or damaged.',
    repair: 'Repair installation',
    about: 'About',
    aboutNote: (title: string, version: string): string => `${title} ${version}. Sign-in goes through Microsoft only and ownership is checked online on every launch.`,
    appearance: 'Appearance',
    appearanceNote: 'Launcher language and theme.',
    game: 'Game',
    gameNote: 'Resources given to the game.',
    java: 'Java arguments',
    javaNote: 'Read-only. Hover an argument to understand its role.',
    javaPending: 'The complete arguments appear after the first game preparation.',
    sources: {
      launcher: 'Launcher',
      minecraft: 'Minecraft',
      loader: 'Loader',
      pack: 'Pack'
    },
  },
  themes: {
    system: 'System',
    cosmos: 'Cosmos',
    obsidian: 'Obsidian',
    ember: 'Ember',
    ocean: 'Ocean',
    forest: 'Forest',
    light: 'Light',
    classic: 'Classic'
  },
  boot: {
    loading: 'Loading...',
    ready: 'Ready'
  },
  languages: {
    fr: 'Français',
    en: 'English'
  },
  toast: {
    verified: (name: string): string => `${name} is verified and owns Minecraft.`,
    repaired: 'Installation verified.',
    signedIn: (name: string): string => `Signed in as ${name}.`,
    signedInPlain: 'Signed in.',
    linkFailed: 'That link could not be opened.',
    gameClosed: (code: number): string => `The game closed with code ${code}. Check logs/launcher-stderr.log in the instance folder.`
  },
  eggs: {
    achievement: 'Achievement get!',
    cosmicTitle: 'Cosmic mode',
    starsTitle: 'Stargazer',
    creeperTitle: 'That was close',
    herobrineTitle: 'Nothing to see here',
    netherTitle: 'We need to go deeper',
    magicTitle: 'The magic word',
    classicTitle: 'Back to basics',
    classicUnlocked: 'Classic theme unlocked. Switch it in settings.',
    hiss: 'Ssssss...',
    credits: (title: string): string => `${title} -- built with care.`,
    blockTitle: 'Taking inventory',
    dropsLost: 'The items got away. The block is back, try again.',
  },
  player: {
    default: 'Default skin',
    hint: 'Drag to rotate | click to wave',
    unsupported: '3D preview is unavailable on this device.'
  },
  content: {
    imageUnavailable: 'Image unavailable',
    mediaUnavailable: 'The media could not be loaded.'
  },
}

const DICTIONARIES: Readonly<Record<Language, Dictionary>> = { fr, en }
let currentLanguage: Language = 'fr'

export function setLanguage(language: Language): void {
  currentLanguage = language
  document.documentElement.lang = language
}

export function localeTag(): string {
  return currentLanguage === 'fr' ? 'fr-FR' : 'en-US'
}

export const T: Dictionary = new Proxy({} as Dictionary, {
  get: (_target, key) => DICTIONARIES[currentLanguage][key as keyof Dictionary]
})