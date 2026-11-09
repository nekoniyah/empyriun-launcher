import type { Language } from './preferences'

export type FlagCategory = 'memory' | 'gc' | 'jit' | 'security' | 'modules' | 'system' | 'minecraft' | 'loader' | 'debug'
export type FlagSource = 'launcher' | 'minecraft' | 'loader' | 'pack'

export interface JvmArgument { readonly value: string, readonly source: FlagSource }
export interface FlagInfo { readonly category: FlagCategory, readonly title: string, readonly body: string, readonly detail: string | null, readonly known: boolean }

export const CATEGORY_LABELS: Readonly<Record<FlagCategory, Readonly<Record<Language, string>>>> = {
  memory: { fr: 'Mémoire', en: 'Memory' },
  gc: { fr: 'Ramasse-miettes', en: 'Garbage collector' },
  jit: { fr: 'Compilation JIT', en: 'JIT compiler' },
  security: { fr: 'Sécurité', en: 'Security' },
  modules: { fr: 'Modules Java', en: 'Java modules' },
  system: { fr: 'Système Java', en: 'Java system' },
  minecraft: { fr: 'Minecraft', en: 'Minecraft' },
  loader: { fr: 'Chargeur de mods', en: 'Mod loader' },
  debug: { fr: 'Débogage et journaux', en: 'Debugging and logs' }
}

type Row = readonly [RegExp, FlagCategory, string, string, string]

