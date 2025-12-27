# Next Steps: Implementation Roadmap

This document outlines the next phase of development for Grand Theft Swarm. The foundation is complete - core systems, state management, and basic UI are functional. This guide is for the next developer/agent picking up the work.

---

## Current State Summary

### What's Built
- **Core Systems**: EventBus, GameLoop, CurveEvaluator, MultiplierSystem
- **State Management**: GameState, StateManager with subscriptions
- **Game Systems**: ResourceSystem, BuildingSystem, SaveSystem
- **UI**: Basic vanilla DOM renderer with era theming
- **Config**: Complete type system, resources, buildings, curves, timing

### What's Missing
- UI framework (React)
- UpgradeSystem
- EventSystem (random events)
- PrestigeSystem
- Production chain processing

---

## Phase 1: React Migration

### 1.1 Install Dependencies

```bash
npm install react react-dom
npm install -D @types/react @types/react-dom @vitejs/plugin-react
```

### 1.2 Update Vite Config

```typescript
// vite.config.ts
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // ... rest of config
});
```

### 1.3 Create React Entry Point

Replace `src/main.ts` with `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { Game, createGame } from './Game';

// Create game instance
const game = createGame();

// Mount React
const root = createRoot(document.getElementById('game-root')!);
root.render(
  <StrictMode>
    <App game={game} />
  </StrictMode>
);

// Initialize and start game after React mounts
game.initialize(document.getElementById('game-root')!);
game.start();
```

### 1.4 Create App Component Structure

```
src/
├── App.tsx                 # Main app, provides game context
├── components/
│   ├── Header.tsx          # Era indicator, game title
│   ├── ResourcePanel.tsx   # Resource display with rates
│   ├── HarvestButton.tsx   # Click-to-harvest button
│   ├── BuildingPanel.tsx   # Building list and purchase
│   ├── BuildingCard.tsx    # Individual building display
│   ├── StatsPanel.tsx      # Statistics display
│   └── Notification.tsx    # Toast notifications
├── hooks/
│   ├── useGameState.ts     # Subscribe to StateManager
│   ├── useResource.ts      # Single resource subscription
│   └── useBuildings.ts     # Building list with affordability
└── context/
    └── GameContext.tsx     # Provide game instance to components
```

### 1.5 Key Hook: useGameState

```tsx
// src/hooks/useGameState.ts
import { useState, useEffect } from 'react';
import { Game } from '../Game';
import type { GameState } from '../state/GameState';

export function useGameState(game: Game): GameState {
  const [state, setState] = useState(game.getState());

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = game.stateManager.subscribe((newState) => {
      setState({ ...newState });
    });
    return unsubscribe;
  }, [game]);

  return state;
}
```

### 1.6 Example Component: ResourcePanel

```tsx
// src/components/ResourcePanel.tsx
import { useGameState } from '../hooks/useGameState';
import { useGame } from '../context/GameContext';
import { formatNumber, formatRate } from '../utils/NumberFormatter';

export function ResourcePanel() {
  const game = useGame();
  const state = useGameState(game);

  const resources = game.resourceSystem.getUnlockedResources();

  return (
    <section className="panel resource-panel">
      <h2>Resources</h2>
      <div className="resource-list">
        {resources.map(resource => {
          const amount = state.resources[resource.id]?.current ?? 0;
          const rate = game.resourceSystem.getProductionRate(resource.id);

          return (
            <div key={resource.id} className="resource-item">
              <span className="resource-name">{resource.name}</span>
              <span className="resource-amount">{formatNumber(amount)}</span>
              {rate.perSecond > 0 && (
                <span className="resource-rate">{formatRate(rate.perSecond)}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

### 1.7 Migration Checklist

- [ ] Install React dependencies
- [ ] Update vite.config.ts with React plugin
- [ ] Create GameContext provider
- [ ] Create useGameState hook
- [ ] Convert Header component
- [ ] Convert ResourcePanel component
- [ ] Convert HarvestButton component
- [ ] Convert BuildingPanel component
- [ ] Convert StatsPanel component
- [ ] Add Notification component for EventBus ui:notification events
- [ ] Remove old UIRenderer.ts (or keep for reference)
- [ ] Update index.html if needed
- [ ] Test all functionality works

---

## Phase 2: UpgradeSystem

### 2.1 Create System File

```typescript
// src/systems/UpgradeSystem.ts
```

Follow the pattern established by BuildingSystem:
- Constructor takes config, stateManager, resourceSystem, multiplierSystem
- `getUpgradeInfo(upgradeId)` - returns full info for UI
- `getAvailableUpgrades()` - returns upgrades for current era
- `calculateCost(upgradeId, tier?)` - handles tiered upgrades
- `purchase(upgradeId)` - deducts cost, applies effects
- `checkUnlocks()` - checks unlock requirements

### 2.2 Key Methods

```typescript
purchase(upgradeId: string): boolean {
  // 1. Check if already purchased (for non-repeatable)
  // 2. Check unlock requirements
  // 3. Deduct costs
  // 4. Mark as purchased in state
  // 5. Apply multiplier effects to MultiplierSystem
  // 6. Process special effects (unlocks, etc.)
  // 7. Emit upgrade:purchased event
}

