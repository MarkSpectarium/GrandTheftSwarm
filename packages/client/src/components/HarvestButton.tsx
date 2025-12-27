import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../contexts/GameContext';

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
  const { actions } = useGame();
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const nextIdRef = useRef(0);

  const handleClick = useCallback(() => {
    actions.harvest();

    // Animate button
    setIsHarvesting(true);
    setTimeout(() => setIsHarvesting(false), 100);

    // Show floating text
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const id = nextIdRef.current++;
      setFloatingTexts(prev => [...prev, {
        id,
        x: rect.left + rect.width / 2,
        y: rect.top,
      }]);
    }
  }, [actions]);

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
        <span className="harvest-amount"></span>
      </button>

      {floatingTexts.map(ft => (
        <FloatingText
          key={ft.id}
          text="+1"
          x={ft.x}
          y={ft.y}
          onComplete={() => removeFloatingText(ft.id)}
        />
      ))}
    </section>
  );
}
