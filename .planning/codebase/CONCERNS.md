# Codebase Concerns

**Analysis Date:** 2026-04-09

## Tech Debt

**Large Component Files - Maintenance Risk:**
- Issue: Three components exceed 300 lines with high state complexity and render logic intermixed
  - `src/components/TaskManager.jsx` - 375 lines
  - `src/components/DashboardOverview.jsx` - 345 lines
  - `src/components/MedicationTracker.jsx` - 305 lines
- Impact: Harder to test, modify, and debug; refactoring requires careful state coordination
- Fix approach: Extract filter/sort logic into custom hooks (`useTaskFiltering`), split form handling into separate components or contexts

**Uncontrolled Form Rendering Pattern:**
- Issue: `src/components/AddItemForm.jsx` uses uncontrolled components with `defaultValue` props; field state is only in FormData at submit time
- Files: `src/components/AddItemForm.jsx` (lines 66, 83, 93, 119)
- Impact: Cannot show inline validation, clear inputs programmatically, or detect unsaved changes
- Fix approach: Convert to controlled components or use a form library (React Hook Form, Formik); maintain explicit state for inputs

**Settings State Split Between localStorage and Redux/Context:**
- Issue: `src/hooks/useFamilyData.js` (lines 15-21) manages settings in localStorage with silent error catching, but app state uses separate error states
- Impact: Settings changes don't trigger re-renders reliably; silent errors hide configuration issues
- Fix approach: Move all state to a dedicated context or state management layer (Zustand, Jotai); make error handling explicit

**Global Error State Not Cleared After Recovery:**
- Issue: `src/hooks/useFamilyData.js` - `setError()` calls can be overwritten by subsequent operations, but parent components don't reset error state when users retry
- Files: `src/App.jsx` (line 264-269), `src/hooks/useFamilyData.js` (line 66)
- Impact: Users see stale error messages after fixing the issue server-side
- Fix approach: Clear error state on retry/new operation; tie error visibility to action state (e.g., only show error if last action failed)

**No Request Cancellation on Cleanup:**
- Issue: `src/hooks/useFamilyData.js` fetch callbacks don't use AbortController; component unmounts during fetch can cause memory leaks
- Impact: Lingering requests can cause state updates after unmount warnings; slow networks compound the issue
- Fix approach: Implement AbortController pattern in all fetch wrappers; cancel on component unmount

## Known Bugs

**Session Timeout Does Not Force Logout UI:**
- Symptoms: User's session expires server-side (24h TTL), but frontend still shows authenticated until they try an action
- Files: `src/App.jsx` (line 28), `src/api/client.js` (line 10)
- Trigger: Session cookie expires after 24 hours; user remains logged in on frontend until making a request that returns 401
- Workaround: User must manually log out or wait for next API call
- Fix approach: Implement session TTL timer on frontend that proactively checks `/auth/status` every 30 minutes; redirect to login if expired

**File Import on Cancelled Dialog Leaves Input Dirty:**
- Symptoms: Selecting a file, then cancelling doesn't clear the file input; re-selecting same file doesn't trigger change handler
- Files: `src/App.jsx` (lines 100-115), specifically line 114
- Trigger: User cancels import, then selects the same file again
- Current mitigation: Line 114 clears input value, but only on success
- Workaround: Refresh page or select a different file first
- Fix approach: Move input clearing outside try/catch to always execute; or clear on modal close in parent

**Data Import Does Not Validate Format Before Processing:**
- Symptoms: Malformed JSON in import file can cause partial data corruption
- Files: `src/hooks/useFamilyData.js` (line 188), `server/index.js` (line 486-497)
- Trigger: User imports JSON with missing required fields (e.g., medication without `name`)
- Current mitigation: Server filters items (line 485), but frontend doesn't prevent re-import of corrupted data
- Fix approach: Add schema validation (zod, joi) before import; show preview of what will be imported

