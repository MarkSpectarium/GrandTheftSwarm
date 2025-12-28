import { GameHeader } from './GameHeader';
import { ResourcePanel } from './ResourcePanel';
import { HarvestButton } from './HarvestButton';
import { BuildingPanel } from './BuildingPanel';
import { UpgradePanel } from './UpgradePanel';
import { StatsPanel } from './StatsPanel';
import { AuthButton } from './AuthButton';
import { DebugResetButton } from './DebugResetButton';
import { FarmVisualization } from './FarmVisualization';

export function GameContainer() {
  return (
    <div className="game-container">
      <DebugResetButton />
      <AuthButton />
      <GameHeader />
      <FarmVisualization />
      <main className="game-main">
        <ResourcePanel />
        <HarvestButton />
        <BuildingPanel />
        <UpgradePanel />
      </main>
      <StatsPanel />
    </div>
  );
}
