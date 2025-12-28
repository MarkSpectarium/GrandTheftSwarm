# Polish Phase: Known Issues & Improvements

This document tracks known areas that need attention before production release.

---

## 1. OAuth Error Handling (UX)

**Location:** `packages/api/src/routes/auth.ts`

**Issue:** OAuth errors redirect to client with generic error codes.

**Problems:**
- Users see `?error=oauth_failed` without actionable information
- Debug logging added but not user-friendly
- No retry mechanism

**Recommended Fix:**
- Create an error page component in the client
- Map error codes to user-friendly messages
- Add "Try again" button
- Log detailed errors server-side for debugging

**Priority:** Medium (affects user experience on auth failures)

---

## 2. Email Fetching Fallback (Data Quality)

**Location:** `packages/api/src/routes/auth.ts`

**Issue:** Falls back to profile email when `/user/emails` API doesn't return an array.

**Problems:**
- Some users may not have email in their profile
- No indication to user that email wasn't captured
- Could affect features that rely on email

**Recommended Fix:**
- Log when fallback is used (currently implemented)
- Consider prompting user to add email if missing
- Make email optional in user-facing features

**Priority:** Low (graceful fallback exists)

---

## 3. JWT Token Security (Security)

**Location:** `packages/api/src/middleware/auth.ts`

**Issue:** JWT tokens have no refresh mechanism and long expiration (30 days).

**Problems:**
- Token stolen = long-term access
- No way to revoke tokens
- User must re-authenticate if token expires

**Recommended Fix:**
- Implement refresh tokens
- Store token generation time in database
- Add token revocation on password change/logout
- Reduce access token expiration to 15-30 minutes

**Priority:** High (security concern)

---

## 4. Database Connection Handling (Reliability)

**Location:** `packages/api/src/db/client.ts`

**Issue:** Single database client instance without connection pooling or error recovery.

**Problems:**
- Cold starts may have connection delays
- No automatic reconnection on failure
- No connection health checks

**Recommended Fix:**
- Implement connection health check endpoint
- Add retry logic for failed queries
- Consider connection pooling if Turso supports it
- Add graceful degradation for database outages

**Priority:** Medium (could cause intermittent failures)

---

## 5. Game State Validation (Data Integrity)

**Location:** Not yet implemented

**Issue:** No validation of game state data when saving.

**Problems:**
- Corrupted data could be saved
- Cheated/modified data could be accepted
- No version migration for schema changes

**Recommended Fix:**
- Use zod or similar for save data validation
- Implement version field in save schema
- Add migration system for old saves
- Server-side validation of reasonable values (anti-cheat)

**Priority:** High (affects data integrity)

---

## 6. Missing Game Systems (Features)

**Issue:** Some game systems are not yet implemented.

**Implemented:**
- GameLoop - Core loop with tick processing
- ResourceSystem - Production calculations with consumption
- BuildingSystem - Purchase and production logic with batch mode
- MultiplierSystem - Bonus calculations with stacks
- CurveEvaluator - Formula evaluation
- SaveSystem - Local storage persistence
- UpgradeSystem - Upgrade purchases and multiplier effects
- EventBus - Game events for batch completions

**Era 1 Content (Complete):**
- Rice production chain (paddies, workers, buffalo)
- Water supply chain (wells, carriers, canals)
- Dingy trading system with 7 upgrades
- Farm visualization with animations

**Missing:**
- **EventSystem** - Random events (Monsoon Blessing, etc.)
- **PrestigeSystem** - Era transitions and resets

**Recommended Fix:**
- Add EventSystem for random/timed events
- Complete PrestigeSystem for era progression

**Priority:** Medium (Era 1 gameplay complete, needed for Era 2+)

---

## 7. Cloud Save Integration (Resilience)

**Location:** `packages/client/src/systems/SaveSystem.ts`

**Issue:** LocalStorage is implemented but cloud sync is not integrated.

**Problems:**
- Cloud saves exist in API but client doesn't use them
- No sync between local and cloud saves
- No offline detection

**Recommended Fix:**
- Connect SaveSystem to API endpoints
- Implement sync on login
- Handle merge conflicts between local and cloud saves
- Add offline detection and appropriate UI

**Priority:** High (major UX concern)

---

## 8. Environment Variable Validation (Developer Experience)

**Location:** `packages/api/src/`

**Issue:** Missing environment variables cause runtime errors without clear messages.

**Problems:**
- Silent failures when env vars missing
- Unclear error messages
- Dangerous default for JWT_SECRET

**Recommended Fix:**
- Validate required env vars at startup
- Fail fast if JWT_SECRET not set in production
- Provide clear error messages for missing vars
- Use a schema validator (zod/envalid)

**Priority:** Medium (developer experience + security)

---

## 9. Rate Limiting (Security)

**Location:** Not implemented

**Issue:** No rate limiting on API endpoints.

**Problems:**
- Vulnerable to abuse/DoS
- Save endpoint could be spammed
- OAuth endpoint could be hammered

**Recommended Fix:**
- Add rate limiting middleware
- Different limits per endpoint type
- Consider Vercel's built-in rate limiting
- Add IP-based and user-based limits

**Priority:** Medium (security concern for production)

---

## Implementation Order

1. **Critical (before launch):**
   - #7 Cloud Save Integration
   - EventSystem implementation
   - PrestigeSystem for Era 2 transition

2. **High Priority (before public release):**
   - #3 JWT Token Security
   - #5 Game State Validation

3. **Medium Priority (before scaling):**
   - #1 OAuth Error Handling
   - #4 Database Connection
   - #8 Environment Validation
   - #9 Rate Limiting

4. **Low Priority:**
   - #2 Email Fallback

---

## Era 1 Completion Status ✅

Era 1 core gameplay is complete:
- [x] Rice production with workers and buffalo
- [x] Water economy (buffalo consume water)
- [x] Trading system (dingy sells rice for dong)
- [x] Upgrade paths for trading improvements
- [x] Animated farm visualization
- [x] Batch production for discrete trading trips
- [ ] Random events (Monsoon Blessing, etc.)
- [ ] Era 2 transition requirements