**Gender/Relationship Field Missing (Data Model Gap):**
- Symptoms: Family members only have name, color, and tokens; no way to track relationships or gender for medical context
- Files: `src/hooks/useFamilyData.js`, `server/index.js` (family member schema)
- Impact: Cannot distinguish primary caregiver from child, or generate proper medical documentation
- Priority: Medium (impacts domain accuracy but not core functionality)
- Recommendation: Add `role` field (`'parent' | 'child' | 'sibling'`) and optional `dateOfBirth`

## Security Considerations

**Weak Password Requirements Not Enforced:**
- Risk: Single shared family password with no minimum length requirement or complexity rules
- Files: `server/index.js` (line 75)
- Current mitigation: Deployment guide recommends 12+ chars, but not enforced
- Recommendations:
  - Validate password strength server-side on startup
  - Provide generate-password utility in deployment docs
  - Consider multi-user login in v2 with per-user credentials

**Google OAuth Tokens Stored at Rest (Even Encrypted):**
- Risk: Long-lived refresh tokens can be exfiltrated if data.json is compromised
- Files: `server/index.js` (lines 562, 579, 609)
- Current mitigation: AES-256-GCM encryption with random IV, but tokens still persist
- Recommendations:
  - Implement token rotation strategy
  - Store only encrypted refresh tokens, request new access token on each use
  - Add audit logging for token access
  - Consider moving tokens to a dedicated secrets manager

**Import/Export Data Includes Full User Details But No Access Control:**
- Risk: Exported JSON contains all family member info and event data; no granular export controls
- Files: `server/index.js` (lines 454-462), family members include encrypted tokens in export
- Recommendation: When exporting, strip tokens and require explicit password confirmation; add import size limits

**CORS Configuration Lacks Wildcard Validation:**
- Risk: If CORS_ORIGINS is misconfigured (e.g., trailing slash mismatch), requests may silently fail or allow unintended origins
- Files: `server/index.js` (line 22)
- Recommendation: Add validation helper that normalizes URLs and logs warnings on startup

**No Rate Limiting on API Endpoints (Only on `/auth/login`):**
- Risk: Bulk data operations (import) and deletion have no rate limits
- Files: `server/index.js` (only line 57: rateLimit on login)
- Recommendation: Apply rate limiting to `/api/data/import`, `/api/data`, and deletion endpoints

## Performance Bottlenecks

**All Data Loaded on Mount (No Pagination):**
- Problem: `src/hooks/useFamilyData.js` fetches all medications, appointments, tasks on load
- Files: `src/hooks/useFamilyData.js` (line 52-72)
- Cause: No server-side pagination; O(n) filtering/sorting on every state change
- Current scale: Works fine at <1000 items (typical family), but will degrade with larger deployments
- Improvement path:
  - Implement server-side filtering/sorting endpoints (e.g., `GET /api/medications?person=X&status=active`)
  - Add cursor-based pagination for large result sets
  - Cache filtered views on frontend to avoid re-filtering

**Medication/Task Ref Updates Cause Re-renders Despite useCallback:**
- Problem: `medicationsRef.current = medications` (line 29) and `tasksRef.current = tasks` (line 31) update refs on every state change
- Files: `src/hooks/useFamilyData.js` (lines 28-31)
- Cause: Refs update on every render, but callbacks with `[withErrorHandling]` dependency don't change, so toggle handlers are not memoized properly across state updates
- Impact: Minor (refs are intentional pattern to avoid stale closures), but indicates the pattern is fragile
- Improvement: Document why refs are used; consider useReducer to consolidate state updates

**O(n) Linear Search for Member Name/Color:**
- Problem: Every rendered medication/task/appointment searches for member by ID
- Files: `src/utils/memberHelpers.js`, used throughout components
- Cause: No member ID → object lookup map cached
- Improvement: Memoize member lookup map in `useFamilyData`; return from hook

