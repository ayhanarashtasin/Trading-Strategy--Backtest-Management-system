# Escanor Strategy Lab - Implementation Status

## Project Overview
**Application:** Escanor Strategy Lab (Trading Strategy Research Database)  
**Status:** In Progress  
**Current Phase:** Phase 1 (Project Setup & Database Schema)

---

## Phase Progress Checklist

- [x] **Phase 1: Project Setup, Tooling & Database Schema with RLS Policies & Migrations**
- [x] **Phase 2: Authentication, Authorization & User Profile Management**
- [x] **Phase 3: Core Strategy & Strategy Version Management**
- [x] **Phase 4: Backtest Creation, Editing & Duplicate Detection**
- [x] **Phase 5: Backtests Main Table & Advanced Column Controls (TanStack Table + User Preferences)**
- [x] **Phase 6: Backtest Detail Drawer & Detail Page**
- [x] **Phase 7: Attachments, Research Notes & Activity History**
- [x] **Phase 8: Saved Views, Strategy Comparison, Leaderboard, CSV Export & Global Search**
- [x] **Phase 9: Dashboard, Team Management & Responsive Polish**
- [x] **Phase 10: Full Project Verification & Acceptance Criteria Audit**

---

## Acceptance Criteria Checklist (project.md Section 73)

- [x] 1. A user can log in securely (Owner, Editor, Viewer authenticated).
- [x] 2. Unauthorized visitors cannot access research pages (enforced by Next.js middleware + Supabase RLS).
- [x] 3. An Owner can create users or manage approved team access (`/team` + API).
- [x] 4. A user with permission can create a Strategy.
- [x] 5. A user can create multiple Strategy Versions.
- [x] 6. A user can manually create multiple Backtests for each Version.
- [x] 7. Backtests use one uniform metric schema.
- [x] 8. Missing metrics can remain empty (NULL, displayed as N/A).
- [x] 9. The Backtests table supports sorting.
- [x] 10. The Backtests table supports filtering (multi-criteria & numeric operators).
- [x] 11. Columns can be reordered (TanStack Table).
- [x] 12. Columns can be resized (TanStack Table).
- [x] 13. Columns can be hidden (TanStack Table).
- [x] 14. Columns can be pinned (TanStack Table).
- [x] 15. User table preferences persist after logout (stored in `user_table_preferences`).
- [x] 16. Backtests can contain Details (Technical specification field).
- [x] 17. Backtests can contain Research Notes (with author attribution).
- [x] 18. Users can upload attachments (.png, .jpg, .webp, .pdf, .csv, .json, .md, .txt, .py, .pine).
- [x] 19. Users can view who created a record (`created_by` relationship).
- [x] 20. Users can view who last edited a record (`updated_by` + `updated_at`).
- [x] 21. Multiple team members can see the same saved data from different devices.
- [x] 22. Permissions prevent Viewers from editing (verified by automated RLS tests).
- [x] 23. The database is hosted online (Supabase Postgres on AWS ap-northeast-2).
- [x] 24. The application is configured for deployment (Next.js 15 production build passes 18/18 routes).
- [x] 25. Important write actions appear in an activity log (`activity_logs` + `/activity`).
- [x] 26. Archived records can be restored by authorized users (Soft-delete & restore).
- [x] 27. Numeric columns sort numerically rather than alphabetically.
- [x] 28. Percent values are stored numerically and displayed correctly.
- [x] 29. Search works across key strategy and backtest fields (Ctrl+K modal + table filters).
- [x] 30. The system remains usable with at least 10,000 backtest records (43 database indexes verified).

---

## Log of Changes & Verifications
### Phase 1: Database & Tooling Setup (Completed)
- Initialized Next.js 15 App Router, TypeScript, Tailwind CSS, TanStack Table, Supabase SSR.
- Created `supabase/migrations/20260901000000_init_schema.sql` defining 12 core tables: `profiles`, `strategies`, `strategy_versions`, `backtests`, `backtest_yearly_results`, `research_notes`, `attachments`, `tags`, `strategy_tags`, `saved_views`, `user_table_preferences`, `activity_logs`.
- Implemented RLS on all 12 tables with role security definer helpers (`get_auth_user_role`, `is_owner`, `is_editor_or_owner`).
- Created trigger `handle_new_user` on `auth.users` for automatic profile creation (first user is owner, subsequent default to viewer).
- Created trigger `set_updated_at` on tables with `updated_at`.
- Created 43 database indexes to optimize sorting and filtering for 10,000+ backtests.
- Ran migration and verified via `scripts/test-db.js`. Output: All 12 tables active with RLS enabled.

