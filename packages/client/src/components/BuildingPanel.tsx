import { memo, useMemo, useCallback } from 'react';
import { useGame } from '../contexts/GameContext';
import { formatNumber, formatRate } from '../utils/NumberFormatter';
import { getBuildingIcon } from '../config/ui/icons.config';
import type { BuildingConfig } from '../config/types/buildings';

interface BuildingItemProps {
  config: BuildingConfig;
  owned: number;
  canAfford: boolean;
  currentCost: Array<{ resourceId: string; amount: number }>;
  productionPerSecond: Record<string, number>;
  onPurchase: () => void;
  getResourceName: (id: string) => string;
}

const BuildingItem = memo(function BuildingItem({
  config,
  owned,
  canAfford,
  currentCost,
  productionPerSecond,
  onPurchase,
  getResourceName,
}: BuildingItemProps) {
  const costText = currentCost
    .map(c => `${formatNumber(c.amount)} ${getResourceName(c.resourceId)}`)
    .join(', ');

  const productionText = Object.entries(productionPerSecond)
    .map(([id, rate]) => `${formatRate(rate)} ${getResourceName(id)}`)
    .join(', ');

  return (
    <div
      className={`building-item ${canAfford ? '' : 'cannot-afford'}`}
      data-building={config.id}
    >
      <div className="building-header">
        <span className="building-icon">{getBuildingIcon(config.id)}</span>
        <span className="building-name">{config.name}</span>
        <span className="building-owned">x{owned}</span>
      </div>
      <div className="building-info">
        <span className="building-production">
          {productionText || 'Passive production'}
        </span>
      </div>
      <div className="building-cost">Cost: {costText}</div>
      <button
        className="building-buy-btn"
        disabled={!canAfford}
        onClick={onPurchase}
      >
        Buy
      </button>
    </div>
  );
});

export function BuildingPanel() {
  const { game, state, config, actions } = useGame();

  const buildingSystem = (game as unknown as {
    buildingSystem: {
      getAvailableBuildings: () => Array<{
        config: BuildingConfig;
        owned: number;
        unlocked: boolean;
        canAfford: boolean;
        currentCost: Array<{ resourceId: string; amount: number }>;
        productionPerSecond: Record<string, number>;
      }>;
    };
  }).buildingSystem;

  const buildings = useMemo(() => {
    return buildingSystem.getAvailableBuildings().filter(b => b.unlocked);
  }, [buildingSystem, state.buildings, state.resources]);

  const getResourceName = useCallback((resourceId: string): string => {
    const resource = config.resources.find(r => r.id === resourceId);
    return resource?.name || resourceId;
  }, [config.resources]);

  const handlePurchase = useCallback((buildingId: string) => {
    actions.purchaseBuilding(buildingId, 1);
  }, [actions]);

  return (
    <section className="panel building-panel">
      <h2>Buildings</h2>
      <div className="building-list">
        {buildings.length === 0 ? (
          <p className="no-buildings">No buildings available yet</p>
        ) : (
          buildings.map(building => (
            <BuildingItem
              key={building.config.id}
              config={building.config}
              owned={building.owned}
              canAfford={building.canAfford}
              currentCost={building.currentCost}
              productionPerSecond={building.productionPerSecond}
              onPurchase={() => handlePurchase(building.config.id)}
              getResourceName={getResourceName}
            />
          ))
        )}
      </div>
    </section>
  );
}
