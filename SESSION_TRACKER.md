# DevTrackr — Session Progress Tracker
## Give this file to AI agent along with DEVTRACKR_CONTEXT.md every session

---

## ⚠️ AGENT INSTRUCTIONS
- Read this file completely before writing any code
- Only use the exact stack listed in the LOCKED STACK section below
- Update the checklist mentally — implement only the CURRENT SESSION tasks
- Do not jump ahead to future sessions
- Follow RULES.md for all naming, error handling, and response shapes

---

## 🔒 LOCKED TECH STACK (No substitutions allowed)

### Backend
| Purpose             | Package / Tool           |
|---------------------|--------------------------|
| Runtime             | Node.js                  |
| Framework           | Express.js               |
| Database            | MongoDB + Mongoose ODM   |
| Auth                | JWT (jsonwebtoken) + bcrypt (bcryptjs) |
| GitHub API          | @octokit/rest + @octokit/graphql |
| AI / LLM            | Google Gemini API → `@google/generative-ai` |
| Validation          | express-validator        |
| Logging             | winston                  |
| PDF Export          | pdfkit                   |
| Encryption          | crypto-js (AES-256)      |
| Rate Limiting       | express-rate-limit       |
| Security Headers    | helmet                   |
| HTTP Logging        | morgan                   |
| Environment         | dotenv                   |
| Containerization    | Docker + Docker Compose  |
| Testing             | Jest + Supertest + mongodb-memory-server |

### Frontend
| Purpose             | Package / Tool           |
|---------------------|--------------------------|
| Framework           | React 18 (Vite)          |
| Styling             | Tailwind CSS             |
| Charts              | Recharts                 |
| HTTP Client         | Axios                    |
| Routing             | React Router DOM v6      |
| State Management    | Zustand                  |
| Icons               | @heroicons/react         |
| Notifications       | react-hot-toast          |
| Testing             | Vitest + @testing-library/react |

### ❌ DO NOT USE (Strictly prohibited)
- Redux / Redux Toolkit (use Zustand)
- Chart.js / D3.js (use Recharts)
- Prisma / TypeORM (use Mongoose)
- NextAuth / Passport.js (use JWT manually)
- OpenAI / Anthropic / Cohere API (use Gemini only)
- Material UI / Ant Design / Chakra UI (use Tailwind only)
- GraphQL server (backend is REST only)
- TypeScript (use plain JavaScript)
- yarn / pnpm (use npm only)

---

## ✅ COMPLETED SESSIONS

> Mark sessions as done by changing `[ ]` → `[x]` and filling the "What was built" section

---

### SESSION 1 — Docker + Express Boilerplate + Auth
**Status:** `[x] Complete`
**Goal:** Project scaffold, Docker, MongoDB connection, full auth system

**What was built:**
- [x] `docker-compose.yml` with services: backend, frontend, mongo
- [x] `backend/Dockerfile` and `frontend/Dockerfile`
- [x] `backend/src/server.js` and `app.js` (Express setup, middleware)
- [x] `backend/src/config/db.js` (Mongoose connection with retry)
- [x] `backend/src/config/logger.js` (Winston setup)
- [x] `User.model.js` (with all fields from schema)
- [x] `auth.routes.js` → POST /register, /login, /refresh, /logout
- [x] `auth.controller.js` + `auth.service.js`
- [x] `auth.middleware.js` (JWT verify — authenticateToken)
- [x] `tokenHelper.js` (sign/verify access + refresh tokens)
- [x] `responseHelper.js` ({ success, data, message })
- [x] `asyncHandler.js` (try/catch wrapper)
- [x] GET /api/auth/me (protected route test)
- [x] `validate.middleware.js` + `auth.validator.js`
- [x] `errorHandler.middleware.js` (global error handler)
- [x] `.env.example` with all required keys
- [x] Auth tested via Postman / test file

**Known issues / carry-forward:**
- None for Session 1. Ready for Session 2.

---

### SESSION 2 — GitHub OAuth + Token Storage + Repo Listing
**Status:** `[x] Complete`  
**Depends on:** Session 1 complete

**Goal:** Full GitHub OAuth connect flow, encrypted token storage, list user repos

