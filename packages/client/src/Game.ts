/**
 * Game - Main game orchestrator
 *
 * Initializes and connects all game systems.
 * This is the primary entry point for the game logic.
 *
 * Note: UI rendering is handled by React components, not UIRenderer.
 */

import { EventBus, SubscriptionManager } from "./core/EventBus";
import { GameLoop } from "./core/GameLoop";
import { initializeCurveEvaluator } from "./core/CurveEvaluator";
import { MultiplierSystem } from "./core/MultiplierSystem";

import { StateManager } from "./state/StateManager";

import { ResourceSystem } from "./systems/ResourceSystem";
import { BuildingSystem } from "./systems/BuildingSystem";
import { ConsumptionSystem } from "./systems/ConsumptionSystem";
import { UpgradeSystem } from "./systems/UpgradeSystem";
import { SaveSystem } from "./systems/SaveSystem";

import { gameConfig, type GameConfig } from "./config";
import {
  loadConfigOverrides,
  applyConfigOverrides,
} from "./systems/ConfigOverrideSystem";

export interface GameOptions {
  config?: GameConfig;
  autoStart?: boolean;
  /** If true, skip loading config overrides from localStorage */
  skipOverrides?: boolean;
}

export class Game {
  private config: GameConfig;
  private gameLoop: GameLoop;
  private multiplierSystem: MultiplierSystem;
  public readonly stateManager: StateManager;
  public readonly resourceSystem: ResourceSystem;
  public readonly buildingSystem: BuildingSystem;
  public readonly consumptionSystem: ConsumptionSystem;
  public readonly upgradeSystem: UpgradeSystem;
  private saveSystem: SaveSystem;

  private isInitialized: boolean = false;

  // Error tracking for graceful degradation
  private tickErrorCount: number = 0;
  private readonly maxTickErrors: number = 5;

  // Cleanup tracking
  private subscriptions = new SubscriptionManager();

  constructor(options: GameOptions = {}) {
    // Load base config
    let config = options.config ?? gameConfig;

    // Apply config overrides from localStorage (unless skipped)
    if (!options.skipOverrides) {
      const overrides = loadConfigOverrides();
      config = applyConfigOverrides(config, overrides);
      console.log("Game: Applied config overrides from localStorage");
    }

    this.config = config;

    // Initialize core systems
    initializeCurveEvaluator(this.config.curves);
    this.gameLoop = new GameLoop(this.config.timing, this.config.devMode);
    this.multiplierSystem = new MultiplierSystem(this.config.multiplierStacks);

    // Initialize state
    this.stateManager = new StateManager(this.config);

    // Initialize game systems
    this.resourceSystem = new ResourceSystem(
      this.config,
      this.stateManager,
      this.multiplierSystem
    );

    this.buildingSystem = new BuildingSystem(
      this.config,
      this.stateManager,
      this.resourceSystem,
      this.multiplierSystem
    );

    this.consumptionSystem = new ConsumptionSystem(
      this.config,
      this.stateManager,
      this.resourceSystem
    );

    this.upgradeSystem = new UpgradeSystem(
      this.config,
      this.stateManager,
      this.resourceSystem,
      this.multiplierSystem
    );

    this.saveSystem = new SaveSystem(this.stateManager, {
      saveKey: "grandtheftswarm_save",
      autoSaveIntervalMs: this.config.timing.autoSaveIntervalMs,
    });

    // Setup event handlers
    this.setupEventHandlers();

    // Initialize immediately (no DOM needed for React)
    this.initialize();

    // Auto-start if requested
    if (options.autoStart !== false) {
      this.start();
    }
  }

  /**
   * Initialize the game systems
   */
  private initialize(): void {
    if (this.isInitialized) {
      console.warn("Game: Already initialized");
      return;
    }

    // Try to load saved game
    const hasExistingSave = this.saveSystem.load();

    if (hasExistingSave) {
      // Process offline time
      const offlineTime = this.stateManager.getOfflineTime();
      if (offlineTime > 1000) {
        // More than 1 second offline
        this.gameLoop.processOfflineTime(offlineTime);
        this.showOfflineProgress(offlineTime);
      }
    }

    // Initial building and upgrade unlock check
    this.buildingSystem.checkUnlocks();
    this.upgradeSystem.checkUnlocks();

    // Calculate initial production rates
    this.buildingSystem.recalculateAllProduction();

    // Start auto-save
    this.saveSystem.startAutoSave();

    this.isInitialized = true;

    console.log("Game: Initialized successfully");
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (!this.isInitialized) {
      console.warn("Game: Not initialized");
      return;
    }

    this.gameLoop.start();
    console.log("Game: Started");
  }

