# Polish Phase: Known Issues & Improvements

This document tracks known shortcuts and areas that need attention before production release. These are acceptable for the foundation phase but should be addressed during polish.

---

## 1. Formula Expression Evaluator (Security)

**Location:** `src/core/CurveEvaluator.ts:186-210`

**Issue:** Uses `new Function()` for parsing formula expressions.

**Risk:** Potential security vulnerability if formulas ever come from untrusted sources (currently they don't - all formulas are hardcoded in config).

**Recommended Fix:**
- Implement a proper expression parser (e.g., mathjs library)
- Or create a custom safe expression evaluator with whitelisted operators/functions
- Add input validation to reject suspicious patterns

**Priority:** Medium (low risk in current architecture, but good practice)

---

## 2. UI Rendering (Performance & Security)

**Location:** `src/ui/UIRenderer.ts`

**Issue:** Direct DOM manipulation with `innerHTML` instead of a proper virtual DOM or framework.

**Problems:**
- No efficient diffing - re-renders entire sections on changes
- Potential XSS if any user input were displayed (none currently)
- Limited component reusability

**Recommended Fix:**
- Migrate to a lightweight framework (Preact, lit-html, or Solid)
- Or implement a simple virtual DOM diffing algorithm
- At minimum, use `textContent` for user-generated content

**Priority:** Medium (performance impact grows with complexity)

---

## 3. Building Production Accumulators (Precision)

**Location:** `src/systems/BuildingSystem.ts:280-310`

**Issue:** Simple accumulator pattern with 0.01 threshold for fractional production.

**Problems:**
- Could cause slight visual jitter with very slow production rates
- Floating point precision issues over long play sessions

**Recommended Fix:**
- Use a decimal library (e.g., decimal.js) for high-precision calculations
- Or accumulate in integer "micro-units" and convert for display

**Priority:** Low (unlikely to cause noticeable issues)

---

## 4. Multiplier Condition Context (Reactivity)

**Location:** `src/core/MultiplierSystem.ts`

**Issue:** The condition context is manually updated rather than being computed.

**Problems:**
- Requires calling `updateConditionContext()` whenever state changes
- Could get out of sync if a call is missed

**Recommended Fix:**
- Implement a reactive/computed approach using proxies or signals
- Or add automatic context updates via EventBus subscriptions in MultiplierSystem itself

**Priority:** Medium (could cause subtle bugs if missed)

---

## 5. Save System Checksum (Integrity)

**Location:** `src/systems/SaveSystem.ts:177-182`

**Issue:** Simple string length + character sum checksum.

```typescript
let sum = 0;
for (let i = 0; i < str.length; i++) {
  sum += str.charCodeAt(i);
}
return `${str.length}:${sum}`;
```

**Problems:**
- Not cryptographically secure
- Only catches accidental corruption, not intentional tampering
- Easy to generate collisions

**Recommended Fix:**
- Use CRC32 for better error detection
- Or use a proper hash (SHA-256) if tamper resistance is needed
- Consider encrypting save data if cheating is a concern

**Priority:** Low (current implementation is fine for detecting corruption)

---

## 6. Event Handling in UIRenderer (Architecture)

**Location:** `src/ui/UIRenderer.ts:203`

**Issue:** Uses inline `onclick` attributes for building buy buttons.

```typescript
onclick="window.gameInstance?.purchaseBuilding('${building.config.id}')"
```

**Problems:**
- Relies on global window object
- Harder to test
- Breaks if game instance naming changes

**Recommended Fix:**
- Use event delegation with data attributes
- Or attach event listeners after rendering
- Example:
  ```typescript
  buildingPanel.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-building-buy]');
    if (btn) {
      const buildingId = btn.getAttribute('data-building-id');
      this.onBuildingBuy(buildingId);
    }
  });
  ```

**Priority:** Medium (affects testability and maintainability)

---

## 7. Missing Systems (Features)

**Issue:** Several systems referenced in config but not implemented.

**Missing:**
- **UpgradeSystem** - Upgrades are defined but no purchase logic
- **EventSystem** - Random events (Monsoon Blessing, etc.) not implemented
- **PrestigeSystem** - Prestige logic referenced but not built
- **Production Chain Processing** - Resource conversions defined but not processed

**Recommended Fix:**
- Implement each system following the same patterns as ResourceSystem/BuildingSystem
- Add to Game.ts initialization

**Priority:** High (required for full gameplay)

---

## 8. Type Coercion in State Loading (Safety)

**Location:** `src/state/StateManager.ts:165`

**Issue:** Trusts loaded save data structure without validation.

```typescript
const loaded = savedState as Record<string, unknown>;
```

**Problems:**
- Corrupted saves could crash the game
- Old save formats could have missing fields
- Malformed data could cause runtime errors

**Recommended Fix:**
- Use a schema validator (zod, yup, io-ts)
- Validate each field before using
- Provide safe defaults for missing/invalid fields

**Example with zod:**
```typescript
const SaveSchema = z.object({
  version: z.string(),
  resources: z.record(ResourceStateSchema),
  // ...
});

function loadState(data: unknown) {
  const result = SaveSchema.safeParse(data);
  if (!result.success) {
    console.warn('Invalid save data, using defaults');
    return createInitialGameState();
  }
  return result.data;
}
```

**Priority:** High (affects save reliability)

---

## Implementation Order Recommendation

1. **High Priority (before beta):**
   - #7 Missing Systems - Required for gameplay
   - #8 Type Coercion - Prevents crashes

2. **Medium Priority (before release):**
   - #4 Multiplier Context - Prevents subtle bugs
   - #6 Event Handling - Improves maintainability
   - #2 UI Rendering - Performance improvements

3. **Low Priority (nice to have):**
   - #1 Formula Evaluator - Only if formulas become user-editable
   - #3 Production Accumulators - Only if precision issues observed
   - #5 Save Checksum - Only if tampering is a concern

---

## Notes

- All issues have workarounds in place that are acceptable for development
- The current architecture is designed to make these improvements straightforward
- Each fix can be done incrementally without breaking existing functionality
