# SpeakX-Pro — 4-Tier RBAC & UI Implementation Plan

**Repo:** `keyur536/SpeakX-Pro` — branch `keyur`
**Stack:** FastAPI + PostgreSQL(`pgvector`) + SQLAlchemy/Alembic backend · React + Vite + TypeScript + Tailwind + shadcn/ui frontend
**Audience:** This doc is written to be handed directly to an AI coding agent (Antigravity) as a work order. It references real file paths in the current repo.

---

## 0. TL;DR for the agent

The role hierarchy (super_admin → admin → faculty → student) and most of its database schema **already exist** and are partially wired up. Don't rebuild it from scratch. Instead:

1. Fix one real bug (admin chatbot is currently **unscoped**, sees everything).
2. Build the missing read/reporting endpoints (faculty has **no backend routes at all**; super_admin/admin can't see student progress).
3. Fix course→admin assignment so it's a real "reassign," not just an additive many-to-many map.
4. Replace the raw numeric-ID inputs in the admin/super-admin UI with real dropdowns, and build out the faculty dashboard, which is currently a hardcoded stub.
5. Layer a consistent shared component system across all 4 dashboards for the "change the UI" ask.

---

## 1. Target RBAC Model (as specified)

| Role | User mgmt | Course mgmt | Batch mgmt | Faculty assignment | Student assignment | Data visibility | Chatbot scope |
|---|---|---|---|---|---|---|---|
| **Super Admin** | Add/manage faculty; approve/reject any user | Create courses; assign/reassign admin per course | Full visibility of all batches | Assign faculty to any course/batch | Full visibility | **All** students' sessions & progress | **All** data |
| **Admin** | — | Manages only the course(s) assigned to them | Create batches under their course(s) | Assign faculty to their batches | Add students to their batches | Students/sessions within **their course(s) only** | Scoped to **their course(s) only** |
| **Faculty** | — | — | — | — | — | Students in batches **assigned to them only** | *(not specified — recommend: same scope as data visibility, see §9)* |
| **Student** | — | — | — | — | — | Own sessions only | Own data only (unchanged) |

---

## 2. Codebase Audit — What Exists vs. What's Missing

### ✅ Already implemented and correct
- `db/models.py`: `UserRole` enum (student/faculty/admin/super_admin), `Course`, `Batch`, `AdminCourseMap`, `FacultyCourseMap`, `FacultyBatchMap`, `StudentBatchMap`, `AuditLog` — the whole relational skeleton is there.
- `api/deps.py`: `require_role()` dependency factory — clean RBAC primitive, reuse it everywhere.
- `api/routes/super_admin.py`: create course, create faculty, assign faculty→course/batch, create batch (with compulsory admin), approve/reject users, audit log. All gated correctly with `require_role([UserRole.super_admin])`.
- `api/routes/admin.py`: create batch (scoped via `check_admin_course_access`), assign faculty to batch, add student / bulk CSV import to batch. Scoping helper functions (`check_admin_course_access`, `check_admin_batch_access`) already exist and are correct.
- `api/routes/chat.py`: RAG chatbot **already scopes students and faculty correctly** (student → own sessions; faculty → `FacultyBatchMap` batch IDs).

### ❌ Gaps / bugs found

| # | Issue | File | Impact |
|---|---|---|---|
| 1 | Admin's chatbot query has **no scoping filter at all** — comment literally says `# admins and super_admins can search the whole corpus for now` | `Backend/api/routes/chat.py` (line ~45) | Admin can see every student's data across every course via chat — violates your spec directly. |
| 2 | **No `api/routes/faculty.py` exists.** Faculty has zero endpoints to list their batches or view student progress. `main.py` doesn't import or register a faculty router at all. | `Backend/main.py`, `Backend/api/routes/` | Faculty literally cannot see "data of students assigned to them" today — the frontend `FacultyDashboard.tsx` is hardcoded (`<div>1</div>` batches, `"Live"` sessions). |
| 3 | Super admin has no endpoint to view student sessions/progress in aggregate. `sessions.py` only exposes `GET /sessions/` which returns **the logged-in user's own sessions** — nothing else queries `Session` by role. | `Backend/api/routes/sessions.py` | "Super admin can access all students' sessions and progress" — not possible today. |
| 4 | Admin has no equivalent scoped student/session view either. | `Backend/api/routes/admin.py` | Admin dashboard shows `Total Students: ...` as a literal placeholder string. |
| 5 | `assign_admin_to_course` only **adds** to `AdminCourseMap` (many-to-many). There's no "current admin" concept and no reassignment/removal logic — calling it twice gives a course two admins simultaneously, and there's no way to change or remove one. | `Backend/api/routes/super_admin.py` | "He can also change admin afterwards" isn't actually supported. |
| 6 | Frontend uses raw `<Input type="number">` for `course_id`, `batch_id`, `assigned_admin_id`, `faculty_id` instead of dropdowns populated from the API. Admins have no way to know these IDs. | `SuperAdminDashboard.tsx`, `AdminDashboard.tsx` | Functionally broken UX — not usable by a real non-technical admin. |
| 7 | Errors surfaced via raw browser `alert()`, no loading skeletons, "Total Students" hardcoded to `"..."`. | `AdminDashboard.tsx`, `SuperAdminDashboard.tsx` | UI polish debt, ties into your "change UI" ask. |
| 8 | `Backend/app.py` is dead legacy Streamlit code, not used by `main.py` (which is the real FastAPI entrypoint). It's confusing to have both in the repo. | `Backend/app.py` | Housekeeping — should probably be deleted. |

---

## 3. Data Model Changes

Only **one** schema change is actually needed — everything else can be built on the existing tables.

### 3.1 `Course` — add a direct "current admin" pointer

Mirror the pattern already used on `Batch.assigned_admin_id`:

```python
# db/models.py — Course class
assigned_admin_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
```

Keep `AdminCourseMap` exactly as-is — it becomes the **append-only audit history** of every assignment (who assigned whom, when), while `Course.assigned_admin_id` becomes the single source of truth for "who is the current admin." Same dual pattern already exists for batches conceptually.

**Alembic migration:** `Backend/alembic/versions/` — new revision adding `assigned_admin_id` nullable FK column to `courses`.

No changes needed to `SessionEmbedding` — course-level scoping for the admin chatbot can be derived via `Batch.course_id` (already present), so no denormalization is required there.

---

## 4. Backend Implementation Tasks

### 4.1 Fix `api/routes/chat.py` — scope admin chatbot to their course(s)

Replace the current logic:

```python
elif current_user.role == UserRole.faculty:
    ...
# admins and super_admins can search the whole corpus for now
```

with:

```python
elif current_user.role == UserRole.faculty:
    assigned_batches = db.query(FacultyBatchMap.batch_id).filter(FacultyBatchMap.faculty_id == current_user.id).all()
    batch_ids = [b[0] for b in assigned_batches]
    base_query = base_query.filter(SessionEmbedding.batch_id.in_(batch_ids))
elif current_user.role == UserRole.admin:
    course_ids = db.query(AdminCourseMap.course_id).filter(AdminCourseMap.admin_id == current_user.id).all()
    course_ids = [c[0] for c in course_ids]
    batch_ids = db.query(Batch.id).filter(Batch.course_id.in_(course_ids)).all()
    batch_ids = [b[0] for b in batch_ids]
    base_query = base_query.filter(SessionEmbedding.batch_id.in_(batch_ids))
# super_admin: unrestricted (unchanged)
```

Add `Course`, `Batch`, `AdminCourseMap` to the imports at the top of the file.

### 4.2 New file: `Backend/api/routes/faculty.py`

This role currently has **no** dedicated route file — create one and register it in `main.py`.

```python
router = APIRouter()

GET  /faculty/batches
    → batches from FacultyBatchMap for current_user, joined with Course name

GET  /faculty/students
    → all students (via StudentBatchMap) inside faculty's assigned batches
    → return: id, username, email, batch_name, latest_overall_score, total_sessions, last_session_date

GET  /faculty/students/{student_id}/sessions
    → 403 if student is not in one of the faculty's assigned batches (check via StudentBatchMap ∩ FacultyBatchMap)
    → else return full Session history for that student (same shape as sessions.py's GET /sessions/)
```

Register in `main.py`:
```python
from api.routes import ..., faculty
app.include_router(faculty.router, prefix="/api/v1/faculty", tags=["Faculty"])
```

### 4.3 Extend `api/routes/admin.py`

```python
GET /admin/courses
    → the course(s) this admin manages (via AdminCourseMap) — used to populate the
      course dropdown when creating a batch, replacing the raw numeric input

GET /admin/students
    → all students across all batches within admin's course(s)
    → same response shape as faculty's /faculty/students, plus batch_code/course_name

GET /admin/students/{student_id}/sessions
    → scoped: 403 unless student's batch's course is in this admin's AdminCourseMap

GET /admin/faculty
    → list of approved faculty (global pool, for the "assign faculty to batch" picker) —
      optionally flag which are already assigned to admin's batches

GET /admin/batches/{batch_id}/students
    → roster + progress summary for one specific batch (for drill-down UI)
```

All of these reuse the existing `check_admin_course_access` / `check_admin_batch_access` helpers already in the file — don't duplicate that logic.

### 4.4 Extend `api/routes/super_admin.py`

```python
GET /super-admin/overview
    → aggregate stats: total students, total sessions, avg overall_score platform-wide,
      sessions submitted in last 7 days — replaces the hardcoded "100%" System Health card

GET /super-admin/students
    → ALL students, with batch/course, latest score, total sessions (paginate; this can get large)

GET /super-admin/students/{student_id}/sessions
    → full session history, no scoping restriction

GET /super-admin/admins
    → list of approved admin users (needed for the "assign admin to course" dropdown —
      currently the frontend has no way to know which user IDs are admins)

PUT /super-admin/courses/{course_id}/admin      # REPLACES assign_admin_to_course's role
    body: { admin_id: int }
    → validates admin is role=admin and approved (existing checks, keep them)
    → sets course.assigned_admin_id = admin_id  (this is the actual "change admin" operation)
    → inserts a new AdminCourseMap row for audit history (don't delete old rows — keep as log)
    → log_action(..., "reassign_course_admin", ...)

GET /super-admin/courses/{course_id}
    → single course detail including current admin's username/email (joined), for the UI
      to show "Currently assigned to: X" with a "Change" button
```

Keep the existing `POST /courses`, `POST /faculty`, `assign_faculty_course/batch`, `pending-users`, `audit-log` endpoints as-is.

### 4.5 Housekeeping
- Delete or clearly quarantine `Backend/app.py` (dead Streamlit code) so it doesn't confuse future agents/devs. If any part of the team still uses it standalone, move it to a `/legacy` folder instead of the repo root.

---

## 5. Frontend Implementation Tasks

### 5.1 Shared component layer (new) — `frontend/src/components/shared/`

Build these once, reuse across all 4 dashboards — this is the core of "changing the UI" since right now every dashboard hand-rolls its own cards/tables:

- **`<StatCard icon title value trend? />`** — replaces the duplicated KPI-card JSX block that currently appears 3× nearly identically across `SuperAdminDashboard.tsx`, `AdminDashboard.tsx`, `FacultyDashboard.tsx`.
- **`<EntityCombobox />`** — searchable shadcn `Combobox`/`Select` that fetches from an API endpoint and shows names, not raw IDs. Use this to replace **every** `<Input type="number">` currently used for `course_id`, `batch_id`, `assigned_admin_id`, `faculty_id`.
- **`<DataTable columns data />`** — thin wrapper for sortable/paginated tables, replacing the raw `<Table>` blocks repeated in every dashboard.
- **`<StudentRosterTable data onRowClick />`** + **`<StudentDetailDrawer studentId fetchUrl />`** — a reusable "list of students with scores → click to see full session history/transcript/feedback" pattern. This single component, parameterized by which endpoint it calls, covers:
  - Super Admin → `/super-admin/students`
  - Admin → `/admin/students`
  - Faculty → `/faculty/students`
- Swap all `alert(...)` calls for shadcn `sonner`/toast notifications.
- Add loading skeletons (shadcn `Skeleton`) instead of literal `"..."` text and empty states for zero-data cases.

### 5.2 `FacultyDashboard.tsx` — rebuild (currently a stub)

- Replace hardcoded `1` batch count / `"Live"` sessions with real data from `GET /faculty/batches`.
- Add a **Students** tab using `<StudentRosterTable>` wired to `GET /faculty/students`, with drill-down to session history.
- Keep the existing Attendance tab as-is.

### 5.3 `AdminDashboard.tsx` — rebuild

- Batch creation dialog: swap `course_id` numeric input → `<EntityCombobox>` fed by `GET /admin/courses`.
- "Total Students" stat card: wire to `GET /admin/students` (`.length` or a count from `/admin/overview` if you add one).
- **Faculty tab**: currently just a text hint — replace with an actual "Assign Faculty to Batch" dialog: batch picker + faculty picker (`GET /admin/faculty`) → `POST /admin/batches/{id}/faculty`. Show a table of current faculty↔batch assignments.
- **Students tab**: replace the bare CSV importer with `<StudentRosterTable>` (source: `GET /admin/students`) *above* the existing CSV import form, so admins can see who's already enrolled, not just import blind.
- AI Coach: no frontend change needed — the existing shared `AiCoach.tsx` page automatically becomes course-scoped once §4.1 ships, since the backend does the filtering. Consider adding a small "Scoped to: {course names}" caption at the top of the chat for clarity.

### 5.4 `SuperAdminDashboard.tsx` — rebuild

- Courses tab: each row should show the **current admin's name** (from the new `GET /super-admin/courses/{id}` join) with a "Change Admin" button opening a dialog with `<EntityCombobox>` sourced from `GET /super-admin/admins`, calling `PUT /super-admin/courses/{id}/admin`.
- Batches tab: replace `course_id` / `assigned_admin_id` numeric inputs with `<EntityCombobox>`s.
- Overview tab: wire the "System Health" card and add real aggregate numbers from `GET /super-admin/overview`.
- **New Students tab**: global roster via `<StudentRosterTable>` sourced from `GET /super-admin/students`, with search/filter by course or batch.
- AI Coach: unchanged, already unrestricted per spec.

### 5.5 Visual/theme pass
The app already uses a dark, glassmorphic shadcn/Tailwind theme (per README). Recommended low-risk visual changes that reinforce the 4-role structure without a full redesign:
- Give each role a small accent color used consistently in that role's dashboard header/badges (e.g., super_admin = violet, admin = blue, faculty = teal, student = emerald) so it's visually obvious which context you're in.
- Consistent page header pattern: title + role badge + `NotificationBell` (already exists) across all 4 dashboards.
- Confirm dialogs (shadcn `AlertDialog`) for destructive/high-impact actions (reassigning a course admin, changing batch status).

If you want a deeper visual overhaul (new color palette, typography, layout system) rather than this consistency pass, flag that separately — see open questions below.

---

## 6. Phased Delivery Order (recommended for Antigravity)

1. **Phase 1 — Backend correctness & data endpoints** (§3, §4). This unblocks everything else and fixes the real security/scoping bug (admin chatbot). Do this first and test with `curl`/Swagger (`/docs`) before touching frontend.
2. **Phase 2 — Shared frontend component library** (§5.1). Build once, so Phases 3–5 aren't duplicating table/dropdown code.
3. **Phase 3 — Faculty dashboard rebuild** (§5.2) — smallest surface area, good validation of the shared components.
4. **Phase 4 — Admin dashboard rebuild** (§5.3).
5. **Phase 5 — Super Admin dashboard rebuild + course reassignment flow** (§5.4).
6. **Phase 6 — Visual consistency pass** (§5.5) + delete legacy `app.py`.

---

## 7. Acceptance Criteria (test per role before calling it done)

- [ ] Logging in as **student** still only sees their own sessions and chatbot data (unchanged behavior).
- [ ] Logging in as **faculty**: Dashboard shows real assigned batch count; Students tab lists only students in those batches; clicking a student shows their real session history; chatbot only references those students' data.
- [ ] Logging in as **admin**: Can create a batch by picking a course from a dropdown (no more typing an ID); can assign faculty via a picker; Students tab shows only students within their course(s); chatbot answers **only** reference sessions from their course(s) — verify by asking about a student known to be in a *different* course and confirming it's not surfaced.
- [ ] Logging in as **super_admin**: Can create a course, assign an admin via dropdown, then **change** that admin to someone else and see the change reflected immediately; Students tab shows every student platform-wide; chatbot can reference any student's data.
- [ ] Attempting to hit `/admin/students/{id}/sessions` or `/faculty/students/{id}/sessions` for a student outside your scope returns `403`, not data.

---

## 8. Open Questions (decide before/during implementation)

1. **Chatbot scope for faculty vs. their "data access":** you specified faculty's *data* access (student sessions) but didn't explicitly restate chatbot scope for faculty. The existing code already scopes faculty's chatbot to their batches — confirm you want to keep that (recommended) rather than give faculty no chatbot at all.
2. **One admin per course vs. many:** this plan assumes exactly **one active admin per course at a time** (matching "assign a new admin... can also change admin afterwards"). If you actually want a course to have multiple simultaneous admins, §4.4's reassignment endpoint needs to become additive instead of a replace.
3. **Faculty visibility into raw video/transcript vs. scores only:** should faculty see the full transcript and uploaded video, or just the numeric scores/feedback summary? This affects what `/faculty/students/{id}/sessions` returns.
4. **Visual direction:** do you want a genuinely new look (colors, typography, layout system) or is the consistency/functional pass in §5.5 sufficient? If the former, share any reference screenshots/brand colors so Antigravity has a target.
5. **Scale of "all students" view for super_admin:** any expected number of students (dozens vs. thousands)? This determines whether `GET /super-admin/students` needs pagination/search from day one (recommended either way, but worth confirming urgency).
