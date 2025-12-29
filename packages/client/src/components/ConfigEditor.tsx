/**
 * ConfigEditor Component
 *
 * In-game config editor modal for editing game balance values.
 * Supports editing buildings, upgrades, timing, and gameplay settings.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import {
  type ConfigOverrides,
  type BuildingOverride,
  type UpgradeOverride,
  loadConfigOverrides,
  saveConfigOverrides,
  exportConfigOverrides,
  importConfigOverrides,
  clearConfigOverrides,
  getOverrideSummary,
} from '../systems/ConfigOverrideSystem';
import type { CurveRef } from '../config/types';
import './ConfigEditor.css';

/**
 * Helper to get numeric value (can be number or CurveRef)
 */
function getNumericValue(value: number | CurveRef): number {
  if (typeof value === 'number') {
    return value;
  }
  // For CurveRef, return a placeholder
  return 0;
}

/**
 * Helper to check if value is a simple number (editable)
 */
function isNumericValue(value: number | CurveRef): value is number {
  return typeof value === 'number';
}

/**
 * Helper to format value for display
 */
function formatValue(value: number | CurveRef): string {
  if (typeof value === 'number') {
    return String(value);
  }
  return '(curve-based)';
}

type EditorTab = 'buildings' | 'upgrades' | 'timing' | 'gameplay' | 'import-export';

interface ConfigEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
}

