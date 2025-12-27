/**
 * GameState - Central game state structure
 *
 * Defines the complete saveable state of the game.
 * All persistent data lives here.
 */

export interface ResourceState {
  /** Current amount */
  current: number;
  /** Lifetime total earned */
  lifetime: number;
  /** Maximum capacity (if limited) */
  maxCapacity: number | null;
  /** Is this resource unlocked/visible */
  unlocked: boolean;
}

export interface BuildingState {
  /** Number owned */
  owned: number;
  /** Total ever purchased */
  totalPurchased: number;
  /** Is this building unlocked */
  unlocked: boolean;
  /** Current production rate (calculated) */
  productionRate: number;
  /** Last production tick */
  lastProductionTime: number;
}

export interface UpgradeState {
  /** Is this upgrade purchased */
  purchased: boolean;
  /** Current tier (for tiered upgrades) */
  tier: number;
  /** Purchase count (for repeatable upgrades) */
  purchaseCount: number;
}

export interface EventState {
  /** Is this event currently active */
  active: boolean;
  /** When the event started */
  startedAt: number;
  /** When the event expires */
  expiresAt: number;
  /** Has this event been clicked (if clickable) */
  clicked: boolean;
  /** Current stack count */
  stacks: number;
  /** Last time this event triggered (for cooldown) */
  lastTriggered: number;
}

export interface PrestigeState {
  /** Total prestige currency earned */
  totalEarned: number;
  /** Currently held prestige currency */
  current: number;
  /** Number of times prestiged */
  prestigeCount: number;
  /** Purchased prestige shop items */
  shopPurchases: Record<string, number>;
}

export interface StatisticsState {
  /** Total time played (ms) */
  totalPlayTimeMs: number;
  /** Total clicks */
  totalClicks: number;
  /** Total resources harvested via clicking */
  totalClickHarvested: number;
  /** Total buildings purchased */
  totalBuildingsPurchased: number;
  /** Total upgrades purchased */
  totalUpgradesPurchased: number;
  /** Total events triggered */
  totalEventsTriggered: number;
  /** Fastest era completion times */
  fastestEraTimes: Record<number, number>;
  /** Session start time */
  sessionStartTime: number;
  /** Last save time */
  lastSaveTime: number;
}

export interface SettingsState {
  /** Master volume (0-1) */
  masterVolume: number;
  /** Music volume (0-1) */
  musicVolume: number;
  /** SFX volume (0-1) */
  sfxVolume: number;
  /** Enable notifications */
  notifications: boolean;
  /** Number format preference */
  numberFormat: "standard" | "scientific" | "vietnamese";
  /** Auto-save enabled */
  autoSave: boolean;
  /** Confirm before prestige */
  confirmPrestige: boolean;
  /** Show production rates */
  showProductionRates: boolean;
  /** Theme preference */
  theme: "auto" | "light" | "dark";
}

export interface GameState {
  /** Save file version for migration */
  version: string;

  /** Current era */
  currentEra: number;

  /** All resource states */
  resources: Record<string, ResourceState>;

  /** All building states */
  buildings: Record<string, BuildingState>;

  /** All upgrade states */
  upgrades: Record<string, UpgradeState>;

  /** Active event states */
  events: Record<string, EventState>;

  /** Prestige state */
  prestige: PrestigeState;

  /** Game statistics */
  statistics: StatisticsState;

  /** Player settings */
  settings: SettingsState;

  /** Unlocked features */
  unlockedFeatures: Set<string>;

  /** Earned achievements */
  achievements: Set<string>;

  /** Last played timestamp (for offline calculation) */
  lastPlayedAt: number;

  /** Is this a fresh game or loaded */
  isNewGame: boolean;
}

/**
 * Create initial game state from config
 */
export function createInitialGameState(): GameState {
  return {
    version: "1.0.0",
    currentEra: 1,
    resources: {},
    buildings: {},
    upgrades: {},
    events: {},
    prestige: {
      totalEarned: 0,
      current: 0,
      prestigeCount: 0,
      shopPurchases: {},
    },
    statistics: {
      totalPlayTimeMs: 0,
      totalClicks: 0,
      totalClickHarvested: 0,
      totalBuildingsPurchased: 0,
      totalUpgradesPurchased: 0,
      totalEventsTriggered: 0,
      fastestEraTimes: {},
      sessionStartTime: Date.now(),
      lastSaveTime: Date.now(),
    },
    settings: {
      masterVolume: 1,
      musicVolume: 0.5,
      sfxVolume: 0.7,
      notifications: true,
      numberFormat: "standard",
      autoSave: true,
      confirmPrestige: true,
      showProductionRates: true,
      theme: "auto",
    },
    unlockedFeatures: new Set(["manual_harvest", "basic_buildings"]),
    achievements: new Set(),
    lastPlayedAt: Date.now(),
    isNewGame: true,
  };
}

/**
 * Create initial resource state
 */
export function createResourceState(
  initialAmount: number = 0,
  maxCapacity: number | null = null,
  unlocked: boolean = true
): ResourceState {
  return {
    current: initialAmount,
    lifetime: initialAmount,
    maxCapacity,
    unlocked,
  };
}

/**
 * Create initial building state
 */
export function createBuildingState(unlocked: boolean = false): BuildingState {
  return {
    owned: 0,
    totalPurchased: 0,
    unlocked,
    productionRate: 0,
    lastProductionTime: Date.now(),
  };
}

/**
 * Create initial upgrade state
 */
export function createUpgradeState(): UpgradeState {
  return {
    purchased: false,
    tier: 0,
    purchaseCount: 0,
  };
}
