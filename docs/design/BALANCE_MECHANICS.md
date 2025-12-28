# Balance Mechanics Requirements

> **Purpose**: Define the mathematical systems and formula types the game engine must support for balance tuning.
> **Companion**: See `src/config/` for editable balance configurations.

---

## 1. Design Philosophy

### 1.1 Separation of Concerns

```
┌─────────────────────────────────────────────────────────────────┐
│                        BALANCE TUNING                           │
│                                                                 │
│   Config Files (src/config/)     Game Engine (src/systems/)    │
│   ┌─────────────────────────┐    ┌─────────────────────────┐   │
│   │ • All numeric values    │    │ • Formula evaluation    │   │
│   │ • Curve definitions     │───▶│ • Mechanic logic        │   │
│   │ • Thresholds & gates    │    │ • State management      │   │
│   │ • Ratios & multipliers  │    │ • UI binding            │   │
│   └─────────────────────────┘    └─────────────────────────┘   │
│                                                                 │
│   Designer edits configs ──▶ No code changes required           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Core Principles

1. **Zero Magic Numbers**: Every tunable value lives in config, never hardcoded
2. **Formula Expressions**: Support runtime-evaluated formulas, not just static values
3. **Curve Libraries**: Pre-defined curve types that designers select by name
4. **Validation**: TypeScript types ensure config correctness at compile time
5. **Hot-Reloadable**: Development builds can reload configs without refresh (future)

---

## 2. Curve System Requirements

The engine must support these mathematical curve types, selectable by name in configs.

### 2.1 Exponential Curves

**Use Cases**: Building costs, upgrade prices, prestige requirements

```typescript
// Formula: base * (rate ^ count)
type ExponentialCurve = {
  type: "exponential";
  base: number;      // Starting value
  rate: number;      // Growth rate (e.g., 1.15 = 15% increase)
  count: string;     // Variable reference (e.g., "owned", "purchased")
};

// Example: Cookie Clicker building costs
// Cost = 100 * (1.15 ^ buildingsOwned)
```

**Variant - Exponential with Offset**:
```typescript
// Formula: base * (rate ^ (count + offset))
type ExponentialOffsetCurve = {
  type: "exponential_offset";
  base: number;
  rate: number;
  offset: number;    // Shifts the curve (for mid-game unlocks)
  count: string;
};
```

### 2.2 Polynomial Curves

**Use Cases**: Prestige scaling, soft caps, diminishing returns

```typescript
// Formula: coefficient * (value ^ power)
type PolynomialCurve = {
  type: "polynomial";
  coefficient: number;
  power: number;      // 2 = quadratic, 3 = cubic, 0.5 = sqrt
  value: string;      // Variable reference
};

// Example: Prestige points (cubic scaling)
// Points = 1 * (lifetimeRice / 1e12) ^ 3
```

### 2.3 Linear Curves

**Use Cases**: Base production, simple scaling, additive bonuses

```typescript
// Formula: base + (rate * count)
type LinearCurve = {
  type: "linear";
  base: number;
  rate: number;
  count: string;
};

// Example: Worker production
// Production = 0.5 + (0.1 * upgradeLevel)
```

### 2.4 Logarithmic Curves

**Use Cases**: Diminishing returns, soft caps, late-game scaling

```typescript
// Formula: coefficient * log(base, value + offset)
type LogarithmicCurve = {
  type: "logarithmic";
  coefficient: number;
  logBase: number;    // 10 for log10, Math.E for ln
  offset: number;     // Prevents log(0)
  value: string;
};

// Example: Click power diminishing returns
// Bonus = 10 * log10(totalClicks + 1)
```

### 2.5 Sigmoid Curves

**Use Cases**: Soft caps that approach a maximum, difficulty scaling

```typescript
// Formula: max / (1 + e^(-steepness * (value - midpoint)))
type SigmoidCurve = {
  type: "sigmoid";
  max: number;        // Asymptotic maximum
  steepness: number;  // How sharp the transition is
  midpoint: number;   // Value at which output = max/2
  value: string;
};

