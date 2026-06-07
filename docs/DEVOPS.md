# DevOps Plumbing

This repo is prepared for Firebase App Hosting + Firestore, with Cloudflare proxy routing for `vigneshsundhar.com/watchlist`.

Nothing should be deployed from this repo until Vignesh explicitly says `deploy`.

## Runtime Architecture

- Local development: Next.js + `data/watchlist.json`.
- Production storage: Firestore through the Firebase Admin SDK.
- Production app host: Firebase App Hosting for the Next.js app.
- Public path: Cloudflare Worker route proxies `vigneshsundhar.com/watchlist*` and `vigneshsundhar.com/api/watchlist*` to the Firebase origin.
- LLM ranking: OpenAI Responses API, disabled unless `OPENAI_RANKING_ENABLED=true`.

## Firebase Values Needed

I need:

- `FIREBASE_PROJECT_ID`
- Firestore enabled in production mode
- App Hosting backend origin URL, after backend creation
- For local Firestore access only: either `FIREBASE_SERVICE_ACCOUNT_JSON` or a `GOOGLE_APPLICATION_CREDENTIALS` file path

Exact steps:

1. Go to [Firebase console](https://console.firebase.google.com/).
2. Create or select a project for this app.
3. Copy the project ID from Project settings > General > Project ID.
4. In Build > Firestore database, click Create database.
5. Choose Production mode.
6. Choose a region. Prefer the same region later used for App Hosting.
7. For local service access, open [Google Cloud Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts).
8. Select the Firebase project.
9. Create a service account named `mywatchlist-local-admin`.
10. Grant the least role that lets it read/write Firestore, usually `Cloud Datastore User`.
11. Open the service account > Keys > Add key > Create new key > JSON.
12. Copy the JSON contents into `.env.local` as a single-line `FIREBASE_SERVICE_ACCOUNT_JSON='...'`, or save it outside the repo and set `GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/key.json`.

## Firebase App Hosting Setup

App Hosting is not created yet. When deployment is explicitly requested:

1. Run `npx firebase login`.
2. Copy `.firebaserc.example` to `.firebaserc` and replace `YOUR_FIREBASE_PROJECT_ID`.
3. Create secrets:
   - `npx firebase apphosting:secrets:set tmdbApiKey --project YOUR_FIREBASE_PROJECT_ID`
   - `npx firebase apphosting:secrets:set omdbApiKey --project YOUR_FIREBASE_PROJECT_ID`
   - `npx firebase apphosting:secrets:set openaiApiKey --project YOUR_FIREBASE_PROJECT_ID`
4. Create the backend:
   - `npx firebase apphosting:backends:create --project YOUR_FIREBASE_PROJECT_ID`
5. Use root directory `/`.
6. Set live branch to `main`.
7. Decline automatic rollouts unless you explicitly want pushes to deploy.
8. Keep `OPENAI_RANKING_ENABLED=false` until the OpenAI project budget is configured.

## Cloudflare Values Needed

I need:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ZONE_ID`
- `CLOUDFLARE_API_TOKEN`
- Zone name: `vigneshsundhar.com`
- Firebase App Hosting origin URL

Exact steps:

1. Go to [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Select the account that owns `vigneshsundhar.com`.
3. Copy Account ID from the right sidebar of the account or zone overview.
4. Open the `vigneshsundhar.com` zone and copy Zone ID from the right sidebar.
5. Go to My Profile > API Tokens.
6. Click Create Token.
7. Use Create Custom Token.
8. Name it `mywatchlist-deploy`.
9. Add permissions:
   - Account > Workers Scripts > Edit
   - Zone > Workers Routes > Edit
   - Zone > DNS > Edit
10. Scope resources:
   - Account Resources: the account that owns the site
   - Zone Resources: Include > Specific zone > `vigneshsundhar.com`
11. Continue to summary, create the token, and copy it once.
12. Verify it:
    - `curl "https://api.cloudflare.com/client/v4/user/tokens/verify" --header "Authorization: Bearer YOUR_TOKEN"`

When deploy is requested, copy `infra/cloudflare/wrangler.production.toml.example` to `infra/cloudflare/wrangler.production.toml`, fill in the account ID and Firebase origin, then deploy the Worker with:

```bash
CLOUDFLARE_API_TOKEN=... npx wrangler deploy --config infra/cloudflare/wrangler.production.toml
```

## OpenAI Values Needed

I need:

- `OPENAI_API_KEY`
- Confirmation that the OpenAI project has a low monthly budget, recommended `$1` or less

Exact steps:

1. Go to [OpenAI API keys](https://platform.openai.com/api-keys).
2. Create a dedicated project named `MyWatchlist`.
3. In that project, create a new secret key named `mywatchlist-ranking`.
4. Copy the key once and put it in `.env.local` as `OPENAI_API_KEY=...`.
5. Go to [OpenAI billing limits](https://platform.openai.com/settings/organization/billing/limits).
6. Set a low monthly budget for the project. Recommended: `$1`.
7. Keep repo env `OPENAI_RANKING_MONTHLY_BUDGET_USD=0.25` unless you explicitly raise it.
8. Set `OPENAI_RANKING_ENABLED=true` only after the project budget is set.

The app uses `gpt-5-nano` by default, caps output tokens, caps ranked item count, caps input size, and falls back to deterministic ranking if the local estimated monthly budget would be exceeded.

## Local Secret Template

```bash
TMDB_API_KEY=
OMDB_API_KEY=
WATCHLIST_STORAGE=file

OPENAI_API_KEY=
OPENAI_RANKING_ENABLED=false
OPENAI_RANKING_MODEL=gpt-5-nano
OPENAI_RANKING_MONTHLY_BUDGET_USD=0.25

FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_JSON=

CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_API_TOKEN=
```
