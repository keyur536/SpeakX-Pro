# SpeakX-Pro — UI Redesign Implementation Spec

**For:** Antigravity, working in `keyur536/SpeakX-Pro` branch `keyur`
**Use alongside:** the `redesign-existing-projects` skill (installed via `npx skills add https://github.com/leonxlnx/taste-skill --skill redesign-existing-projects`) — see §7 for exactly how the two fit together.
**Reference screenshots:** `login.png`, `student-dashboard.png`, `super-admin.png` (shipped alongside this file), plus live HTML references at `redesign-reference/*.html` you can open directly in a browser.

---

## 1. The concept

**"Your voice, measured."** SpeakX-Pro's entire product is built on analyzing a person's voice and delivery — pace, pitch, pauses, eye contact, posture, coherence — so the interface should feel like a recording studio readout, not a generic SaaS dashboard.

Two accents carry two different meanings throughout the app, deliberately:
- **Amber** = the human side — warmth, coaching, encouragement, primary actions (record, sign in, submit).
- **Teal** = the machine side — the measured signal, data, charts, scores.

The signature element is **the readout**: an equalizer-style cluster of vertical bars representing the six score pillars (Confidence, Fluency, English Proficiency, Communication Impact, Vocal Engagement, Physical Presence) that already exist in `Session` model fields. It replaces the generic "row of stat cards" pattern used today and echoes visually everywhere a score appears — dashboards, roster tables, chat.

