/**
 * SaveSystem - Handles game persistence
 *
 * Manages saving/loading game state to localStorage and cloud sync.
 */

import { EventBus, SubscriptionManager } from "../core/EventBus";
import { StateManager } from "../state/StateManager";
import { api } from "../api/client";
import type {
  CloudSaveData,
  SyncResponse,
  SaveData as SharedSaveData,
  SerializableGameState,
} from "shared";

export interface LocalSaveData {
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

export type ConflictResolution = "local" | "cloud" | "merge";

export interface ConflictInfo {
  localSave: LocalSaveData;
  cloudSave: CloudSaveData;
  localTimestamp: number;
  cloudTimestamp: number;
}

const TOKEN_KEY = "gts_auth_token";
const LAST_SYNCED_KEY = "gts_last_synced";

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
      const saveData: LocalSaveData = {
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

      const saveData: LocalSaveData = JSON.parse(serialized);

      // Validate checksum
      if (!this.validateChecksum(saveData)) {
        console.warn("SaveSystem: Save data checksum mismatch, attempting recovery");
        return this.loadFromBackup();
      }

      // Load into state manager
      this.stateManager.loadState(saveData.data);

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
      const saveData: LocalSaveData = JSON.parse(serialized);

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

      const saveData: LocalSaveData = JSON.parse(serialized);
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

        const saveData: LocalSaveData = JSON.parse(backup);

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

  private generateChecksum(data: object): string {
    // Simple checksum using string length and character sum
    const str = JSON.stringify(data);
    let sum = 0;
    for (let i = 0; i < str.length; i++) {
      sum += str.charCodeAt(i);
    }
    return `${str.length}:${sum}`;
  }

  private validateChecksum(saveData: LocalSaveData): boolean {
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

  // ============ Cloud Sync Methods ============

  /**
   * Check if user is authenticated
   */
  private isAuthenticated(): boolean {
    return localStorage.getItem(TOKEN_KEY) !== null;
  }

  /**
   * Get the last synced timestamp
   */
  private getLastSyncedAt(): number | null {
    const value = localStorage.getItem(LAST_SYNCED_KEY);
    return value ? parseInt(value, 10) : null;
  }

  /**
   * Set the last synced timestamp
   */
  private setLastSyncedAt(timestamp: number): void {
    localStorage.setItem(LAST_SYNCED_KEY, timestamp.toString());
  }

  /**
   * Sync local save to cloud
   * Only works when authenticated
   */
  async syncToCloud(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      console.log("SaveSystem: Not authenticated, skipping cloud sync");
      return false;
    }

    try {
      // First save locally to ensure we have the latest state
      this.save();

      const serialized = localStorage.getItem(this.config.saveKey);
      if (!serialized) {
        console.log("SaveSystem: No local save to sync");
        return false;
      }

      const localSave: LocalSaveData = JSON.parse(serialized);

      EventBus.emit("cloud:sync:start", {});

      // Convert to SharedSaveData for API call
      const apiSave: SharedSaveData = {
        version: localSave.version,
        timestamp: localSave.timestamp,
        data: localSave.data as SerializableGameState,
        checksum: localSave.checksum,
      };

      const response: SyncResponse = await api.syncGame({
        localSave: apiSave,
        lastSyncedAt: this.getLastSyncedAt(),
      });

      if (response.conflict && response.serverSave) {
        // Emit conflict event for UI to handle
        EventBus.emit("cloud:sync:conflict", {
          localSave,
          cloudSave: response.serverSave,
          localTimestamp: localSave.timestamp,
          cloudTimestamp: new Date(response.serverSave.updatedAt).getTime(),
        });
        return false;
      }

      // Apply offline progress if any
      if (response.offlineProgress) {
        EventBus.emit("cloud:offline:progress", response.offlineProgress);
        // Reload state with offline progress applied
        this.stateManager.loadState(response.save.data);
        // Save the updated state locally
        this.save();
      }

      this.setLastSyncedAt(Date.now());
      EventBus.emit("cloud:sync:success", { save: response.save });
      return true;
    } catch (error) {
      console.error("SaveSystem: Cloud sync failed:", error);
      EventBus.emit("cloud:sync:error", { error });
      return false;
    }
  }

  /**
   * Load save from cloud
   * Call this on login to get the latest cloud save
   */
  async loadFromCloud(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      console.log("SaveSystem: Not authenticated, cannot load from cloud");
      return false;
    }

    try {
      EventBus.emit("cloud:load:start", {});

      const response = await api.loadGame();

      if (!response.save) {
        console.log("SaveSystem: No cloud save found");
        EventBus.emit("cloud:load:empty", {});
        // If we have a local save, sync it to cloud
        if (this.hasSave()) {
          return this.syncToCloud();
        }
        return false;
      }

      const cloudSave = response.save;
      const localSerialized = localStorage.getItem(this.config.saveKey);

      // Check for conflict with local save
      if (localSerialized) {
        const localSave: LocalSaveData = JSON.parse(localSerialized);
        const cloudTimestamp = new Date(cloudSave.updatedAt).getTime();

        if (localSave.timestamp > cloudTimestamp) {
          // Local is newer - emit conflict
          EventBus.emit("cloud:sync:conflict", {
            localSave,
            cloudSave,
            localTimestamp: localSave.timestamp,
            cloudTimestamp,
          });
          return false;
        }
      }

      // Cloud save is newer or no local save exists - load cloud save
      this.stateManager.loadState(cloudSave.data);

      // Update local storage with cloud save
      const saveData: LocalSaveData = {
        version: cloudSave.version,
        timestamp: new Date(cloudSave.updatedAt).getTime(),
        data: cloudSave.data,
        checksum: cloudSave.checksum,
      };
      localStorage.setItem(this.config.saveKey, JSON.stringify(saveData));

      this.setLastSyncedAt(Date.now());
      this.isDirty = false;

      EventBus.emit("cloud:load:success", { save: cloudSave });
      return true;
    } catch (error) {
      console.error("SaveSystem: Failed to load from cloud:", error);
      EventBus.emit("cloud:load:error", { error });
      return false;
    }
  }

