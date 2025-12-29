/**
 * SaveConflictModal Component
 *
 * Steam-style modal that appears when there's a conflict between
 * local and cloud saves. User must choose which save to keep.
 */

import { useMemo } from 'react';
import type { LocalSaveData } from '../systems/SaveSystem';
import type { CloudSaveData, SerializableGameState } from 'shared';
import './SaveConflictModal.css';

export interface SaveConflictInfo {
  localSave: LocalSaveData;
  cloudSave: CloudSaveData;
  localTimestamp: number;
  cloudTimestamp: number;
}

interface SaveConflictModalProps {
  conflict: SaveConflictInfo;
  onChooseLocal: () => void;
  onChooseCloud: () => void;
}

interface SaveSummary {
  rice: number;
  money: number;
  buildings: number;
  upgrades: number;
  lastPlayed: string;
  playedAgo: string;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function extractSummary(data: SerializableGameState, timestamp: number): SaveSummary {
  const resources = data.resources || {};
  const buildings = data.buildings || {};
  const upgrades = data.upgrades || {};

  // Count total buildings owned
  let totalBuildings = 0;
  for (const building of Object.values(buildings)) {
    totalBuildings += (building as { owned?: number }).owned || 0;
  }

  // Count purchased upgrades
  let totalUpgrades = 0;
  for (const upgrade of Object.values(upgrades)) {
    if ((upgrade as { purchased?: boolean }).purchased) {
      totalUpgrades++;
    }
  }

  return {
    rice: Math.floor((resources.rice as { current?: number })?.current || 0),
    money: Math.floor((resources.money as { current?: number })?.current || 0),
    buildings: totalBuildings,
    upgrades: totalUpgrades,
    lastPlayed: formatDate(timestamp),
    playedAgo: formatTimeAgo(timestamp),
  };
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export function SaveConflictModal({
  conflict,
  onChooseLocal,
  onChooseCloud,
}: SaveConflictModalProps) {
  const localSummary = useMemo(
    () => extractSummary(conflict.localSave.data as SerializableGameState, conflict.localTimestamp),
    [conflict.localSave, conflict.localTimestamp]
  );

  const cloudSummary = useMemo(
    () => extractSummary(conflict.cloudSave.data, conflict.cloudTimestamp),
    [conflict.cloudSave, conflict.cloudTimestamp]
  );

  const localIsNewer = conflict.localTimestamp > conflict.cloudTimestamp;

  return (
    <div className="save-conflict-overlay">
      <div className="save-conflict-modal">
        <header className="save-conflict-header">
          <h2>Save Conflict Detected</h2>
          <p>You have saves on multiple devices. Choose which one to keep:</p>
        </header>

        <div className="save-conflict-options">
          {/* Local Save Option */}
          <button
            className={`save-conflict-option ${localIsNewer ? 'save-conflict-option--newer' : ''}`}
            onClick={onChooseLocal}
          >
            <div className="save-option-header">
              <span className="save-option-icon">💻</span>
              <span className="save-option-title">This Device</span>
              {localIsNewer && <span className="save-option-badge">Newer</span>}
            </div>

            <div className="save-option-stats">
              <div className="save-stat">
                <span className="save-stat-label">Rice</span>
                <span className="save-stat-value">{formatNumber(localSummary.rice)}</span>
              </div>
              <div className="save-stat">
                <span className="save-stat-label">Money</span>
                <span className="save-stat-value">${formatNumber(localSummary.money)}</span>
              </div>
              <div className="save-stat">
                <span className="save-stat-label">Buildings</span>
                <span className="save-stat-value">{localSummary.buildings}</span>
              </div>
              <div className="save-stat">
                <span className="save-stat-label">Upgrades</span>
                <span className="save-stat-value">{localSummary.upgrades}</span>
              </div>
            </div>

            <div className="save-option-time">
              <span className="save-time-ago">{localSummary.playedAgo}</span>
              <span className="save-time-date">{localSummary.lastPlayed}</span>
            </div>

            <div className="save-option-action">
              Use This Save
            </div>
          </button>

          {/* Cloud Save Option */}
          <button
            className={`save-conflict-option ${!localIsNewer ? 'save-conflict-option--newer' : ''}`}
            onClick={onChooseCloud}
          >
            <div className="save-option-header">
              <span className="save-option-icon">☁️</span>
              <span className="save-option-title">Cloud Save</span>
              {!localIsNewer && <span className="save-option-badge">Newer</span>}
            </div>

            <div className="save-option-stats">
              <div className="save-stat">
                <span className="save-stat-label">Rice</span>
                <span className="save-stat-value">{formatNumber(cloudSummary.rice)}</span>
              </div>
              <div className="save-stat">
                <span className="save-stat-label">Money</span>
                <span className="save-stat-value">${formatNumber(cloudSummary.money)}</span>
              </div>
              <div className="save-stat">
                <span className="save-stat-label">Buildings</span>
                <span className="save-stat-value">{cloudSummary.buildings}</span>
              </div>
              <div className="save-stat">
                <span className="save-stat-label">Upgrades</span>
                <span className="save-stat-value">{cloudSummary.upgrades}</span>
              </div>
            </div>

            <div className="save-option-time">
              <span className="save-time-ago">{cloudSummary.playedAgo}</span>
              <span className="save-time-date">{cloudSummary.lastPlayed}</span>
            </div>

            <div className="save-option-action">
              Use This Save
            </div>
          </button>
        </div>

        <footer className="save-conflict-footer">
          <p>The save you don't choose will be permanently overwritten.</p>
        </footer>
      </div>
    </div>
  );
}