**Form Validation Re-runs on Every Field Render:**
- Problem: `validateTask()`, `validateMedication()` etc. called in handleSubmit but validation object created on every render
- Files: `src/components/MedicationTracker.jsx` (line 44), TaskManager, AppointmentsPage
- Cause: No schema caching; each validation creates new error objects
- Impact: Negligible for small forms, but pattern doesn't scale
- Improvement: Move to Zod/Joi schemas memoized outside component

## Fragile Areas

**OAuth Flow State Management:**
- Files: `server/index.js` (lines 511-569)
- Why fragile:
  - `pendingOAuthFlows` Map cleaned up only on new OAuth requests, not by timer
  - 10-minute TTL (line 523) means old entries accumulate until next request
  - CSRF token is memberId + random; no entropy validation
- Safe modification:
  - Add explicit cleanup timer on startup
  - Return CSRF token from `/auth/google` endpoint to frontend for validation
  - Validate state parameter before parsing JSON (line 542)
- Test coverage: Tests exist (`server/index.test.js` lines 100+) but don't cover cleanup race conditions

**Data Persistence Race Conditions:**
- Files: `server/index.js` (lines 248-252)
- Why fragile:
  - `saveQueue` Promise chain can lose writes if multiple saves interleave
  - No write validation; disk errors silently fail to propagate
  - No atomic writes; data.json can be partially written on crash
- Safe modification:
  - Use atomic file writes (write-temp, then rename)
  - Add retry logic with exponential backoff
  - Validate written data on read
- Test coverage: Tests mock fs, don't cover actual disk errors

**Google Calendar Event Sanitization Missing Field Validation:**
- Files: `server/index.js` (lines 596-602)
- Why fragile:
  - Only returns `id`, `summary`, `start`, `end`, `location`; no validation that fields exist
  - `e.summary || '(No title)'` hides missing titles
  - `e.start` and `e.end` are complex objects (dateTime or date); frontend expects ISO string
- Safe modification:
  - Validate event structure before sanitizing
  - Normalize dates to ISO 8601 strings
  - Log dropped fields for debugging
- Test coverage: No tests for calendar-events endpoint

**Component Integration Test Gap:**
- Files: All component JSX files lack integration tests
- Why fragile:
  - Form submission flows (edit + validation + delete) only have unit tests on utils
  - Modal lifecycle (open → submit → close) not tested
  - Parent-child prop drilling not verified
- Test coverage: Only utility functions tested (`dataValidation.test.js`, `dateHelpers.test.js`)

## Scaling Limits

**In-Memory Session Storage:**
- Current capacity: Unlimited sessions; limited by heap size (~100MB default Node.js)
- Estimate: ~1000-10000 concurrent valid sessions before performance degrades
- Limit: Multiple device logins per family member cause sessions to accumulate
- Scaling path:
  - Move sessions to Redis for multi-instance deployments
  - Implement session TTL with sliding window (reset on activity)
  - Add max-sessions-per-user limit

**File-Based Data Storage:**
- Current capacity: JSON file I/O; works fine up to ~50MB file size (~10k items per category)
- Limit: No concurrent write safety; large imports block all reads
- Scaling path:
  - Migrate to SQLite for local deployments (ACID guarantees)
  - Add read replicas for high-traffic deployments
  - Implement connection pooling for multiple app instances

**In-Memory Rate Limit Store:**
- Current capacity: `rateLimitStore` Map holds all IPs in memory indefinitely
- Limit: Distributed deployments share no state; each instance has separate rate limiter
- Scaling path:
  - Move to Redis
  - Implement distributed rate limiting with shared state

**Browser Medication/Task Filters:**
- Current capacity: `useMemo` filters entire list O(n) on every prop change
- Limit: >5000 items will cause noticeable UI lag
- Scaling path: Implement server-side filtering; use react-window for virtualized lists

## Dependencies at Risk

**Express 5.x Maintenance Status:**
- Risk: Express 5 is in beta/RC; full release timeline uncertain as of 2026-04-09
- Impact: Node.js version constraints or future security updates may require major version bump
- Migration plan: Monitor Express releases; have fallback to Express 4.x with minimal changes (same API)

