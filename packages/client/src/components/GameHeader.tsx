import { useGame } from '../contexts/GameContext';
import { useTheme } from '../contexts/ThemeContext';

export function GameHeader() {
  const { config } = useGame();
  const { era } = useTheme();

  return (
    <header className="game-header">
      <h1 className="game-title">{config.meta.name}</h1>
      <div className="era-indicator">
        Era {era.id}: {era.name} ({era.timePeriod})
      </div>
    </header>
  );
}
