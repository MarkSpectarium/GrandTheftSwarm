/**
 * SaveSystem - Handles game persistence
 *
 * Manages saving/loading game state to localStorage,
 * with version migration and data validation.
 */

import { EventBus, SubscriptionManager } from "../core/EventBus";
import { StateManager } from "../state/StateManager";
import type { TimingConfig } from "../config/types";

export interface SaveData {
  version: string;
  timestamp: number;
  data: object;
  checksum: string;
}

export interface SaveSystemConfig {
  saveKey: string;
  autoSaveIntervalMs: number;
  maxBackups: number;
}

export class SaveSystem {
  private stateManager: StateManager;
  private config: SaveSystemConfig;
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;
  private isDirty: boolean = false;

  // Cleanup tracking
  private subscriptions = new SubscriptionManager();
  private beforeUnloadHandler: (() => void) | null = null;
  private visibilityHandler: (() => void) | null = null;

  constructor(
    stateManager: StateManager,
    config: Partial<SaveSystemConfig> = {}
  ) {
    this.stateManager = stateManager;
    this.config = {
      saveKey: "grandtheftswarm_save",
      autoSaveIntervalMs: 30000, // 30 seconds
      maxBackups: 3,
      ...config,
    };

    this.setupEventListeners();
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.stopAutoSave();
    this.subscriptions.dispose();
    this.removeWindowListeners();
  }

