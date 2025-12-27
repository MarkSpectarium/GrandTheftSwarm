import { useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import { formatNumber } from '../utils/NumberFormatter';

export function StatsPanel() {
  const { state } = useGame();
  const { statistics } = state;

  const playTime = useMemo(() => {
    const totalSeconds = Math.floor(statistics.totalPlayTimeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  }, [statistics.totalPlayTimeMs]);

  return (
    <section className="panel stats-panel">
      <h2>Statistics</h2>
      <div className="stats-list">
        <div className="stat-item">
          <span className="stat-label">Total Clicks</span>
          <span className="stat-value">{formatNumber(statistics.totalClicks)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Rice Harvested (Click)</span>
          <span className="stat-value">{formatNumber(statistics.totalClickHarvested)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Buildings Purchased</span>
          <span className="stat-value">{formatNumber(statistics.totalBuildingsPurchased)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Play Time</span>
          <span className="stat-value">{playTime}</span>
        </div>
      </div>
    </section>
  );
}