  /**
   * Pause the game
   */
  pause(): void {
    this.gameLoop.pause();
  }

  /**
   * Resume the game
   */
  resume(): void {
    this.gameLoop.resume();
  }

  /**
   * Stop the game loop (can be resumed)
   */
  stop(): void {
    this.gameLoop.stop();
    this.saveSystem.stopAutoSave();
    this.saveSystem.save();
  }

  /**
   * Completely dispose of all game resources
   * Call this when destroying the game instance
   */
  dispose(): void {
    // Stop game loop
    this.gameLoop.dispose();

    // Dispose all systems
    this.buildingSystem.dispose();
    this.consumptionSystem.dispose();
    this.upgradeSystem.dispose();
    this.saveSystem.dispose();

    // Dispose own subscriptions
    this.subscriptions.dispose();

    // Clear singleton reference
    gameInstance = null;
    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).gameInstance = undefined;
      (window as unknown as Record<string, unknown>).GrandTheftSwarm = undefined;
    }

    this.isInitialized = false;
    console.log("Game: Disposed");
  }

  /**
   * Save the game manually
   */
  save(): boolean {
    return this.saveSystem.save();
  }

  /**
   * Reset the game (delete save and restart)
   */
  reset(): void {
    if (confirm("Are you sure you want to reset? All progress will be lost!")) {
      this.saveSystem.deleteSave();
      this.stateManager.reset();
      this.upgradeSystem.resetForPrestige();
      this.buildingSystem.checkUnlocks();
      this.upgradeSystem.checkUnlocks();
      this.buildingSystem.recalculateAllProduction();
    }
  }

  /**
   * Export save data
   */
  exportSave(): string {
    return this.saveSystem.exportSave();
  }

  /**
   * Import save data
   */
  importSave(data: string): boolean {
    const success = this.saveSystem.importSave(data);
    if (success) {
      this.buildingSystem.checkUnlocks();
      this.upgradeSystem.checkUnlocks();
      this.buildingSystem.recalculateAllProduction();
    }
    return success;
  }

  /**
   * Sync local save to cloud (requires auth)
   */
  async syncToCloud(): Promise<boolean> {
    return this.saveSystem.syncToCloud();
  }

  /**
   * Load save from cloud (requires auth)
   */
  async loadFromCloud(): Promise<boolean> {
    const success = await this.saveSystem.loadFromCloud();
    if (success) {
      this.buildingSystem.checkUnlocks();
      this.upgradeSystem.checkUnlocks();
      this.buildingSystem.recalculateAllProduction();
    }
    return success;
  }

  /**
   * Force upload local save to cloud, overwriting cloud save
   */
  async forceUploadToCloud(): Promise<boolean> {
    return this.saveSystem.forceUploadToCloud();
  }

  /**
   * Force load cloud save, overwriting local save
   */
  forceLoadFromCloud(cloudSave: import('shared').CloudSaveData): boolean {
    const success = this.saveSystem.forceLoadFromCloud(cloudSave);
    if (success) {
      this.buildingSystem.checkUnlocks();
      this.upgradeSystem.checkUnlocks();
      this.buildingSystem.recalculateAllProduction();
    }
    return success;
  }

  /**
   * Purchase a building (exposed for UI)
   */
  purchaseBuilding(buildingId: string, count: number = 1): boolean {
    return this.buildingSystem.purchase(buildingId, count);
  }

  /**
   * Purchase an upgrade (exposed for UI)
   */
  purchaseUpgrade(upgradeId: string): boolean {
    const success = this.upgradeSystem.purchase(upgradeId);
    if (success) {
      // Recalculate production after upgrade (multipliers may have changed)
      this.buildingSystem.recalculateAllProduction();
    }
    return success;
  }

  /**
   * Get game state (for debugging)
   */
  getState() {
    return this.stateManager.getState();
  }

  /**
   * Get config (for debugging)
   */
  getConfig() {
    return this.config;
  }

  private setupEventHandlers(): void {
    // Handle game tick with error boundary (tracked for cleanup)
    this.subscriptions.subscribe("game:tick", ({ deltaMs }) => {
      this.safeTickProcess(deltaMs);
    });

    // Handle resource changes for multiplier context (tracked for cleanup)
    this.subscriptions.subscribe("resource:changed", () => {
      this.updateMultiplierContext();
    });

    // Handle building purchase for multiplier context (tracked for cleanup)
    this.subscriptions.subscribe("building:purchased", () => {
      this.updateMultiplierContext();
    });
  }

  /**
   * Process a tick with error handling to prevent game loop crashes
   */
  private safeTickProcess(deltaMs: number): void {
    try {
      // Update play time
      this.stateManager.updatePlayTime(deltaMs);

      // Process building production
      this.buildingSystem.processTick(deltaMs);

      // Process consumption (must be after production so resources can be used)
      this.consumptionSystem.processTick(deltaMs);

      // Process expired multipliers
      this.multiplierSystem.processExpiredMultipliers(Date.now());

      // Update multiplier context
      this.updateMultiplierContext();

      // Reset error count on successful tick
      if (this.tickErrorCount > 0) {
        this.tickErrorCount = 0;
      }
    } catch (error) {
      this.handleTickError(error);
    }
  }

  /**
   * Handle errors during tick processing with graceful degradation
   */
  private handleTickError(error: unknown): void {
    this.tickErrorCount++;

    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("Game: Error during tick processing:", error);
    if (errorStack) {
      console.error("Stack trace:", errorStack);
    }

    // If too many consecutive errors, pause the game to prevent further damage
    if (this.tickErrorCount >= this.maxTickErrors) {
      console.error(
        `Game: ${this.maxTickErrors} consecutive tick errors detected. ` +
        "Pausing game to prevent data corruption."
      );

      this.gameLoop.pause();

      EventBus.emit("ui:notification", {
        message: "Game paused due to repeated errors. Your progress has been saved.",
        type: "error",
      });

      // Attempt emergency save
      try {
        this.saveSystem.save();
        console.log("Game: Emergency save completed successfully");
      } catch (saveError) {
        console.error("Game: Emergency save failed:", saveError);
      }
    }
  }

  private updateMultiplierContext(): void {
    const state = this.stateManager.getState();

    const resources: Record<string, number> = {};
    for (const [id, res] of Object.entries(state.resources)) {
      resources[id] = res.current;
    }

    const buildings: Record<string, number> = {};
    for (const [id, bld] of Object.entries(state.buildings)) {
      buildings[id] = bld.owned;
    }

    const upgrades = new Set<string>();
    for (const [id, upg] of Object.entries(state.upgrades)) {
      if (upg.purchased) {
        upgrades.add(id);
      }
    }

    this.multiplierSystem.updateConditionContext({
      resources,
      buildings,
      upgrades,
      era: state.currentEra,
      prestigeLevel: state.prestige.prestigeCount,
      currentHour: new Date().getHours(),
    });
  }

  private showOfflineProgress(offlineMs: number): void {
    const seconds = Math.floor(offlineMs / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    let timeStr = "";
    if (hours > 0) {
      timeStr = `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      timeStr = `${minutes} minutes`;
    } else {
      timeStr = `${seconds} seconds`;
    }

    EventBus.emit("ui:notification", {
      message: `Welcome back! You were away for ${timeStr}. Your workers kept harvesting!`,
      type: "info",
    });

    console.log(`Game: Processed ${timeStr} of offline progress`);
  }
}

// Export singleton factory
let gameInstance: Game | null = null;

export function createGame(options: GameOptions = {}): Game {
  if (gameInstance) {
    console.warn("Game: Instance already exists, returning existing");
    return gameInstance;
  }
  gameInstance = new Game(options);
  return gameInstance;
}

export function getGame(): Game | null {
  return gameInstance;
}
