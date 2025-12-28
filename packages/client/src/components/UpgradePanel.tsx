import { memo, useMemo, useCallback } from 'react';
import { useGame } from '../contexts/GameContext';
import { formatNumber } from '../utils/NumberFormatter';
import { getUpgradeIcon } from '../config/ui/icons.config';
import type { UpgradeConfig } from '../config/types/upgrades';

interface UpgradeItemProps {
  config: UpgradeConfig;
  purchased: boolean;
  unlocked: boolean;
  canAfford: boolean;
  currentCost: Array<{ resourceId: string; amount: number }>;
  onPurchase: () => void;
  getResourceName: (id: string) => string;
}

const UpgradeItem = memo(function UpgradeItem({
  config,
  purchased,
  unlocked,
  canAfford,
  currentCost,
  onPurchase,
  getResourceName,
}: UpgradeItemProps) {
  const costText = currentCost
    .map(c => `${formatNumber(c.amount)} ${getResourceName(c.resourceId)}`)
    .join(', ');

  const statusClass = purchased
    ? 'purchased'
    : !unlocked
    ? 'locked'
    : canAfford
    ? 'available'
    : 'cannot-afford';

  return (
    <div
      className={`upgrade-item ${statusClass}`}
      data-upgrade={config.id}
    >
      <div className="upgrade-header">
        <span className="upgrade-icon">{getUpgradeIcon(config.id)}</span>
        <span className="upgrade-name">{config.name}</span>
        {purchased && <span className="upgrade-purchased-badge">Owned</span>}
      </div>
      <div className="upgrade-description">{config.description}</div>
      {config.flavorText && (
        <div className="upgrade-flavor">"{config.flavorText}"</div>
      )}
      {!purchased && (
        <>
          <div className="upgrade-cost">Cost: {costText}</div>
          <button
            className="upgrade-buy-btn"
            disabled={!unlocked || !canAfford}
            onClick={onPurchase}
          >
            {!unlocked ? 'Locked' : 'Purchase'}
          </button>
        </>
      )}
    </div>
  );
});

export function UpgradePanel() {
  const { game, state, config, actions } = useGame();

  const upgradeSystem = (game as unknown as {
    upgradeSystem?: {
      getAvailableUpgrades: () => Array<{
        config: UpgradeConfig;
        purchased: boolean;
        unlocked: boolean;
        visible: boolean;
        canAfford: boolean;
        currentCost: Array<{ resourceId: string; amount: number }>;
      }>;
    };
  }).upgradeSystem;

  const upgrades = useMemo(() => {
    if (!upgradeSystem) return [];
    return upgradeSystem.getAvailableUpgrades();
  }, [upgradeSystem, state.upgrades, state.resources]);

  const getResourceName = useCallback((resourceId: string): string => {
    const resource = config.resources.find(r => r.id === resourceId);
    return resource?.name || resourceId;
  }, [config.resources]);

  const handlePurchase = useCallback((upgradeId: string) => {
    if (actions.purchaseUpgrade) {
      actions.purchaseUpgrade(upgradeId);
    }
  }, [actions]);

  // Don't render if no upgrade system or no upgrades available
  if (!upgradeSystem || upgrades.length === 0) {
    return null;
  }

  // Group upgrades by category
  const unpurchasedUpgrades = upgrades.filter(u => !u.purchased);
  const purchasedUpgrades = upgrades.filter(u => u.purchased);

  return (
    <section className="panel upgrade-panel">
      <h2>Upgrades</h2>
      <div className="upgrade-list">
        {unpurchasedUpgrades.length === 0 && purchasedUpgrades.length === 0 ? (
          <p className="no-upgrades">No upgrades available yet</p>
        ) : (
          <>
            {unpurchasedUpgrades.map(upgrade => (
              <UpgradeItem
                key={upgrade.config.id}
                config={upgrade.config}
                purchased={upgrade.purchased}
                unlocked={upgrade.unlocked}
                canAfford={upgrade.canAfford}
                currentCost={upgrade.currentCost}
                onPurchase={() => handlePurchase(upgrade.config.id)}
                getResourceName={getResourceName}
              />
            ))}
            {purchasedUpgrades.length > 0 && (
              <div className="purchased-upgrades">
                <h3>Owned Upgrades ({purchasedUpgrades.length})</h3>
                {purchasedUpgrades.map(upgrade => (
                  <UpgradeItem
                    key={upgrade.config.id}
                    config={upgrade.config}
                    purchased={upgrade.purchased}
                    unlocked={upgrade.unlocked}
                    canAfford={upgrade.canAfford}
                    currentCost={upgrade.currentCost}
                    onPurchase={() => {}}
                    getResourceName={getResourceName}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
