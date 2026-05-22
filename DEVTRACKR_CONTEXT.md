# DevTrackr — AI Developer Productivity Dashboard
## Master Context File (Give this to AI agent at the start of every session)

---

## 🧠 Project Summary

DevTrackr is a full-stack web application where developers connect their GitHub account and receive AI-generated productivity insights, sprint summaries, commit analytics, and bottleneck detection.

**AI Engine:** Google Gemini API (`gemini-2.5-flash` or `gemini-2.5-pro`)
**Auth:** JWT (access + refresh tokens) + bcrypt
**Data Sources:** GitHub REST API v3 + GitHub GraphQL API v4

---

## 🧰 Finalized Tech Stack

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| Frontend     | React 18 (Vite), Tailwind CSS, Recharts         |
| Backend      | Node.js, Express.js                             |
| Database     | MongoDB (Mongoose ODM)                          |
| Auth         | JWT (access + refresh) + bcrypt                 |
| AI Engine    | Google Gemini API (`@google/generative-ai`)     |
| GitHub       | GitHub REST API v3 + GraphQL v4 (Octokit)       |
| Export       | PDFKit (backend PDF generation)                 |
| DevOps       | Docker + Docker Compose                         |
| Testing      | Jest + Supertest (backend), Vitest (frontend)   |

---

## 🌐 Environment Variables

### Backend (`backend/.env`)
```
PORT=5000
MONGO_URI=mongodb://mongo:27017/devtrackr
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret
GITHUB_REDIRECT_URI=http://localhost:5000/api/github/callback
GEMINI_API_KEY=your_gemini_api_key_here
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend (`frontend/.env`)
```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GITHUB_CLIENT_ID=your_github_oauth_app_client_id
```

---

## 🗺️ Full Application Flow

```
1. User signs up / logs in  → JWT issued
2. User clicks "Connect GitHub" → GitHub OAuth flow (OAuth App)
3. Backend receives OAuth code → exchanges for GitHub access_token
4. GitHub token stored encrypted in MongoDB (User document)
5. Frontend triggers repo sync → backend fetches commits, PRs, issues via Octokit
6. Raw data stored in MongoDB (Repo, Commit, PullRequest, Issue collections)
7. AI engine (Gemini) processes raw data → generates insights
8. Insights stored in AIInsight collection with TTL (24h cache)
9. Frontend polls /api/insights/:repoId → renders charts + AI cards
10. Optional: User clicks "Export PDF" → backend streams PDF via PDFKit
```

---

## 🗃️ MongoDB Schema Definitions

### User
```js
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  githubId: String,
  githubUsername: String,
  githubAccessToken: String (encrypted),
  githubConnected: Boolean (default: false),
  refreshToken: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Repository
```js
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  githubRepoId: Number,
  name: String,
  fullName: String,           // e.g. "pravin/devtrackr"
  description: String,
  isPrivate: Boolean,
  defaultBranch: String,
  language: String,
  stars: Number,
  forks: Number,
  openIssuesCount: Number,
  lastSyncedAt: Date,
  createdAt: Date
}
```

### Commit
```js
{
  _id: ObjectId,
  repoId: ObjectId (ref: Repository),
  sha: String (unique),
  message: String,
  author: {
    name: String,
    email: String,
    login: String,            // GitHub username
    avatarUrl: String
  },
  additions: Number,
  deletions: Number,
  filesChanged: Number,
  committedAt: Date,
  url: String
}
```

