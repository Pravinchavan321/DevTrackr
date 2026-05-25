# DevTrackr

[![Repo](https://img.shields.io/badge/github-Pravinchavan321/DevTrackr-blue)](https://github.com/Pravinchavan321/DevTrackr)
[![Docker Compose](https://img.shields.io/badge/docker-compose-blue)](https://docs.docker.com/compose/)
[![Node.js](https://img.shields.io/badge/node-18+-green)](https://nodejs.org/)

DevTrackr is a polished full-stack developer productivity dashboard that combines GitHub analytics, AI-powered insights, and PDF reporting inside a modern React + Node.js + MongoDB application.

## Live Local App Access

After running the app with Docker Compose, access the complete UI here:

- Frontend UI: http://localhost:5173
- Backend API: http://localhost:5000/api

The application is fully orchestrated via Docker Compose, including MongoDB, backend, and frontend services.

## What DevTrackr Does

DevTrackr helps developers and teams monitor engineering velocity, identify bottlenecks, and get AI-generated suggestions from GitHub repository data.

Core capabilities:
- Secure user registration and login
- GitHub OAuth integration for repo sync
- Commit, pull request, issue, and contributor analytics
- AI insights and sprint summaries via Google Gemini
- PDF report export for team performance metrics
- Docker Compose deployment for fast local setup

## Project Structure

```
devtrackr/
├── backend/
│   ├── src/
│   │   ├── config/       # db, logger, Gemini, GitHub settings
│   │   ├── controllers/  # Express request handlers
│   │   ├── middleware/   # auth, validation, error handling
│   │   ├── models/       # User, Repository, Commit, PR, Issue, Insight
│   │   ├── routes/       # api endpoints: auth, github, analytics, ai, export
│   │   ├── services/     # business logic and integrations
│   │   ├── utils/        # token helper, prompt builder, response helper
│   │   └── validators/   # request validation rules
│   ├── __tests__/        # backend Jest tests
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── api/          # axios endpoint wrappers
│   │   ├── components/   # dashboard and common UI components
│   │   ├── hooks/        # custom React hooks
│   │   ├── pages/        # app pages and protected routes
│   │   ├── store/        # Zustand state management
│   │   └── utils/        # frontend helpers
│   ├── public/           # static assets
│   ├── package.json
│   ├── Dockerfile
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

## Tech Stack

- Frontend: React 18, Vite, Tailwind CSS, Recharts, Zustand
- Backend: Node.js, Express.js, MongoDB, Mongoose
- Auth: JWT access tokens + refresh tokens, secure cookies
- AI: Google Gemini API
- GitHub: OAuth, Octokit REST and GraphQL
- PDF Export: PDFKit
- DevOps: Docker Compose
- Testing: Jest, Supertest, Vitest, mongodb-memory-server

## Quick Start

### Option 1: Run with Docker Compose (Recommended)

From devtrackr/:

```bash
git clone https://github.com/Pravinchavan321/DevTrackr.git
cd DevTrackr/devtrackr
docker compose up --build
```

Open the app at:
- http://localhost:5173
- Backend API: http://localhost:5000/api

### Option 2: Run Services Individually

#### Backend

```bash
cd devtrackr/backend
cp .env.example .env
npm install
npm run dev
```

#### Frontend

```bash
cd devtrackr/frontend
cp .env.example .env
npm install
npm run dev
```

Then open the UI at http://localhost:5173.

## Environment Variables

### Backend .env

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
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret_here
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
ENCRYPTION_SECRET=your_32_char_encryption_secret_here
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend .env

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_REPO_ACTIVITY_POLL_INTERVAL_MS=15000
```

## GitHub Webhooks

DevTrackr includes a signed webhook endpoint at:

```text
POST http://localhost:5000/api/github/webhook
```

Configure `GITHUB_WEBHOOK_SECRET` in `backend/.env`, then create a GitHub repository webhook with content type `application/json` and the same secret. Use events for pushes, pull requests, pull request reviews, issues, and repository metadata.

For local development, expose the backend through a public HTTPS tunnel such as ngrok and use:

```text
https://your-public-url/api/github/webhook
```

See `GITHUB_WEBHOOKS.md` for the full setup checklist.

## What to Do to Complete & Verify

1. Create .env files in backend/ and frontend/ from the .env.example files.
2. Add your GitHub OAuth credentials and Google Gemini API key.
3. Run docker compose up --build from devtrackr/.
4. Visit http://localhost:5173 and sign up or log in.
5. Connect GitHub from the settings page to authorize repo access.
6. Sync repositories and verify:
   - dashboard charts load
   - commit, PR, issue, and contributor pages display data
   - AI Insights page generates summaries
   - PDF report export works
7. Confirm backend health with http://localhost:5000/api/health.
8. Run tests:
   - Backend: cd backend && npm test
   - Frontend: cd frontend && npm test

## How the App Works

1. User signs up / logs in through the frontend.
2. The backend issues JWT access tokens and stores refresh tokens in secure cookies.
3. The user connects GitHub via OAuth.
4. The backend syncs repository data from GitHub into MongoDB.
5. The dashboard consumes backend metrics and renders charts, tables, and summaries.
6. The AI module calls Google Gemini to create sprint insights, bottleneck detection, and contributor health analysis.
7. The PDF export endpoint generates a downloadable report based on current analytics.

## Useful Links

- Repo: https://github.com/Pravinchavan321/DevTrackr
- UI after startup: http://localhost:5173
- Backend API after startup: http://localhost:5000/api

## Why This README Works

- Clear entry points for Docker and local development
- Exact URLs to access the UI and backend
- Explanation of project flow and key features
- Completion checklist for verification and testing
- Friendly, polished presentation for GitHub visitors

Built with developer productivity in mind — from GitHub insights to AI recommendations, DevTrackr is designed to help teams move faster and ship smarter.
