# Sportified → Multi-Tenant Platform Refactor

This is a large, multi-phase effort. Shipping all 6 phases in one pass would be risky (big DB migrations + broad code rewrites at once). I propose to deliver it in safe, verifiable stages, starting with **performance** since you said it takes priority.

## Stage 1 — Performance (priority, no schema risk)
The app already lazy-loads routes via `lazyWithRetry`. I'll extend that and fix data/query/realtime costs.

- **Queries**: replace `select('*')` with explicit columns on Index, Leaderboard, EventBracket, Matches, Predictions, galleries; add `.limit()`/pagination on leaderboard and gallery.
- **Realtime**: subscribe only to currently-live matches; ensure every channel unsubscribes on unmount; debounce burst updates so scores don't trigger cascade rerenders.
- **Memoization**: `useMemo`/`useCallback` on derived bracket/standings/leaderboard data; `React.memo` on list rows (match cards, leaderboard rows, gallery tiles).
- **Gallery**: lazy `loading="lazy"` + decode async; windowing for large sets.
- **Leaderboard**: cache via React Query with sensible `staleTime`; avoid recompute on every render.
- **Indexes** (migration): `matches(event_id, status)`, `predictions(match_id)`, `predictions(user_id)`, `points(user_id)`, `matches(prediction_deadline)`, `event_photos(event_id)`, `teams(event_id)`.

## Stage 2 — Multi-tenant foundation (DB migration, needs approval)
- New `organizations` table: `id, name, slug, logo_url, description, owner_id, created_at` + GRANTs + RLS.
- Add `organization_id` to `events` (backfill existing events into a default "Sportified" org so nothing is orphaned).
- Helper functions: `is_super_admin()`, `owns_organization(org_id)`, `is_org_member(org_id)`.

## Stage 3 — Role system (DB + guards)
- Extend `app_role` enum to `super_admin | organizer | staff | viewer` (keep `admin` mapped to super_admin during transition).
- Add `organization_members(org_id, user_id, role)` so roles are scoped per organization (org admin/staff), with super_admin global.
- Update `useAuth` to expose `role`, `isSuperAdmin`, `organizationId`; new `RoleGuard` replacing/extending `AdminGuard`.

## Stage 4 — Separate dashboards
- `/admin` (super admin): Analytics, Organizations, Events, Users, Moderation, Featured, Reports, Platform Settings.
- `/org` (organizer): Dashboard, Events, Teams, Matches, Predictions, Gallery, Notifications, Org Settings.
- Staff sees a reduced org dashboard (scores + media only).

## Stage 5 — Event ecosystems
- Confirm predictions/galleries/leaderboards are all filtered by `event_id` end-to-end (EventBracket already centralizes this); remove any global mixing.

## Stage 6 — Onboarding + Quick Actions
- First-login organizer wizard: Create Org → Create Event → Add Teams → Generate Fixtures → Start Match.
- Quick Actions panel on the organizer dashboard.

## Technical notes
- Stages 2–3 change the schema and role semantics, so I'll run those migrations one at a time and verify the app still loads between each.
- Existing data is preserved: events backfill into a default org; current admins become super_admins.
- I recommend doing **Stage 1 now** (immediate, low-risk speed wins), then proceeding to Stage 2 once you confirm.

## Proposed first step
Start with Stage 1 (performance) plus the Stage 1 index migration. Confirm and I'll begin.