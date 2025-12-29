import { memo, useMemo, useCallback } from 'react';
import { useGame } from '../contexts/GameContext';
import { formatNumber, formatRate } from '../utils/NumberFormatter';
import { getBuildingIcon } from '../config/ui/icons.config';
import type { BuildingConfig } from '../config/types/buildings';
import type { BuildingInfo } from '../systems/BuildingSystem';

interface BuildingItemProps {
  config: BuildingConfig;
  owned: number;
  canAfford: boolean;
  currentCost: Array<{ resourceId: string; amount: number }>;
  productionPerSecond: Record<string, number>;
  health?: {
    current: number;
    max: number;
    percentage: number;
    isCritical: boolean;
  };
  consumptionPerTick?: Record<string, number>;
  preview: BuildingInfo['preview'];
  nextPurchase: BuildingInfo['nextPurchase'];
  resourceLimitConfig?: BuildingInfo['resourceLimitConfig'];
  onPurchase: () => void;
  onResourceLimitChange?: (limit: number) => void;
  getResourceName: (id: string) => string;
}

const BuildingItem = memo(function BuildingItem({
  config,
  owned,
  canAfford,
  currentCost,
  productionPerSecond,
  health,
  consumptionPerTick,
  preview,
  nextPurchase,
  resourceLimitConfig,
  onPurchase,
  onResourceLimitChange,
  getResourceName,
}: BuildingItemProps) {
  const costText = currentCost
    .map(c => `${formatNumber(c.amount)} ${getResourceName(c.resourceId)}`)
    .join(', ');

  const productionText = Object.entries(productionPerSecond)
    .map(([id, rate]) => `${formatRate(rate)} ${getResourceName(id)}`)
    .join(', ');

  const consumptionText = consumptionPerTick
    ? Object.entries(consumptionPerTick)
        .map(([id, rate]) => `-${formatRate(rate)} ${getResourceName(id)}`)
        .join(', ')
    : null;

  // Build preview text showing what one unit does
  const previewOutputText = preview.outputsPerUnit
    .map(o => {
      if (preview.isBatchProduction && preview.cycleDurationSeconds) {
        return `${formatNumber(o.amount)} ${getResourceName(o.resourceId)} per ${preview.cycleDurationSeconds}s trip`;
      }
      return `${formatRate(o.perSecond)} ${getResourceName(o.resourceId)}`;
    })
    .join(', ');

  const previewInputText = preview.inputsPerUnit
    ? preview.inputsPerUnit
        .map(i => `${formatNumber(i.perCycle)} ${getResourceName(i.resourceId)}`)
        .join(', ')
    : null;

  // Build next purchase info text
  const nextPurchaseText = Object.entries(nextPurchase.productionIncrease)
    .map(([id, rate]) => `+${formatRate(rate)} ${getResourceName(id)}`)
    .join(', ');

  const nextCostText = nextPurchase.nextCost
    .map(c => `${formatNumber(c.amount)} ${getResourceName(c.resourceId)}`)
    .join(', ');

  // Calculate effective max resources based on slider
  const effectiveMaxDisplay = resourceLimitConfig && preview.inputsPerUnit?.[0]
    ? Math.floor(preview.inputsPerUnit[0].perCycle * owned * resourceLimitConfig.currentLimit)
    : null;

  return (
    <div
      className={`building-item ${canAfford ? '' : 'cannot-afford'} ${health?.isCritical ? 'health-critical' : ''}`}
      data-building={config.id}
    >
      <div className="building-header">
        <span className="building-icon">{getBuildingIcon(config.id)}</span>
        <span className="building-name">{config.name}</span>
        <span className="building-owned">x{owned}</span>
      </div>

      {/* Health bar for buildings with consumption */}
      {health && owned > 0 && (
        <div className="building-health">
          <div className="health-bar-container">
            <div
              className={`health-bar-fill ${health.isCritical ? 'critical' : ''}`}
              style={{ width: `${health.percentage}%` }}
            />
          </div>
          <span className="health-text">
            {Math.floor(health.current)}/{health.max} HP
          </span>
        </div>
      )}

      {/* Preview section showing what the building does */}
      <div className="building-preview">
        <div className="preview-production">
          <span className="preview-label">Per unit:</span>
          <span className="preview-value">{previewOutputText}</span>
        </div>
        {previewInputText && (
          <div className="preview-consumption">
            <span className="preview-label">Uses:</span>
            <span className="preview-value">{previewInputText}{preview.isBatchProduction ? '/trip' : '/cycle'}</span>
          </div>
        )}
        {preview.effects && preview.effects.length > 0 && (
          <div className="preview-effects">
            <span className="preview-label">Effects:</span>
            <span className="preview-value">{preview.effects.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Current production for owned buildings */}
      {owned > 0 && (
        <div className="building-info">
          <span className="building-production">
            Total: {productionText || 'Passive production'}
          </span>
          {consumptionText && (
            <span className="building-consumption">
              Consumes: {consumptionText}
            </span>
          )}
        </div>
      )}

      {/* Resource limit slider for transport buildings */}
      {resourceLimitConfig?.hasSlider && owned > 0 && (
        <div className="building-resource-limit">
          <div className="resource-limit-header">
            <span className="resource-limit-label">Resource Limit:</span>
            <span className="resource-limit-value">
              {Math.round(resourceLimitConfig.currentLimit * 100)}%
              {effectiveMaxDisplay !== null && ` (max ${formatNumber(effectiveMaxDisplay)} per trip)`}
            </span>
          </div>
          <input
            type="range"
            className="resource-limit-slider"
            min="0"
            max="100"
            value={Math.round(resourceLimitConfig.currentLimit * 100)}
            onChange={(e) => onResourceLimitChange?.(parseInt(e.target.value, 10) / 100)}
          />
        </div>
      )}

      {/* Next purchase info */}
      <div className="building-next-purchase">
        <span className="next-purchase-benefit">{nextPurchaseText}</span>
        <span className="next-purchase-cost">Next: {nextCostText}</span>
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
      getAvailableBuildings: () => BuildingInfo[];
      setResourceLimit: (buildingId: string, limit: number) => void;
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

  const handleResourceLimitChange = useCallback((buildingId: string, limit: number) => {
    buildingSystem.setResourceLimit(buildingId, limit);
  }, [buildingSystem]);

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
              health={building.health}
              consumptionPerTick={building.consumptionPerTick}
              preview={building.preview}
              nextPurchase={building.nextPurchase}
              resourceLimitConfig={building.resourceLimitConfig}
              onPurchase={() => handlePurchase(building.config.id)}
              onResourceLimitChange={(limit) => handleResourceLimitChange(building.config.id, limit)}
              getResourceName={getResourceName}
            />
          ))
        )}
      </div>
    </section>
  );
}
