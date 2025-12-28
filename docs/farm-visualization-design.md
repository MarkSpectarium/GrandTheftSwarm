# Farm Visualization - Design Document

## Overview

The Farm Visualization is a dynamic visual representation of the player's farm that grows and evolves as they progress through the game. It uses a **hybrid CSS/emoji approach** that requires no external image assets.

## Current Implementation

### Architecture

```
FarmVisualization/
├── FarmVisualization.tsx    # React component (182 lines)
└── FarmVisualization.css    # Styles & animations (495 lines)
```

### Visual Layers (Top to Bottom)

| Layer | Purpose | Implementation |
|-------|---------|----------------|
| **Sky** | Ambient atmosphere | CSS gradient + emoji (sun, clouds, birds) |
| **Horizon** | Background structures | Emoji (trees, home, mill) |
| **Infrastructure** | Water supply buildings | Emoji (wells, carriers) + CSS (canal) |
| **Paddy Grid** | Main farming area | 4x3 CSS grid with emoji content |
| **River** | Water/transport | CSS gradient + emoji (boats) |
| **Progress Bar** | Farm density indicator | CSS bar |

### Grid Alignment Solution

The core challenge with emoji-based visuals is **inconsistent emoji widths** across operating systems and fonts. Our solution:

```css
.paddy-grid {
  display: grid;
  grid-template-columns: repeat(4, 60px);  /* FIXED widths */
  grid-template-rows: repeat(3, 50px);
}

.paddy-cell {
  width: 60px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;  /* Clip oversized emoji */
}
```

**Key principle**: The grid cells are fixed-size containers. Emoji content is centered within them using flexbox. This ensures perfect alignment regardless of emoji rendering differences.

### Animations

| Element | Animation | Technique |
|---------|-----------|-----------|
| Sun | Pulsing glow | `@keyframes` scale + brightness filter |
| Clouds | Horizontal drift | `translateX` with long duration |
| Birds | Figure-8 flight | `translateX` + `translateY` |
| Rice plants | Gentle sway | `rotate` oscillation |
| Workers | Harvesting motion | `translateY` bob |
| Buffalo | Grazing | `translateY` + slight `rotate` |
| Water carriers | Walking | `translateX` back-and-forth |
| Well bucket | Up/down | `translateY` |
| Boats | Floating | `translateY` + `translateX` drift |
| Water flow | Continuous scroll | `translateX` infinite loop |

### State Integration

```tsx
const farmState = useMemo(() => {
  // Read building counts from game state
  const paddyCount = getBuildingCount(buildings, 'paddy_field');
  // ... etc

  // Cap display counts for visual balance
  return {
    paddyCount: Math.min(paddyCount, 12),
    workerCount: Math.min(workerCount, 6),
    // ... etc
  };
}, [buildings, currentEra]);
```

### Era Theming

Era-specific CSS classes modify the visualization:

- **Era 1**: Earthy browns, muted greens, simple structures
- **Era 2**: Vibrant greens, mill appears, boats on river

---

## Shortcuts & Workarounds

### 1. Display Caps

**Issue**: Displaying 100+ paddy fields would be visually overwhelming and performance-heavy.

**Workaround**: Building counts are capped for display purposes:
- Paddy fields: max 12 shown
- Workers: max 6 shown
- Buffalo: max 4 shown
- Wells: max 2 shown

**Limitation**: Players with 50 paddy fields see the same farm as players with 12.

### 2. Simplified Positioning

**Issue**: True procedural placement of buildings would require complex layout algorithms.

**Workaround**: Fixed grid positions. Workers and buffalo are placed in paddy cells based on index, not intelligent positioning.

**Limitation**: Visual doesn't accurately represent "where" things are on the farm.

### 3. Static Infrastructure

**Issue**: Canals should connect water sources to fields visually.

**Workaround**: Canal is just a styled label in the infrastructure row, not an actual visual connection.

### 4. No Building-Specific Visuals

**Issue**: Each building type should have a distinct visual representation.

**Workaround**: Most buildings are single emoji. Complex buildings (mill, workshop) don't show internal detail.

### 5. Limited Boat Behavior

**Issue**: Sampans should show trading activity (loading, moving goods).

**Workaround**: Boats just float with a simple animation. No cargo or destination logic.

### 6. No Resource Visualization

**Issue**: Rice piles, water levels, flour bags should be visible.

**Workaround**: Resources only shown in the ResourcePanel, not in the farm scene.

---

## Missing Features

### High Priority

