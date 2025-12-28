import { useGame } from '../contexts/GameContext';

export function DebugResetButton() {
  const { actions } = useGame();

  return (
    <div className="debug-section">
      <button className="debug-reset-btn" onClick={() => actions.reset()}>
        Reset
      </button>
    </div>
  );
}
