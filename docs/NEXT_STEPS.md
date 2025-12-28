# Next Steps: Implementation Roadmap

This document outlines remaining work for Grand Theft Swarm.

---

## Architecture

```
grand-theft-swarm/
├── packages/
│   ├── client/          # React 18 + Vite frontend
│   └── api/             # Express.js backend
├── shared/              # Shared TypeScript types
├── api/                 # Vercel serverless entry point
├── scripts/
│   └── dev.js           # Dev server launcher
├── docs/                # Design documentation
└── vercel.json          # Vercel deployment config
```

---

## Current State

### Implemented

**Infrastructure:**
- Monorepo with pnpm workspaces
- React 18 frontend with Vite
- Express.js API server
- GitHub OAuth authentication
- Turso (libSQL) database with Drizzle ORM
- JWT session management
- Vercel deployment

**Game Systems:**
- GameLoop - Tick-based game loop
- ResourceSystem - Production calculations with consumption
- BuildingSystem - Purchase and production logic with batch mode
- MultiplierSystem - Bonus calculations with stacks
- CurveEvaluator - Formula evaluation
- SaveSystem - LocalStorage persistence
- UpgradeSystem - Upgrade purchases and multiplier effects
- EventBus - Game event system for building completions

**Era 1 Content (Fully Implemented):**
- Rice production chain (paddies → workers → buffalo)
- Water supply chain (wells → carriers → canals)
- Buffalo consumption system (water-dependent production)
- Dingy trading system (batch production: rice → dong)
- 7 dingy upgrades (speed, profit, cargo capacity)
- Animated farm visualization with dynamic boat trading
- SubsequentCost system for currency-switching costs

**API Endpoints:**
- `GET /api/health` - Health check
- `GET /api/auth/github` - Initiate OAuth
- `GET /api/auth/github/callback` - OAuth callback
- `GET /api/auth/me` - Current user
- `GET /api/saves` - List saves
- `GET /api/saves/:slot` - Get save
- `PUT /api/saves/:slot` - Create/update save
- `DELETE /api/saves/:slot` - Delete save

### Not Yet Implemented

**Game Systems:**
- EventSystem - Random events (Monsoon Blessing, etc.)
- PrestigeSystem - Era transitions and resets
- Cloud save integration - Connect SaveSystem to API

**UI Components:**
- Event notifications
- Settings panel
- Offline progress modal
- Era transition cinematics

---

## Phase 1: Complete Core Gameplay

### 1.1 UpgradeSystem ✅ COMPLETE

Implemented in `packages/client/src/systems/UpgradeSystem.ts`:
- Purchase upgrades with resource costs
- Apply multiplier effects via MultiplierSystem
- Track upgrade state in game state

Config populated with:
- 7 dingy upgrades (speed path: 3, profit path: 4)
- Upgrade paths for organized progression
- Multiplier stacks for dingy_speed and dingy_profit

### 1.2 Implement EventSystem

Create `packages/client/src/systems/EventSystem.ts`:
- Random event triggering based on conditions
- Timed events with durations
- Click-to-activate bonus events

Populate config arrays:
- `events` - Random events
- `seasonalEvents` - Calendar-based
- `eventPools` - Weighted random pools

### 1.3 Implement PrestigeSystem

Create `packages/client/src/systems/PrestigeSystem.ts`:
- Era transition requirements
- Prestige currency calculation
- Permanent upgrades shop

---

## Phase 2: Cloud Save Integration

### 2.1 Connect SaveSystem to API

Extend `SaveSystem.ts`:
- Sync to cloud on authenticated save
- Load from cloud on login
- Handle merge conflicts
- Offline detection

### 2.2 Auto-sync

- Sync on login
- Periodic background sync
- Sync on major milestones

---

## Phase 3: UI Polish

### 3.1 Completed Components

- [x] UpgradePanel - Shows available upgrades with purchase UI
- [x] FarmVisualization - Animated farm showing buildings and trading
- [x] BuildingPanel - Purchase and display buildings

### 3.2 Remaining Components

- [ ] EventNotification
- [ ] OfflineProgressModal
- [ ] SettingsPanel
- [ ] Era transition cinematics

### 3.3 Era Theming

| Era | Theme | Visual Style |
|-----|-------|--------------|
| 1 (1980-1995) | Vintage | Paper, wood, sepia |
| 2 (1995-2010) | Early Digital | CRT, Windows 95 |
| 3 (2010-2025) | Modern | Clean, Material Design |
| 4 (2025-2045) | Cyberpunk | Neon, holographic |

---

## Development Commands

```bash
pnpm install        # Install dependencies
pnpm dev            # Start dev servers
pnpm dev:client     # Client only
pnpm dev:api        # API only
pnpm build          # Production build
pnpm typecheck      # Type check
pnpm test           # Run tests
```

---

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

---

## File Reference

| File | Purpose |
|------|---------|
| `docs/GAME_DESIGN_DOCUMENT.md` | Game vision and mechanics |
| `docs/design/BALANCE_MECHANICS.md` | Balance formulas |
| `docs/POLISH_PHASE.md` | Known issues |
| `packages/client/` | React frontend |
| `packages/api/` | Express.js backend |
| `shared/` | Shared types |
| `api/index.ts` | Vercel entry point |

---

## Notes

- Game engine runs entirely in browser
- API is for authentication and cloud saves
- Offline progress calculated client-side
- LocalStorage fallback when not authenticated
