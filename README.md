# DevTrackr — AI Developer Productivity Dashboard

A full-stack web application that helps developers understand their productivity through AI-powered insights, GitHub integration, and advanced analytics.

## 🎯 Features

- ✅ **User Authentication** — Register, login, JWT-based auth with refresh tokens
- 🔐 **GitHub OAuth Integration** — Connect your GitHub account securely
- 📊 **Repository Analytics** — Sync commits, PRs, issues from multiple repos
- 🤖 **AI Insights** — Sprint summaries, bottleneck detection, contributor analysis via Google Gemini
- 📈 **Interactive Charts** — Commit trends, PR velocity, contributor activity using Recharts
- 📋 **PDF Export** — Generate detailed productivity reports
- 🐳 **Docker Support** — Run locally or deploy with Docker Compose

## 🛠️ Tech Stack

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| **Frontend** | React 18, Vite, Tailwind CSS, Recharts, Zustand |
| **Backend**  | Node.js, Express.js, MongoDB, Mongoose         |
| **Auth**     | JWT (access + refresh tokens), bcrypt          |
| **AI**       | Google Gemini API                              |
| **GitHub**   | GitHub REST API v3 + GraphQL v4 (Octokit)      |
| **Export**   | PDFKit                                          |
| **DevOps**   | Docker + Docker Compose                        |
| **Testing**  | Jest, Supertest, mongodb-memory-server         |

## 📁 Project Structure

```
devtrackr/
├── backend/
│   ├── src/
│   │   ├── config/       (db, logger, gemini)
│   │   ├── models/       (User, Repository, Commit, etc.)
│   │   ├── routes/       (auth, github, analytics, ai, export)
│   │   ├── controllers/  (request handlers)
│   │   ├── services/     (business logic)
│   │   ├── middleware/   (auth, validation, error handling)
│   │   ├── validators/   (express-validator rules)
│   │   └── utils/        (helpers, token, encryption)
│   ├── __tests__/        (Jest tests)
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── api/          (axios endpoints)
│   │   ├── store/        (Zustand state)
│   │   ├── hooks/        (custom React hooks)
│   │   ├── pages/        (page components)
│   │   ├── components/   (reusable components)
│   │   └── utils/        (helpers)
│   ├── public/           (static assets)
│   ├── package.json
│   ├── Dockerfile
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- MongoDB (or Docker)
- Git

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-link>
   cd devtrackr
   ```

2. **Setup Backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   npm install
   npm run dev
   ```

3. **Setup Frontend** (in another terminal)
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - Backend Health: http://localhost:5000/api/health

### Docker Setup

1. **Create .env files**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. **Edit .env files** with your API keys

3. **Start all services**
   ```bash
   docker compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

### Production Docker Setup

```bash
docker compose -f docker-compose.prod.yml up --build
```

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
PORT=5000
MONGO_URI=mongodb://mongo:27017/devtrackr
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:5000/api/github/callback
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
ENCRYPTION_SECRET=your_32_char_encryption_secret_here
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GITHUB_CLIENT_ID=your_github_client_id
```

## 🔐 Setting Up External Services

### 1. GitHub OAuth App

1. Go to GitHub Developer Settings (https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the fields:
   - **Application name**: DevTrackr
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:5000/api/github/callback`
4. Click "Register application"
5. Copy the generated **Client ID** into your backend `.env` as `GITHUB_CLIENT_ID`
6. Generate a new client secret, copy it, and paste it into your backend `.env` as `GITHUB_CLIENT_SECRET`
7. Ensure `GITHUB_REDIRECT_URI=http://localhost:5000/api/github/callback` is set in your backend `.env`
8. Ensure `FRONTEND_URL=http://localhost:5173` is set in your backend `.env`
9. Restart the backend server after making these changes to `.env`

### 2. Google Gemini API

1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy the key → add to `backend/.env` as `GEMINI_API_KEY`

### 3. MongoDB

**Option A: Docker** (Included in docker-compose.yml)
```bash
docker compose up mongo
```

**Option B: Local MongoDB**
```bash
mongod --port 27017
```

