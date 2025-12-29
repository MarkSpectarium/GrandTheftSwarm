# Grand Theft Swarm - Agent Guide

A browser-based idle farming game set in Vietnam's Mekong Delta. Build a rice empire from manual harvesting to automated megacorp.

## Quick Start

```bash
pnpm install          # Install dependencies (required first!)
pnpm dev              # Start client + API dev servers
pnpm build            # Production build
pnpm typecheck        # Type check all packages
pnpm test             # Run tests
```

If you see "Cannot find module" errors, run `pnpm install` first.

## Project Structure

```
packages/
├── client/           # React 18 + Vite frontend (game runs here)
│   └── src/
│       ├── config/   # ALL game balance and content (see below)
│       ├── core/     # GameLoop, EventBus, CurveEvaluator, MultiplierSystem
│       ├── systems/  # BuildingSystem, ResourceSystem, UpgradeSystem, etc.
│       ├── state/    # StateManager, GameState
│       ├── components/  # React UI components
│       └── Game.ts   # Main orchestrator
├── api/              # Express.js backend (auth + cloud saves only)
│   └── src/
│       ├── routes/   # auth.ts, saves.ts, devConfig.ts
│       ├── db/       # Turso/Drizzle schema
│       └── middleware/
└── shared/           # Shared TypeScript types
```

## Architecture Principles

### 1. Configuration-Driven Design

**All game balance lives in config files, not code.** To tune the game, edit config files - no engine changes needed.

```
packages/client/src/config/
├── types/            # TypeScript interfaces for all configs
├── balance/          # Curves, timing, formatting, prestige values
│   ├── curves.config.ts       # Exponential/polynomial cost curves
│   ├── timing.config.ts       # Tick rates, intervals
│   └── formatting.config.ts   # Number display rules
├── content/          # Game content definitions
│   ├── resources.config.ts    # Rice, dong, water, etc.
│   ├── buildings.config.ts    # Paddies, workers, buffalo, etc.
│   └── upgrades.config.ts     # All upgrade definitions
└── ui/               # UI-specific configs
    └── visualization.config.ts
```

### 2. Separation of Logic and Config

**Bad:**
```typescript
const cost = baseCost * Math.pow(1.15, owned);  // Magic numbers in code
```

**Good:**
```typescript
const cost = evaluateCurve('cost_standard', { owned });  // Uses config
```

### 3. No God Files

Keep files focused on single responsibilities. If a file grows too large (500+ lines), consider splitting it. Example: `BuildingSystem.ts` delegates to `ProductionProcessor.ts` for production logic.

### 4. Event-Driven Communication

Systems communicate via `EventBus` pub/sub pattern, not direct coupling:

```typescript
// Publishing
EventBus.emit('building:purchased', { buildingId, count });

// Subscribing (with cleanup)
const unsub = EventBus.subscribe('building:purchased', handler);
// Call unsub() in dispose()
```

### 5. Client-Side Game Logic

- All game calculations run in the browser for responsiveness
- API is **only** for authentication and cloud saves
- LocalStorage fallback when not authenticated
- Offline progress calculated client-side

## Key Systems

| System | Purpose |
|--------|---------|
| `Game.ts` | Main orchestrator, connects all systems |
| `GameLoop` | Tick-based loop (100ms default) |
| `StateManager` | Central game state (resources, buildings, upgrades) |
| `BuildingSystem` | Purchase logic, production processing, batch mode |
| `ResourceSystem` | Resource management, consumption |
| `MultiplierSystem` | Bonus stacks (additive/multiplicative) |
| `CurveEvaluator` | Evaluates exponential/polynomial formulas |
| `UpgradeSystem` | Upgrade purchases, multiplier effects |
| `SaveSystem` | LocalStorage persistence |

## Current Game Content (Era 1)

**Resources:** rice, dong (currency), water

**Buildings:**
- Production: paddy_field, family_worker, buffalo (consumes water)
- Water supply: village_well, water_carrier, irrigation_canal
- Trading: dingy (batch production: rice → dong)

**Upgrades:** 7 dingy upgrades (speed path, profit path)

## Common Tasks

### Adding a New Building

1. Add type to `config/types/buildings.ts` if needed
2. Add building definition to `config/content/buildings.config.ts`
3. Add icon to `config/ui/icons.config.ts`
4. If it has special mechanics (batch production, consumption), update relevant system

### Adding a New Upgrade

1. Add to `config/content/upgrades.config.ts`
2. Reference existing multiplier stacks or add new ones to `config/index.ts`

### Changing Balance Values

Edit the relevant config file:
- Cost curves: `config/balance/curves.config.ts`
- Production rates: `config/content/buildings.config.ts`
- Timing: `config/balance/timing.config.ts`

### Dev Mode Testing

Use dev mode presets in `config/balance/devmode.config.ts` for accelerated testing (faster ticks, boosted production).

## API Endpoints

```
GET  /api/health              # Health check
GET  /api/auth/github         # Initiate OAuth
GET  /api/auth/github/callback
GET  /api/auth/me             # Current user
GET  /api/saves               # List saves
GET  /api/saves/:slot         # Get save
PUT  /api/saves/:slot         # Create/update save
DELETE /api/saves/:slot       # Delete save
POST /api/dev/config          # Write config changes (dev only)
```

## Environment Variables

### Client (.env)
```
VITE_API_URL=http://localhost:3001
```

### API (.env)
```
PORT=3001
NODE_ENV=development
API_URL=http://localhost:3001
CLIENT_URL=http://localhost:3000
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
JWT_SECRET=...
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

## Code Style Guidelines

1. **Zero magic numbers** - All tunable values in config
2. **Type everything** - Use TypeScript interfaces from `config/types/`
3. **Clean up subscriptions** - Use `SubscriptionManager` pattern
4. **Prefer config over code changes** for balance tweaks
5. **Keep systems decoupled** - Communicate via EventBus

## Documentation

| File | Purpose |
|------|---------|
| `docs/GAME_DESIGN_DOCUMENT.md` | Full game vision, era system, mechanics |
| `docs/design/BALANCE_MECHANICS.md` | Mathematical systems, curve types |
| `docs/NEXT_STEPS.md` | Implementation roadmap |
| `docs/POLISH_PHASE.md` | Known issues and priorities |
