# DevTrackr — Development Rules & Conventions
## `.rules` / `RULES.md`

Follow these rules strictly in every session. The AI coding agent must never deviate from these.

---

## 📁 1. File & Folder Conventions

- All backend files use **camelCase**: `userController.js`, `githubService.js`
- All frontend component files use **PascalCase**: `CommitChart.jsx`, `DashboardLayout.jsx`
- All route files named as `[resource].routes.js`
- All controller files named as `[resource].controller.js`
- All service files named as `[resource].service.js`
- All model files named as `[Resource].model.js` (capitalized)
- Environment variables always read from `process.env.*` — never hardcoded
- No `console.log` in production code — use the `logger` utility (`winston`)

---

## 🔐 2. Authentication Rules

- Access token expiry: **15 minutes**
- Refresh token expiry: **7 days**
- Refresh token stored in MongoDB AND sent as **httpOnly cookie** (not localStorage)
- Access token sent as **Bearer token in Authorization header**
- All protected routes must use `authenticateToken` middleware
- Never return `password` or `githubAccessToken` fields in any API response
- GitHub tokens must be AES-256 encrypted before saving to MongoDB

```js
// CORRECT — never expose sensitive fields
const user = await User.findById(id).select('-password -githubAccessToken -refreshToken');

// WRONG
const user = await User.findById(id);
res.json(user); // exposes password hash
```

---

## 🛣️ 3. Express Route Rules

- All routes versioned under `/api/`
- Route handlers must be thin — business logic lives in **service layer**, not controllers
- Every route must have try/catch or use `asyncHandler` wrapper
- All validation done with **express-validator** before reaching controller
- HTTP status codes must be semantically correct:
  - `200` OK, `201` Created, `204` No Content
  - `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found
  - `409` Conflict (duplicate), `422` Validation error, `500` Server Error
- Error responses always follow this shape:
```json
{ "success": false, "message": "Human readable message", "errors": [] }
```
- Success responses always follow this shape:
```json
{ "success": true, "data": {}, "message": "Optional message" }
```

---

## 🗃️ 4. MongoDB / Mongoose Rules

- Always define indexes in schema (especially for `userId`, `repoId`, `sha`, `email`)
- Use `.lean()` for read-only queries that don't need Mongoose document methods
- Never use `findOneAndUpdate` with `{new: true}` without also using `{runValidators: true}`
- Use transactions for multi-document writes
- All date fields stored as **UTC**
- Pagination pattern:
```js
const skip = (page - 1) * limit;
const results = await Model.find(query).skip(skip).limit(limit).lean();
const total = await Model.countDocuments(query);
```

---

## 🤖 5. Gemini AI Rules

- Model: always use `gemini-1.5-flash` for speed (switch to `gemini-1.5-pro` only for deep analysis)
- Always wrap Gemini calls in try/catch — AI calls can fail silently
- Always validate Gemini JSON response before saving — use `JSON.parse` inside try/catch
- Cache all insights in `AIInsight` collection with 24h TTL — never call Gemini twice for same data in 24h
- Max input tokens per request: keep context under 8000 tokens (trim commit messages if needed)
- Prompt structure must always request JSON-only responses with a defined schema
- If Gemini response is not valid JSON, retry once, then return a fallback error insight
- Never send raw user data to Gemini without sanitizing (strip PII from commit messages)

---

## 🐙 6. GitHub API Rules

- Use `@octokit/rest` for REST calls and `@octokit/graphql` for GraphQL
- Always check `githubConnected === true` before making any GitHub API call
- Respect rate limits: check `x-ratelimit-remaining` header; pause if < 100
- Sync must be incremental: use `since` parameter with `lastSyncedAt` timestamp
- Never store raw GitHub API responses directly — map to our schema first
- On GitHub disconnect, set `githubConnected: false` and delete token (don't just null it)
- GitHub OAuth callback must validate `state` parameter to prevent CSRF

---

## ⚛️ 7. React Frontend Rules

- Use **functional components only** — no class components
- All API calls via a centralized `api.js` Axios instance with interceptors
- Access token stored in **React state / context** — never in localStorage
- Refresh token handled via httpOnly cookie — never accessed in JS
- All protected pages wrapped in `<PrivateRoute>` component
- Loading states with skeleton loaders — never raw spinners on full page
- Error boundaries on dashboard components — one failing chart must not crash the page
- Use `React.memo` on heavy chart components
- All Recharts charts must be `<ResponsiveContainer>` wrapped
- Never fetch data in useEffect without cleanup / abort controller

```jsx
// CORRECT
useEffect(() => {
  const controller = new AbortController();
  fetchCommits(repoId, { signal: controller.signal });
  return () => controller.abort();
}, [repoId]);
```

---

## 🎨 8. Tailwind CSS Rules

- Dark mode first — use `dark:` variants everywhere
- No inline styles — Tailwind only (exception: dynamic chart colors)
- Breakpoints used: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Color palette:
  - Primary: `indigo-600` / `indigo-500`
  - Success: `emerald-500`
  - Warning: `amber-500`
  - Danger: `red-500`
  - Background dark: `gray-950` / `gray-900`
  - Card dark: `gray-800`
- All interactive elements must have `focus:ring` and `hover:` states
- Use `transition-all duration-200` on interactive elements

---

## 🐳 9. Docker Rules

- `docker-compose.yml` at project root — always
- Services: `backend`, `frontend`, `mongo`
- Backend depends on `mongo` with health check
- Frontend dev server uses `--host` flag for Docker compatibility
- Use named volumes for MongoDB data: `mongo_data`
- Never expose MongoDB port to host in production config (only in dev)
- Environment variables injected via docker-compose `env_file` directive

---

## 🧪 10. Testing Rules

- Every API endpoint must have at least one success test and one failure test
- Use `mongodb-memory-server` for test database — never test against real MongoDB
- Mock all external APIs: GitHub API and Gemini API must be mocked in tests
- Test file naming: `[resource].test.js` placed in `__tests__/` folder
- Run tests with: `npm test` (Jest + Supertest)
- Minimum coverage target: **70%** for controllers and services
- Frontend component tests with Vitest + React Testing Library

---

## 🚫 11. Hard Prohibitions

- ❌ No `eval()` anywhere
- ❌ No `SELECT *` equivalent — always `.select()` specific fields in Mongoose
- ❌ No synchronous file I/O in Express routes
- ❌ No `any` type if using TypeScript (not used here, but noted for future)
- ❌ No API keys or secrets in any source file — `.env` only
- ❌ No `npm install --save` during a session without adding to `package.json` comment
- ❌ No catching errors and silently swallowing them — always log + respond

---

## 📦 12. Approved NPM Packages

### Backend
```
express, mongoose, bcryptjs, jsonwebtoken, cookie-parser, cors,
@octokit/rest, @octokit/graphql, @google/generative-ai,
express-validator, winston, pdfkit, dotenv, crypto-js,
express-rate-limit, helmet, morgan, nodemon (dev), jest, supertest (dev),
mongodb-memory-server (dev)
```

### Frontend
```
react, react-dom, react-router-dom, axios, recharts,
@heroicons/react, react-hot-toast, zustand,
vite (dev), tailwindcss (dev), vitest (dev), @testing-library/react (dev)
```