**Option C: MongoDB Atlas** (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string → update `MONGO_URI` in `.env`

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Watch mode
npm test:watch

# Coverage report
npm test:coverage
```

### Test Files

- `backend/__tests__/auth.test.js` — Authentication endpoints
- `backend/__tests__/github.test.js` — GitHub OAuth (Session 2)
- `backend/__tests__/analytics.test.js` — Analytics endpoints (Session 4)
- `backend/__tests__/ai.test.js` — AI insights (Session 5)
- `backend/__tests__/export.test.js` — PDF export (Session 9)

## 📚 API Routes

### Authentication
- `POST /api/auth/register` — Create new account
- `POST /api/auth/login` — Login user
- `POST /api/auth/refresh` — Refresh access token
- `POST /api/auth/logout` — Logout user
- `GET /api/auth/me` — Get current user (protected)

### GitHub (Session 2+)
- `GET /api/github/connect` — Start OAuth flow
- `GET /api/github/callback` — OAuth callback
- `GET /api/github/status` — Check GitHub connection
- `DELETE /api/github/disconnect` — Disconnect GitHub
- `GET /api/github/repos` — List user's repos
- `POST /api/github/repos/:repoFullName/sync` — Sync repo data (incremental)
  - **Parameters**: `:repoFullName` (URL-encoded string representing `owner/repo`, e.g. `facebook%2Freact`)
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  - **Success Response** (200 OK):
    ```json
    {
      "success": true,
      "message": "Repository synced successfully",
      "data": {
        "repository": {
          "id": "60d0fe4f5311236168a10aa4",
          "githubRepoId": 10270250,
          "name": "react",
          "fullName": "facebook/react",
          "lastSyncedAt": "2026-05-22T08:00:00.000Z"
        },
        "summary": {
          "commitsSynced": 30,
          "pullRequestsSynced": 30,
          "issuesSynced": 15
        },
        "warning": null
      }
    }
    ```


### Analytics (Session 4+)
All analytics routes require a Bearer access token. The `:repoId` must belong to the authenticated user.
- **GET /api/analytics/repos/:repoId/commits** — List paginated commits
  - **Query Parameters**: `page` (default 1), `limit` (default 10, max 100)
- **GET /api/analytics/repos/:repoId/commits/chart** — Commits chart data grouped by day or week
  - **Query Parameters**: `groupBy` (`day` or `week`, default `day`)
- **GET /api/analytics/repos/:repoId/contributors** — Contributor statistics aggregated from commits
- **GET /api/analytics/repos/:repoId/pullrequests** — PR analytics and merge times
  - **Query Parameters**: `page` (default 1), `limit` (default 10), `state` (`open`, `closed`, `all`, default `all`)
- **GET /api/analytics/repos/:repoId/issues** — Issue analytics and open/closed summary
  - **Query Parameters**: `page` (default 1), `limit` (default 10), `state` (`open`, `closed`, `all`, default `all`)
- **GET /api/analytics/repos/:repoId/velocity** — High-level engineering velocity metrics

#### Access Control Rules
- **Invalid repoId format**: Returns `400 Bad Request`
- **Repository not found**: Returns `404 Not Found`
- **Repository belongs to another user**: Returns `403 Forbidden`

### AI Insights (Session 5+)
All AI routes require a Bearer access token. The `:repoId` must belong to the authenticated user.
- **POST /api/ai/repos/:repoId/summarize** — Generate or fetch cached 24-hour sprint summary insight
  - **Query Parameters**: `force` (`true` to bypass cache and regenerate, default `false`)
  - **Request Body**: `{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }` (optional date ranges, defaults to last 30 days)
- **POST /api/ai/repos/:repoId/bottlenecks** — Generate or fetch cached 24-hour bottleneck detection insight
  - **Query Parameters**: `force` (`true` to bypass cache, default `false`)
- **POST /api/ai/repos/:repoId/contributors** — Generate or fetch cached 24-hour contributor team health analysis
  - **Query Parameters**: `force` (`true` to bypass cache, default `false`)
- **POST /api/ai/repos/:repoId/recommendations** — Generate or fetch cached 24-hour task recommendations and next best action
  - **Query Parameters**: `force` (`true` to bypass cache, default `false`)
- **GET /api/ai/repos/:repoId/insights** — Retrieve list of all currently active cached insights for the repository

#### Access Control & Setup Rules
- **Authentication**: All routes protected by `authenticateToken` JWT validation.
- **Invalid repoId format**: Returns `400 Bad Request`
- **Repository not found**: Returns `404 Not Found`
- **Repository belongs to another user**: Returns `403 Forbidden`
- **Cache Control**: Insights are cached in MongoDB with a 24-hour expiration (`expiresAt` TTL index). The `force=true` query parameter forces immediate regeneration.
- **Config**: Requires `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-1.5-flash` configured in the backend environment.

### Export (Session 9+)
- `GET /api/export/repos/:repoId/pdf` — Download PDF report

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongosh

# If using Docker
docker ps | grep mongo
```

### Port Already in Use
```bash
# Port 5000 (backend)
lsof -i :5000
kill -9 <PID>

# Port 5173 (frontend)
lsof -i :5173
kill -9 <PID>
```

### Docker Issues
```bash
# Clear Docker cache
docker system prune -a

# View logs
docker compose logs -f backend
docker compose logs -f frontend
```

### .env Not Loading
- Make sure .env file is in the correct directory
- Restart the server after changing .env
- Check `NODE_ENV` — some features only work in production

## 📝 Development Sessions

This project is built in 10 structured sessions:

1. ✅ **Session 1** — Docker + Express + Auth
2. ✅ **Session 2** — GitHub OAuth + Token Storage + Repo Listing
3. ✅ **Session 3** — GitHub Data Sync Engine
4. ✅ **Session 4** — Analytics API Endpoints
5. ✅ **Session 5** — Gemini AI Integration (CURRENT)
6. **Session 6** — React Frontend Auth Pages + Dashboard Layout
7. **Session 7** — Recharts Dashboard + Charts
8. **Session 8** — AI Insight Cards UI
9. **Session 9** — PDF Export
10. **Session 10** — Polish, Error Handling, Deployment Config

## 📦 Dependencies

### Backend
- express, mongoose, bcryptjs, jsonwebtoken
- @octokit/rest, @octokit/graphql
- @google/generative-ai
- express-validator, winston, helmet, morgan, cors
- pdfkit, crypto-js, dotenv
- jest, supertest (dev), mongodb-memory-server (dev)

### Frontend
- react, react-dom, react-router-dom
- axios, recharts, zustand
- @heroicons/react, react-hot-toast
- tailwindcss, vite (dev)
- vitest, @testing-library/react (dev)

## 📄 License

MIT

## 👤 Author

DevTrackr Team

## 🤝 Contributing

This is a development project. For bug reports or feature requests, please open an issue.

---

**Last Updated**: Session 5 Complete
