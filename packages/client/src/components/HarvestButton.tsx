import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../contexts/GameContext';
import { formatNumber } from '../utils/NumberFormatter';

interface FloatingTextProps {
  text: string;
  x: number;
  y: number;
  onComplete: () => void;
}

function FloatingText({ text, x, y, onComplete }: FloatingTextProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return createPortal(
    <div
      className="floating-text"
      style={{ left: x, top: y }}
    >
      {text}
    </div>,
    document.body
  );
}

export function HarvestButton() {
  const { game, state, actions, config } = useGame();
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<Array<{ id: number; x: number; y: number; amount: number }>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const nextIdRef = useRef(0);

  // Get current click power from multiplier system
  // Re-calculate when upgrades change (state.upgrades triggers re-render)
  const clickPower = useMemo(() => {
    const multiplierSystem = (game as unknown as {
      multiplierSystem?: { getValue: (stackId: string) => number };
    }).multiplierSystem;

    if (!multiplierSystem) return config.gameplay.clickBaseAmount;

    const clickMultiplier = multiplierSystem.getValue("click_power");
    const allProdMultiplier = multiplierSystem.getValue("all_production");
    return config.gameplay.clickBaseAmount * clickMultiplier * allProdMultiplier;
  }, [game, config.gameplay.clickBaseAmount, state.upgrades]);

  const handleClick = useCallback(() => {
    actions.harvest();

    // Animate button
    setIsHarvesting(true);
    setTimeout(() => setIsHarvesting(false), 100);

    // Show floating text with actual amount
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const id = nextIdRef.current++;
      setFloatingTexts(prev => [...prev, {
        id,
        x: rect.left + rect.width / 2,
        y: rect.top,
        amount: clickPower,
      }]);
    }
  }, [actions, clickPower]);

  const removeFloatingText = useCallback((id: number) => {
    setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
  }, []);

  return (
    <section className="panel harvest-panel">
      <button
        ref={buttonRef}
        className={`harvest-button ${isHarvesting ? 'harvesting' : ''}`}
        onClick={handleClick}
      >
        <span className="harvest-icon">🌾</span>
        <span className="harvest-text">Harvest Rice</span>
        <span className="harvest-amount">+{formatNumber(clickPower)} per click</span>
      </button>

      {floatingTexts.map(ft => (
        <FloatingText
          key={ft.id}
          text={`+${formatNumber(ft.amount)}`}
          x={ft.x}
          y={ft.y}
          onComplete={() => removeFloatingText(ft.id)}
        />
      ))}
    </section>
  );
}