**date-fns Version Constraint:**
- Risk: No major version pinning; `^2.30.0` allows breaking changes in 3.x
- Impact: Could break date formatting in medications/appointments
- Migration plan: Upgrade to 3.x when released; review API changes for `formatTime`, `isOverdue`

**No TypeScript (JavaScript Codebase):**
- Risk: No static type checking; prop drilling errors only surface at runtime
- Impact: Refactoring components is fragile; API changes propagate as silent failures
- Recommendation: Consider gradual TypeScript migration for `server/`, then `src/`; start with JSDoc comments

## Missing Critical Features

**No Data Deletion Audit Trail:**
- Problem: Clear Data, delete family member with cascade deletes, no undo or audit log
- Blocks: HIPAA/medical compliance audits; family cannot track who deleted what when
- Recommendation: Implement soft deletes with deletion timestamps; add admin audit log view

**No Multi-User Support:**
- Problem: Single shared password for entire family; no role-based access control
- Blocks: Cannot restrict caregiver view to only assigned family members; no shared calendar between parents
- Recommendation: v2 feature; move from session-based to JWT with role claims

**No Offline Data Sync:**
- Problem: PWA features not implemented; no service worker
- Blocks: App cannot work offline; no background sync for changes made offline
- Recommendation: Implement service worker for offline reads; queue mutations for sync on reconnect

**No Data Encryption at Rest Beyond OAuth Tokens:**
- Problem: Medications, appointments, tasks stored in plaintext JSON
- Blocks: Cannot meet privacy requirements for medical data
- Recommendation: Implement client-side encryption with per-family encryption key; document decryption workflow for password recovery

**No Notification/Alert System:**
- Problem: No push notifications for overdue medications, upcoming appointments
- Blocks: Caregivers must check dashboard manually
- Recommendation: Add email digest (daily summary), push notifications via Web Push API, SMS alerts (paid service)

## Test Coverage Gaps

**Components Missing Integration Tests:**
- What's not tested: Form submission lifecycle (open modal → fill form → validate → submit), filter state changes, delete confirmations
- Files: `src/components/MedicationTracker.jsx`, `TaskManager.jsx`, `DashboardOverview.jsx`, `AppointmentsPage.jsx`
- Risk: UI bugs in form flow, filter state leakage, modal state inconsistencies can ship
- Priority: High (users interact directly with these)
- Coverage approach:
  - Add Vitest + React Testing Library setup for components
  - Test happy path: add → edit → delete for each entity
  - Test error cases: validation failures, network errors
  - Test filter interactions: filter + edit + filter again

**API Endpoint Edge Cases:**
- What's not tested: Concurrent requests, partial import failures, token decryption with corrupted data
- Files: `server/index.test.js` (592 lines) covers basic CRUD but not concurrent behavior
- Risk: Race conditions in delete + re-add, import validation bypasses
- Priority: Medium
- Coverage approach:
  - Add concurrent request tests (Promise.all multiple writes)
  - Test import with malformed records (missing name, invalid person ID)
  - Test token decryption with every byte-level corruption

**Hook Behavior (useFamilyData) Integration:**
- What's not tested: Error recovery (fetch fails, retry succeeds), stale closure bugs in toggle handlers, localStorage persistence
- Files: `src/hooks/useFamilyData.js` (242 lines) has no tests
- Risk: Silent state inconsistencies, stale data from refs
- Priority: High (central data flow)
- Coverage approach:
  - Mock API client with success/failure scenarios
  - Test error state cleared on retry
  - Test refs stay in sync with state
  - Test localStorage fallback on error

**Date/Time Formatting Edge Cases:**
- What's not tested: Timezone handling, DST transitions, 24-hour format inconsistencies
- Files: `src/utils/dateHelpers.js` (95 lines, 150 line test file) - actually has good coverage
- Priority: Low (already tested)

---

*Concerns audit: 2026-04-09*
