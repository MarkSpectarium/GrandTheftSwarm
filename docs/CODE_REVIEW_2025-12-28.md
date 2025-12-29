# Code Review: Recent Commits Analysis

**Date:** 2025-12-28
**Commits Reviewed:** Last 10 commits (e7198a4 to d109f52)
**Focus:** Refactoring opportunities, magic numbers, separation of logic and configs

---

## Summary

The recent commits add significant features including batch production mode, dingy trading animation, and farm visualization enhancements. Overall code quality is good with proper config separation, but there are opportunities for improvement.

---

## 1. God Files / Large File Analysis

### BuildingSystem.ts (702 lines) ⚠️ Refactoring Candidate

**Location:** `packages/client/src/systems/BuildingSystem.ts`

This file handles multiple responsibilities:
- Building purchases and cost calculations
- Standard continuous production processing
- Batch production processing (new)
- Input/output efficiency calculations
- Event listener management

**Recommendation:** Consider extracting production logic into a separate `ProductionProcessor` class:

```
BuildingSystem.ts (~400 lines)
├── Building purchases
├── Cost calculations
├── Unlock checking
└── Delegates to ProductionProcessor

ProductionProcessor.ts (~300 lines)
├── processTick()
├── processBuilding()
├── processBatchProduction()
├── calculateInputEfficiency()
└── consumeInputs()
```

### FarmVisualization.tsx (431 lines) ✅ Well-Organized

This file is appropriately sized and well-structured:
- Uses memoized sub-components for performance
- Separates static and dynamic layers
- Custom hook for debounced state management
- Clear section comments

---

## 2. Magic Numbers Identified

### High Priority (Should Extract to Config)

| File | Line | Value | Purpose | Suggested Config Location |
|------|------|-------|---------|---------------------------|
| `BuildingSystem.ts` | 126 | `25` | Critical health threshold percentage | `balance/buildings.config.ts` |
| `FarmVisualization.tsx` | 172 | `2, 10` | Dingy animation min/base duration (seconds) | `balance/timing.config.ts` |
| `FarmVisualization.tsx` | 350 | `20` | Density calculation divisor | `config/ui/visualization.config.ts` |

### Low Priority (Acceptable as-is)

| File | Line | Value | Reason OK |
|------|------|-------|-----------|
| `BuildingSystem.ts` | 269 | `1000` | Safety limit for loop - defensive programming |
| `BuildingSystem.ts` | 331, 352, 436 | `1000` | ms-to-seconds conversion - standard unit conversion |

---

## 3. Separation of Logic and Configuration

### ✅ Good Practices Found

1. **Config Structure**: Well-organized under `config/`:
   ```
   config/
   ├── balance/     (timing, curves, prestige)
   ├── content/     (buildings, resources, upgrades)
   ├── types/       (TypeScript interfaces)
   └── ui/          (icons)
   ```

2. **Shared Package**: Production data shared between client/server via `shared` package for offline calculations consistency.

3. **CSS Variables**: `FarmVisualization.css` uses CSS custom properties extensively for dimensions, colors, and animations.

4. **Type-Safe Events**: `EventBus.ts` has comprehensive type definitions for all game events.

### ⚠️ Areas for Improvement

1. **Inline Config Values**: Some configuration values are embedded in logic files rather than config files:
   - Critical health threshold (25%) in BuildingSystem.ts
   - Animation timing values in FarmVisualization.tsx
   - Density calculation constant in FarmVisualization.tsx

2. **Missing Config File**: Consider creating `config/ui/visualization.config.ts` for farm visualization constants like `GRID_SIZE`, `UPDATE_DEBOUNCE_MS`, `DISPLAY_CAPS`, and density thresholds.

---

## 4. Specific Recommendations

### 4.1 Extract Health Threshold Constant

**Current** (`BuildingSystem.ts:126`):
```typescript
isCritical: percentage <= 25,
```

**Recommended**: Add to a new or existing balance config:
```typescript
// config/balance/buildings.config.ts
export const buildingBalanceConfig = {
  health: {
    criticalThresholdPercent: 25,
  }
};
```

### 4.2 Extract Animation Timing

**Current** (`FarmVisualization.tsx:172`):
```typescript
'--dingy-duration': `${Math.max(2, 10 / speedMultiplier)}s`,
```

**Recommended**: Add to timing config:
```typescript
// config/balance/timing.config.ts
export const animationTimingConfig = {
  dingy: {
    baseDurationSeconds: 10,
    minDurationSeconds: 2,
  }
};
```

### 4.3 Create Visualization Config

**Recommended**: New file `config/ui/visualization.config.ts`:
```typescript
export const visualizationConfig = {
  grid: {
    size: 12,
    updateDebounceMs: 250,
  },
  displayCaps: {
    paddy: 12,
    worker: 6,
    buffalo: 4,
    well: 2,
    carrier: 3,
    canal: 2,
    mill: 2,
    sampan: 3,
  },
  density: {
    maxBuildings: 20, // Divisor for density calculation
  },
};
```

---

## 5. Positive Observations

1. **Performance Optimization**: FarmVisualization uses React.memo, useMemo, and debouncing effectively.

2. **Event-Driven Architecture**: Clean pub/sub pattern via EventBus with proper subscription cleanup.

3. **Production Accumulator**: Smart batching of small production values to prevent floating-point accumulation issues.

4. **Batch Production Mode**: Well-implemented for trip-based mechanics, properly handles speed multipliers.

5. **TypeScript Usage**: Strong typing throughout with interfaces properly defined in type files.

---

## Priority Action Items

1. **Low effort, high value**: Extract the 3 magic numbers listed as "High Priority" to config files
2. **Medium effort, medium value**: Create `visualization.config.ts` for UI constants
3. **Higher effort, optional**: Consider splitting BuildingSystem.ts if it continues to grow

---

*Review conducted on commit e7198a4 and prior 9 commits.*