const ROWS: readonly Row[] = [
  [/^-Xms/, 'memory', 'Initial heap (-Xms)', 'Mémoire réservée dès le démarrage. Le lanceur la plafonne à 2 Go pour démarrer vite; Java l’agrandit ensuite jusqu’à la limite maximale.', 'Memory reserved at startup. The launcher caps it at 2 GB for a fast start; Java grows it later up to the maximum.'],
  [/^-Xmx/, 'memory', 'Maximum heap (-Xmx)', 'Plafond de mémoire du jeu, réglé par le curseur de mémoire. Trop bas: lags et erreurs "OutOfMemory". Trop haut: pauses plus longues et moins de RAM pour le système.', 'Memory ceiling for the game, set by the memory slider. Too low: lag and "OutOfMemory" errors. Too high: longer pauses and less RAM for your system.'],
  [/^-Xss/, 'memory', 'Thread stack size', 'Taille de la pile de chaque thread. Une valeur plus grande évite les "StackOverflow" dans certains mods, au prix d’un peu de mémoire par thread.', 'Stack size for each thread. A larger value avoids "StackOverflow" in some mods at the cost of a little memory per thread.'],
  [/^-XX:MaxMetaspaceSize=/, 'memory', 'Metaspace limit', 'Limite la mémoire des définitions de classes. Les gros modpacks chargent beaucoup de classes.', 'Caps the memory used for class definitions. Large modpacks load many classes.'],
  [/^-XX:(?:Initial|Max|Min)RAMPercentage=/, 'memory', 'Heap as RAM percentage', 'Définit la mémoire en pourcentage de la RAM. Le lanceur utilise plutôt des valeurs fixes (-Xms/-Xmx).', 'Sets the heap as a percentage of RAM. The launcher normally uses fixed values (-Xms/-Xmx) instead.'],
  [/^-XX:ReservedCodeCacheSize=/, 'jit', 'JIT code cache size', 'Espace pour le code compilé à la volée. Les gros modpacks peuvent remplir la valeur par défaut, ce qui ralentit le jeu.', 'Space for just-in-time compiled code. Large modpacks can fill the default, which slows the game.'],
  [/^-XX:TieredStopAtLevel=/, 'jit', 'Limit JIT tiers', 'Limite la compilation à un niveau plus simple: démarrage plus rapide, mais performances maximales plus faibles.', 'Limits compilation to a simpler tier: faster startup but lower peak performance.'],
  [/^-XX:\+UseG1GC$/, 'gc', 'G1 garbage collector', 'Ramasse-miettes équilibré, adapté à Minecraft: pauses courtes et prévisibles.', 'Balanced garbage collector that suits Minecraft: short, predictable pauses.'],
  [/^-XX:\+UseZGC$/, 'gc', 'ZGC garbage collector', 'Ramasse-miettes à très faible latence, qui travaille presque tout en parallèle du jeu. Demande plus de mémoire.', 'Very low-latency collector that works mostly alongside the game. Needs more memory.'],
  [/^-XX:\+ZGenerational$/, 'gc', 'Generational ZGC', 'Active le ZGC générationnel (Java 21): sépare les objets jeunes et anciens pour moins de travail.', 'Enables generational ZGC (Java 21): separates young and old objects for less work.'],
  [/^-XX:\+UseShenandoahGC$/, 'gc', 'Shenandoah collector', 'Ramasse-miettes à faible pause qui compacte la mémoire en parallèle. Non disponible dans toutes les distributions de Java.', 'Low-pause collector that compacts memory concurrently. Not available in every Java distribution.'],
  [/^-XX:\+Use(?:Parallel|Serial)GC$/, 'gc', 'Parallel/Serial collector', 'Ramasse-miettes plus simple: bon débit, mais pauses plus longues que G1.', 'Simpler collector: good throughput but longer pauses than G1.'],
  [/^-XX:MaxGCPauseMillis=/, 'gc', 'Pause time goal', 'Objectif de durée maximale d’une pause du ramasse-miettes G1, en millisecondes. C’est un objectif, pas une garantie.', 'Target maximum pause for the G1 collector, in milliseconds. A goal, not a guarantee.'],
  [/^-XX:G1NewSizePercent=/, 'gc', 'G1 minimum young size', 'Part minimale du tas réservée aux objets jeunes. Minecraft crée énormément d’objets éphémères.', 'Minimum share of the heap for young objects. Minecraft creates huge numbers of short-lived objects.'],
  [/^-XX:G1MaxNewSizePercent=/, 'gc', 'G1 maximum young size', 'Part maximale du tas pour les objets jeunes.', 'Maximum share of the heap for young objects.'],
  [/^-XX:G1HeapRegionSize=/, 'gc', 'G1 region size', 'Taille des régions du tas G1. Des régions plus grandes aident quand le jeu alloue de gros blocs.', 'Size of G1 heap regions. Larger regions help when the game allocates big blocks.'],
  [/^-XX:G1ReservePercent=/, 'gc', 'G1 reserve', 'Part du tas gardée libre comme marge pour éviter les échecs d’évacuation.', 'Share of the heap kept free as a safety margin to avoid evacuation failures.'],
  [/^-XX:InitiatingHeapOccupancyPercent=/, 'gc', 'Concurrent marking threshold', 'Taux d’occupation du tas à partir duquel G1 commence son marquage en arrière-plan.', 'Heap occupancy at which G1 starts its background marking.'],
  [/^-XX:G1MixedGCCountTarget=/, 'gc', 'Mixed collection count', 'Nombre de collectes mixtes après un marquage pour récupérer les anciennes régions.', 'Number of mixed collections after marking used to reclaim old regions.'],
  [/^-XX:G1MixedGCLiveThresholdPercent=/, 'gc', 'Mixed collection threshold', 'Les anciennes régions contenant moins de données vivantes que ce seuil sont incluses dans les collectes mixtes.', 'Old regions with less live data than this threshold are included in mixed collections.'],
  [/^-XX:G1HeapWastePercent=/, 'gc', 'Tolerated heap waste', 'Part de mémoire gaspillée tolérée avant d’arrêter les collectes mixtes.', 'Wasted memory tolerated before mixed collections stop.'],
  [/^-XX:G1RSetUpdatingPauseTimePercent=/, 'gc', 'Remembered set time', 'Part du temps de pause consacrée à la mise à jour des ensembles mémorisés de G1.', 'Share of pause time spent updating G1’s remembered sets.'],
  [/^-XX:G1(?:SATBBufferEnqueueingThresholdPercent|ConcRSHotCardLimit|ConcRefinementServiceIntervalMillis|ConcMarkStepDurationMillis)=/, 'gc', 'G1 concurrent tuning', 'Réglage fin du travail en arrière-plan de G1. Fait partie des réglages populaires pour limiter les micro-saccades.', 'Fine-tuning of G1’s background work. Part of popular tunings that reduce micro-stutter.'],
  [/^-XX:SurvivorRatio=/, 'gc', 'Survivor ratio', 'Rapport entre l’espace des nouveaux objets et celui des survivants.', 'Ratio between the space for new objects and survivor space.'],
  [/^-XX:MaxTenuringThreshold=/, 'gc', 'Promotion age', 'Nombre de collectes qu’un objet doit survivre avant de passer dans la zone des objets anciens.', 'How many collections an object must survive before moving to the old generation.'],
  [/^-XX:(?:Parallel|Conc)GCThreads=/, 'gc', 'GC thread count', 'Nombre de threads utilisés par le ramasse-miettes.', 'Number of threads the garbage collector uses.'],
  [/^-XX:\+ParallelRefProcEnabled$/, 'gc', 'Parallel reference processing', 'Traite les références (caches, finalisation) sur plusieurs threads pendant le ramasse-miettes.', 'Processes references (caches, finalizers) on several threads during garbage collection.'],
  [/^-XX:\+DisableExplicitGC$/, 'gc', 'Ignore System.gc()', 'Ignore les demandes manuelles de ramasse-miettes que certains mods déclenchent, source de longues pauses.', 'Ignores manual garbage-collection requests that some mods trigger, a source of long pauses.'],
  [/^-XX:\+AlwaysPreTouch$/, 'memory', 'Pre-touch heap', 'Touche toute la mémoire du tas au démarrage: démarrage plus long, mais jeu plus fluide ensuite. Utilise immédiatement toute la RAM allouée.', 'Touches all heap memory at startup: slower start, smoother play afterwards. Uses all allocated RAM immediately.'],
  [/^-XX:\+PerfDisableSharedMem$/, 'system', 'Disable perf shared memory', 'Empêche Java d’écrire ses statistiques dans un fichier partagé, ce qui évite certains blocages disque.', 'Stops Java writing its statistics to a shared file, avoiding some disk stalls.'],
  [/^-XX:\+Unlock(?:Experimental|Diagnostic)VMOptions$/, 'system', 'Unlock advanced flags', 'Nécessaire avant d’utiliser certaines options avancées; ne change rien à lui seul.', 'Required before some advanced options can be used; changes nothing on its own.'],
  [/^-XX:\+UseStringDeduplication$/, 'gc', 'String deduplication', 'Fusionne les chaînes identiques en mémoire pour économiser de la RAM (avec G1).', 'Merges identical strings in memory to save RAM (with G1).'],
  [/^-XX:\+Use(?:TransparentHugePages|LargePages)$/, 'memory', 'Huge pages', 'Utilise de grandes pages mémoire quand le système le permet, pour moins de surcoût de gestion.', 'Uses large memory pages when the system allows, for less management overhead.'],
  [/^-XX:-OmitStackTraceInFastThrow$/, 'debug', 'Keep stack traces', 'Garde les traces d’erreur complètes même pour les exceptions répétées, utile pour diagnostiquer.', 'Keeps full stack traces even for repeated exceptions, useful for diagnosis.'],
  [/^-XX:\+(?:HeapDumpOnOutOfMemoryError|ExitOnOutOfMemoryError)$/, 'debug', 'Out-of-memory handling', 'Réagit à une panne de mémoire: écriture d’un fichier de diagnostic volumineux, ou arrêt immédiat du jeu.', 'Reacts to running out of memory: writes a large diagnostic file or stops the game immediately.'],
  [/^-XX:HeapDumpPath=MojangTricks/, 'minecraft', 'Intel graphics profile trick', 'Astuce de Mojang: ce nom de fichier fait appliquer aux pilotes graphiques Intel un profil de performance pour Minecraft.', 'Mojang trick: this file name makes Intel graphics drivers apply a performance profile for Minecraft.'],
  [/^-XX:HeapDumpPath=/, 'debug', 'Heap dump location', 'Dossier où écrire le fichier de diagnostic mémoire.', 'Where the memory diagnostic file is written.'],
  [/^-Djava\.library\.path=/, 'minecraft', 'Native library folder', 'Dossier des bibliothèques natives (graphismes, audio) extraites pour cette version.', 'Folder of native libraries (graphics, audio) extracted for this version.'],
  [/^-D(?:jna\.tmpdir|org\.lwjgl\.system\.SharedLibraryExtractPath|io\.netty\.native\.workdir)=/, 'minecraft', 'Native extraction folder', 'Dossier de travail où les bibliothèques natives sont décompressées.', 'Working folder where native libraries are unpacked.'],
  [/^-Dminecraft\.launcher\.(?:brand|version)=/, 'minecraft', 'Launcher identity', 'Indique à Minecraft quel lanceur l’a démarré et sa version.', 'Tells Minecraft which launcher started it and its version.'],
  [/^-D(?:os\.name|os\.version)=/, 'minecraft', 'OS compatibility', 'Règle de compatibilité de Mojang pour certaines versions de Windows.', 'Mojang compatibility rule for certain Windows versions.'],
  [/^-(?:cp|classpath|--class-path)\s/, 'minecraft', 'Class path', 'Liste des bibliothèques et du jeu chargés par Java.', 'The libraries and game jars loaded by Java.'],
  [/^-Dlog4j\.configurationFile=/, 'minecraft', 'Log configuration', 'Fichier qui décrit le format et la destination des journaux du jeu.', 'File describing the format and destination of the game’s logs.'],
  [/^-Dlog4j2\.formatMsgNoLookups=true$/, 'security', 'Log4Shell protection', 'Désactive les recherches dynamiques dans les messages de journal, protection contre la faille Log4Shell.', 'Disables dynamic lookups in log messages, a protection against the Log4Shell vulnerability.'],
  [/^-Dcom\.sun\.jndi\.(?:rmi|ldap)\.object\.trustURLCodebase=false$/, 'security', 'Remote code protection', 'Interdit à Java de charger du code depuis une adresse distante via JNDI.', 'Stops Java loading code from a remote address through JNDI.'],
  [/^-D(?:file|stdout|stderr|sun\.stdout|sun\.stderr)\.encoding=/, 'system', 'Text encoding', 'Force l’encodage des textes (UTF-8) pour les fichiers et les journaux, afin d’éviter les caractères cassés.', 'Forces text encoding (UTF-8) for files and logs to avoid broken characters.'],
  [/^-Djava\.net\.prefer(?:IPv4Stack=true|IPv6Addresses=)/, 'system', 'Network preference', 'Choisit comment Java préfère les adresses IPv4 et IPv6 pour les connexions.', 'Chooses how Java prefers IPv4 and IPv6 addresses for connections.'],
  [/^-Djava\.io\.tmpdir=/, 'system', 'Temp folder', 'Dossier temporaire utilisé par Java.', 'Temporary folder used by Java.'],
  [/^-Dsun\.java2d\./, 'system', 'Java 2D rendering', 'Réglage du rendu 2D de Java (fenêtres et interface de démarrage).', 'Java 2D rendering setting (windows and the early loading screen).'],
  [/^-DignoreList=/, 'loader', 'Bootstrap ignore list', 'Liste de noms de jars que le démarrage du chargeur ignore dans le classpath, pour éviter les doublons.', 'Jar names the loader’s bootstrap ignores on the classpath to avoid duplicates.'],
  [/^-DmergeModules=/, 'loader', 'Merged modules', 'Jars fusionnés en un seul module Java par le chargeur.', 'Jars merged into a single Java module by the loader.'],
  [/^-DlibraryDirectory=/, 'loader', 'Library folder', 'Dossier des bibliothèques utilisé par le démarrage du chargeur.', 'Library folder used by the loader’s bootstrap.'],
  [/^-D(?:fml|forge|neoforge|fabric|loader)\./, 'loader', 'Loader setting', 'Réglage interne du chargeur de mods (Forge, NeoForge ou Fabric).', 'Internal setting of the mod loader (Forge, NeoForge or Fabric).'],
  [/^(?:-p|--module-path)\s/, 'modules', 'Module path', 'Liste des modules Java du chargeur. NeoForge et Forge fonctionnent avec le système de modules.', 'List of the loader’s Java modules. NeoForge and Forge run on the module system.'],
  [/^--add-modules\s/, 'modules', 'Add modules', 'Ajoute des modules au démarrage. ALL-MODULE-PATH charge tous ceux du chemin de modules.', 'Adds modules at startup. ALL-MODULE-PATH loads every module on the module path.'],
  [/^--add-opens\s/, 'modules', 'Open package', 'Autorise des modules à accéder en profondeur à une partie interne de Java, nécessaire à la gestion des jars des mods.', 'Lets modules reach deep into an internal part of Java, needed for handling mod jars.'],
  [/^--add-(?:exports|reads)\s/, 'modules', 'Module access', 'Rend visible une partie interne de Java ou lit un autre module, nécessaire au chargeur.', 'Makes an internal part of Java visible or lets a module read another, needed by the loader.'],
  [/^--enable-native-access/, 'modules', 'Native access', 'Autorise des modules à appeler du code natif sans avertissement.', 'Allows modules to call native code without a warning.'],
  [/^-(?:verbose:gc|Xlog:)/, 'debug', 'Garbage collection log', 'Écrit des informations détaillées sur le ramasse-miettes dans les journaux.', 'Writes detailed garbage-collection information to the logs.'],
  [/^-(?:agentlib:jdwp|Xdebug|Xrunjdwp)/, 'debug', 'Remote debugger', 'Ouvre le jeu à un débogueur externe. À éviter hors développement.', 'Opens the game to an external debugger. Avoid outside development.'],
  [/^-Dcom\.sun\.management\.jmxremote/, 'debug', 'Remote monitoring', 'Ouvre une interface de supervision à distance de Java. Risque de sécurité si elle est exposée.', 'Opens a remote monitoring interface for Java. A security risk if exposed.'],
  [/^-(?:ea|enableassertions|da|disableassertions)$/, 'debug', 'Assertions', 'Active ou désactive les vérifications internes des développeurs.', 'Turns developers’ internal checks on or off.'],
  [/^-javaagent:/, 'debug', 'Java agent', 'Charge un programme qui modifie le jeu pendant son exécution. Le lanceur refuse cette option dans le pack.', 'Loads a program that modifies the game while it runs. The launcher refuses this option in the pack.']
]