**What was built:**
- [x] GitHub OAuth App created (Client ID + Secret in .env)
- [x] `github.routes.js` → GET /connect, /callback, /repos, /status, DELETE /disconnect
- [x] `github.controller.js` + `github.service.js`
- [x] `encryptionHelper.js` (AES-256 encrypt/decrypt for GitHub tokens)
- [x] OAuth callback exchanges code → GitHub access_token
- [x] GitHub token encrypted and saved to User document
- [x] `githubConnected`, `githubId`, `githubUsername` set on User after connect
- [x] GET /github/repos → fetches user's repos from GitHub API via Octokit
- [x] GET /github/status → returns { connected: true/false, username }
- [x] DELETE /github/disconnect → clears token + resets fields
- [x] CSRF state param validated in callback
- [x] Middleware: check githubConnected before GitHub routes

**Known issues / carry-forward:**
- None. Ready for Session 3.

---

### SESSION 3 — GitHub Data Sync Engine
**Status:** `[x] Complete`  
**Depends on:** Session 2 complete

**Goal:** Fetch commits, PRs, issues from GitHub and store in MongoDB

**What was built:**
- [x] `Repository.model.js`, `Commit.model.js`, `PullRequest.model.js`, `Issue.model.js`
- [x] `sync.service.js` — full sync engine
  - [x] fetchAndSaveCommits() — Octokit paginated commits, incremental via `since`
  - [x] fetchAndSaveIssues() — open + closed issues
  - [x] fetchAndSavePullRequests() — all PR states with stats
  - [x] upsert strategy (update if SHA/number exists, insert if new)
  - [x] Update `lastSyncedAt` on Repository after sync
- [x] `githubDataMapper.js` — maps raw GitHub API → Mongoose schema
- [x] POST /github/repos/:repoFullName/sync → triggers full sync job
- [x] Repository saved to DB on first sync (if not exists)
- [x] Rate limit check: reads x-ratelimit-remaining header
- [x] Sync job handles GitHub API errors gracefully (no crash)

**Known issues / carry-forward:**
- None. Ready for Session 4.

---

### SESSION 4 — Analytics API Endpoints
**Status:** `[x] Complete`  
**Depends on:** Session 3 complete

**Goal:** All analytics endpoints with MongoDB aggregation pipelines

**What was built:**
- [x] `analytics.routes.js` — all secure analytics endpoints registered and structured
- [x] `analytics.controller.js` + `analytics.service.js` using async/await and robust error handling
- [x] GET /analytics/repos/:repoId/commits → paginated commit list
- [x] GET /analytics/repos/:repoId/commits/chart → grouped by day/week using MongoDB aggregate pipelines
- [x] GET /analytics/repos/:repoId/contributors → per-author stats (commits, additions, deletions) avoiding duplicates
- [x] GET /analytics/repos/:repoId/pullrequests → PR list with calculated `mergeTimeHours`
- [x] GET /analytics/repos/:repoId/issues → issue list with open/closed count summaries
- [x] GET /analytics/repos/:repoId/velocity → engineering metrics like avgMergeTime, commitsPerDay, and prMergeRate
- [x] Authorization check: repo must belong to authenticated user (400 for invalid ID, 404 for missing repo, 403 for unauthorized)
- [x] All endpoints use `.lean()` for optimal query performance
- [x] Pagination implemented on list endpoints (page + limit)

**Known issues / carry-forward:**
- None. Ready for Session 5.

---

### SESSION 5 — Gemini AI Integration (All 4 Insight Types)
**Status:** `[x] Complete`  
**Depends on:** Session 4 complete

**Goal:** Full AI pipeline — prompt building, Gemini calls, JSON parsing, caching

**What was built:**
- [x] `AIInsight.model.js` (with expiresAt TTL index)
- [x] `gemini.service.js`
  - [x] generateSprintSummary() with prompt from promptBuilder
  - [x] generateBottleneckAnalysis()
  - [x] generateContributorAnalysis()
  - [x] generateRecommendations()
  - [x] JSON validation + retry once on invalid JSON
  - [x] Fallback error object if retry fails
- [x] `insight.service.js` — cache check logic (TTL 24h)
- [x] `promptBuilder.js` — all 4 prompt templates (JSON-only responses)
- [x] `ai.routes.js` and `ai.controller.js`
- [x] POST /ai/repos/:repoId/summarize
- [x] POST /ai/repos/:repoId/bottlenecks
- [x] POST /ai/repos/:repoId/contributors
- [x] POST /ai/repos/:repoId/recommendations
- [x] GET /ai/repos/:repoId/insights (all cached insights)
- [x] `?force=true` param bypasses cache