  /**
   * Start auto-save timer
   */
  startAutoSave(): void {
    if (this.autoSaveInterval) return;

    this.autoSaveInterval = setInterval(() => {
      if (this.isDirty) {
        this.save();
      }
    }, this.config.autoSaveIntervalMs);
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Save game to localStorage
   */
  save(): boolean {
    try {
      const state = this.stateManager.getSerializableState();
      const saveData: SaveData = {
        version: "1.0.0",
        timestamp: Date.now(),
        data: state,
        checksum: this.generateChecksum(state),
      };

      // Create backup of existing save
      this.rotateBackups();

      // Save to localStorage
      const serialized = JSON.stringify(saveData);
      localStorage.setItem(this.config.saveKey, serialized);

      this.isDirty = false;

      EventBus.emit("game:save", { success: true });
      return true;
    } catch (error) {
      console.error("SaveSystem: Failed to save game:", error);
      EventBus.emit("game:save", { success: false });
      return false;
    }
  }

  /**
   * Load game from localStorage
   */
  load(): boolean {
    try {
      const serialized = localStorage.getItem(this.config.saveKey);
      if (!serialized) {
        console.log("SaveSystem: No save found, starting new game");
        return false;
      }

      const saveData: SaveData = JSON.parse(serialized);

      // Validate checksum
      if (!this.validateChecksum(saveData)) {
        console.warn("SaveSystem: Save data checksum mismatch, attempting recovery");
        return this.loadFromBackup();
      }

      // Migrate if needed
      const migratedData = this.migrateIfNeeded(saveData);

      // Load into state manager
      this.stateManager.loadState(migratedData.data);

      this.isDirty = false;
      return true;
    } catch (error) {
      console.error("SaveSystem: Failed to load game:", error);
      return this.loadFromBackup();
    }
  }

  /**
   * Check if a save exists
   */
  hasSave(): boolean {
    return localStorage.getItem(this.config.saveKey) !== null;
  }

  /**
   * Delete save data
   */
  deleteSave(): void {
    localStorage.removeItem(this.config.saveKey);

    // Also delete backups
    for (let i = 0; i < this.config.maxBackups; i++) {
      localStorage.removeItem(`${this.config.saveKey}_backup_${i}`);
    }
  }

  /**
   * Export save as string (for sharing/backup)
   */
  exportSave(): string {
    const serialized = localStorage.getItem(this.config.saveKey);
    if (!serialized) return "";

    // Base64 encode for safe sharing
    return btoa(serialized);
  }

  /**
   * Import save from string
   */
  importSave(encodedSave: string): boolean {
    try {
      const serialized = atob(encodedSave);
      const saveData: SaveData = JSON.parse(serialized);

      // Validate structure
      if (!saveData.version || !saveData.data || !saveData.timestamp) {
        throw new Error("Invalid save structure");
      }

      // Store and load
      localStorage.setItem(this.config.saveKey, serialized);
      return this.load();
    } catch (error) {
      console.error("SaveSystem: Failed to import save:", error);
      return false;
    }
  }

  /**
   * Get time since last save
   */
  getTimeSinceLastSave(): number {
    try {
      const serialized = localStorage.getItem(this.config.saveKey);
      if (!serialized) return 0;

      const saveData: SaveData = JSON.parse(serialized);
      return Date.now() - saveData.timestamp;
    } catch {
      return 0;
    }
  }

  /**
   * Mark state as dirty (needs saving)
   */
  markDirty(): void {
    this.isDirty = true;
  }

  private rotateBackups(): void {
    // Shift existing backups
    for (let i = this.config.maxBackups - 1; i > 0; i--) {
      const older = localStorage.getItem(`${this.config.saveKey}_backup_${i - 1}`);
      if (older) {
        localStorage.setItem(`${this.config.saveKey}_backup_${i}`, older);
      }
    }

    // Save current as first backup
    const current = localStorage.getItem(this.config.saveKey);
    if (current) {
      localStorage.setItem(`${this.config.saveKey}_backup_0`, current);
    }
  }

  private loadFromBackup(): boolean {
    for (let i = 0; i < this.config.maxBackups; i++) {
      try {
        const backup = localStorage.getItem(`${this.config.saveKey}_backup_${i}`);
        if (!backup) continue;

        const saveData: SaveData = JSON.parse(backup);

        if (this.validateChecksum(saveData)) {
          console.log(`SaveSystem: Recovered from backup ${i}`);
          this.stateManager.loadState(saveData.data);

          // Overwrite corrupted main save
          localStorage.setItem(this.config.saveKey, backup);

          return true;
        }
      } catch {
        continue;
      }
    }

    console.warn("SaveSystem: All backups failed, starting fresh");
    return false;
  }

  private migrateIfNeeded(saveData: SaveData): SaveData {
    const currentVersion = "1.0.0";
    const saveVersion = saveData.version;

    if (saveVersion === currentVersion) {
      return saveData;
    }

    // Add migration logic here as versions change
    // Example:
    // if (saveVersion === "0.9.0") {
    //   saveData.data = this.migrateFrom090To100(saveData.data);
    //   saveData.version = "1.0.0";
    // }

    console.log(`SaveSystem: Migrated save from ${saveVersion} to ${currentVersion}`);
    return saveData;
  }

  private generateChecksum(data: object): string {
    // Simple checksum using string length and character sum
    const str = JSON.stringify(data);
    let sum = 0;
    for (let i = 0; i < str.length; i++) {
      sum += str.charCodeAt(i);
    }
    return `${str.length}:${sum}`;
  }

  private validateChecksum(saveData: SaveData): boolean {
    const expected = this.generateChecksum(saveData.data);
    return saveData.checksum === expected;
  }

  private setupEventListeners(): void {
    // Mark dirty on any state change (tracked for cleanup)
    this.subscriptions.subscribe("resource:changed", () => this.markDirty());
    this.subscriptions.subscribe("building:purchased", () => this.markDirty());
    this.subscriptions.subscribe("upgrade:purchased", () => this.markDirty());
    this.subscriptions.subscribe("era:transition:complete", () => this.markDirty());

    // Save before page unload (tracked for cleanup)
    if (typeof window !== "undefined") {
      this.beforeUnloadHandler = () => {
        if (this.isDirty) {
          this.save();
        }
      };
      window.addEventListener("beforeunload", this.beforeUnloadHandler);

      // Save when tab is hidden (tracked for cleanup)
      this.visibilityHandler = () => {
        if (document.hidden && this.isDirty) {
          this.save();
        }
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);
    }
  }

  private removeWindowListeners(): void {
    if (typeof window !== "undefined") {
      if (this.beforeUnloadHandler) {
        window.removeEventListener("beforeunload", this.beforeUnloadHandler);
        this.beforeUnloadHandler = null;
      }
      if (this.visibilityHandler) {
        document.removeEventListener("visibilitychange", this.visibilityHandler);
        this.visibilityHandler = null;
      }
    }
  }
}
