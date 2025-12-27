/**
 * API Types - Request/Response types for the backend API
 */

import type { SaveData, CloudSaveData } from './saveData';
import type { SerializableGameState } from './gameState';

// ============ Auth Types ============

export interface User {
  id: string;
  githubUsername: string;
  email: string | null;
  createdAt: Date;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ============ Save Types ============

export interface SaveRequest {
  version: string;
  data: SerializableGameState;
  checksum: string;
}

export interface SaveResponse {
  success: boolean;
  save: CloudSaveData;
}

export interface LoadResponse {
  success: boolean;
  save: CloudSaveData | null;
}

// ============ Sync Types ============

export interface SyncRequest {
  localSave: SaveData;
  lastSyncedAt: number | null;
}

export interface OfflineProgressResult {
  resourcesGained: Record<string, number>;
  offlineTimeMs: number;
  efficiencyApplied: number;
}

export interface SyncResponse {
  success: boolean;
  save: CloudSaveData;
  offlineProgress: OfflineProgressResult | null;
  conflict: boolean;
  serverSave?: CloudSaveData;
}

// ============ Error Types ============

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