// Example: Market saturation effect
// PriceMultiplier = 0.5 / (1 + e^(-0.1 * (marketShare - 50)))
```

### 2.6 Step Curves (Thresholds)

**Use Cases**: Era unlocks, tier gates, discrete bonuses

```typescript
// Returns the value of the highest threshold passed
type StepCurve = {
  type: "step";
  steps: Array<{
    threshold: number;
    value: number;
  }>;
  input: string;
};

// Example: Era unlocks
// steps: [{threshold: 0, value: 1}, {threshold: 1e6, value: 2}, ...]
```

### 2.7 Compound Curves

**Use Cases**: Complex formulas combining multiple curve types

```typescript
type CompoundCurve = {
  type: "compound";
  operation: "add" | "multiply" | "min" | "max";
  curves: Curve[];  // Nested curves
};

// Example: Final production = baseProduction * upgradeMultiplier * eraBonus
```

---

## 3. Multiplier Stack System

### 3.1 Stack Types

The engine must track multipliers in separate stacks that combine differently:

```typescript
type MultiplierStack = {
  id: string;
  stackType: "additive" | "multiplicative" | "diminishing";
  sources: MultiplierSource[];
};

type MultiplierSource = {
  id: string;
  value: number;
  source: string;  // "upgrade:better_seeds", "event:monsoon", etc.
  temporary?: boolean;
  expiresAt?: number;  // Timestamp for temporary bonuses
};
```

### 3.2 Stack Calculation Rules

```
ADDITIVE STACK:
  Final = Base + (Bonus1 + Bonus2 + Bonus3)
  Example: Base 1.0 + 0.5 + 0.3 + 0.2 = 2.0x multiplier

MULTIPLICATIVE STACK:
  Final = Base * Bonus1 * Bonus2 * Bonus3
  Example: Base 1.0 * 1.5 * 1.3 * 1.2 = 2.34x multiplier

DIMINISHING STACK (for caps):
  Final = 1 - ((1-Bonus1) * (1-Bonus2) * (1-Bonus3))
  Example: 50% + 30% + 20% = 72% (not 100%)
```

### 3.3 Multiplier Categories

Each resource/action should have defined multiplier categories:

```typescript
type MultiplierCategory =
  | "click_power"      // Affects manual clicks
  | "idle_production"  // Affects passive generation
  | "all_production"   // Affects both click and idle
  | "cost_reduction"   // Reduces purchase costs
  | "travel_speed"     // Reduces fleet travel time
  | "sell_price"       // Increases market returns
  | "event_chance"     // Increases random event probability
  | "event_reward"     // Increases event reward amounts
  | "prestige_gain";   // Increases prestige currency earned
```

---

## 4. Time-Based Systems

### 4.1 Production Tick System

```typescript
type TickConfig = {
  baseTickMs: number;           // How often production calculates (e.g., 100ms)
  idleTickMs: number;           // Tick rate when tab is hidden (e.g., 1000ms)
  maxOfflineSeconds: number;    // Cap on offline progress (e.g., 86400 = 24h)
  offlineEfficiency: number;    // Multiplier for offline gains (e.g., 0.5 = 50%)
};
```

### 4.2 Travel Time Formula

```typescript
type TravelConfig = {
  baseTimeSeconds: number;      // Minimum travel time
  distanceMultiplier: number;   // Seconds per distance unit
  speedDivisor: string;         // Variable that reduces time (e.g., "boatSpeed")
  formula: "linear" | "inverse"; // linear: base + dist*mult, inverse: base + dist*mult/speed
};