1. **Upgrade Visual Effects**
   - Upgraded buildings should look different (better tools, improved fields)
   - Currently: No visual distinction between tier 1 and tier 3 paddy fields

2. **Health/Status Indicators**
   - Buffalo health should be visible (happy/struggling/dying)
   - Currently: No indication of buffalo consuming water or losing health

3. **Click Interaction**
   - Clicking the farm should trigger harvest (alternative to button)
   - Clicking buildings could show info tooltips
   - Currently: Farm is display-only

4. **Production Animations**
   - Show rice being harvested when production ticks
   - Show resources flowing from buildings
   - Currently: Only ambient animations, no production feedback

### Medium Priority

5. **Weather/Time Effects**
   - Day/night cycle based on real time or play time
   - Weather effects (rain during monsoon events)
   - Currently: Static daytime scene

6. **Seasonal Rice Growth**
   - Rice plants should show growth stages (seedling → mature → golden)
   - Harvest animation when clicking
   - Currently: All rice plants look identical

7. **Proper Canal Network**
   - Visual water channels connecting well → canal → fields
   - Animated water flow through the system
   - Currently: Canal is just a label

8. **Building Placement Animation**
   - New buildings should "build" into existence
   - Construction animation when purchasing
   - Currently: Buildings just appear

9. **Achievement Monuments**
   - Visual markers for major milestones
   - Shrine/statue for prestige, first million rice, etc.
   - Currently: No achievement visualization

### Low Priority (Future Eras)

10. **Era 2 Processing Visualization**
    - Mill should show rice → flour conversion
    - Noodle workshop with drying racks
    - Currently: Mill just shows smoke animation

11. **Era 3+ Elements**
    - Motorboats replacing sampans
    - Drones flying over fields
    - Modern infrastructure
    - Currently: Only Era 1-2 visuals implemented

12. **Zoom/Pan Capability**
    - Allow players to zoom into farm details
    - Pan across larger farms
    - Currently: Fixed viewport

13. **Isometric or 2.5D View**
    - More visually impressive perspective
    - Depth and layering
    - Currently: Flat top-down/side hybrid

---

## Technical Debt

### Performance Concerns

1. **Animation Count**: Currently ~15 simultaneous CSS animations. Should profile on lower-end devices.

2. **Re-render Frequency**: Component re-renders on every game state change. Should consider:
   - Debouncing updates
   - Separating fast-changing elements (workers) from static (buildings)

3. **No Virtualization**: All elements rendered even if visually similar. Could use instancing for repeated elements.

### Code Quality

1. **Magic Numbers**: Grid dimensions (60px, 50px) hardcoded in multiple places. Should be CSS variables.

2. **Emoji Hardcoded**: Emoji characters in TSX instead of using icon registry. Should import from `icons.config.ts`.

3. **Limited Type Safety**: `getBuildingCount` uses string IDs. Should use typed building ID enum.

4. **No Tests**: Component lacks unit tests for:
   - Correct building count display
   - Era class application
   - Animation presence

---

## Future Architecture Considerations

### If Scaling Beyond Emoji

```
Option A: SVG Sprites
- Create simple geometric SVG for each building
- Maintains code-only approach
- Better animation control
- Consistent cross-platform rendering

Option B: Canvas Rendering
- Procedural drawing of farm elements
- Better performance for many elements
- Enables particle effects
- More complex implementation

Option C: Hybrid
- Keep emoji for entities (workers, buffalo)
- Use SVG/CSS for terrain and buildings
- Best of both worlds
```

### State Management Improvements

```tsx
// Current: Read directly from game state
const paddyCount = buildings.paddy_field?.owned ?? 0;

// Better: Dedicated visualization state
interface FarmVisualState {
  grid: GridCell[][];
  entities: Entity[];
  effects: ActiveEffect[];
  lastUpdate: number;
}

// Computed separately, updated less frequently
const visualState = useFarmVisualization(gameState, {
  updateInterval: 500, // ms
  maxEntities: 50,
});
```

---

## Summary

The current implementation provides a **functional, charming visualization** that grows with player progress. It uses clever CSS techniques to ensure consistent rendering without external assets.

**Strengths:**
- Zero external dependencies (no images)
- Smooth animations
- Responsive to game state
- Cross-platform emoji alignment solved

**Weaknesses:**
- Display caps hide true scale of large farms
- No interaction capability
- Missing production feedback
- Limited era differentiation

The foundation is solid for iterative improvement. Priority should be:
1. Click interaction for harvesting
2. Upgrade visual distinction
3. Health indicators for buffalo
4. Production tick animations
