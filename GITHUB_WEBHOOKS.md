# GitHub Webhooks Setup

DevTrackr supports signed GitHub webhooks for real-time repository updates.

## What This Adds

- Push events insert new commits without clicking manual sync.
- Pull request events update PR state, merge status, and merge timestamps.
- Pull request review events refresh PR data and record reviewers.
- Issue events update open/closed issue state.
- Repository metadata events refresh repository details.
- Duplicate GitHub deliveries are ignored safely.
- Cached AI insights are invalidated when webhook data changes.

## Backend Environment Variable

Add this to `backend/.env`:

```env
GITHUB_WEBHOOK_SECRET=use_a_long_random_secret_here
```

Use the same secret when creating the webhook in GitHub.

## GitHub Webhook URL

Local backend endpoint:

```text
http://localhost:5000/api/github/webhook
```

For a real GitHub webhook, GitHub must reach your backend through a public HTTPS URL.
For local testing, expose the backend with a tunnel such as ngrok and use:

```text
https://your-public-url.ngrok-free.app/api/github/webhook
```

## GitHub Webhook Settings

In GitHub repository settings:

1. Go to `Settings -> Webhooks -> Add webhook`.
2. Payload URL: your public `/api/github/webhook` URL.
3. Content type: `application/json`.
4. Secret: same value as `GITHUB_WEBHOOK_SECRET`.
5. Events:
   - Pushes
   - Pull requests
   - Pull request reviews
   - Issues
   - Repository
6. Save webhook.

## Important Behavior

The repository must be synced once manually before webhook updates can be applied. This is required because DevTrackr needs an existing repository record linked to the correct user.

Manual sync is still available and works exactly as before. Webhooks only add incremental updates after the first sync.
