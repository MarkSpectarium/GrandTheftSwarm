/**
 * FarmVisualization Component
 *
 * A dynamic visual representation of the farm that grows as the player
 * purchases buildings, upgrades, and progresses through eras.
 *
 * Performance optimizations:
 * - Debounced state updates to prevent excessive re-renders
 * - Memoized sub-components for instanced elements
 * - Separated static layers from dynamic layers
 */

import { useMemo, useRef, useEffect, useState, memo } from 'react';
import { useGame } from '../contexts/GameContext';
import './FarmVisualization.css';

// =============================================================================
// Types
// =============================================================================

interface FarmState {
  paddyCount: number;
  workerCount: number;
  buffaloCount: number;
  wellCount: number;
  carrierCount: number;
  canalCount: number;
  millCount: number;
  sampanCount: number;
  density: number;
  tier: number;
  era: number;
  hasCanal: boolean;
  hasMill: boolean;
  hasBoats: boolean;
}

interface PaddyCellData {
  hasRice: boolean;
  hasWorker: boolean;
  hasBuffalo: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const GRID_SIZE = 12;
const UPDATE_DEBOUNCE_MS = 250;

// Display caps to prevent visual overload
const DISPLAY_CAPS = {
  paddy: 12,
  worker: 6,
  buffalo: 4,
  well: 2,
  carrier: 3,
  canal: 2,
  mill: 2,
  sampan: 3,
} as const;

// =============================================================================
// Helpers
// =============================================================================

function getBuildingCount(buildings: Record<string, { owned?: number }>, id: string): number {
  return buildings[id]?.owned ?? 0;
}

function isBuildingUnlocked(buildings: Record<string, { unlocked?: boolean }>, id: string): boolean {
  return buildings[id]?.unlocked ?? false;
}

// =============================================================================
// Memoized Sub-Components (Instancing)
// =============================================================================

/** Static sky layer - never re-renders after mount */
const SkyLayer = memo(function SkyLayer({ showBird }: { showBird: boolean }) {
  return (
    <div className="farm-sky">
      <span className="sky-element sun">☀️</span>
      <span className="sky-element cloud cloud-1">☁️</span>
      <span className="sky-element cloud cloud-2">☁️</span>
      {showBird && <span className="sky-element bird">🐦</span>}
    </div>
  );
});

/** Static horizon layer */
const HorizonLayer = memo(function HorizonLayer({ hasMill }: { hasMill: boolean }) {
  return (
    <div className="farm-horizon">
      <span className="horizon-element tree tree-1">🌳</span>
      <span className="horizon-element home">🏠</span>
      <span className="horizon-element tree tree-2">🌴</span>
      {hasMill && <span className="horizon-element mill">🏭</span>}
    </div>
  );
});

/** Instanced well component */
const Well = memo(function Well() {
  return (
    <span className="infra-element well">
      <span className="well-icon">⛲</span>
    </span>
  );
});

/** Instanced carrier component */
const Carrier = memo(function Carrier({ index }: { index: number }) {
  return (
    <span className={`infra-element carrier carrier-${index}`}>🚶</span>
  );
});

/** Instanced paddy cell component */
const PaddyCell = memo(function PaddyCell({
  hasRice,
  hasWorker,
  hasBuffalo
}: PaddyCellData) {
  if (!hasRice) {
    return (
      <div className="paddy-cell empty">
        <span className="empty-plot">◻️</span>
      </div>
    );
  }

  return (
    <div className="paddy-cell active">
      <span className="rice-plant r1">🌾</span>
      <span className="rice-plant r2">🌾</span>
      {hasWorker && <span className="worker">👨‍🌾</span>}
      {hasBuffalo && !hasWorker && <span className="buffalo">🐃</span>}
    </div>
  );
});

/** Instanced boat component */
const Boat = memo(function Boat({ index }: { index: number }) {
  return (
    <span
      className={`boat boat-${index}`}
      style={{ animationDelay: `${index * 2}s` }}
    >
      🚣
    </span>
  );
});

/** Static water flow component */
const WaterFlow = memo(function WaterFlow() {
  return (
    <div className="water-flow">
      <span className="wave">〰️</span>
      <span className="wave">〰️</span>
      <span className="wave">〰️</span>
      <span className="wave">〰️</span>
    </div>
  );
});

/** River layer with boats */
const RiverLayer = memo(function RiverLayer({
  hasCanal,
  sampanCount
}: {
  hasCanal: boolean;
  sampanCount: number;
}) {
  // Pre-generate boat indices to avoid recreating array each render
  const boatIndices = useMemo(() =>
    Array.from({ length: sampanCount }, (_, i) => i),
    [sampanCount]
  );

  return (
    <div className={`farm-river ${hasCanal ? 'with-canal' : ''}`}>
      <WaterFlow />
      {boatIndices.map(i => <Boat key={i} index={i} />)}
    </div>
  );
});

/** Infrastructure layer */
const InfrastructureLayer = memo(function InfrastructureLayer({
  wellCount,
  carrierCount,
  hasCanal,
}: {
  wellCount: number;
  carrierCount: number;
  hasCanal: boolean;
}) {
  // Pre-generate indices
  const wellIndices = useMemo(() =>
    Array.from({ length: wellCount }, (_, i) => i),
    [wellCount]
  );
  const carrierIndices = useMemo(() =>
    Array.from({ length: carrierCount }, (_, i) => i),
    [carrierCount]
  );

  return (
    <div className="farm-infrastructure">
      {wellIndices.map(i => <Well key={`well-${i}`} />)}
      {hasCanal && (
        <span className="infra-element canal">
          <span className="canal-label">〰️ Canal 〰️</span>
        </span>
      )}
      {carrierIndices.map(i => <Carrier key={`carrier-${i}`} index={i} />)}
    </div>
  );
});

/** Paddy grid layer */
const PaddyGridLayer = memo(function PaddyGridLayer({
  grid
}: {
  grid: PaddyCellData[];
}) {
  return (
    <div className="paddy-grid">
      {grid.map((cell, i) => (
        <PaddyCell
          key={i}
          hasRice={cell.hasRice}
          hasWorker={cell.hasWorker}
          hasBuffalo={cell.hasBuffalo}
        />
      ))}
    </div>
  );
});

/** Progress bar */
const ProgressBar = memo(function ProgressBar({ density }: { density: number }) {
  return (
    <div className="farm-progress">
      <div
        className="progress-bar"
        style={{ width: `${density * 100}%` }}
      />
    </div>
  );
});

// =============================================================================
// Custom Hook: Debounced Farm State
// =============================================================================

function useDebouncedFarmState(
  buildings: Record<string, { owned?: number; unlocked?: boolean }>,
  currentEra: number
): FarmState {
  const [debouncedState, setDebouncedState] = useState<FarmState>(() =>
    computeFarmState(buildings, currentEra)
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastStateRef = useRef<string>('');

  useEffect(() => {
    const newState = computeFarmState(buildings, currentEra);
    const stateKey = JSON.stringify(newState);

    // Skip if state hasn't actually changed
    if (stateKey === lastStateRef.current) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the update
    timeoutRef.current = setTimeout(() => {
      lastStateRef.current = stateKey;
      setDebouncedState(newState);
    }, UPDATE_DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [buildings, currentEra]);

  return debouncedState;
}

function computeFarmState(
  buildings: Record<string, { owned?: number; unlocked?: boolean }>,
  currentEra: number
): FarmState {
  const paddyCount = getBuildingCount(buildings, 'paddy_field');
  const workerCount = getBuildingCount(buildings, 'family_worker');
  const buffaloCount = getBuildingCount(buildings, 'buffalo');
  const wellCount = getBuildingCount(buildings, 'village_well');
  const carrierCount = getBuildingCount(buildings, 'water_carrier');
  const canalCount = getBuildingCount(buildings, 'irrigation_canal');
  const millCount = getBuildingCount(buildings, 'rice_mill');
  const sampanCount = getBuildingCount(buildings, 'sampan');

  // Calculate visual density (how "full" the farm looks)
  const totalBuildings = paddyCount + wellCount + canalCount + millCount;
  const density = Math.min(totalBuildings / 20, 1);

  // Calculate farm "tier" for visual complexity
  let tier = 1;
  if (currentEra >= 2) tier = 2;
  if (millCount > 0) tier = Math.max(tier, 2);
  if (sampanCount > 0) tier = Math.max(tier, 2);

  return {
    paddyCount: Math.min(paddyCount, DISPLAY_CAPS.paddy),
    workerCount: Math.min(workerCount, DISPLAY_CAPS.worker),
    buffaloCount: Math.min(buffaloCount, DISPLAY_CAPS.buffalo),
    wellCount: Math.min(wellCount, DISPLAY_CAPS.well),
    carrierCount: Math.min(carrierCount, DISPLAY_CAPS.carrier),
    canalCount: Math.min(canalCount, DISPLAY_CAPS.canal),
    millCount: Math.min(millCount, DISPLAY_CAPS.mill),
    sampanCount: Math.min(sampanCount, DISPLAY_CAPS.sampan),
    density,
    tier,
    era: currentEra,
    hasCanal: isBuildingUnlocked(buildings, 'irrigation_canal') && canalCount > 0,
    hasMill: millCount > 0,
    hasBoats: sampanCount > 0,
  };
}

// =============================================================================
// Main Component
// =============================================================================

export function FarmVisualization() {
  const { state } = useGame();
  const { buildings, currentEra } = state;

  // Debounced farm state to reduce re-renders
  const farmState = useDebouncedFarmState(buildings, currentEra);

  // Generate paddy field grid
  const paddyGrid = useMemo((): PaddyCellData[] => {
    const grid: PaddyCellData[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
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
      <SkyLayer showBird={farmState.era >= 2} />
      <HorizonLayer hasMill={farmState.hasMill} />
      <InfrastructureLayer
        wellCount={farmState.wellCount}
        carrierCount={farmState.carrierCount}
        hasCanal={farmState.hasCanal}
      />
      <PaddyGridLayer grid={paddyGrid} />
      <RiverLayer
        hasCanal={farmState.hasCanal}
        sampanCount={farmState.sampanCount}
      />
      <ProgressBar density={farmState.density} />
    </div>
  );
}

export default FarmVisualization;
