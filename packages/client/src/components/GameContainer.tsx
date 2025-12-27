import { GameHeader } from './GameHeader';
import { ResourcePanel } from './ResourcePanel';
import { HarvestButton } from './HarvestButton';
import { BuildingPanel } from './BuildingPanel';
import { StatsPanel } from './StatsPanel';
import { AuthButton } from './AuthButton';

export function GameContainer() {
  return (
    <div className="game-container">
      <AuthButton />
      <GameHeader />
      <main className="game-main">
        <ResourcePanel />
        <HarvestButton />
        <BuildingPanel />
      </main>
      <StatsPanel />
    </div>
  );
}
