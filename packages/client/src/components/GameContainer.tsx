import { useState, useCallback } from 'react';
import { GameHeader } from './GameHeader';
import { ResourcePanel } from './ResourcePanel';
import { HarvestButton } from './HarvestButton';
import { BuildingPanel } from './BuildingPanel';
import { UpgradePanel } from './UpgradePanel';
import { StatsPanel } from './StatsPanel';
import { AuthButton } from './AuthButton';
import { DebugResetButton } from './DebugResetButton';
import { FarmVisualization } from './FarmVisualization';
import { ConfigEditor } from './ConfigEditor';
import { ConfigEditorButton } from './ConfigEditorButton';

export function GameContainer() {
  const [isConfigEditorOpen, setIsConfigEditorOpen] = useState(false);

  const handleOpenConfigEditor = useCallback(() => {
    setIsConfigEditorOpen(true);
  }, []);

  const handleCloseConfigEditor = useCallback(() => {
    setIsConfigEditorOpen(false);
  }, []);

  const handleApplyConfig = useCallback(() => {
    // Config changes require a page reload to take effect
    // The ConfigOverrideSystem persists changes to localStorage
    // and they are applied when the game reinitializes
    window.location.reload();
  }, []);

  return (
    <div className="game-container">
      <DebugResetButton />
      <AuthButton />
      <ConfigEditorButton onClick={handleOpenConfigEditor} />
      <GameHeader />
      <FarmVisualization />
      <main className="game-main">
        <ResourcePanel />
        <HarvestButton />
        <BuildingPanel />
        <UpgradePanel />
      </main>
      <StatsPanel />
      <ConfigEditor
        isOpen={isConfigEditorOpen}
        onClose={handleCloseConfigEditor}
        onApply={handleApplyConfig}
      />
    </div>
  );
}