// Example: 60 + (distance * 30) / boatSpeed
```

### 4.3 Cooldown System

```typescript
type CooldownConfig = {
  baseCooldownMs: number;
  reductionCurve?: Curve;       // How upgrades reduce cooldown
  minimumMs: number;            // Hard floor for cooldown
};
```

### 4.4 Batch Production System

Buildings can use batch production for discrete, trip-based mechanics (e.g., trading boats):

```typescript
type BatchProductionConfig = {
  batchProduction: true;        // Enables discrete production mode
  baseIntervalMs: number;       // Time per complete cycle
  inputs: ResourceAmount[];     // Consumed per batch
  outputs: ResourceAmount[];    // Produced per batch
  speedStackId?: string;        // Multiplier stack for interval
  amountStackId?: string;       // Multiplier stack for output
};
```

**Behavior:**
- Accumulates time until full interval completes
- Checks if inputs are available before producing
- Consumes all inputs and produces all outputs at once
- Speed multipliers reduce the interval (faster trips)
- Amount multipliers increase the output (more profit)
- Emits `building:batch:complete` event on each cycle

**Example: Dingy Trading**
```typescript
{
  batchProduction: true,
  baseIntervalMs: 10000,        // 10 seconds per trip
  inputs: [{ resourceId: 'rice', amount: 1000 }],
  outputs: [{ resourceId: 'dong', baseAmount: 100 }],
  speedStackId: 'dingy_speed',
  amountStackId: 'dingy_profit',
}
```

---

## 5. Random Event System

### 5.1 Event Probability

```typescript
type EventProbabilityConfig = {
  baseChancePerTick: number;    // e.g., 0.001 = 0.1% per tick
  chanceMultiplierStack: string; // Reference to multiplier stack
  cooldownAfterTrigger: number; // Minimum time between events (ms)
  maxActiveEvents: number;      // Concurrent event limit
};
```

### 5.2 Event Reward Scaling

```typescript
type EventRewardConfig = {
  baseReward: Curve;            // Can scale with progression
  durationMs: number;           // How long event lasts
  rewardMultiplierStack: string;
};

// Example: Monsoon Blessing
// baseReward: { type: "linear", base: 100, rate: 10, count: "era" }
// At Era 1: 110 rice, Era 2: 120 rice, etc. (before multipliers)
```

---

## 6. Prestige System

### 6.1 Prestige Currency Calculation

```typescript
type PrestigeConfig = {
  currencyName: string;
  calculationCurve: PolynomialCurve;  // Typically cubic
  minimumForPrestige: number;         // Threshold to unlock reset
  retainedOnReset: string[];          // List of things kept (achievements, cosmetics)
  resetOnPrestige: string[];          // List of things reset (resources, buildings)
};

// Example: Ancestral Wisdom
// wisdom = floor((lifetimeRice / 1e12) ^ (1/3))
// This is inverted cubic: need 1T for 1, 8T for 2, 27T for 3, etc.
```

### 6.2 Prestige Bonus Application

```typescript
type PrestigeBonusConfig = {
  perPointBonus: Curve;         // Bonus per prestige point
  appliesTo: MultiplierCategory[];
  stackType: "additive" | "multiplicative";
};

// Example: Each Ancestral Wisdom gives +2% to all_production (additive)
```

---

## 7. Number Formatting Requirements

### 7.1 Display Thresholds

```typescript
type NumberFormatConfig = {
  thousandsSeparator: string;   // "," for 1,000
  decimalSeparator: string;     // "." for 1.5

  suffixThresholds: Array<{
    min: number;
    suffix: string;
    divisor: number;
  }>;

  scientificThreshold: number;  // When to switch to 1.23e15
  scientificPrecision: number;  // Decimal places in scientific
};

// Example thresholds:
// 1,000 → 1K, 1,000,000 → 1M, 1,000,000,000 → 1B
// After 1e15 → scientific notation
```

---

## 8. Era Transition System

### 8.1 Era Gate Configuration

```typescript
type EraGateConfig = {
  era: number;
  requirements: Array<{
    type: "resource_lifetime" | "resource_current" | "achievement" | "purchase";
    target: string;
    value: number;
  }>;
  requireAll: boolean;  // AND vs OR for multiple requirements
};