const FALLBACKS: readonly Row[] = [
  [/^-XX:[+-]/, 'jit', 'Advanced JVM flag', 'Option avancée de la machine virtuelle Java (activation ou désactivation d’un comportement interne).', 'Advanced Java virtual machine option (turns an internal behaviour on or off).'],
  [/^-XX:/, 'jit', 'Advanced JVM setting', 'Réglage avancé de la machine virtuelle Java avec une valeur.', 'Advanced Java virtual machine setting with a value.'],
  [/^-D/, 'system', 'Java system property', 'Propriété lue par Java, le jeu ou un mod pour adapter son comportement.', 'A property read by Java, the game or a mod to adapt its behaviour.'],
  [/^-X/, 'system', 'Non-standard JVM option', 'Option non standard de la machine virtuelle Java.', 'Non-standard Java virtual machine option.'],
  [/^--/, 'modules', 'Java launcher option', 'Option du lanceur Java (souvent liée aux modules).', 'Java launcher option (often related to modules).']
]

const PAIRED = new Set(['-p', '--module-path', '--add-opens', '--add-exports', '--add-modules', '--add-reads', '-cp', '-classpath', '--class-path', '--enable-native-access', '--patch-module', '--limit-modules'])

export function groupArguments(items: readonly JvmArgument[]): JvmArgument[] {
  const result: JvmArgument[] = []
  if (!items || items === undefined || items?.length === 0) return result
  for (let index = 0; index < (items?.length ?? 0); index += 1) {
    const item = items[index]!
    const next = items[index + 1]
    if (PAIRED.has(item.value) && next && !next.value.startsWith('-')) {
      result.push({ value: `${item.value} ${next.value}`, source: item.source })
      index += 1
    } else {
      result.push(item)
    }
  }
  return result
}

function detailOf(value: string): string | null {
  if (/^-Xm[sx]|^-Xss/.test(value)) return value.slice(4)
  const space = value.indexOf(' ')
  if (value.startsWith('-') && space > 0) return value.slice(space + 1)
  const equals = value.indexOf('=')
  return equals > 0 ? value.slice(equals + 1): null
}

export function describeFlag(value: string, language: Language): FlagInfo {
  const index = language === 'fr' ? 3: 4
  for (const row of ROWS) if (row[0].test(value)) return { category: row[1], title: row[2], body: row[index] as string, detail: detailOf(value), known: true }
  for (const row of FALLBACKS) if (row[0].test(value)) return { category: row[1], title: row[2], body: row[index] as string, detail: detailOf(value), known: false }
  return { category: 'system', title: 'Unknown option', body: language === 'fr' ? 'Option non reconnue par le dictionnaire du lanceur.': 'Option not recognised by the launcher’s dictionary.', detail: null, known: false }
}