export function ConfigEditor({ isOpen, onClose, onApply }: ConfigEditorProps) {
  const { config } = useGame();
  const [activeTab, setActiveTab] = useState<EditorTab>('buildings');
  const [overrides, setOverrides] = useState<ConfigOverrides>(() => loadConfigOverrides());
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedUpgradeId, setSelectedUpgradeId] = useState<string>('');
  const [importText, setImportText] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get summary of changes
  const summary = useMemo(() => getOverrideSummary(overrides), [overrides]);

  // Set initial selection when tab changes
  useEffect(() => {
    if (activeTab === 'buildings' && !selectedBuildingId && config.buildings.length > 0) {
      setSelectedBuildingId(config.buildings[0].id);
    }
    if (activeTab === 'upgrades' && !selectedUpgradeId && config.upgrades.length > 0) {
      setSelectedUpgradeId(config.upgrades[0].id);
    }
  }, [activeTab, config.buildings, config.upgrades, selectedBuildingId, selectedUpgradeId]);

  // Show status message temporarily
  const showStatus = useCallback((type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 3000);
  }, []);

  // Save overrides
  const handleSave = useCallback(() => {
    if (saveConfigOverrides(overrides)) {
      showStatus('success', 'Config saved successfully!');
    } else {
      showStatus('error', 'Failed to save config');
    }
  }, [overrides, showStatus]);

  // Apply changes and reload game
  const handleApply = useCallback(() => {
    handleSave();
    onApply();
    showStatus('success', 'Config applied! Reload the page to see changes.');
  }, [handleSave, onApply, showStatus]);

  // Clear all overrides
  const handleClear = useCallback(() => {
    if (confirm('Are you sure you want to clear all config overrides?')) {
      clearConfigOverrides();
      setOverrides(loadConfigOverrides());
      showStatus('success', 'All overrides cleared');
    }
  }, [showStatus]);

  // Export to clipboard
  const handleExport = useCallback(() => {
    const json = exportConfigOverrides(overrides);
    navigator.clipboard.writeText(json).then(
      () => showStatus('success', 'Copied to clipboard!'),
      () => showStatus('error', 'Failed to copy to clipboard')
    );
  }, [overrides, showStatus]);

  // Import from text
  const handleImport = useCallback(() => {
    const imported = importConfigOverrides(importText);
    if (imported) {
      setOverrides(imported);
      saveConfigOverrides(imported);
      setImportText('');
      showStatus('success', 'Config imported successfully!');
    } else {
      showStatus('error', 'Invalid config format');
    }
  }, [importText, showStatus]);

  // Update building override
  const updateBuildingOverride = useCallback((
    buildingId: string,
    updates: Partial<BuildingOverride>
  ) => {
    setOverrides(prev => ({
      ...prev,
      buildings: {
        ...prev.buildings,
        [buildingId]: {
          ...prev.buildings[buildingId],
          ...updates,
        },
      },
    }));
  }, []);

  // Update upgrade override
  const updateUpgradeOverride = useCallback((
    upgradeId: string,
    updates: Partial<UpgradeOverride>
  ) => {
    setOverrides(prev => ({
      ...prev,
      upgrades: {
        ...prev.upgrades,
        [upgradeId]: {
          ...prev.upgrades[upgradeId],
          ...updates,
        },
      },
    }));
  }, []);

  // Update timing override
  const updateTimingOverride = useCallback((
    key: keyof ConfigOverrides['timing'],
    value: number
  ) => {
    setOverrides(prev => ({
      ...prev,
      timing: {
        ...prev.timing,
        [key]: value,
      },
    }));
  }, []);

  // Update gameplay override
  const updateGameplayOverride = useCallback((
    key: keyof ConfigOverrides['gameplay'],
    value: number
  ) => {
    setOverrides(prev => ({
      ...prev,
      gameplay: {
        ...prev.gameplay,
        [key]: value,
      },
    }));
  }, []);

  // Clear specific building override
  const clearBuildingOverride = useCallback((buildingId: string) => {
    setOverrides(prev => {
      const newBuildings = { ...prev.buildings };
      delete newBuildings[buildingId];
      return { ...prev, buildings: newBuildings };
    });
  }, []);

  // Clear specific upgrade override
  const clearUpgradeOverride = useCallback((upgradeId: string) => {
    setOverrides(prev => {
      const newUpgrades = { ...prev.upgrades };
      delete newUpgrades[upgradeId];
      return { ...prev, upgrades: newUpgrades };
    });
  }, []);

  if (!isOpen) return null;

  const selectedBuilding = config.buildings.find(b => b.id === selectedBuildingId);
  const selectedUpgrade = config.upgrades.find(u => u.id === selectedUpgradeId);
  const buildingOverride = overrides.buildings[selectedBuildingId] || {};
  const upgradeOverride = overrides.upgrades[selectedUpgradeId] || {};

  return (
    <div className="config-editor-overlay" onClick={onClose}>
      <div className="config-editor-modal" onClick={e => e.stopPropagation()}>
        <header className="config-editor-header">
          <h2>Config Editor</h2>
          <div className="config-editor-summary">
            {summary.buildingCount > 0 && (
              <span className="summary-badge">{summary.buildingCount} buildings</span>
            )}
            {summary.upgradeCount > 0 && (
              <span className="summary-badge">{summary.upgradeCount} upgrades</span>
            )}
            {summary.hasTimingOverrides && (
              <span className="summary-badge">timing</span>
            )}
            {summary.hasGameplayOverrides && (
              <span className="summary-badge">gameplay</span>
            )}
          </div>
          <button className="config-editor-close" onClick={onClose}>&times;</button>
        </header>

        {statusMessage && (
          <div className={`config-editor-status config-editor-status--${statusMessage.type}`}>
            {statusMessage.text}
          </div>
        )}

        <nav className="config-editor-tabs">
          <button
            className={activeTab === 'buildings' ? 'active' : ''}
            onClick={() => setActiveTab('buildings')}
          >
            Buildings
          </button>
          <button
            className={activeTab === 'upgrades' ? 'active' : ''}
            onClick={() => setActiveTab('upgrades')}
          >
            Upgrades
          </button>
          <button
            className={activeTab === 'timing' ? 'active' : ''}
            onClick={() => setActiveTab('timing')}
          >
            Timing
          </button>
          <button
            className={activeTab === 'gameplay' ? 'active' : ''}
            onClick={() => setActiveTab('gameplay')}
          >
            Gameplay
          </button>
          <button
            className={activeTab === 'import-export' ? 'active' : ''}
            onClick={() => setActiveTab('import-export')}
          >
            Import/Export
          </button>
        </nav>

        <main className="config-editor-content">
          {/* Buildings Tab */}
          {activeTab === 'buildings' && (
            <div className="config-editor-panel config-editor-panel--split">
              <aside className="config-editor-list">
                <h3>Select Building</h3>
                <ul>
                  {config.buildings.map(building => (
                    <li
                      key={building.id}
                      className={`${selectedBuildingId === building.id ? 'selected' : ''} ${overrides.buildings[building.id] ? 'has-override' : ''}`}
                      onClick={() => setSelectedBuildingId(building.id)}
                    >
                      {building.name}
                      {overrides.buildings[building.id] && <span className="override-indicator">*</span>}
                    </li>
                  ))}
                </ul>
              </aside>

              {selectedBuilding && (
                <div className="config-editor-form">
                  <h3>{selectedBuilding.name}</h3>
                  <p className="config-editor-description">{selectedBuilding.description}</p>

                  <div className="config-editor-section">
                    <h4>Base Cost</h4>
                    {selectedBuilding.baseCost.map(cost => (
                      <div key={cost.resourceId} className="config-editor-field">
                        <label>{cost.resourceId}</label>
                        {isNumericValue(cost.amount) ? (
                          <>
                            <input
                              type="number"
                              min={0}
                              value={
                                buildingOverride.baseCostMultiple?.[cost.resourceId] ??
                                (selectedBuilding.baseCost.length === 1 ? buildingOverride.baseCostAmount : undefined) ??
                                getNumericValue(cost.amount)
                              }
                              onChange={e => {
                                const value = parseFloat(e.target.value);
                                if (selectedBuilding.baseCost.length === 1) {
                                  updateBuildingOverride(selectedBuildingId, { baseCostAmount: value });
                                } else {
                                  updateBuildingOverride(selectedBuildingId, {
                                    baseCostMultiple: {
                                      ...buildingOverride.baseCostMultiple,
                                      [cost.resourceId]: value,
                                    },
                                  });
                                }
                              }}
                            />
                            <span className="config-editor-original">Original: {formatValue(cost.amount)}</span>
                          </>
                        ) : (
                          <span className="config-editor-help">Uses curve-based cost (not editable)</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedBuilding.production?.outputs?.[0] && (
                    <div className="config-editor-section">
                      <h4>Production</h4>
                      <div className="config-editor-field">
                        <label>Amount per tick</label>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={buildingOverride.productionAmount ?? selectedBuilding.production.outputs[0].baseAmount}
                          onChange={e => updateBuildingOverride(selectedBuildingId, {
                            productionAmount: parseFloat(e.target.value),
                          })}
                        />
                        <span className="config-editor-original">
                          Original: {selectedBuilding.production.outputs[0].baseAmount}
                        </span>
                      </div>

                      {isNumericValue(selectedBuilding.production.baseIntervalMs) && (
                        <div className="config-editor-field">
                          <label>Interval (ms)</label>
                          <input
                            type="number"
                            min={100}
                            step={100}
                            value={buildingOverride.productionIntervalMs ?? getNumericValue(selectedBuilding.production.baseIntervalMs)}
                            onChange={e => updateBuildingOverride(selectedBuildingId, {
                              productionIntervalMs: parseInt(e.target.value),
                            })}
                          />
                          <span className="config-editor-original">
                            Original: {getNumericValue(selectedBuilding.production.baseIntervalMs)}ms
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="config-editor-section">
                    <h4>Unlock</h4>
                    <div className="config-editor-field config-editor-field--checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={buildingOverride.unlockDisabled ?? false}
                          onChange={e => updateBuildingOverride(selectedBuildingId, {
                            unlockDisabled: e.target.checked,
                          })}
                        />
                        Always unlocked (bypass requirements)
                      </label>
                    </div>
                  </div>

                  {selectedBuilding.maxOwned !== undefined && (
                    <div className="config-editor-section">
                      <h4>Limits</h4>
                      <div className="config-editor-field">
                        <label>Max owned</label>
                        <input
                          type="number"
                          min={1}
                          value={buildingOverride.maxOwned ?? selectedBuilding.maxOwned ?? ''}
                          onChange={e => updateBuildingOverride(selectedBuildingId, {
                            maxOwned: e.target.value ? parseInt(e.target.value) : null,
                          })}
                        />
                        <span className="config-editor-original">
                          Original: {selectedBuilding.maxOwned ?? 'unlimited'}
                        </span>
                      </div>
                    </div>
                  )}

                  {overrides.buildings[selectedBuildingId] && (
                    <button
                      className="config-editor-clear-btn"
                      onClick={() => clearBuildingOverride(selectedBuildingId)}
                    >
                      Reset to Original
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Upgrades Tab */}
          {activeTab === 'upgrades' && (
            <div className="config-editor-panel config-editor-panel--split">
              <aside className="config-editor-list">
                <h3>Select Upgrade</h3>
                <ul>
                  {config.upgrades.map(upgrade => (
                    <li
                      key={upgrade.id}
                      className={`${selectedUpgradeId === upgrade.id ? 'selected' : ''} ${overrides.upgrades[upgrade.id] ? 'has-override' : ''}`}
                      onClick={() => setSelectedUpgradeId(upgrade.id)}
                    >
                      {upgrade.name}
                      {overrides.upgrades[upgrade.id] && <span className="override-indicator">*</span>}
                    </li>
                  ))}
                </ul>
              </aside>

              {selectedUpgrade && (
                <div className="config-editor-form">
                  <h3>{selectedUpgrade.name}</h3>
                  <p className="config-editor-description">{selectedUpgrade.description}</p>

                  <div className="config-editor-section">
                    <h4>Cost</h4>
                    {selectedUpgrade.cost.map(cost => (
                      <div key={cost.resourceId} className="config-editor-field">
                        <label>{cost.resourceId}</label>
                        {isNumericValue(cost.amount) ? (
                          <>
                            <input
                              type="number"
                              min={0}
                              value={
                                upgradeOverride.costMultiple?.[cost.resourceId] ??
                                (selectedUpgrade.cost.length === 1 ? upgradeOverride.costAmount : undefined) ??
                                getNumericValue(cost.amount)
                              }
                              onChange={e => {
                                const value = parseFloat(e.target.value);
                                if (selectedUpgrade.cost.length === 1) {
                                  updateUpgradeOverride(selectedUpgradeId, { costAmount: value });
                                } else {
                                  updateUpgradeOverride(selectedUpgradeId, {
                                    costMultiple: {
                                      ...upgradeOverride.costMultiple,
                                      [cost.resourceId]: value,
                                    },
                                  });
                                }
                              }}
                            />
                            <span className="config-editor-original">Original: {formatValue(cost.amount)}</span>
                          </>
                        ) : (
                          <span className="config-editor-help">Uses curve-based cost (not editable)</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedUpgrade.effects?.[0] && (
                    <div className="config-editor-section">
                      <h4>Effect</h4>
                      <div className="config-editor-field">
                        <label>{selectedUpgrade.effects[0].stackId}</label>
                        <input
                          type="number"
                          step={0.01}
                          value={upgradeOverride.effectValue ?? selectedUpgrade.effects[0].value}
                          onChange={e => updateUpgradeOverride(selectedUpgradeId, {
                            effectValue: parseFloat(e.target.value),
                          })}
                        />
                        <span className="config-editor-original">
                          Original: {selectedUpgrade.effects[0].value}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="config-editor-section">
                    <h4>Unlock</h4>
                    <div className="config-editor-field config-editor-field--checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={upgradeOverride.unlockDisabled ?? false}
                          onChange={e => updateUpgradeOverride(selectedUpgradeId, {
                            unlockDisabled: e.target.checked,
                          })}
                        />
                        Always unlocked (bypass requirements)
                      </label>
                    </div>
                  </div>

                  {overrides.upgrades[selectedUpgradeId] && (
                    <button
                      className="config-editor-clear-btn"
                      onClick={() => clearUpgradeOverride(selectedUpgradeId)}
                    >
                      Reset to Original
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Timing Tab */}
          {activeTab === 'timing' && (
            <div className="config-editor-panel">
              <div className="config-editor-form">
                <div className="config-editor-section">
                  <h4>Core Tick Rates</h4>
                  <div className="config-editor-field">
                    <label>Base Tick (ms)</label>
                    <input
                      type="number"
                      min={50}
                      max={1000}
                      step={10}
                      value={overrides.timing.baseTickMs ?? config.timing.baseTickMs}
                      onChange={e => updateTimingOverride('baseTickMs', parseInt(e.target.value))}
                    />
                    <span className="config-editor-original">
                      Original: {config.timing.baseTickMs}ms
                    </span>
                    <span className="config-editor-help">
                      How often the game calculates production (lower = smoother, higher CPU)
                    </span>
                  </div>

                  <div className="config-editor-field">
                    <label>Idle Tick (ms)</label>
                    <input
                      type="number"
                      min={100}
                      max={5000}
                      step={100}
                      value={overrides.timing.idleTickMs ?? config.timing.idleTickMs}
                      onChange={e => updateTimingOverride('idleTickMs', parseInt(e.target.value))}
                    />
                    <span className="config-editor-original">
                      Original: {config.timing.idleTickMs}ms
                    </span>
                    <span className="config-editor-help">
                      Tick rate when browser tab is hidden
                    </span>
                  </div>
                </div>

                <div className="config-editor-section">
                  <h4>Offline Progression</h4>
                  <div className="config-editor-field">
                    <label>Max Offline Time (seconds)</label>
                    <input
                      type="number"
                      min={0}
                      step={3600}
                      value={overrides.timing.maxOfflineSeconds ?? config.timing.maxOfflineSeconds}
                      onChange={e => updateTimingOverride('maxOfflineSeconds', parseInt(e.target.value))}
                    />
                    <span className="config-editor-original">
                      Original: {config.timing.maxOfflineSeconds}s ({Math.floor(config.timing.maxOfflineSeconds / 3600)}h)
                    </span>
                    <span className="config-editor-help">
                      Maximum time to calculate when player returns
                    </span>
                  </div>

                  <div className="config-editor-field">
                    <label>Offline Efficiency (0-1)</label>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={overrides.timing.offlineEfficiency ?? config.timing.offlineEfficiency}
                      onChange={e => updateTimingOverride('offlineEfficiency', parseFloat(e.target.value))}
                    />
                    <span className="config-editor-original">
                      Original: {config.timing.offlineEfficiency} ({config.timing.offlineEfficiency * 100}%)
                    </span>
                    <span className="config-editor-help">
                      Multiplier for offline gains (1 = full, 0.5 = 50%)
                    </span>
                  </div>
                </div>

                <div className="config-editor-section">
                  <h4>Persistence</h4>
                  <div className="config-editor-field">
                    <label>Auto-save Interval (ms)</label>
                    <input
                      type="number"
                      min={5000}
                      step={1000}
                      value={overrides.timing.autoSaveIntervalMs ?? config.timing.autoSaveIntervalMs}
                      onChange={e => updateTimingOverride('autoSaveIntervalMs', parseInt(e.target.value))}
                    />
                    <span className="config-editor-original">
                      Original: {config.timing.autoSaveIntervalMs}ms ({config.timing.autoSaveIntervalMs / 1000}s)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Gameplay Tab */}
          {activeTab === 'gameplay' && (
            <div className="config-editor-panel">
              <div className="config-editor-form">
                <div className="config-editor-section">
                  <h4>Click Harvesting</h4>
                  <div className="config-editor-field">
                    <label>Click Base Amount</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={overrides.gameplay.clickBaseAmount ?? config.gameplay.clickBaseAmount}
                      onChange={e => updateGameplayOverride('clickBaseAmount', parseFloat(e.target.value))}
                    />
                    <span className="config-editor-original">
                      Original: {config.gameplay.clickBaseAmount}
                    </span>
                    <span className="config-editor-help">
                      Base amount per click (before multipliers)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Import/Export Tab */}
          {activeTab === 'import-export' && (
            <div className="config-editor-panel">
              <div className="config-editor-form">
                <div className="config-editor-section">
                  <h4>Export Config</h4>
                  <p>Export your config overrides to share or backup.</p>
                  <button className="config-editor-btn" onClick={handleExport}>
                    Copy to Clipboard
                  </button>
                </div>

                <div className="config-editor-section">
                  <h4>Import Config</h4>
                  <p>Paste a config JSON to import.</p>
                  <textarea
                    className="config-editor-textarea"
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder="Paste config JSON here..."
                    rows={8}
                  />
                  <button
                    className="config-editor-btn"
                    onClick={handleImport}
                    disabled={!importText.trim()}
                  >
                    Import Config
                  </button>
                </div>

                <div className="config-editor-section config-editor-section--danger">
                  <h4>Reset All</h4>
                  <p>Clear all config overrides and restore defaults.</p>
                  <button className="config-editor-btn config-editor-btn--danger" onClick={handleClear}>
                    Clear All Overrides
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="config-editor-footer">
          <button className="config-editor-btn" onClick={handleSave}>
            Save
          </button>
          <button className="config-editor-btn config-editor-btn--primary" onClick={handleApply}>
            Save & Apply (Requires Reload)
          </button>
          <button className="config-editor-btn config-editor-btn--secondary" onClick={onClose}>
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
