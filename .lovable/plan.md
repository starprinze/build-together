# Sportified v17 — Phased Completion Plan

This spec covers 19 subsystems. Building them all in one pass would be unstable and would risk breaking the working platform. Instead this is sequenced into phases, each independently shippable, backward-compatible, and testable. Nothing existing is renamed or removed — everything is **additive**.

Current foundation already live: multi-tenant orgs, events, teams, matches, single/double elim + round robin + league fixtures, live control, predictions, event leaderboards, gallery, notifications, roles/RLS.

---

## Phase 1 — Universal Sport Engine (foundation for everything)
The keystone. Makes the platform sport-agnostic via a config-driven registry. **No football logic hardcoded.**

- New `src/lib/sports/` module: a `SportProfile` type + registry for Football, Basketball, Volleyball, Handball, Tennis, Table Tennis, Badminton, Athletics, Chess, Esports.
- Each profile declares: scoring rules, match periods, overtime/tiebreak rules, winner determination, standings points (win/draw/loss), and which timeline event types are relevant.
- `getSportProfile(sport)` helper with a safe default so existing events keep working.
- Wire standings (`src/lib/standings.ts`) and winner determination (`src/lib/bracket.ts`) to read from the profile instead of assuming football.
- Sport picker in event creation reads from the registry.

Deliverable: any sport selectable; standings/winner logic driven by sport config. Existing events unaffected.

## Phase 2 — Competition Formats + Fixture Management
- Extend `fixture_format` enum + `bracket.ts` generators: Group Stage + Knockout, Swiss, Custom. (Single/double elim, round robin, league already exist.)
- Organizer fixture editor: manual create/edit/delete, swap teams, swap home/away, assign venue/time, lock fixtures, safe regenerate (respects locks). Drag-and-drop rearrange.
- DB additions (additive columns on `matches`): `venue`, `scheduled_at`, `locked`, `group_id`, `leg`.

## Phase 3 — Group Stage + Knockout Engine
- New `groups` table (org-isolated, RLS). Unlimited custom-named groups, auto standings, manual correction (admin), qualification rules (top N / best thirds / manual).
- Knockout engine: seeded/random/manual draw, byes, walkovers, manual advancement, third-place playoff, sport-specific extra-time/penalty resolution.

## Phase 4 — Match Lifecycle + Live Match Center
- Extend `match_status` enum: ready, halftime, break, extra_time, penalties, walkover, postponed, abandoned (keep existing pending/live/completed/cancelled).
- Live center: sport-adaptive event entry (goals/sets/quarters/cards/fouls/timeouts/subs/possession) driven by Phase 1 profiles, realtime.

## Phase 5 — Predictions, Leaderboards, Players, Statistics
- Predictions: history, accuracy %, streaks, badges, season rankings; guard against duplicate point awards (already partly handled by unique constraint).
- Leaderboards: team / prediction / season / org / global, recalculated on match completion.
- Optional `players` table: squad, jersey #, position, photo, captain. Sport-adaptive stats.
- Modular statistics engine keyed off sport profile.

## Phase 6 — Org Management, Media, Notifications, Analytics, Hardening
- Granular org roles (referee, media, volunteer) on existing `organization_members`.
- Media center extensions (videos, albums, highlights, featured) on existing gallery/Cloudinary.
- Notification types (announcements, reminders).
- Analytics dashboards (participation, predictions, engagement).
- Security pass (RLS/org isolation/route guards), performance pass (query columns, caching, realtime debounce, lazy loading), full typecheck + build.

## AI Readiness (cross-cutting)
No placeholder features. Clean extension points only: a `match_events`/`summary` data shape rich enough for future AI reports, and a service-layer seam where AI modules can later plug in.

---

## Technical notes
- All enum extensions use `ALTER TYPE ... ADD VALUE` (non-destructive).
- All new tables follow the GRANT + RLS + policy pattern, org-isolated via existing `can_manage_org`/`can_manage_event`.
- Sport profiles are pure TS config (no DB migration needed for Phase 1) — the fastest path to sport-agnostic behavior.
- Each phase ends with typecheck + targeted tests before moving on.

## Recommendation
Approve this plan and I'll start with **Phase 1 (Universal Sport Engine)** now, since every other phase depends on it. Phases 2–6 will each come back for review as they land. If you'd rather I jump to a specific phase first (e.g. Fixture Management), tell me which.