  /**
   * Resolve a save conflict
   * @param resolution - Which save to use: "local", "cloud", or "merge"
   * @param conflictInfo - The conflict information
   */
  async resolveConflict(
    resolution: ConflictResolution,
    conflictInfo: ConflictInfo
  ): Promise<boolean> {
    try {
      switch (resolution) {
        case "local":
          // Keep local save, push to cloud
          return this.forceUploadToCloud();

        case "cloud":
          // Use cloud save, overwrite local
          return this.forceLoadFromCloud(conflictInfo.cloudSave);

        case "merge":
          // Merge strategy: take the save with more progress
          const merged = this.mergeSaves(
            conflictInfo.localSave,
            conflictInfo.cloudSave
          );
          this.stateManager.loadState(merged.data as object);
          this.save();
          return this.forceUploadToCloud();

        default:
          console.error("SaveSystem: Unknown resolution type:", resolution);
          return false;
      }
    } catch (error) {
      console.error("SaveSystem: Conflict resolution failed:", error);
      EventBus.emit("cloud:conflict:error", { error });
      return false;
    }
  }

  /**
   * Force upload local save to cloud (overwriting cloud save)
   */
  async forceUploadToCloud(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    try {
      const serialized = localStorage.getItem(this.config.saveKey);
      if (!serialized) {
        return false;
      }

      const localSave: LocalSaveData = JSON.parse(serialized);

      await api.saveGame({
        version: localSave.version,
        data: localSave.data as SerializableGameState,
        checksum: localSave.checksum,
      });

      this.setLastSyncedAt(Date.now());
      EventBus.emit("cloud:sync:success", {});
      return true;
    } catch (error) {
      console.error("SaveSystem: Force upload failed:", error);
      return false;
    }
  }

  /**
   * Force load from cloud save (overwriting local save)
   */
  forceLoadFromCloud(cloudSave: CloudSaveData): boolean {
    try {
      this.stateManager.loadState(cloudSave.data);

      const saveData: LocalSaveData = {
        version: cloudSave.version,
        timestamp: new Date(cloudSave.updatedAt).getTime(),
        data: cloudSave.data,
        checksum: cloudSave.checksum,
      };
      localStorage.setItem(this.config.saveKey, JSON.stringify(saveData));

      this.setLastSyncedAt(Date.now());
      this.isDirty = false;

      EventBus.emit("cloud:load:success", { save: cloudSave });
      return true;
    } catch (error) {
      console.error("SaveSystem: Force load from cloud failed:", error);
      return false;
    }
  }

  /**
   * Merge two saves, preferring the one with more progress
   * Uses resource totals as a heuristic for "more progress"
   */
  private mergeSaves(
    localSave: LocalSaveData,
    cloudSave: CloudSaveData
  ): LocalSaveData {
    const localData = localSave.data as unknown as Record<string, unknown>;
    const cloudData = cloudSave.data as unknown as Record<string, unknown>;

    // Calculate progress score for each save
    const localScore = this.calculateProgressScore(localData);
    const cloudScore = this.calculateProgressScore(cloudData);

    // Take the save with higher progress, but use max of each resource
    const baseData = localScore >= cloudScore ? localData : cloudData;
    const otherData = localScore >= cloudScore ? cloudData : localData;

    // Merge resources - take maximum of each
    const mergedResources = this.mergeResources(
      (baseData.resources as Record<string, unknown>) || {},
      (otherData.resources as Record<string, unknown>) || {}
    );

    const mergedData = {
      ...baseData,
      resources: mergedResources,
      lastPlayedAt: Date.now(),
    };

    return {
      version: localSave.version,
      timestamp: Date.now(),
      data: mergedData,
      checksum: this.generateChecksum(mergedData),
    };
  }

  /**
   * Calculate a progress score for a save (for merge comparison)
   */
  private calculateProgressScore(data: Record<string, unknown>): number {
    let score = 0;

    // Add up lifetime resources
    const resources = data.resources as Record<
      string,
      { lifetime?: number }
    > | null;
    if (resources) {
      for (const resource of Object.values(resources)) {
        score += resource.lifetime || 0;
      }
    }

    // Add points for buildings owned
    const buildings = data.buildings as Record<
      string,
      { owned?: number }
    > | null;
    if (buildings) {
      for (const building of Object.values(buildings)) {
        score += (building.owned || 0) * 1000;
      }
    }

    // Add points for upgrades purchased
    const upgrades = data.upgrades as Record<
      string,
      { purchased?: boolean }
    > | null;
    if (upgrades) {
      for (const upgrade of Object.values(upgrades)) {
        if (upgrade.purchased) {
          score += 5000;
        }
      }
    }

    return score;
  }

  /**
   * Merge resources from two saves, taking the maximum of each
   */
  private mergeResources(
    resources1: Record<string, unknown>,
    resources2: Record<string, unknown>
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...resources1 };

    for (const [key, value2] of Object.entries(resources2)) {
      const value1 = merged[key] as { current?: number; lifetime?: number } | undefined;
      const r2 = value2 as { current?: number; lifetime?: number };

      if (!value1) {
        merged[key] = value2;
      } else {
        merged[key] = {
          ...value1,
          current: Math.max(value1.current || 0, r2.current || 0),
          lifetime: Math.max(value1.lifetime || 0, r2.lifetime || 0),
        };
      }
    }

    return merged;
  }
}