applyEffects(upgrade: UpgradeConfig): void {
  for (const effect of upgrade.effects) {
    this.multiplierSystem.addMultiplier({
      id: `upgrade:${upgrade.id}:${effect.stackId}`,
      stackId: effect.stackId,
      value: effect.value,
      sourceType: 'upgrade',
      sourceId: upgrade.id,
      sourceName: upgrade.name,
    });
  }
}
```

### 2.3 Wire Into Game.ts

```typescript
// In Game constructor
this.upgradeSystem = new UpgradeSystem(
  this.config,
  this.stateManager,
  this.resourceSystem,
  this.multiplierSystem
);

// Add public method
purchaseUpgrade(upgradeId: string): boolean {
  return this.upgradeSystem.purchase(upgradeId);
}
```

### 2.4 Create UI Component

```tsx
// src/components/UpgradePanel.tsx
```

---

## Phase 3: EventSystem

### 3.1 Create System File

```typescript
// src/systems/EventSystem.ts
```

### 3.2 Core Responsibilities

- Track active events with expiration times
- Process random event triggers each tick
- Handle event pools with weighted selection
- Manage click bonuses during events
- Apply/remove temporary multipliers

### 3.3 Key Methods

```typescript
processTick(deltaMs: number): void {
  // 1. Check for expired events, remove them
  // 2. Roll for random events based on chance
  // 3. Check threshold triggers
}

triggerEvent(eventId: string): void {
  // 1. Check cooldown
  // 2. Apply active effects (multipliers)
  // 3. Process onTrigger instant effects
  // 4. Set expiration time
  // 5. Emit event:triggered
}

clickEvent(eventId: string): void {
  // For events that require/reward clicking
  // Apply click bonus, mark as clicked
}
```

### 3.4 Wire Into Game.ts

Add to `safeTickProcess`:
```typescript
this.eventSystem.processTick(deltaMs);
```

---

## Phase 4: PrestigeSystem

### 4.1 Create System File

```typescript
// src/systems/PrestigeSystem.ts
```

### 4.2 Core Responsibilities

- Calculate prestige currency earned based on formula
- Execute prestige reset (resources, buildings, upgrades)
- Preserve persistent items
- Apply prestige bonuses to MultiplierSystem
- Manage prestige shop purchases

### 4.3 Key Methods

```typescript
calculatePrestigeGain(): number {
  // Use CurveEvaluator with prestige formula from config
  const formula = this.getCurrentEraPrestige().formula;
  return Math.floor(this.curveEvaluator.evaluate(formula, {
    lifetimeRice: this.resourceSystem.getLifetimeAmount('rice'),
  }));
}

canPrestige(): boolean {
  const gain = this.calculatePrestigeGain();
  const minimum = this.getCurrentEraPrestige().minimumToPrestige;
  return gain >= minimum;
}

executePrestige(): void {
  // 1. Calculate and grant prestige currency
  // 2. Reset specified resources
  // 3. Reset specified buildings
  // 4. Reset specified upgrades
  // 5. Apply prestige bonuses
  // 6. Emit prestige:executed
  // 7. Save game
}
```

---

## Phase 5: Production Chains

### 5.1 Add to BuildingSystem or Create ConversionSystem

Process the `conversions` config to transform resources:

```typescript
processConversions(deltaMs: number): void {
  for (const conversion of this.config.conversions) {
    // Check if building exists and is owned
    // Check if inputs are available
    // Consume inputs
    // Produce outputs
    // Respect conversion timing
  }
}
```

---

## File Reference

| File | Purpose |
|------|---------|
| `docs/GAME_DESIGN_DOCUMENT.md` | Full game vision and mechanics |
| `docs/design/BALANCE_MECHANICS.md` | Balance formulas and curves |
| `docs/POLISH_PHASE.md` | Known shortcuts to address later |
| `src/config/content/resources.config.ts` | All resources defined |
| `src/config/content/buildings.config.ts` | All buildings defined |
| `src/config/types/upgrades.ts` | Upgrade type definitions |
| `src/config/types/events.ts` | Event type definitions |
| `src/config/balance/prestige.config.ts` | Prestige formulas and shop |

---

## Testing Checklist

After each phase:
- [ ] Game loads without errors
- [ ] Save/load works correctly
- [ ] Offline progress calculates correctly
- [ ] All UI elements update reactively
- [ ] No console errors during normal gameplay
- [ ] Error boundaries catch and handle failures gracefully

---

## Notes

- The config-driven architecture means most content is already defined
- Follow existing patterns in BuildingSystem for new systems
- Use EventBus for cross-system communication
- StateManager handles all persistent state changes
- MultiplierSystem handles all bonus calculations
- CurveEvaluator handles all dynamic formulas