**Known issues / carry-forward:**
- Mocked Gemini client completely in unit/integration tests to ensure no real network calls or quota depletion during testing.
- AI route requires user authentication and checks repository ownership permissions consistently.
- Default values and fallback objects conform strictly to standard high-fidelity schemas.


---

### SESSION 6 — React Frontend (Auth Pages + Dashboard Layout)
**Status:** `[ ] Not Started`  
**Depends on:** Session 5 complete (backend fully working)

**Goal:** Full React app scaffold, auth flow, dashboard shell

**What was built:**
- [ ] Vite + React + Tailwind setup
- [ ] `src/api/axios.js` — Axios instance with interceptors (auto attach token, silent refresh on 401)
- [ ] All API files: `auth.api.js`, `github.api.js`, `analytics.api.js`, `ai.api.js`
- [ ] `authStore.js` — Zustand store (user, accessToken, isAuthenticated)
- [ ] `repoStore.js` — Zustand store (repos, selectedRepo)
- [ ] `useAuth.js` hook (login, logout, register, loadUser)
- [ ] `PrivateRoute.jsx` — redirects to /login if not authenticated
- [ ] `AppLayout.jsx` — Sidebar + Topbar shell
- [ ] `Sidebar.jsx` — nav links (Dashboard, Commits, PRs, Issues, Insights, Contributors, Settings)
- [ ] `Topbar.jsx` — user avatar, repo selector, notifications
- [ ] `LandingPage.jsx` — public hero page with login/register CTA
- [ ] `LoginPage.jsx` + `LoginForm.jsx`
- [ ] `RegisterPage.jsx` + `RegisterForm.jsx`
- [ ] `DashboardPage.jsx` — repo selector + 4 StatsCards (commits, PRs, issues, contributors)
- [ ] `SettingsPage.jsx` — GitHub connect/disconnect button
- [ ] `RepoSelector.jsx` — dropdown to switch active repo
- [ ] `Button.jsx`, `Input.jsx`, `Badge.jsx`, `SkeletonLoader.jsx`, `EmptyState.jsx`
- [ ] `ToastNotifications.jsx` (react-hot-toast configured)
- [ ] React Router routes configured in `App.jsx`
- [ ] Dark mode default in `tailwind.config.js`

**Known issues / carry-forward:**
```
(fill this in after session completes)
```

---

### SESSION 7 — Recharts Dashboard (All Charts)
**Status:** `[ ] Not Started`  
**Depends on:** Session 6 complete

**Goal:** All 6 chart components connected to real API data

**What was built:**
- [ ] `chartHelpers.js` — transforms API data → Recharts-compatible arrays
- [ ] `useAnalytics.js` hook — fetches analytics data per repo
- [ ] `CommitBarChart.jsx` — daily commits (BarChart + ResponsiveContainer)
- [ ] `CommitLineChart.jsx` — commit trend over time (LineChart)
- [ ] `PRStatusPieChart.jsx` — open vs merged vs closed (PieChart)
- [ ] `ContributorRadarChart.jsx` — per-contributor metrics (RadarChart)
- [ ] `VelocityAreaChart.jsx` — sprint velocity trend (AreaChart)
- [ ] `IssueHeatmap.jsx` — issues by day (custom grid or BarChart)
- [ ] `CommitsPage.jsx` — commit list table + CommitBarChart
- [ ] `PullRequestsPage.jsx` — PR table + PRStatusPieChart
- [ ] `IssuesPage.jsx` — issue list + open/closed counters
- [ ] `ContributorsPage.jsx` — contributor cards + RadarChart
- [ ] `ActivityFeed.jsx` — recent 10 commits on dashboard
- [ ] `SyncButton.jsx` — triggers sync with loading spinner
- [ ] `ErrorBoundary.jsx` wrapping each chart
- [ ] All charts use `<ResponsiveContainer width="100%" height={300}>`
- [ ] Empty state shown when no data

**Known issues / carry-forward:**
```
(fill this in after session completes)
```

---

### SESSION 8 — AI Insight Cards UI
**Status:** `[ ] Not Started`  
**Depends on:** Session 7 complete

**Goal:** AI insights panel fully wired to backend, beautiful cards UI

