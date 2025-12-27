import { memo, useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import { formatNumber, formatRate } from '../utils/NumberFormatter';
import { getResourceIcon } from '../config/ui/icons.config';

interface ResourceItemProps {
  id: string;
  name: string;
  current: number;
  productionRate: number;
}

const ResourceItem = memo(function ResourceItem({
  id,
  name,
  current,
  productionRate
}: ResourceItemProps) {
  return (
    <div className="resource-item" data-resource={id}>
      <span className="resource-icon">{getResourceIcon(id)}</span>
      <span className="resource-name">{name}</span>
      <span className="resource-amount">{formatNumber(current)}</span>
      <span className="resource-rate">
        {productionRate > 0 ? formatRate(productionRate) : ''}
      </span>
    </div>
  );
});

export function ResourcePanel() {
  const { game, state } = useGame();

  const resourceSystem = (game as unknown as {
    resourceSystem: {
      getUnlockedResources: () => Array<{ id: string; name: string }>;
      getProductionRate: (id: string) => { perSecond: number };
    }
  }).resourceSystem;

  const unlockedResources = useMemo(() => {
    return resourceSystem.getUnlockedResources();
  }, [resourceSystem]);

  const resourceData = useMemo(() => {
    return unlockedResources.map(resource => ({
      id: resource.id,
      name: resource.name,
      current: state.resources[resource.id]?.current ?? 0,
      productionRate: resourceSystem.getProductionRate(resource.id).perSecond,
    }));
  }, [unlockedResources, state.resources, resourceSystem]);

  return (
    <section className="panel resource-panel">
      <h2>Resources</h2>
      <div className="resource-list">
        {resourceData.map(resource => (
          <ResourceItem
            key={resource.id}
            id={resource.id}
            name={resource.name}
            current={resource.current}
            productionRate={resource.productionRate}
          />
        ))}
      </div>
    </section>
  );
}