Typography carries this split too: a warm display serif for moments that need presence (headlines, the AI coach's voice), a clean grotesk for everyday UI, and a monospace for every number that gets measured (WPM, Hz, percentages, scores) — so data reads like an instrument readout, not prose.

---

## 2. Design tokens — drop-in replacement for `frontend/src/index.css`

This keeps every existing CSS variable **name** the same (so Tailwind config and every existing shadcn component keep working with zero refactor) — only the values change. Replace the `:root` and `.dark` blocks:

```css
@layer base {
  :root {
    --background: 230 13% 9%;
    --foreground: 44 23% 91%;
    --card: 228 15% 13%;
    --card-foreground: 44 23% 91%;
    --popover: 230 15% 16%;
    --popover-foreground: 44 23% 91%;
    --primary: 36 79% 57%;
    --primary-foreground: 26 45% 12%;
    --secondary: 230 15% 16%;
    --secondary-foreground: 44 23% 91%;
    --muted: 230 15% 16%;
    --muted-foreground: 235 7% 63%;
    --accent: 179 69% 55%;
    --accent-foreground: 180 60% 10%;
    --destructive: 4 72% 59%;
    --destructive-foreground: 0 0% 98%;
    --border: 228 14% 21%;
    --input: 230 15% 16%;
    --ring: 179 69% 55%;
    --radius: 0.625rem;
  }
}
```

**Recommendation: ship dark-only.** The amber-spotlight-on-dark-stage concept only works against a dark canvas — a light-mode variant would be a different, weaker design. Remove the `mode-toggle` from `components/theme-provider.tsx` / wherever it's rendered in the nav, and hardcode `defaultTheme="dark"` with no toggle exposed. If the team wants light mode preserved for accessibility reasons, flag it back — that's a real, valid override of this recommendation, but it means designing a second palette, which this spec doesn't cover.

Additional tokens to append (not part of the shadcn set, used directly by new components):

```css
:root {
  --amber-deep: 34 73% 45%;
  --amber-tint: 39 34% 15%;
  --teal-deep: 179 64% 34%;
  --teal-tint: 180 33% 12%;
  --sage: 114 29% 65%;
  --sage-tint: 114 30% 12%;
  --radius-card: 1rem;
}
```

---

## 3. Typography setup

Add to `frontend/index.html` `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

Extend `frontend/tailwind.config.js` under `theme.extend`:

```js
fontFamily: {
  display: ['Fraunces', 'Georgia', 'serif'],
  sans: ['Manrope', '-apple-system', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'monospace'],
},
```

Usage rules for the team:
- `font-display` — page headlines, the "Good evening, {name}" greeting, coach quote callouts only. Never body copy, never buttons.
- default `font-sans` (now Manrope) — everything else: nav, buttons, labels, table headers.
- `font-mono` — every measured number without exception: WPM, Hz, percentages, scores, timestamps, IDs. Add `font-variant-numeric: tabular-nums` wherever numbers stack in a column (session history table) so digits align.

---

## 4. Component-level implementation notes

### 4.1 New component: `ScoreReadout`
`frontend/src/components/ScoreReadout.tsx` — the signature element. Props:

```ts
interface ScoreReadoutProps {
  overall: number;
  pillars: { label: string; value: number }[]; // 6 items: Confidence, Fluency, English Proficiency, Communication Impact, Vocal Engagement, Physical Presence
  highlight?: string; // label of the pillar to render in amber instead of teal (e.g. the biggest mover)
}
```

Renders the large mono `overall` number inside an amber-ringed circle on the left, six teal equalizer bars (one amber) on the right, bar height proportional to `value`. See `student-dashboard.png` / `redesign-reference/student-dashboard.html` for the exact visual target — that markup is close enough to lift directly into JSX with class names swapped for Tailwind utilities.

Use it in:
- `pages/Dashboard.tsx` — replaces the current KPI card row, as the page hero.
- Compact variant (just the 6 mini-bars, no ring) inside `<StudentRosterTable>` / `<StudentDetailDrawer>` rows wherever a student's latest scores are listed (Admin, Faculty, Super Admin dashboards, per the RBAC implementation plan) — this is what makes the redesign feel cohesive across all four roles instead of one nice page and three unchanged ones.

### 4.2 `pages/Login.tsx` and `pages/Register.tsx`
Two-column layout: left = brand + headline + the waveform bar motif (static decorative), right = the auth card. See `login.png`. The role-pill row at the bottom of the card (student/faculty/admin) is optional polish, not a functional requirement — the actual role comes from the account, not a picker; drop it if it implies something false.

### 4.3 `components/layout/DashboardLayout.tsx`
Currently unclear from a quick pass whether this renders a sidebar or a top bar — check it first. Target pattern for admin-tier roles (admin, faculty, super_admin) is a **left sidebar** per `super-admin.png`: brand mark, nav items with a small filled dot for the active item (teal), user chip pinned to the bottom. Keep the student experience on a simple top nav (`student-dashboard.png`) — students have three destinations (Dashboard, Analyze, Coach), a sidebar is overkill for that.

### 4.4 `pages/SuperAdminDashboard.tsx`, `AdminDashboard.tsx`
This is where the redesign and the RBAC implementation plan (delivered earlier in this conversation) meet directly:
- Every `<Input type="number">` currently used for `course_id` / `batch_id` / `assigned_admin_id` / `faculty_id` becomes the `EntityCombobox` component from that plan, styled per `.combo` / `.combo-drop` in `redesign-reference/super-admin.html` — teal focus border, dark dropdown panel, selected row tinted teal.
- Course rows get a "Change admin" pill button (teal outline, `radius-pill`) wired to the `PUT /super-admin/courses/{id}/admin` endpoint from that plan.
- Status pills (`ongoing`, `approved`, `pending`, `rejected`, `hold` — from the `ApprovalStatus` / `BatchStatus` enums) use the sage/amber/danger tint tokens, not the raw shadcn `Badge` defaults.

### 4.5 `pages/AiCoach.tsx`
Keep the structure, restyle the bubbles: assistant messages get a thin amber-left-border treatment (not a filled background) since the coach's voice is the "human warmth" side of the palette; use `font-display` italic for nothing here — keep chat body in `font-sans` for readability, reserve the serif for the coach's messages only where they're being surfaced as a pull-quote elsewhere (e.g. the "Your coach says" card on the dashboard, per `student-dashboard.png`).

### 4.6 Global cleanup while you're in each file
Fold these in as you touch each file — they're small, low-risk, and were already flagged as gaps:
- Replace every `alert(...)` call (`AdminDashboard.tsx`, `SuperAdminDashboard.tsx`) with a toast (shadcn `sonner`, add via `npx shadcn add sonner` — check it isn't already present first).
- Replace `"..."` placeholder stat values with a skeleton (shadcn `Skeleton`) while the real fetch is in flight.
- Add a visible focus ring (`ring-2 ring-accent`) to every interactive element — inputs, buttons, table rows that are clickable.

---

## 5. What NOT to change

- Don't touch `ml_pipeline/`, `Backend/` business logic, or the database schema — this is a visual pass only. Backend/RBAC work is covered in the separate implementation plan already in this project's history.
- Don't introduce a new component library or CSS framework. Tailwind + shadcn/ui stays; these are token and markup changes on top of it.
- Don't remove `lucide-react` (see §7.3 for why).

---

## 6. Screenshots reference

| File | Shows |
|---|---|
| `login.png` | Brand voice, headline typography, the waveform motif, auth card pattern |
| `student-dashboard.png` | The `ScoreReadout` hero, progress chart, coach card, record CTA, session history table |
| `super-admin.png` | Sidebar nav pattern, stat cards, the `EntityCombobox` in its open state, course-admin reassignment row |

The matching `.html` files in `redesign-reference/` render the exact same output in a browser (open directly, no build step) — useful as a pixel reference while translating into React/Tailwind, since colors/spacing can be inspected directly in devtools.

---

## 7. How this fits with the `redesign-existing-projects` skill

I checked the actual skill contents before writing this (worth knowing: third-party skill directories disagree on what this skill does — one listing describes it as a brand-identity/logo-kit generator, which is wrong for this repo; the source `SKILL.md` itself is a UI code-audit skill, and that's the one that matters here).

The skill's own process is **scan the existing codebase → diagnose against a generic-pattern checklist → fix with targeted, reviewable changes to the existing stack** — it explicitly says not to rewrite from scratch or swap frameworks. That makes it the right tool for *executing* this spec safely across a real codebase, but it isn't the thing that should decide the *direction* — this document already did that part. Concretely:

1. **Treat this document as the target direction**, not the skill's own default instincts. The tokens in §2, the component specs in §4, and the screenshots are what "done" looks like.
2. **Run the skill's audit checklist as your quality pass** while implementing each file — its checks on hover/active/focus states, loading and empty states, tabular numerals for data, consistent icon stroke widths, and no `window.alert()` all directly reinforce §4.6 above and are good to apply everywhere, not just the files this spec calls out by name.
3. **Two deliberate overrides**, called out so they don't get "fixed" back by the audit pass:
   - The skill's checklist generally favors a single accent color; this spec uses two (amber + teal) on purpose because they carry different meanings (human vs. measured), not decorative variety. Keep both.
   - The skill's checklist is skeptical of sidebar-pattern dashboards by default; this spec keeps one for the admin-tier roles because the app already has one and it genuinely fits a dense, multi-section console — don't replace it with a top nav.
4. **Icons stay on `lucide-react`.** The skill's own icon guidance leans toward swapping away from Lucide for differentiation, but its higher-priority rule is not to add dependencies that aren't already there — `lucide-react` is already in `frontend/package.json`. Standardize stroke width to 2px across the app instead of switching libraries.

If Antigravity has the skill loaded, feed it this file plus the three screenshots as the brief, and let it drive the actual file-by-file migration using its own scan/diagnose/fix sequence — that's the sequencing it's built for.