// Example: Era 2 requires (1M lifetime rice) OR (purchase "district_permit")
```

---

## 9. Building Cost Systems

### 9.1 Standard Cost Scaling

Most buildings use exponential cost scaling:

```typescript
type StandardCost = {
  baseCost: ResourceAmount[];
  costCurve: CurveRef;  // e.g., "cost_standard" (1.15x per purchase)
};
```

### 9.2 Currency-Switching Costs (SubsequentCost)

Some buildings cost one currency initially but switch to another for subsequent purchases:

```typescript
type SwitchingCost = {
  baseCost: ResourceAmount[];      // First purchase cost
  subsequentCost: ResourceAmount[]; // All following purchases
  costCurve: CurveRef;             // Applied to subsequentCost
};
```

**Example: Dingy Trading Boat**
```typescript
{
  baseCost: [{ resourceId: 'rice', amount: 1000 }],     // First: 1000 rice
  subsequentCost: [{ resourceId: 'dong', amount: 1000 }], // Then: 1000 dong
  costCurve: 'cost_dingy_5x',  // 5x scaling: 1000, 5000, 25000...
}
```

### 9.3 Consumption System

Buildings can consume resources each tick. If resources are insufficient, the building loses health:

```typescript
type ConsumptionConfig = {
  resources: [{
    resourceId: string;
    amountPerTick: number;
    healthLossPerMissing: number;
  }];
  maxHealth: number;
  onDeath: 'remove' | 'disable';
};
```

**Example: Buffalo**
```typescript
{
  resources: [{ resourceId: 'water', amountPerTick: 3, healthLossPerMissing: 1 }],
  maxHealth: 100,
  onDeath: 'remove',  // Buffalo dies without water
}
```

---

## 10. Config File Structure Overview

```
src/config/
├── types/
│   ├── curves.ts           # Curve type definitions
│   ├── multipliers.ts      # Multiplier system types
│   ├── resources.ts        # Resource definitions
│   ├── buildings.ts        # Building/producer types
│   ├── upgrades.ts         # Upgrade types
│   ├── events.ts           # Event types
│   ├── eras.ts             # Era configuration types
│   └── index.ts            # Re-exports all types
│
├── balance/
│   ├── curves.config.ts    # Shared curve presets
│   ├── timing.config.ts    # Tick rates, travel times
│   ├── formatting.config.ts # Number display rules
│   └── prestige.config.ts  # Prestige system values
│
├── content/
│   ├── resources.config.ts # All resources
│   ├── buildings.config.ts # All buildings per era
│   ├── upgrades.config.ts  # All upgrades per era
│   ├── events.config.ts    # Random events
│   └── eras.config.ts      # Era definitions & gates
│
└── index.ts                # Master config export
```

---

## 11. Validation Requirements

### 11.1 Compile-Time Validation

TypeScript types must enforce:
- All required fields present
- Curve types match expected shapes
- Variable references are valid strings (runtime check needed)
- Numeric values are within sensible ranges (custom type guards)

### 11.2 Runtime Validation

The engine should validate on load:
- All variable references resolve to actual game state
- No circular dependencies in compound curves
- Prestige requirements are achievable
- Era gates form a valid progression chain

### 11.3 Balance Warnings

Development builds should warn when:
- Cost curves grow faster than production curves (death spiral)
- Prestige becomes optimal too early (< 1 hour) or too late (> 1 week)
- Offline gains exceed online gains (discourages play)
- Any resource can go negative

---

## Appendix: Formula Expression Syntax

For maximum flexibility, support a simple expression language in string form:

```typescript
// Simple variable reference
"owned"

// Arithmetic expressions
"base * 1.15 ^ owned"
"(lifetimeRice / 1e12) ^ (1/3)"
"max(1, level - 5)"

// Supported operators: + - * / ^ ( )
// Supported functions: min, max, floor, ceil, log, log10, sqrt, abs
// Supported constants: e, pi
```

The expression evaluator receives a context object with all current game state values.

---

*This document defines WHAT the engine must support. See `src/config/` for the actual balance values.*
