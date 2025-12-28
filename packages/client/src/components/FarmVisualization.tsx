/**
 * FarmVisualization Component
 *
 * A dynamic visual representation of the farm that grows as the player
 * purchases buildings, upgrades, and progresses through eras.
 *
 * Uses a hybrid approach:
 * - CSS gradients/shapes for terrain (sky, water, land)
 * - Emojis in fixed-size grid cells for buildings/entities
 * - CSS animations for movement and life
 */

import { useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import './FarmVisualization.css';

// Helper to get count of a building, defaulting to 0
function getBuildingCount(buildings: Record<string, { owned?: number }>, id: string): number {
  return buildings[id]?.owned ?? 0;
}

// Helper to check if a building is unlocked
function isBuildingUnlocked(buildings: Record<string, { unlocked?: boolean }>, id: string): boolean {
  return buildings[id]?.unlocked ?? false;
}

export function FarmVisualization() {
  const { state } = useGame();
  const { buildings, currentEra } = state;

  // Calculate farm state based on buildings owned
  const farmState = useMemo(() => {
    const paddyCount = getBuildingCount(buildings, 'paddy_field');
    const workerCount = getBuildingCount(buildings, 'family_worker');
    const buffaloCount = getBuildingCount(buildings, 'buffalo');
    const wellCount = getBuildingCount(buildings, 'village_well');
    const carrierCount = getBuildingCount(buildings, 'water_carrier');
    const canalCount = getBuildingCount(buildings, 'irrigation_canal');
    const millCount = getBuildingCount(buildings, 'rice_mill');
    const sampanCount = getBuildingCount(buildings, 'sampan');
    const dingyCount = getBuildingCount(buildings, 'dingy');

    // Calculate visual density (how "full" the farm looks)
    const totalBuildings = paddyCount + wellCount + canalCount + millCount;
    const density = Math.min(totalBuildings / 20, 1); // Cap at 20 for "full"

    // Calculate farm "tier" for visual complexity
    let tier = 1;
    if (currentEra >= 2) tier = 2;
    if (millCount > 0) tier = Math.max(tier, 2);
    if (sampanCount > 0) tier = Math.max(tier, 2);

    return {
      paddyCount: Math.min(paddyCount, 12), // Cap display at 12 paddies
      workerCount: Math.min(workerCount, 6),
      buffaloCount: Math.min(buffaloCount, 4),
      wellCount: Math.min(wellCount, 2),
      carrierCount: Math.min(carrierCount, 3),
      canalCount: Math.min(canalCount, 2),
      millCount: Math.min(millCount, 2),
      sampanCount: Math.min(sampanCount, 3),
      dingyCount,
      density,
      tier,
      era: currentEra,
      hasCanal: isBuildingUnlocked(buildings, 'irrigation_canal') && canalCount > 0,
      hasMill: millCount > 0,
      hasBoats: sampanCount > 0,
      hasDingy: dingyCount > 0,
    };
  }, [buildings, currentEra]);

  // Generate paddy field grid
  const paddyGrid = useMemo(() => {
    const grid: Array<{ hasRice: boolean; hasWorker: boolean; hasBuffalo: boolean }> = [];
    for (let i = 0; i < 12; i++) {
      grid.push({
        hasRice: i < farmState.paddyCount,
        hasWorker: i < farmState.workerCount && i < farmState.paddyCount,
        hasBuffalo: i >= farmState.paddyCount - farmState.buffaloCount &&
                    i < farmState.paddyCount &&
                    farmState.buffaloCount > 0,
      });
    }
    return grid;
  }, [farmState.paddyCount, farmState.workerCount, farmState.buffaloCount]);

  return (
    <div className={`farm-visualization era-${farmState.era} tier-${farmState.tier}`}>
      {/* Sky Layer */}
      <div className="farm-sky">
        <span className="sky-element sun">☀️</span>
        <span className="sky-element cloud cloud-1">☁️</span>
        <span className="sky-element cloud cloud-2">☁️</span>
        {farmState.era >= 2 && (
          <span className="sky-element bird">🐦</span>
        )}
      </div>

      {/* Horizon / Background Elements */}
      <div className="farm-horizon">
        <span className="horizon-element tree tree-1">🌳</span>
        <span className="horizon-element home">🏠</span>
        <span className="horizon-element tree tree-2">🌴</span>
        {farmState.hasMill && (
          <span className="horizon-element mill">🏭</span>
        )}
      </div>

      {/* Infrastructure Row (Wells, Canals) */}
      <div className="farm-infrastructure">
        {Array(farmState.wellCount).fill(0).map((_, i) => (
          <span key={`well-${i}`} className="infra-element well">
            <span className="well-icon">⛲</span>
          </span>
        ))}
        {farmState.hasCanal && (
          <span className="infra-element canal">
            <span className="canal-label">〰️ Canal 〰️</span>
          </span>
        )}
        {Array(farmState.carrierCount).fill(0).map((_, i) => (
          <span key={`carrier-${i}`} className={`infra-element carrier carrier-${i}`}>
            🚶
          </span>
        ))}
      </div>

      {/* Main Paddy Grid - Fixed size cells! */}
      <div className="paddy-grid">
        {paddyGrid.map((cell, i) => (
          <div
            key={i}
            className={`paddy-cell ${cell.hasRice ? 'active' : 'empty'}`}
          >
            {cell.hasRice && (
              <>
                <span className="rice-plant r1">🌾</span>
                <span className="rice-plant r2">🌾</span>
                {cell.hasWorker && (
                  <span className="worker">👨‍🌾</span>
                )}
                {cell.hasBuffalo && !cell.hasWorker && (
                  <span className="buffalo">🐃</span>
                )}
              </>
            )}
            {!cell.hasRice && (
              <span className="empty-plot">◻️</span>
            )}
          </div>
        ))}
      </div>

      {/* River Layer */}
      <div className={`farm-river ${farmState.hasCanal ? 'with-canal' : ''}`}>
        <div className="water-flow">
          <span className="wave">〰️</span>
          <span className="wave">〰️</span>
          <span className="wave">〰️</span>
          <span className="wave">〰️</span>
        </div>
        {Array(farmState.sampanCount).fill(0).map((_, i) => (
          <span
            key={`boat-${i}`}
            className={`boat boat-${i}`}
            style={{ animationDelay: `${i * 2}s` }}
          >
            🚣
          </span>
        ))}
        {/* Dingy Trading Boat */}
        {farmState.hasDingy && (
          <div className="dingy-container">
            <span className="dingy">🚣</span>
            <span className="dingy-rice rice-1">🌾</span>
            <span className="dingy-rice rice-2">🌾</span>
            <span className="dingy-rice rice-3">🌾</span>
            <span className="dingy-dong dong-1">💰</span>
            <span className="dingy-dong dong-2">💰</span>
            <span className="dingy-dong dong-3">💰</span>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="farm-progress">
        <div
          className="progress-bar"
          style={{ width: `${farmState.density * 100}%` }}
        />
      </div>
    </div>
  );
}

export default FarmVisualization;
