/**
 * SaveData - Types for save file structure
 */

import type { SerializableGameState } from './gameState';

export interface SaveData {
  /** Save format version */
  version: string;
  /** Timestamp of save */
  timestamp: number;
  /** The game state */
  data: SerializableGameState;
  /** Checksum for integrity validation */
  checksum: string;
}

export interface CloudSaveData extends SaveData {
  /** User ID (from GitHub) */
  userId: string;
  /** Save slot ID */
  id: string;
  /** When created */
  createdAt: Date;
  /** When last updated */
  updatedAt: Date;
}