**What was built:**
- [ ] `useInsights.js` hook — fetch cached + trigger generation
- [ ] `InsightsPage.jsx` — grid of all insight types
- [ ] `GenerateInsightButton.jsx` — loading state while Gemini processes
- [ ] `SprintSummaryCard.jsx` — score badge (1–10), highlights list, concerns list
- [ ] `BottleneckCard.jsx` — bottleneck list with severity color badges (red/yellow/green)
- [ ] `RecommendationsCard.jsx` — numbered task prioritization tips
- [ ] `InsightCard.jsx` — generic wrapper with type label + timestamp
- [ ] Force-regenerate button (`?force=true`)
- [ ] "Last generated X hours ago" timestamp shown
- [ ] Loading skeleton while AI generates
- [ ] Error state if Gemini fails

**Known issues / carry-forward:**
```
(fill this in after session completes)
```

---

### SESSION 9 — PDF Export
**Status:** `[ ] Not Started`  
**Depends on:** Session 8 complete

**Goal:** Backend PDF generation + frontend download button

**What was built:**
- [ ] `export.service.js` — PDFKit report builder
  - [ ] Cover page (repo name, date range, generated timestamp)
  - [ ] Stats summary section (commits, PRs, issues counts)
  - [ ] Top contributors table
  - [ ] Sprint summary text from AIInsight
  - [ ] Bottlenecks section
  - [ ] Recommendations section
- [ ] `export.routes.js` + `export.controller.js`
- [ ] GET /export/repos/:repoId/pdf → streams PDF
- [ ] `Content-Disposition: attachment` header set
- [ ] `export.api.js` frontend function (axios blob download)
- [ ] Download button in `InsightsPage.jsx` and `DashboardPage.jsx`
- [ ] Loading state on download button

**Known issues / carry-forward:**
```
(fill this in after session completes)
```

---

### SESSION 10 — Polish, Error Handling, Deployment Config
**Status:** `[ ] Not Started`  
**Depends on:** Session 9 complete

**Goal:** Production-ready hardening and deployment files

**What was built:**
- [ ] All API errors return `{ success: false, message, errors }` consistently
- [ ] All loading states have skeleton loaders (no raw spinners)
- [ ] `rateLimiter.middleware.js` applied to auth routes (5 attempts / 15 min)
- [ ] `helmet` middleware applied to Express app
- [ ] GitHub API rate limit warning shown in UI if < 100 requests remaining
- [ ] `docker-compose.prod.yml` with Nginx for frontend
- [ ] `nginx.conf` for React SPA routing
- [ ] `README.md` with setup instructions
- [ ] All `.env.example` files complete
- [ ] `morgan` HTTP logging in development mode
- [ ] 404 catch-all route in Express
- [ ] Refresh token rotation implemented
- [ ] Final end-to-end test: signup → connect GitHub → sync → view charts → generate AI → export PDF

**Known issues / carry-forward:**
```
(fill this in after session completes)
```

---

## 🔁 HOW TO USE THIS FILE — AGENT PROMPT TEMPLATE

At the start of each session, paste this file + DEVTRACKR_CONTEXT.md and say:

```
I am building DevTrackr. 

Context files attached: DEVTRACKR_CONTEXT.md, SESSION_TRACKER.md

Completed sessions: [list which sessions are marked done, e.g. "Session 1 and 2 complete"]

Current session goal: Session [N] — [session name]

Issues from last session to fix first: [paste from "Known issues" section above]

Now implement everything in the SESSION [N] checklist. 
Follow all rules in RULES.md. Use ONLY the locked stack. Do not use any other libraries.
```

---

## 📊 Overall Progress

```
Session 1  [Auth + Docker]          ██████████  10%
Session 2  [GitHub OAuth]           ██████████  10%
Session 3  [Sync Engine]            ██████████  10%
Session 4  [Analytics API]          ██████████  10%
Session 5  [Gemini AI]              ██████████  10%
Session 6  [React + Auth UI]        ░░░░░░░░░░  0%
Session 7  [Recharts Dashboard]     ░░░░░░░░░░  0%
Session 8  [AI Insight Cards]       ░░░░░░░░░░  0%
Session 9  [PDF Export]             ░░░░░░░░░░  0%
Session 10 [Polish + Deploy]        ░░░░░░░░░░  0%

Total: 5 / 10 Sessions Complete
```

> Update progress bar manually: replace `░` with `█` as tasks complete
> Each session = 10% of total project
