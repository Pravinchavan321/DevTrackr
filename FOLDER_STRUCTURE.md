# DevTrackr — Complete Folder Structure

```
devtrackr/
│
├── docker-compose.yml               # Orchestrates backend + frontend + mongo
├── docker-compose.prod.yml          # Production overrides
├── .gitignore
├── README.md
│
├── DEVTRACKR_CONTEXT.md             # ← AI agent context file (this project)
├── RULES.md                         # ← Dev rules & conventions
├── FOLDER_STRUCTURE.md              # ← This file
├── TEST_CASES.md                    # ← Test case reference
│
│
│── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env                         # (gitignored)
│   ├── .env.example
│   ├── jest.config.js
│   │
│   ├── src/
│   │   ├── server.js                # Express app entry point
│   │   ├── app.js                   # Express app config (middleware, routes)
│   │   │
│   │   ├── config/
│   │   │   ├── db.js                # Mongoose connection
│   │   │   ├── gemini.js            # Gemini client initialization
│   │   │   └── logger.js            # Winston logger setup
│   │   │
│   │   ├── models/
│   │   │   ├── User.model.js
│   │   │   ├── Repository.model.js
│   │   │   ├── Commit.model.js
│   │   │   ├── PullRequest.model.js
│   │   │   ├── Issue.model.js
│   │   │   └── AIInsight.model.js
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── github.routes.js
│   │   │   ├── analytics.routes.js
│   │   │   ├── ai.routes.js
│   │   │   └── export.routes.js
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── github.controller.js
│   │   │   ├── analytics.controller.js
│   │   │   ├── ai.controller.js
│   │   │   └── export.controller.js
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.js          # register, login, token logic
│   │   │   ├── github.service.js        # OAuth flow, token exchange
│   │   │   ├── sync.service.js          # Repo data sync engine (Octokit)
│   │   │   ├── analytics.service.js     # MongoDB aggregation queries
│   │   │   ├── gemini.service.js        # All Gemini API calls + prompt builders
│   │   │   ├── insight.service.js       # Cache check + insight CRUD
│   │   │   └── export.service.js        # PDFKit report generation
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js       # authenticateToken (JWT verify)
│   │   │   ├── validate.middleware.js   # express-validator error handler
│   │   │   ├── rateLimiter.middleware.js
│   │   │   └── errorHandler.middleware.js  # Global error handler
│   │   │
│   │   ├── validators/
│   │   │   ├── auth.validator.js        # register/login validation rules
│   │   │   └── github.validator.js
│   │   │
│   │   └── utils/
│   │       ├── asyncHandler.js          # try/catch wrapper for async routes
│   │       ├── tokenHelper.js           # sign/verify JWT helpers
│   │       ├── encryptionHelper.js      # AES-256 encrypt/decrypt for GitHub tokens
│   │       ├── githubDataMapper.js      # Maps raw GitHub API → our schema
│   │       ├── promptBuilder.js         # Builds Gemini prompt strings
│   │       └── responseHelper.js        # { success, data, message } shapes
│   │
│   └── __tests__/
│       ├── auth.test.js
│       ├── github.test.js
│       ├── analytics.test.js
│       ├── ai.test.js
│       └── helpers/
│           ├── testDb.js               # mongodb-memory-server setup/teardown
│           └── mockData.js             # Reusable test fixtures
│
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .env                            # (gitignored)
    ├── .env.example
    ├── index.html
    │
    ├── public/
    │   └── favicon.ico
    │
    └── src/
        ├── main.jsx                    # ReactDOM.createRoot entry
        ├── App.jsx                     # Router + global providers
        │
        ├── api/
        │   ├── axios.js                # Axios instance + interceptors (token refresh)
        │   ├── auth.api.js             # Auth endpoint calls
        │   ├── github.api.js           # GitHub endpoint calls
        │   ├── analytics.api.js        # Analytics endpoint calls
        │   ├── ai.api.js               # AI insight endpoint calls
        │   └── export.api.js           # Export endpoint calls
        │
        ├── store/
        │   ├── authStore.js            # Zustand — user, accessToken, isAuthenticated
        │   ├── repoStore.js            # Zustand — selected repo, repos list
        │   └── uiStore.js              # Zustand — loading states, notifications
        │
        ├── hooks/
        │   ├── useAuth.js              # Login/logout/register actions
        │   ├── useGithub.js            # Connect GitHub, fetch repos, trigger sync
        │   ├── useAnalytics.js         # Fetch commit/PR/issue data for charts
        │   └── useInsights.js          # Fetch + trigger AI insights
        │
        ├── pages/
        │   ├── LandingPage.jsx         # Public landing / hero
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── DashboardPage.jsx       # Main dashboard (repo selector + stats)
        │   ├── CommitsPage.jsx         # Commit history + chart
        │   ├── PullRequestsPage.jsx    # PR analytics
        │   ├── IssuesPage.jsx          # Issue tracker view
        │   ├── InsightsPage.jsx        # AI-generated insights panel
        │   ├── ContributorsPage.jsx    # Contributor activity map
        │   └── SettingsPage.jsx        # GitHub connect/disconnect + profile
        │
        ├── components/
        │   │
        │   ├── layout/
        │   │   ├── AppLayout.jsx       # Sidebar + topbar wrapper
        │   │   ├── Sidebar.jsx
        │   │   ├── Topbar.jsx
        │   │   └── PrivateRoute.jsx    # Auth guard wrapper
        │   │
        │   ├── auth/
        │   │   ├── LoginForm.jsx
        │   │   └── RegisterForm.jsx
        │   │
        │   ├── dashboard/
        │   │   ├── StatsCard.jsx       # Single metric card (commits, PRs, etc.)
        │   │   ├── RepoSelector.jsx    # Dropdown to select active repository
        │   │   ├── ActivityFeed.jsx    # Recent commits list
        │   │   └── SyncButton.jsx      # Trigger sync + loading state
        │   │
        │   ├── charts/
        │   │   ├── CommitBarChart.jsx      # Daily commits (BarChart)
        │   │   ├── CommitLineChart.jsx     # Commit trend over time (LineChart)
        │   │   ├── PRStatusPieChart.jsx    # Open vs Merged vs Closed
        │   │   ├── ContributorRadarChart.jsx  # Per-contributor stats (RadarChart)
        │   │   ├── VelocityAreaChart.jsx   # Sprint velocity (AreaChart)
        │   │   └── IssueHeatmap.jsx        # Issues opened/closed by day
        │   │
        │   ├── insights/
        │   │   ├── InsightCard.jsx         # Single AI insight block
        │   │   ├── SprintSummaryCard.jsx   # Sprint summary with score badge
        │   │   ├── BottleneckCard.jsx      # Bottleneck list with severity tags
        │   │   ├── RecommendationsCard.jsx # Task prioritization tips
        │   │   └── GenerateInsightButton.jsx  # Trigger AI generation with loading
        │   │
        │   └── common/
        │       ├── Button.jsx
        │       ├── Input.jsx
        │       ├── Badge.jsx               # Severity/status badges
        │       ├── Modal.jsx
        │       ├── SkeletonLoader.jsx
        │       ├── EmptyState.jsx
        │       ├── ErrorBoundary.jsx
        │       └── ToastNotifications.jsx
        │
        ├── utils/
        │   ├── dateHelpers.js          # Format dates, relative time
        │   ├── chartHelpers.js         # Transform API data → Recharts format
        │   └── constants.js            # Route paths, API keys, color constants
        │
        └── __tests__/
            ├── LoginForm.test.jsx
            ├── CommitBarChart.test.jsx
            └── InsightCard.test.jsx
```

---

## 📝 Key File Responsibilities (Quick Reference)

| File | Purpose |
|------|---------|
| `sync.service.js` | The heart of GitHub data ingestion. Octokit calls, data mapping, upsert to MongoDB |
| `gemini.service.js` | All 4 prompt builders + Gemini API calls + JSON validation + retry logic |
| `insight.service.js` | TTL cache check → if fresh, return cached; if stale, trigger gemini.service |
| `analytics.service.js` | All MongoDB aggregation pipelines (group by day, contributor stats, etc.) |
| `axios.js` (frontend) | Interceptor automatically attaches access token; on 401, refreshes token silently |
| `authStore.js` | Single source of truth for auth state in React |
| `AppLayout.jsx` | All authenticated pages render inside this layout |
| `chartHelpers.js` | Transforms `[{committedAt, author}]` → `[{date, count}]` for Recharts |

---

## 🐳 Docker Services Map

```
docker-compose.yml
├── mongo          → port 27017  (internal only in prod)
├── backend        → port 5000   (Express API)
└── frontend       → port 5173   (Vite dev) / port 80 (Nginx prod)
```
