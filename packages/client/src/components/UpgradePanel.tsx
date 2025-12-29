import { memo, useMemo, useCallback, useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { formatNumber } from '../utils/NumberFormatter';
import { getUpgradeIcon } from '../config/ui/icons.config';
import type { UpgradeConfig, UpgradeCategory } from '../config/types/upgrades';

// Category display configuration
const CATEGORY_CONFIG: Record<UpgradeCategory | 'all', { label: string; order: number }> = {
  all: { label: 'All', order: 0 },
  tools: { label: 'Tools', order: 1 },
  techniques: { label: 'Techniques', order: 2 },
  production: { label: 'Production', order: 3 },
  efficiency: { label: 'Efficiency', order: 4 },
  automation: { label: 'Automation', order: 5 },
  capacity: { label: 'Capacity', order: 6 },
  research: { label: 'Research', order: 7 },
  prestige: { label: 'Prestige', order: 8 },
  special: { label: 'Special', order: 9 },
};

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

type CategoryFilter = UpgradeCategory | 'all';

interface CategoryTabInfo {
  category: CategoryFilter;
  label: string;
  total: number;
  available: number;
  hasAffordable: boolean;
}

export function UpgradePanel() {
  const { game, state, config, actions } = useGame();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');

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

  // Calculate category stats for tabs
  const categoryTabs = useMemo((): CategoryTabInfo[] => {
    const stats = new Map<CategoryFilter, { total: number; available: number; hasAffordable: boolean }>();

    // Initialize all category with totals
    stats.set('all', { total: upgrades.length, available: 0, hasAffordable: false });

    for (const upgrade of upgrades) {
      const cat = upgrade.config.category;
      const current = stats.get(cat) || { total: 0, available: 0, hasAffordable: false };

      current.total++;
      if (!upgrade.purchased) {
        current.available++;
        if (upgrade.canAfford && upgrade.unlocked) {
          current.hasAffordable = true;
        }
      }
      stats.set(cat, current);

      // Update 'all' stats
      const allStats = stats.get('all')!;
      if (!upgrade.purchased) {
        allStats.available++;
        if (upgrade.canAfford && upgrade.unlocked) {
          allStats.hasAffordable = true;
        }
      }
    }

    // Convert to array and sort by order, only include categories with upgrades
    return Array.from(stats.entries())
      .filter(([_, info]) => info.total > 0)
      .map(([category, info]) => ({
        category,
        label: CATEGORY_CONFIG[category].label,
        ...info,
      }))
      .sort((a, b) => CATEGORY_CONFIG[a.category].order - CATEGORY_CONFIG[b.category].order);
  }, [upgrades]);

  // Filter upgrades by selected category
  const filteredUpgrades = useMemo(() => {
    if (selectedCategory === 'all') return upgrades;
    return upgrades.filter(u => u.config.category === selectedCategory);
  }, [upgrades, selectedCategory]);

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

  // Group filtered upgrades by purchased status
  const unpurchasedUpgrades = filteredUpgrades.filter(u => !u.purchased);
  const purchasedUpgrades = filteredUpgrades.filter(u => u.purchased);

  return (
    <section className="panel upgrade-panel">
      <h2>Upgrades</h2>

      {/* Category Tabs */}
      <div className="upgrade-tabs">
        {categoryTabs.map(tab => (
          <button
            key={tab.category}
            className={`upgrade-tab ${selectedCategory === tab.category ? 'active' : ''} ${tab.hasAffordable ? 'has-affordable' : ''}`}
            onClick={() => setSelectedCategory(tab.category)}
          >
            <span className="tab-label">{tab.label}</span>
            {tab.available > 0 && (
              <span className="tab-badge">{tab.available}</span>
            )}
          </button>
        ))}
      </div>

      <div className="upgrade-list">
        {unpurchasedUpgrades.length === 0 && purchasedUpgrades.length === 0 ? (
          <p className="no-upgrades">
            {selectedCategory === 'all'
              ? 'No upgrades available yet'
              : `No ${CATEGORY_CONFIG[selectedCategory].label.toLowerCase()} upgrades available`}
          </p>
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
                <h3>Owned {selectedCategory !== 'all' ? CATEGORY_CONFIG[selectedCategory].label : ''} Upgrades ({purchasedUpgrades.length})</h3>
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
