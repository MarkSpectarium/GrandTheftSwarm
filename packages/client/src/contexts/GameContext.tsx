import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { Game, createGame, getGame } from '../Game';
import type { RuntimeGameState } from '../state/GameState';
import type { GameConfig } from '../config';

interface GameContextValue {
  game: Game;
  state: Readonly<RuntimeGameState>;
  config: GameConfig;
  isInitialized: boolean;
  actions: {
    harvest: () => void;
    purchaseBuilding: (buildingId: string, count?: number) => boolean;
    save: () => boolean;
    reset: () => void;
    exportSave: () => string;
    importSave: (data: string) => boolean;
  };
}

const GameContext = createContext<GameContextValue | null>(null);

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [state, setState] = useState<RuntimeGameState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize game on mount
  useEffect(() => {
    // Check if game already exists (hot reload)
    let gameInstance = getGame();

    if (!gameInstance) {
      gameInstance = createGame({
        autoStart: false,
      });
    }

    setGame(gameInstance);

    // Subscribe to state changes
    const stateManager = (gameInstance as unknown as { stateManager: { subscribe: (cb: (s: RuntimeGameState) => void) => () => void; getState: () => RuntimeGameState } }).stateManager;

    setState(stateManager.getState());

    const unsubscribe = stateManager.subscribe((newState: RuntimeGameState) => {
      setState(newState);
    });

    setIsInitialized(true);
    gameInstance.start();

    return () => {
      unsubscribe();
    };
  }, []);

  // Action handlers
  const harvest = useCallback(() => {
    if (!game) return;
    const resourceSystem = (game as unknown as { resourceSystem: { processClick: () => void } }).resourceSystem;
    resourceSystem.processClick();
  }, [game]);

  const purchaseBuilding = useCallback((buildingId: string, count = 1): boolean => {
    if (!game) return false;
    return game.purchaseBuilding(buildingId, count);
  }, [game]);

  const save = useCallback((): boolean => {
    if (!game) return false;
    return game.save();
  }, [game]);

  const reset = useCallback(() => {
    if (!game) return;
    game.reset();
  }, [game]);

  const exportSave = useCallback((): string => {
    if (!game) return '';
    return game.exportSave();
  }, [game]);

  const importSave = useCallback((data: string): boolean => {
    if (!game) return false;
    return game.importSave(data);
  }, [game]);

  const actions = useMemo(() => ({
    harvest,
    purchaseBuilding,
    save,
    reset,
    exportSave,
    importSave,
  }), [harvest, purchaseBuilding, save, reset, exportSave, importSave]);

  const value = useMemo<GameContextValue | null>(() => {
    if (!game || !state) return null;

    return {
      game,
      state,
      config: game.getConfig(),
      isInitialized,
      actions,
    };
  }, [game, state, isInitialized, actions]);

  if (!value) {
    return null; // Still loading
  }

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