### PullRequest
```js
{
  _id: ObjectId,
  repoId: ObjectId (ref: Repository),
  number: Number,
  title: String,
  body: String,
  state: String,              // open | closed | merged
  author: String,
  reviewers: [String],
  labels: [String],
  additions: Number,
  deletions: Number,
  changedFiles: Number,
  mergedAt: Date,
  closedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Issue
```js
{
  _id: ObjectId,
  repoId: ObjectId (ref: Repository),
  number: Number,
  title: String,
  body: String,
  state: String,              // open | closed
  author: String,
  assignees: [String],
  labels: [String],
  closedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### AIInsight
```js
{
  _id: ObjectId,
  repoId: ObjectId (ref: Repository),
  userId: ObjectId (ref: User),
  type: String,               // 'sprint_summary' | 'contributor_analysis' | 'bottleneck' | 'recommendations'
  period: {
    from: Date,
    to: Date
  },
  content: String,            // Raw Gemini markdown response
  parsedData: Object,         // Structured JSON extracted from Gemini response
  model: String,              // gemini model used
  tokensUsed: Number,
  generatedAt: Date,
  expiresAt: Date             // TTL: generatedAt + 24h
}
```

---

## 🔌 Complete API Contract

### Auth Routes (`/api/auth`)
| Method | Endpoint           | Auth | Description                  |
|--------|--------------------|------|------------------------------|
| POST   | `/register`        | No   | Register new user            |
| POST   | `/login`           | No   | Login, returns JWT pair      |
| POST   | `/refresh`         | No   | Refresh access token         |
| POST   | `/logout`          | Yes  | Invalidate refresh token     |
| GET    | `/me`              | Yes  | Get current user profile     |

### GitHub Routes (`/api/github`)
| Method | Endpoint                      | Auth | Description                    |
|--------|-------------------------------|------|--------------------------------|
| GET    | `/connect`                    | Yes  | Redirect to GitHub OAuth       |
| GET    | `/callback`                   | No   | Handle OAuth callback          |
| GET    | `/repos`                      | Yes  | List user's GitHub repos       |
| POST   | `/repos/:repoFullName/sync`   | Yes  | Trigger full repo data sync    |
| GET    | `/status`                     | Yes  | GitHub connection status       |
| DELETE | `/disconnect`                 | Yes  | Disconnect GitHub account      |

### Analytics Routes (`/api/analytics`)
| Method | Endpoint                              | Auth | Description                  |
|--------|---------------------------------------|------|------------------------------|
| GET    | `/repos/:repoId/commits`             | Yes  | Paginated commit history     |
| GET    | `/repos/:repoId/commits/chart`       | Yes  | Commits grouped by day/week  |
| GET    | `/repos/:repoId/contributors`        | Yes  | Contributor activity map     |
| GET    | `/repos/:repoId/pullrequests`        | Yes  | PR list with stats           |
| GET    | `/repos/:repoId/issues`              | Yes  | Issue list with status       |
| GET    | `/repos/:repoId/velocity`            | Yes  | Dev velocity metrics         |

### AI Routes (`/api/ai`)
| Method | Endpoint                              | Auth | Description                    |
|--------|---------------------------------------|------|--------------------------------|
| POST   | `/repos/:repoId/summarize`           | Yes  | Generate sprint summary        |
| POST   | `/repos/:repoId/contributors`        | Yes  | Contributor health analysis    |
| POST   | `/repos/:repoId/bottlenecks`         | Yes  | Detect bottlenecks             |
| POST   | `/repos/:repoId/recommendations`     | Yes  | Task prioritization tips       |
| GET    | `/repos/:repoId/insights`            | Yes  | Fetch cached insights          |

### Export Routes (`/api/export`)
| Method | Endpoint                       | Auth | Description                  |
|--------|--------------------------------|------|------------------------------|
| GET    | `/repos/:repoId/pdf`          | Yes  | Download PDF report          |

---

## 🤖 Gemini Prompt Templates

### Sprint Summary Prompt
```
You are a software engineering productivity analyst. Analyze the following GitHub repository activity for the period {fromDate} to {toDate}.

Repository: {repoName}
Total Commits: {totalCommits}
Contributors: {contributorCount}
PRs Merged: {mergedPRs}
Issues Closed: {closedIssues}

Top 10 commit messages:
{commitMessages}

Generate a JSON response with this exact structure:
{
  "summary": "2-3 sentence executive summary",
  "velocity": "assessment of team velocity (high/medium/low) with reasoning",
  "highlights": ["highlight1", "highlight2", "highlight3"],
  "concerns": ["concern1", "concern2"],
  "sprintScore": <number 1-10>
}
Return only valid JSON. No markdown, no explanation.
```

### Bottleneck Detection Prompt
```
You are a DevOps efficiency expert. Analyze this repository's bottlenecks.

Repository: {repoName}
Average PR merge time: {avgPRMergeTime} hours
Long-running open PRs (>7 days): {stalePRs}
Inactive contributors (no commit in 14 days): {inactiveContributors}
Issues open >30 days: {staleIssues}
Top contributor handles {topContributorPercent}% of all commits

Respond ONLY in this JSON format:
{
  "bottlenecks": [
    { "type": "string", "severity": "high|medium|low", "description": "string", "suggestion": "string" }
  ],
  "riskLevel": "high|medium|low",
  "topRecommendation": "string"
}
```

### Contributor Analysis Prompt
```
Analyze the following contributor data and identify team health.

{contributorJSON}

Return JSON:
{
  "activeContributors": number,
  "inactiveContributors": ["username1", "username2"],
  "busContributors": ["contributors handling too much"],
  "teamHealthScore": <1-10>,
  "insights": ["insight1", "insight2"]
}
```

---

## 🏗️ Architecture Notes

- **Token Security:** GitHub access tokens stored AES-256 encrypted in MongoDB; decrypted in-memory only
- **Sync Strategy:** Incremental sync — only fetch commits/PRs since `lastSyncedAt`; full sync on first connect
- **AI Caching:** AIInsight documents have 24h TTL; re-generation forced via `?force=true` query param
- **Rate Limiting:** GitHub API = 5000 req/hr for OAuth tokens; queue sync jobs if multiple repos
- **Pagination:** All list endpoints use cursor-based pagination (`page` + `limit` query params)
- **CORS:** Frontend origin whitelisted; credentials: true

---

## ✅ Session Completion Checklist

Track completed sessions here:
- [ ] Session 1: Docker + MongoDB + Express boilerplate + Auth (register/login/refresh)
- [ ] Session 2: GitHub OAuth connect flow + token storage + repo listing
- [ ] Session 3: GitHub data sync engine (commits, PRs, issues via Octokit)
- [ ] Session 4: Analytics API endpoints + MongoDB aggregation queries
- [ ] Session 5: Gemini AI integration — all 4 insight types
- [ ] Session 6: React frontend — auth pages + dashboard layout
- [ ] Session 7: React charts — Recharts commit graph, PR chart, contributor heatmap
- [ ] Session 8: AI insight cards UI + recommendations panel
- [ ] Session 9: PDF export (PDFKit backend + download button frontend)
- [ ] Session 10: Polish, error handling, loading states, deployment config

---

## 🔁 How to Use This File

At the start of each coding session, paste this entire file to your AI coding agent and say:
> "I'm continuing DevTrackr. Today's session goal: [SESSION GOAL]. Completed so far: [LIST]. Continue from where we left off."
