# Grand Theft Swarm: Mekong Delta Farming Empire
## Game Design Document - Foundation

> **Document Status**: Era 1 Complete
> **Version**: 0.2.0
> **Purpose**: Core structure for agent-driven expansion

---

## Table of Contents

1. [Game Vision](#1-game-vision)
2. [Reference Game Analysis](#2-reference-game-analysis)
3. [Core Mechanics Adaptation](#3-core-mechanics-adaptation)
4. [Era System & Progression](#4-era-system--progression)
5. [User Journey](#5-user-journey)
6. [Expansion Points](#6-expansion-points-for-sub-agents)

---

## 1. Game Vision

### 1.1 Elevator Pitch

A browser-based idle farming game where players build a rice empire in Vietnam's Mekong Delta, evolving from a single manual rice paddy in the 1980s to commanding an automated cyberpunk agricultural megacorporation.

### 1.2 Core Experience

| Aspect | Description |
|--------|-------------|
| **Genre** | Idle/Clicker → Management Sim Hybrid |
| **Platform** | Browser (GitHub Pages hosted) |
| **Session Type** | Active clicks + idle progression |
| **Tone** | Nostalgic → Modern → Neon-Futuristic |
| **Setting** | Vietnam Mekong Delta, 1980s → 2040s |

### 1.3 Design Pillars

1. **Satisfying Progression**: Every click and every idle second should feel meaningful
2. **Era-Driven Evolution**: UI, mechanics, and content transform as players advance
3. **Depth Through Simplicity**: Easy to start, rich to master
4. **Respect for Time**: Both active and idle play are rewarded appropriately

### 1.4 Technical Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React 18 + TypeScript | Game UI and engine |
| **Bundler** | Vite | Fast development and optimized builds |
| **Backend** | Express.js + TypeScript | Authentication and cloud saves |
| **Database** | Turso (libSQL) + Drizzle ORM | Edge database for user data |
| **Auth** | GitHub App OAuth + JWT | User authentication |
| **Hosting** | Vercel | Frontend and serverless API |
| **Package Manager** | pnpm workspaces | Monorepo management |

### 1.5 Architecture Principles

- **No Game Engines**: Pure UI-driven experience (no Phaser, PixiJS, etc.)
- **Client-Side Game Logic**: All game calculations run in the browser for responsiveness
- **API for Persistence**: Backend only handles auth and cloud saves
- **Offline-First**: LocalStorage fallback when not authenticated
- **Configuration-Driven**: Balance tuning via config files, not code changes

---

## 2. Reference Game Analysis

### 2.1 Cookie Clicker - The Click-to-Idle Curve

**Source**: [Cookie Clicker Wiki](https://cookieclicker.fandom.com/wiki/Ascension) | [Wikipedia](https://en.wikipedia.org/wiki/Cookie_Clicker)

#### Core Mechanics Extracted

| Mechanic | Description | Why It Works |
|----------|-------------|--------------|
| **Click Foundation** | 1 click = 1 cookie initially | Immediate cause-effect satisfaction |
| **Building Tiers** | Cursors → Grandmas → Farms → Factories... | Clear visual progression path |
| **Exponential Pricing** | Each building costs 15% more than previous | Prevents runaway purchasing, creates decisions |
| **Upgrades** | Multiply production of specific buildings | Rewards focus and investment |
| **Golden Cookies** | Random timed events with huge bonuses | Variable reward schedule creates engagement |
| **Prestige/Ascension** | Reset for permanent multipliers | Enables infinite progression, prevents stagnation |
| **Heavenly Chips** | Meta-currency from prestige | Cubic scaling (level³ × 1 trillion) for cost |

#### Key Balance Insight
> Prestige requires cubic scaling to remain meaningful. Level 1 = 1T cookies, Level 2 = 8T, Level 10 = 1000T.

---

### 2.2 oGame - Fleet Operations & Real-Time Management

**Source**: [oGame Wiki](https://ogame.fandom.com/wiki/Fleet) | [Wikipedia](https://en.wikipedia.org/wiki/OGame)

#### Core Mechanics Extracted

| Mechanic | Description | Why It Works |
|----------|-------------|--------------|
| **Dispatch System** | Send units on missions, outcome on arrival | Anticipation and planning depth |
| **Mission Types** | Attack, Transport, Harvest, Colonize, Spy | Variety in fleet usage |
| **Real-Time Travel** | Fleets take actual time to reach destinations | Creates strategic timing decisions |
| **Fuel Economy** | Larger fleets need more deuterium | Natural scaling limiter |
| **Coordinate System** | Galaxy:System:Planet addressing | Expands perceived world size |
| **Queue Processing** | Events resolve on page load | Works for browser-based games |
| **Alliance Systems** | Coordinate with other players | Social hooks (future consideration) |

#### Key Design Insight
> Player doesn't control units directly—they dispatch and wait. The game plays itself, but player decisions matter enormously.

---

### 2.3 Anno 1800 - Production Chains & Economic Optimization

**Source**: [Anno Wiki](https://anno1800.fandom.com/wiki/Production_chains) | [PC Gamer Guide](https://www.pcgamer.com/anno-1800-tips-guide/)

#### Core Mechanics Extracted

| Mechanic | Description | Why It Works |
|----------|-------------|--------------|
| **Production Chains** | Raw → Processed → Final goods | Creates optimization puzzles |
| **Building Ratios** | 2 farms feed 1 processor at specific rates | Mathematical satisfaction |
| **Workforce Tiers** | Farmers → Workers → Artisans → Engineers | Population as unlock gate |
| **Island Logistics** | Warehouses make goods available island-wide | Simplifies without removing strategy |
| **Trade Routes** | Automated ship transport between islands | Passive inter-region management |
| **Supply/Demand Balance** | Statistics show production vs consumption | Clear feedback for optimization |
| **Fertility System** | Some goods only grow in certain regions | Forces trade, prevents mono-strategies |

#### Key Design Insight
> The joy is in optimizing ratios. 2:1:1 chain feels better than arbitrary numbers. Players love solving "how many X do I need for Y consumers?"

---

## 3. Core Mechanics Adaptation

### 3.1 Mechanic Translation Table

| Reference Mechanic | Mekong Adaptation | Era Introduced |
|-------------------|-------------------|----------------|
| Cookie Click | Harvest Rice (manual) | Era 1 |
| Buildings | Paddies → Workers → Buffalo → Mills | Era 1 |
| Resource Chain | Water → Buffalo (consumption system) | Era 1 |
| Golden Cookie | Monsoon Blessing / Lucky Catch | Era 1 |
| Upgrades | Farming Techniques, Tools, Trading | Era 1+ |
| Trading Trips | Dingy boats sell rice for Dong (batch production) | Era 1 |
| Prestige | Generational Reset (new generation takes over) | Era 2+ |
| Heavenly Chips | Ancestral Wisdom (permanent multipliers) | Era 2+ |
| Fleet Dispatch | Boat Convoys to Markets | Era 2 |
| Mission Types | Sell, Trade, Acquire, Explore | Era 2+ |
| Real-Time Travel | River travel time (scaled minutes) | Era 2 |
| Production Chains | Rice → Flour → Noodles → Packaged Goods | Era 2+ |
| Trade Routes | Automated River Routes | Era 3 |
| Workforce Tiers | Family → Village → District → Region | All Eras |

### 3.2 Thematic Resource Mapping

| Generic Concept | Mekong Theme |
|-----------------|--------------|
| Cookies/Gold | Rice (đồng lúa) |
| Currency | Dong (₫) - Vietnamese currency |
| Premium Currency | Lotus Tokens |
| Prestige Currency | Ancestral Wisdom |
| Energy/Fuel | Water (Era 1) / River Water / Diesel (later) |
| Workers | Family Members → Hired Hands → Drones |
| Buildings | Paddies, Wells, Mills, Warehouses, Factories |
| Transport | Dingies → Sampans → Motorboats → Cargo Drones |

---

## 4. Era System & Progression

### 4.1 Era Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PROGRESSION TIMELINE                         │
├──────────────┬──────────────┬──────────────┬───────────────────────┤
│    ERA 1     │    ERA 2     │    ERA 3     │        ERA 4          │
│  1980-1995   │  1995-2010   │  2010-2025   │      2025-2045        │
│              │              │              │                       │
│  "Roots"     │  "Growth"    │  "Harvest"   │   "Transcendence"     │
│              │              │              │                       │
│  Manual      │  Automation  │   Fleet      │    Empire             │
│  Clicking    │  Begins      │   Command    │    Management         │
├──────────────┼──────────────┼──────────────┼───────────────────────┤
│ UI: Vintage  │ UI: 90s-2000s│ UI: Modern   │ UI: Cyberpunk 2077    │
│ Paper/Wood   │ Early Digital│ Clean/Mobile │ Neon/Holographic      │
└──────────────┴──────────────┴──────────────┴───────────────────────┘
```

---

### 4.2 Era 1: Roots (1980-1995)

**Theme**: Post-war recovery, family farm, manual labor
**UI Aesthetic**: Weathered paper, wood textures, hand-drawn elements, sepia tones

#### Unlock Trigger
- Game start (default)

#### Core Loop
```
CLICK rice paddy → Gain rice → Buy upgrades → Click faster → Buy workers → Passive income begins
```

#### Key Mechanics
| Mechanic | Description |
|----------|-------------|
| **Manual Harvest** | Click paddy to harvest rice (1 rice/click base) |
| **Family Workers** | First automation: family members harvest slowly |
| **Buffalo** | Powerful rice producers that consume water |
| **Water Supply Chain** | Wells → Water Carriers → Irrigation Canals supply water to buffalo |
| **Basic Upgrades** | Better seeds, hand tools, water efficiency |
| **Dingy Trading** | Small boats make trading trips to sell rice for Dong |
| **Farm Visualization** | Animated visual showing farm growth, workers, and trading boats |

#### Water Economy
Buffalo are powerful producers but require water to survive. The water supply chain creates early-game resource management:

| Building | Water/tick | Buffalo Supported |
|----------|------------|-------------------|
| Village Well | 9L | 3 |
| Water Carrier | 27L | 9 |
| Irrigation Canal | 72L | 24 |

#### Trading System
The dingy represents Era 1's trading mechanic - discrete batch production that converts rice to currency:

| Stat | Base Value | Notes |
|------|------------|-------|
| Rice consumed | 1000 | Per trading trip |
| Dong earned | 100 | Per trading trip |
| Trip duration | 10s | Affected by speed upgrades |
| First dingy cost | 1000 rice | Currency switches after first |
| Subsequent costs | 1000 dong × 5^n | 5x exponential scaling |

Upgrades improve dingy speed (+25% to +100%), profit (+25% to +100%), and cargo capacity (+50%).

#### Content Scope
- 1 paddy field (expandable to 12 in visualization)
- 10+ upgrade types (production, water, trading)
- 3 worker types (family workers)
- Buffalo with water consumption
- Water supply buildings (well, carrier, canal)
- Dingy trading boats with upgrades
- Animated farm visualization

#### Era 1 → Era 2 Transition
**Trigger**: Accumulate 1,000,000 rice lifetime OR purchase "District Expansion Permit"

---

### 4.3 Era 2: Growth (1995-2010)

**Theme**: Doi Moi reforms, mechanization, market expansion
**UI Aesthetic**: Early computer interface, CRT monitor feel, Windows 95/98 style

#### Unlock Trigger
- Era 1 completion requirements met
- First "Generational Reset" available

#### Core Loop
```
MANAGE production chains → DISPATCH boats to markets → OPTIMIZE routes → EXPAND territory → PRESTIGE for bonuses
```

#### Key Mechanics
| Mechanic | Description |
|----------|-------------|
| **Production Chains** | Rice → Rice Flour → Rice Noodles |
| **Boat Dispatch** | Send sampans to district markets (real-time travel) |
| **Multiple Paddies** | Manage 3-5 separate field locations |
| **Hired Workers** | Pay wages, higher efficiency than family |
| **Mechanical Tools** | Tractors, pumps, threshers |
| **Market Prices** | Dynamic pricing based on supply/demand |
| **Generational Prestige** | Reset for Ancestral Wisdom bonuses |

#### Fleet System Introduction
```
┌─────────────────────────────────────────────────┐
│              BOAT DISPATCH PANEL                │
├─────────────────────────────────────────────────┤
│  Destination: [District Market ▼]               │
│  Cargo: [500 Rice] [100 Noodles]               │
│  Travel Time: 15 minutes                        │
│  Expected Return: 2,500 Dong                    │
│                                                 │
│  [DISPATCH]                    [CANCEL]         │
└─────────────────────────────────────────────────┘
```

#### Content Scope
- 5 field locations
- 3 production chain depths
- 5 boat types (sampan → motorized)
- 8 market destinations
- 10-15 new upgrades
- First prestige layer

#### Era 2 → Era 3 Transition
**Trigger**: Complete 100 successful trade missions OR reach Ancestral Wisdom level 10

---

### 4.4 Era 3: Harvest (2010-2025)

**Theme**: Modern agriculture, export markets, corporation formation
**UI Aesthetic**: Clean mobile/web design, Material Design influence, data dashboards

#### Unlock Trigger
- Era 2 completion requirements met
- Second prestige layer unlocked

#### Core Loop
```
AUTOMATE routes → MANAGE fleet → OPTIMIZE supply chains → EXPAND to regions → BUILD corporate structure
```

#### Key Mechanics
| Mechanic | Description |
|----------|-------------|
| **Automated Routes** | Set-and-forget trade routes (Anno-style) |
| **Fleet Management** | Multiple simultaneous dispatches |
| **Regional Expansion** | Expand beyond Mekong to other provinces |
| **Export Markets** | International trade with higher returns, more risk |
| **Corporation Upgrades** | Structural improvements affecting all production |
| **Research Tree** | Unlock advanced techniques and equipment |
| **Contracts** | Timed objectives with bonus rewards |

#### Route Automation Panel
```
┌─────────────────────────────────────────────────────────────┐
│                    AUTOMATED ROUTES                          │
├─────────────────────────────────────────────────────────────┤
│  Route 1: Ben Tre → Ho Chi Minh City                        │
│  ├─ Cargo: Rice Noodles (auto-fill)                         │
│  ├─ Frequency: Every 2 hours                                │
│  ├─ Profit/Trip: ~15,000 Dong                               │
│  └─ Status: ● Active                                        │
├─────────────────────────────────────────────────────────────┤
│  Route 2: Can Tho → Export Port                             │
│  ├─ Cargo: Premium Rice (Grade A only)                      │
│  ├─ Frequency: Every 6 hours                                │
│  ├─ Profit/Trip: ~85,000 Dong                               │
│  └─ Status: ● Active                                        │
├─────────────────────────────────────────────────────────────┤
│  [+ Add New Route]                    Routes: 2/5           │
└─────────────────────────────────────────────────────────────┘
```

#### Content Scope
- 10+ field locations across regions
- 5 production chain depths
- 10 vehicle types
- 15 market/export destinations
- Full research tree (20+ nodes)
- Corporate upgrade system
- Contract system

#### Era 3 → Era 4 Transition
**Trigger**: Reach "Agricultural Megacorp" status OR accumulate 1 billion lifetime rice

---

### 4.5 Era 4: Transcendence (2025-2045)

**Theme**: Near-future cyberpunk, drone swarms, AI optimization, mega-scale
**UI Aesthetic**: Cyberpunk 2077 inspired—neon accents, holographic panels, dark theme with cyan/magenta highlights

#### Unlock Trigger
- Era 3 completion requirements met
- "Automation Singularity" research completed

#### Core Loop
```
COMMAND drone swarms → ORCHESTRATE AI systems → DOMINATE markets → TRANSCEND through mega-prestige
```

#### Key Mechanics
| Mechanic | Description |
|----------|-------------|
| **Drone Swarms** | Automated harvesting, no manual intervention |
| **AI Optimization** | Self-improving production efficiency |
| **Market Manipulation** | Influence regional/global prices |
| **Mega-Structures** | Vertical farms, processing megaplexes |
| **Neural Interface** | Direct click-to-command ratio bonuses |
| **Legacy System** | Ultimate prestige with cosmetic unlocks |
| **Endless Scaling** | Exponential numbers, scientific notation |

#### Command Interface Concept
```
┌─────────────────────────────────────────────────────────────────────┐
│ ◢◤ MEKONG AGRICULTURAL NEURAL NETWORK v4.7.2 ◢◤                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │ SWARM-01    │  │ SWARM-02    │  │ SWARM-03    │                │
│  │ ████████░░  │  │ ██████████  │  │ ███░░░░░░░  │                │
│  │ 847 units   │  │ 1,204 units │  │ 312 units   │                │
│  │ Harvesting  │  │ Returning   │  │ Charging    │                │
│  └─────────────┘  └─────────────┘  └─────────────┘                │
│                                                                     │
│  GLOBAL OUTPUT: 4.7e12 rice/sec    EFFICIENCY: 94.7%               │
│  MARKET SHARE: 34.2%               TREND: ▲ +2.1%                  │
│                                                                     │
│  [OPTIMIZE ALL]  [MARKET ANALYSIS]  [EXPAND OPERATIONS]            │
└─────────────────────────────────────────────────────────────────────┘
```

#### Content Scope
- Unlimited expansion potential
- AI-driven mechanics
- Prestige layers 3+
- Cosmetic legacy system
- Leaderboard hooks (future multiplayer consideration)
- Endless scaling with meaningful choices

---

### 4.6 Progression Unlock Summary

| Milestone | Unlock |
|-----------|--------|
| First 100 rice | Second paddy plot |
| First 1,000 rice | Buffalo automation |
| First worker | Seasonal events active |
| 10,000 rice | Village market access |
| 100,000 rice | Era 2 teaser/preview |
| 1,000,000 rice | **ERA 2 UNLOCK** |
| First boat dispatch | Production chains |
| 10 successful trades | Market price dynamics |
| Ancestral Wisdom 5 | Regional expansion preview |
| Ancestral Wisdom 10 | **ERA 3 UNLOCK** |
| First automated route | Fleet management panel |
| 10 simultaneous routes | Export markets |
| Corporation level 10 | Era 4 teaser |
| 1 billion rice | **ERA 4 UNLOCK** |
| First drone swarm | AI optimization |
| Market share 25% | Market manipulation |
| Legacy level 1 | Cosmetic system |

---

## 5. User Journey

### 5.1 First Session (0-30 minutes)

```
MINUTE 0-2: THE HOOK
├─ Player sees: Weathered paper UI, single rice paddy, "Click to Harvest" prompt
├─ Player does: Clicks paddy
├─ Feedback: Rice counter increments, satisfying visual/sound
└─ Emotion: "Okay, simple enough"

MINUTE 2-5: FIRST PURCHASE
├─ Player sees: "Sharper Sickle - 50 rice - 2x harvest per click"
├─ Player does: Continues clicking, saves up, purchases
├─ Feedback: Clicks now yield 2 rice, upgrade visually reflected
└─ Emotion: "Nice, progress!"

MINUTE 5-10: FIRST AUTOMATION
├─ Player sees: "Hire Son to Help - 200 rice - +0.5 rice/sec"
├─ Player does: Grinds clicks, purchases worker
├─ Feedback: Rice counter now ticks up automatically (slowly)
├─ Player realizes: "It works even when I'm not clicking"
└─ Emotion: "Oh, THIS is an idle game"

MINUTE 10-20: THE DECISION LOOP
├─ Player sees: Multiple upgrade paths (more workers vs. better tools vs. more paddies)
├─ Player does: Makes choices, optimizes based on preference
├─ Feedback: Different strategies yield different results
└─ Emotion: "My choices matter"

MINUTE 20-30: FIRST EVENT
├─ Player sees: "Monsoon Blessing!" - golden rain animation, 30 second timer
├─ Player does: Clicks frantically during bonus period
├─ Feedback: 10x production, massive rice gains
├─ Player realizes: Being active at the right time is rewarded
└─ Emotion: "I should check back for these!"
```

### 5.2 First Week (Sessions 2-10)

```
SESSION 2-3: BUILDING MOMENTUM
├─ Player returns: Rice has accumulated while away (idle gains)
├─ Realizes: Overnight = significant progress
├─ Focus: Optimizing idle production before closing game
└─ Hook: "What will I have when I come back?"

SESSION 4-5: APPROACHING ERA TRANSITION
├─ Player sees: "Era 2 Preview" teasers appearing
├─ Motivation: Clear goal (1M rice for Era 2)
├─ Grind: Focused sessions to hit milestone
└─ Anticipation: "What changes in Era 2?"

SESSION 6-7: ERA 2 UNLOCKED
├─ Experience: UI transforms (vintage → early digital)
├─ New mechanics: Boats, production chains, markets
├─ Learning curve: Slight reset to "novice" feeling
├─ Mastery loop: Learn new systems, optimize again
└─ Emotion: "This is like a whole new game!"

SESSION 8-10: FLEET OPERATIONS
├─ Player learns: Dispatch timing, route optimization
├─ Engagement shift: From clicking to planning
├─ Idle evolution: Boats work while away
└─ Hook: "I need to log in when my boats return"
```

### 5.3 First Month (Week 2-4)

```
WEEK 2: PRESTIGE CONSIDERATION
├─ Player sees: Generational Reset available
├─ Decision: "Do I give up my progress for permanent bonuses?"
├─ Research: Calculates if reset is worth it
├─ Action: First prestige reset
└─ Realization: "Second playthrough is noticeably faster"

WEEK 3: MASTERY DEVELOPMENT
├─ Player develops: Personal strategies and optimizations
├─ Knowledge: Understands production ratios (2:1 chains)
├─ Efficiency: Min-maxing idle vs. active play
└─ Identity: "I'm a boat-focused player" or "I optimize chains"

WEEK 4: ERA 3 TRANSITION
├─ Milestone: Era 3 unlocked
├─ Scale shift: Managing fleet, not individual boats
├─ UI evolution: Modern dashboard aesthetic
├─ Complexity: Automated routes, contracts, research trees
└─ Status: Invested player with long-term goals
```

### 5.4 Long-Term Engagement (Month 2+)

```
MONTHLY LOOP:
├─ Daily: Quick check-ins, collect idle gains, dispatch priority missions
├─ Weekly: Optimize routes, prestige if beneficial, progress research
├─ Monthly: Era transitions, major strategic pivots, legacy goals
└─ Ongoing: Cosmetic collection, leaderboard competition (future), completionism

ENGAGEMENT HOOKS:
├─ Sunk cost: Significant time invested, don't want to abandon
├─ Collection: Unlocking all upgrades, achievements, cosmetics
├─ Optimization: Always a way to be slightly more efficient
├─ Events: Seasonal events, limited-time bonuses
└─ Social: Sharing progress, comparing strategies (future)
```

### 5.5 Journey Emotional Arc

```
     ENGAGEMENT
         ▲
         │                    ╭─────╮
         │        ╭─────╮    ╱       ╲      ╭─────────
         │       ╱       ╲──╯  ERA 3  ╲────╯  ERA 4
         │ ╭────╯  ERA 2
         │╱   ERA 1
         │
         └────────────────────────────────────────────► TIME
              Hook   Grind   Transition   Mastery   Endless

EMOTIONAL STATES:
- Hook: Curiosity, satisfaction
- Grind: Determination, anticipation
- Transition: Excitement, slight overwhelm
- Mastery: Confidence, optimization joy
- Endless: Zen-like management, collection drive
```

---

## 6. Expansion Points (For Sub-Agents)

The following sections require dedicated deep-dives. Each is scoped for a focused agent session:

### 6.1 Resource & Economy Design
**File**: `docs/design/ECONOMY.md`
- Complete resource list with acquisition/sink methods
- Currency exchange rates and sinks
- Market price algorithms
- Inflation prevention systems
- Prestige economy balance

### 6.2 Automation & Fleet Systems
**File**: `docs/design/FLEET_SYSTEMS.md`
- Boat/vehicle progression tree
- Dispatch queue mechanics
- Travel time calculations
- Route optimization systems
- Drone swarm mechanics (Era 4)

### 6.3 Production Chain Design
**File**: `docs/design/PRODUCTION_CHAINS.md`
- Complete chain diagrams (all eras)
- Building ratios and timing
- Workforce requirements
- Upgrade paths per chain
- Era-specific chains

### 6.4 UI/UX Specifications
**File**: `docs/design/UI_SPECIFICATIONS.md`
- Wireframes per era
- Component library spec
- Animation requirements
- Responsive design rules
- Accessibility requirements

### 6.5 Game Balance Framework
**File**: `docs/design/BALANCE_MECHANICS.md` (Requirements) + `packages/client/src/config/` (Implementation)

The balance system uses a **configuration-driven architecture**:

| Component | Location | Purpose |
|-----------|----------|---------|
| Mechanics Requirements | `docs/design/BALANCE_MECHANICS.md` | Curve types, multiplier systems, formulas |
| Type Definitions | `packages/client/src/config/types/` | TypeScript interfaces for all configs |
| Balance Tuning | `packages/client/src/config/balance/` | Curves, timing, formatting, prestige values |
| Content Data | `packages/client/src/config/content/` | Resources, buildings, upgrades, events |

**Key Principle**: All balance tuning happens in config files. No code changes needed to adjust:
- Exponential scaling curves
- Idle vs active reward ratios
- Prestige breakpoints
- Time-to-milestone targets
- Number formatting (scientific notation thresholds)

### 6.6 MVP & Implementation Backlog
**File**: `docs/development/MVP_BACKLOG.md`
- Phase 1 feature set (Era 1 only)
- Technical architecture
- Sprint breakdown
- Testing requirements
- Launch criteria

### 6.7 Events & Engagement Systems
**File**: `docs/design/EVENTS_ENGAGEMENT.md`
- Random event design (Monsoon Blessing, etc.)
- Seasonal event framework
- Achievement system
- Daily/weekly objectives
- Notification strategy

---

## Appendix A: Reference Sources

### Cookie Clicker
- [Ascension Guide - Cookie Clicker Wiki](https://cookieclicker.fandom.com/wiki/Ascension)
- [Cookie Clicker - Wikipedia](https://en.wikipedia.org/wiki/Cookie_Clicker)
- [Heavenly Chips - Cookie Clicker Wiki](https://cookieclicker.fandom.com/wiki/Heavenly_Chips)

### oGame
- [Fleet - OGame Wiki](https://ogame.fandom.com/wiki/Fleet)
- [OGame - Wikipedia](https://en.wikipedia.org/wiki/OGame)
- [OGame Fleet Management Strategies](https://ogame.life/ogame/blog/ogame-fleet-management-for-2025-top-strategies/)

### Anno 1800
- [Production Chains - Anno 1800 Wiki](https://anno1800.fandom.com/wiki/Production_chains)
- [Anno 1800 Tips - PC Gamer](https://www.pcgamer.com/anno-1800-tips-guide/)
- [Anno 1800 Calculator](https://suhrmann.github.io/Anno-1800-Calculator/)

---

## Document Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2024-XX-XX | Foundation Agent | Initial structure, era system, user journey |
| 0.2.0 | 2024-12-28 | Claude | Era 1 complete: water economy, dingy trading, farm visualization |

---

*This document serves as the foundation for Grand Theft Swarm's game design. Sub-agents should reference this document and expand upon the designated sections in their respective files.*
