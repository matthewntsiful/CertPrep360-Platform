# CertPrep360 Platform — Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Frontend](#frontend)
4. [Backend — Lambda Functions](#backend)
5. [API Reference](#api-reference)
6. [Database Design](#database-design)
7. [Authentication](#authentication)
8. [Infrastructure](#infrastructure)
9. [CI/CD Pipeline](#cicd)
10. [Environments](#environments)
11. [Data Migration](#data-migration)
12. [Domain & Redirects](#domain)
13. [Cost](#cost)

---

## 1. Overview

CertPrep360 is a serverless AWS certification exam preparation platform. Users take timed practice exams, track performance over time, and study weak areas through adaptive quizzes. The platform supports multiple AWS certifications with AI-generated question content.

**Live URLs**
- Production: `https://certprep360.com`
- Dev: `https://dev.certprep360.com`
- Legacy redirect: `https://aws-exams.matthewntsiful.com` → 301 → `certprep360.com`

**Key numbers**
- 1,891 questions across multiple AWS certifications
- 10 Lambda functions
- 1 DynamoDB single-table
- 2 environments (dev/prod), fully isolated

---

## 2. Architecture

```
User
 │
 ▼
Route53 (certprep360.com)
 │
 ▼
CloudFront (CDN + OAC + WAF + security headers)
 │
 ▼
S3 (static website — React SPA)
 │
 │  (API calls with Cognito JWT)
 ▼
API Gateway (Regional, custom domain api.certprep360.com)
 │
 ├── GET  /questions/{certId}/{examId}  → Lambda: GetQuestions
 ├── POST /results                      → Lambda: SubmitResults
 ├── GET  /analytics                    → Lambda: GetUserAnalytics
 ├── GET  /dynamic-quiz                 → Lambda: GetDynamicQuiz
 ├── GET  /session/{certId}/{examId}    → Lambda: ManageSession
 ├── POST /session                      → Lambda: ManageSession
 ├── GET  /catalog (public)             → Lambda: GetCatalog
 ├── POST /payment/initialize           → Lambda: ProcessPayment
 ├── POST /payment/verify               → Lambda: ProcessPayment
 ├── GET  /admin/content                → Lambda: AdminManageContent
 ├── POST /admin/content                → Lambda: AdminManageContent
 ├── PATCH/DELETE /admin/content        → Lambda: AdminManageContent
 ├── GET  /admin/stats                  → Lambda: AdminAnalytics
 └── POST /admin/ai/generate            → Lambda: AIGenerateContent
          │
          ▼
     DynamoDB (single-table: CertPrep360-{env}-Main)
          │
          ├── Cognito (auth context on every request)
          ├── SSM Parameter Store (secrets)
          ├── Amazon Bedrock (AI content generation)
          └── S3 Assets (exam guide PDFs)
```

**Security layers**
- WAF → CloudFront → OAC → S3 (no public S3 access)
- All API routes require Cognito JWT except `GET /catalog`
- Admin routes additionally check `cognito:groups` for `Admins` membership
- TLS 1.2+ enforced, HSTS preload enabled
- Authorizer TTL = 0 (no stale auth caching)

---

## 3. Frontend

**Stack**: React 18, TypeScript, Vite, Tailwind CSS, AWS Amplify v6, Zustand, TanStack Query

### Entry Point

`main.tsx` bootstraps Amplify with `AWS_CONFIG` from `config.ts`, wraps the app in an `ErrorBoundary`, and mounts a global `Toaster` for notifications.

`config.ts` reads all environment values from Vite env vars:
- `VITE_USER_POOL_ID` — Cognito User Pool ID
- `VITE_CLIENT_ID` — Cognito App Client ID
- `VITE_AUTH_DOMAIN` — Cognito hosted UI domain
- `VITE_REDIRECT_URI` — OAuth callback URL
- `VITE_API_URL` — API Gateway base URL

### Routing

`App.tsx` uses React Router v6 data router (`createBrowserRouter`). All pages are lazy-loaded via `React.lazy`. Route groups:

| Route | Auth | Component |
|-------|------|-----------|
| `/` | Public | Home |
| `/login` | Public | Login |
| `/signup` | Public | SignUp |
| `/dashboard` | Protected | Dashboard |
| `/history` | Protected | History |
| `/results/:attemptId` | Protected | ResultReview |
| `/exam/:certId/:examId` | Protected | Exam |
| `/quiz/dynamic/:domain?` | Protected | DynamicQuiz |
| `/certification/:certId` | Public | ExamHub |
| `/admin/*` | Admin only | Admin pages |
| `/catalog`, `/knowledge-base`, etc. | Public | Info pages |

`ProtectedRoute` checks `useAuth()` — redirects to `/login` with `state.from` preserved for post-login redirect. `AdminProtectedRoute` additionally checks `isAdmin` from the auth context.

### State Management

**`useExamStore`** (Zustand + localStorage persistence) manages the entire exam session:
- `startExam(certId, examId)` — fetches questions from API, restores saved session if one exists
- `startDynamicQuiz(domain, questions, meta)` — initializes a dynamic quiz session
- `setAnswer(index, answer)` — records answer, debounces session sync to backend (2s delay)
- `toggleFlag(index)` — flags/unflags a question for review
- `completeExam()` — calculates score, submits to `/results`, sets status to `completed`
- `tick()` — decrements timer every second; auto-completes when `timeLeft` reaches 0
- `toggleTimer()` — pauses/resumes exam

Session sync is debounced — every user action (answer, flag, navigate) schedules a backend sync 2 seconds later. Dynamic quiz sessions (`examId` starts with `Dynamic-`) are never synced to the backend.

**TanStack Query** (`QueryClient`) is used for all data fetching outside the exam session (analytics, history, catalog). Config: 5-minute stale time, 10-minute GC time, 1 retry, no refetch on window focus.

### Auth Context

`AuthContext.tsx` wraps Amplify auth. Exposes:
- `user` — current Amplify `AuthUser` or null
- `attributes` — Cognito user attributes
- `isAdmin` — true if user is in the `Admins` Cognito group
- `login`, `logout`, `register`, `confirmRegister`, `resendCode`

Listens to Amplify Hub events (`signedIn`, `signedOut`, `tokenRefresh`) to keep state in sync. On `signedIn`, waits 500ms before re-checking to allow tokens to persist.

### Key Pages

**Login** — Email/password form + Google OAuth via `signInWithRedirect({ provider: 'Google' })`. Redirects to original destination after login.

**SignUp** — Two-step: registration form → email verification code. Password requirements enforced client-side (8+ chars, uppercase, number, symbol).

**Exam** — Full exam interface. Uses `useExamStore` for all state. Renders `ExamHeader`, `QuestionView`, `ExamNavigation`, `QuestionStrip`. Keyboard navigation: arrow keys for questions, spacebar for pause/resume.

**Dashboard** — Fetches analytics via `fetchAnalytics()`. Shows score trend chart (`ScoreTrendChart`), study heatmap (`StudyHeatmap`), weak pool counter (`WeakPoolCounter`), recent attempts.

**History** — Paginated exam history using `useInfiniteQuery`. Supports filtering by cert, status (passed/failed), and sorting by date/score.

**ResultReview** — Detailed attempt review. Shows each question with user's answer, correct answer, explanation, and resources.

**DynamicQuiz** — Adaptive or domain-specific quiz. Calls `startAdaptiveQuiz` or `startMultiDomainQuiz` from `api.ts`.

**Admin pages** — Protected by `AdminProtectedRoute`. Includes AI content generator, content manager, user manager, analytics dashboard.

### Services

`api.ts` — All API calls. Two fetch helpers:
- `authFetch(path, options)` — attaches Cognito `idToken` as `Authorization: Bearer` header
- `publicFetch(path, options)` — no auth header (used for `/catalog`)

Key functions:
- `fetchCatalog()` — public, returns available certs and exams
- `fetchAnalytics()` — dashboard summary with trend data and weak pool count
- `fetchHistory(params)` — paginated history, supports cursor-based pagination
- `fetchAttemptDetail(attemptId)` — full attempt with question snapshots
- `fetchDynamicQuiz(domain, certId, limit)` — single-domain quiz
- `startAdaptiveQuiz(certId, limit)` — adaptive quiz using weak domain detection
- `startMultiDomainQuiz(domains, certId, limit)` — multi-domain quiz
- `initializePayment(amount)` — Paystack payment initialization
- `verifyPayment(reference)` — Paystack payment verification

`adminService.ts` — Admin-specific API calls for content management and analytics.

---

## 4. Backend — Lambda Functions

All Lambdas are Node.js ES modules (`type: module` in `package.json`), deployed as zip packages from `backend/lambdas/`. They share a `common/` directory for utilities.

### Common Utilities (`backend/lambdas/common/`)

| File | Purpose |
|------|---------|
| `db.js` | DynamoDB DocumentClient singleton |
| `domainScoring.js` | Computes per-domain accuracy from raw answers |
| `weakPool.js` | Leitner box operations: `addToBox1`, `promote`, `demote`, `removeFromPool` |
| `spacedScheduler.js` | Determines which weak pool questions are due based on session counter |
| `adaptiveSelection.js` | Selects weakest domains and allocates question counts using inverse weighting |
| `pagination.js` | Cursor encode/decode and page size clamping |
| `snapshotTruncation.js` | Truncates question snapshots to stay under DynamoDB 400KB item limit |
| `deduplicationEngine.js` | Prevents duplicate questions across quiz sessions |
| `diversityEnforcer.js` | Ensures domain diversity in question sets |
| `coverageTracker.js` | Tracks which questions a user has seen |
| `qualityValidator.js` | Validates question structure and content quality |
| `examGuideParser.js` | Parses AWS exam guide PDFs for AI content generation |

### GetQuestions

**Route**: `GET /questions/{certId}/{examId}`
**Auth**: Cognito JWT required

Queries DynamoDB with `PK = CERT#{certId}` and `SK begins_with EXAM#{examId}#QUESTION#`. Handles pagination internally to return all questions. Normalizes the `correct` field — strips commas/spaces so both `"A,B"` and `"A, B"` become `"AB"`.

### SubmitResults

**Route**: `POST /results`
**Auth**: Cognito JWT required
**Validation**: API Gateway JSON schema (examId, certId, score, timeTaken required)

Writes an `EXAM_ATTEMPT` item to DynamoDB keyed `USER#{userId}` / `ATTEMPT#{timestamp}#EXAM#{examId}`. Pre-computes `domainScores` from answers using `computeDomainScores`. Handles question snapshots with size truncation to stay under 400KB. After saving the attempt, updates the user's **Weak Pool** using Leitner box logic:
- Incorrect answer, not in pool → add to Box 1
- Correct answer in pool → promote (Box 1→2, Box 2→3, Box 3→remove)
- Incorrect answer in pool → demote to Box 1

### GetUserAnalytics

**Route**: `GET /analytics`
**Auth**: Cognito JWT required

Three query modes based on query string parameters:

1. **Default (dashboard summary)** — fetches all attempts, computes average score, total study hours, weakest domain, trend data (chronological score history), and weak pool count. Returns `trendData` array for the score trend chart.

2. **`?history=true` (paginated history)** — supports filtering by `certId` and `status` (passed/failed), sorting by `date_asc`, `date_desc`, `score_asc`, `score_desc`. Date sorts use DynamoDB's native SK ordering. Score sorts fetch all items and sort in memory. Uses opaque base64 cursors for pagination.

3. **`?attemptId=xxx` (single attempt)** — returns full attempt item including question snapshots for the ResultReview page.

Pass threshold is hardcoded at 72%.

### GetDynamicQuiz

**Route**: `GET /dynamic-quiz`
**Auth**: Cognito JWT required

Three quiz modes:

1. **Single-domain** (`?domain=X&certId=Y&limit=N`) — fetches questions from GSI1 (domain index), falls back to scan if GSI1 returns nothing. Mixes in Weak Pool questions from the same domain.

2. **Multi-domain** (`?domain=X,Y,Z`) — uses `selectAndAllocate` to distribute questions across domains using inverse performance weighting (weaker domains get more questions).

3. **Adaptive** (`?mode=adaptive`) — queries user's historical domain performance, identifies 2+ weakest domains, allocates questions inversely proportional to performance. Falls back to all domains if user has fewer than 2 domains of history.

All modes: fetch Weak Pool scheduled questions (via `spacedScheduler`), atomically increment session counter, deduplicate, shuffle (Fisher-Yates), and return clean question objects.

### ManageSession

**Route**: `POST /session`, `GET /session/{certId}/{examId}`
**Auth**: Cognito JWT required

Saves and retrieves in-progress exam sessions. Item key: `USER#{userId}` / `SESSION#{certId}#{examId}`. Stores `sessionData` (answers, flagged questions, time left, current question index, start time). Used by `useExamStore` to auto-save progress and restore on page reload.

### GetCatalog

**Route**: `GET /catalog`
**Auth**: None (public)

Returns available certifications and their exam lists. First checks for a pre-computed `METADATA#CATALOG` item. Falls back to scanning all `QUESTION` type items and aggregating by `cert_id` and `exam_id`. Returns structure: `{ [certId]: { totalQuestions, examCount, exams[] } }`.

### ProcessPayment

**Route**: `POST /payment/initialize`, `POST /payment/verify`
**Auth**: Cognito JWT required

Integrates with Paystack. Secret key fetched from SSM Parameter Store on cold start and cached in Lambda memory. On initialize: creates a Paystack transaction with user email and metadata. On verify: confirms transaction status, validates `metadata.userId` matches the authenticated user, then updates `USER#{userId}#PROFILE` in DynamoDB with `isPremium = true`.

### AdminManageContent

**Route**: `GET/POST/PATCH/DELETE /admin/content`
**Auth**: Cognito JWT + Admins group check

CRUD operations on question content in DynamoDB. Restricted to users in the `Admins` Cognito group.

### AdminAnalytics

**Route**: `GET /admin/stats`
**Auth**: Cognito JWT + Admins group check

Platform-wide analytics for admin dashboard. Aggregates across all users.

### AIGenerateContent

**Route**: `POST /admin/ai/generate`
**Auth**: Cognito JWT + Admins group check

Uses Amazon Bedrock to generate exam questions from AWS exam guide PDFs stored in S3. Parses PDFs using `examGuideParser.js`, generates questions via Bedrock, validates quality with `qualityValidator.js`, and writes to DynamoDB. Timeout: 15 minutes. Memory: 1024MB (required for PDF parsing and TF-IDF in memory). Supports self-invocation for batch generation.

---

## 5. API Reference

Base URL: `https://api.certprep360.com` (prod) / `https://api.dev.certprep360.com` (dev)

All authenticated routes require: `Authorization: Bearer {cognitoIdToken}`

| Method | Path | Auth | Lambda | Description |
|--------|------|------|--------|-------------|
| GET | `/questions/{certId}/{examId}` | JWT | GetQuestions | Fetch all questions for an exam |
| POST | `/results` | JWT | SubmitResults | Submit exam score and answers |
| GET | `/analytics` | JWT | GetUserAnalytics | Dashboard summary |
| GET | `/analytics?history=true` | JWT | GetUserAnalytics | Paginated attempt history |
| GET | `/analytics?attemptId=xxx` | JWT | GetUserAnalytics | Single attempt detail |
| GET | `/dynamic-quiz` | JWT | GetDynamicQuiz | Domain/adaptive quiz questions |
| POST | `/session` | JWT | ManageSession | Save in-progress session |
| GET | `/session/{certId}/{examId}` | JWT | ManageSession | Restore in-progress session |
| GET | `/catalog` | None | GetCatalog | Available certs and exams |
| POST | `/payment/initialize` | JWT | ProcessPayment | Start Paystack transaction |
| POST | `/payment/verify` | JWT | ProcessPayment | Verify Paystack transaction |
| GET | `/admin/content` | JWT+Admin | AdminManageContent | List questions |
| POST | `/admin/content` | JWT+Admin | AdminManageContent | Create question |
| PATCH | `/admin/content` | JWT+Admin | AdminManageContent | Update question |
| DELETE | `/admin/content` | JWT+Admin | AdminManageContent | Delete question |
| GET | `/admin/stats` | JWT+Admin | AdminAnalytics | Platform analytics |
| POST | `/admin/ai/generate` | JWT+Admin | AIGenerateContent | AI question generation |

**API Gateway configuration:**
- Regional endpoint
- Cognito authorizer TTL = 0 (no caching)
- Request validation on `POST /results` (JSON schema)
- Global throttle: 1000 burst / 500 rate
- `/results` throttle: 200 burst / 100 rate
- CORS enabled on all routes via OPTIONS mock integrations + gateway responses for 4xx/5xx

---

## 6. Database Design

Single-table DynamoDB design. Table name: `CertPrep360-{env}-Main`

**Primary Key**: `PK` (partition) + `SK` (sort)
**GSI1**: `GSI1-PK` + `GSI1-SK` (domain-based question queries)

### Access Patterns

| Item Type | PK | SK | GSI1-PK | GSI1-SK | Description |
|-----------|----|----|---------|---------|-------------|
| Question | `CERT#{certId}` | `EXAM#{examId}#QUESTION#{q_id}` | `DOMAIN#{domain}` | `CERT#{certId}` | Exam question |
| Exam Attempt | `USER#{userId}` | `ATTEMPT#{timestamp}#EXAM#{examId}` | — | — | User's exam result |
| Weak Pool | `USER#{userId}` | `WEAK_POOL#{certId}` | — | — | User's weak questions |
| Session | `USER#{userId}` | `SESSION#{certId}#{examId}` | — | — | In-progress exam |
| User Profile | `USER#{userId}` | `PROFILE` | — | — | User metadata, premium status |
| Quality Report | `QUALITY#{examId}` | `REPORT` | — | — | AI quality validation results |
| Exam Guide | `EXAM_GUIDE#{certId}` | `METADATA` | — | — | PDF processing metadata |
| Catalog Cache | `METADATA` | `CATALOG` | — | — | Pre-computed catalog |
| AI Job | `JOB#{jobId}` | `METADATA` | — | — | AI generation job status |

### Weak Pool (Leitner System)

Each user has one `WEAK_POOL#{certId}` item per certification. The `questions` map stores:
```json
{
  "{q_id}": {
    "box": 1,
    "domain": "Security",
    "certId": "SAA-C03",
    "addedAt": "2025-01-01T00:00:00Z"
  }
}
```

Box progression: Box 1 (review every session) → Box 2 (every 2 sessions) → Box 3 (every 4 sessions) → removed. `sessionCounter` is atomically incremented on every dynamic quiz start.

### DynamoDB Configuration
- Billing: `PAY_PER_REQUEST` (on-demand)
- PITR: enabled
- Encryption: AWS managed keys
- GSI1 provisioned alongside main table

---

## 7. Authentication

**Provider**: AWS Cognito

### User Pools

| Environment | Pool Name | Pool ID | Domain |
|-------------|-----------|---------|--------|
| Dev | CertPrep360-Dev-Users | `us-east-1_hMqIOybsZ` | `certprep360-dev-auth` |
| Prod | CertPrep360-Prod-Users | `us-east-1_2AgqRZj6v` | `certprep360-prod-auth` |

### App Client Configuration
- No client secret (public SPA client)
- OAuth flows: `code`, `implicit`
- Scopes: `email`, `openid`, `profile`, `aws.cognito.signin.user.admin`
- Callback URLs: `https://{domain}`, `http://localhost:5173`
- Identity providers: `COGNITO`, `Google`

### Google OAuth
- Single Google OAuth client used for both dev and prod
- Authorized redirect URIs registered in Google Console:
  - `https://certprep360-dev-auth.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
  - `https://certprep360-prod-auth.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
- Credentials stored in SSM: `/certprep360/{env}/auth/google_client_id` and `google_client_secret`

### Password Policy
- Minimum 8 characters
- Requires: uppercase, lowercase, numbers, symbols
- MFA: optional (TOTP)

### Admin Access
Users in the `Admins` Cognito group get `isAdmin = true` in the auth context. Admin Lambdas check `cognito:groups` claim from the JWT. The `Admins` group is created by Terraform with precedence 1.

### Token Flow
1. User signs in (email/password or Google OAuth)
2. Amplify stores tokens in localStorage
3. `authFetch` in `api.ts` calls `fetchAuthSession()` to get the current `idToken`
4. Token sent as `Authorization: Bearer {idToken}` on every API request
5. API Gateway Cognito authorizer validates the token
6. Lambda receives `userId` from `event.requestContext.authorizer.claims.sub`

---

## 8. Infrastructure

All infrastructure is managed by Terraform 1.9+ with AWS Provider >= 6.0.

### Terraform Structure

```
infrastructure/terraform/
├── backend/          # Remote state bootstrap (S3 + DynamoDB lock)
├── environments/
│   ├── dev/          # Dev environment config
│   └── prod/         # Prod environment config
└── modules/
    ├── s3/           # Content bucket + logs bucket + OAC
    ├── cloudfront/   # Distribution + cache policy + security headers + URL rewrite function
    ├── route53/      # ACM certs + DNS records
    ├── cognito/      # User pool + app client + Google IdP + domain + Admins group
    ├── dynamodb/     # Single table + GSI1
    ├── lambda/       # Function + IAM role + permissions
    ├── api-gateway/  # REST API + all routes + CORS + custom domain
    ├── ssm/          # Secrets storage (Google OAuth, Paystack)
    ├── monitoring/   # CloudWatch alarms
    ├── github-oidc/  # OIDC role for GitHub Actions
    └── redirect/     # 301 redirect CloudFront distribution
```

### Remote State
- S3 bucket: `saa-exams-terraform-state`
- Dev key: `dev/terraform.tfstate`
- Prod key: `prod/terraform.tfstate`
- Locking: `use_lockfile = true` (S3 native locking, no DynamoDB needed)

### S3 Module
- Content bucket: `certprep360-{env}-website`
- Logs bucket: `certprep360-{env}-website-logs`
- Versioning enabled on content bucket
- Public access blocked on both buckets
- OAC (Origin Access Control) for CloudFront-only access
- Lifecycle policy on content bucket: expire old versions after 30 days, abort incomplete multipart uploads after 7 days
- Logs lifecycle: IA after 30 days, Glacier after 90 days, delete after 365 days

### CloudFront Module
- OAC (not legacy OAI)
- Brotli + Gzip compression
- Security headers response policy: HSTS (1 year, preload), X-Frame-Options DENY, XSS protection, referrer policy
- CloudFront Function for URL rewriting (SPA support — appends `index.html` to directory paths)
- Custom error responses: 403/404 → 200 `/index.html` (SPA routing)
- Dev: `PriceClass_100` (US/EU only, cost optimized)
- Prod: `PriceClass_100`
- Access logging to S3 logs bucket

### Lambda Module
- Runtime: Node.js 20
- Default memory: 256MB (overridden per function)
- Default timeout: 30s (AIGenerateContent: 900s)
- IAM role with least-privilege DynamoDB access
- Bedrock access optional (`enable_bedrock_access`)
- Self-invoke permission optional (`enable_self_invoke`)
- S3 read access optional (`s3_read_bucket_arns`)
- SSM read access optional (`ssm_parameter_arns`)
- Cognito access optional (`enable_cognito_access`)

### Lambda Memory Allocation

| Function | Memory | Reason |
|----------|--------|--------|
| GetQuestions | 512MB | More CPU for faster cold starts |
| GetUserAnalytics | 512MB | In-memory sorting for score-based pagination |
| GetDynamicQuiz | 512MB | Domain aggregation and shuffle |
| GetCatalog | 512MB | Scan aggregation |
| AdminManageContent | 512MB | Content operations |
| AdminAnalytics | 512MB | Cross-user aggregation |
| AIGenerateContent | 1024MB | PDF parsing + TF-IDF |
| SubmitResults | 128MB | Simple write operation |
| ManageSession | 128MB | Simple read/write |
| ProcessPayment | 128MB | Simple HTTP + DynamoDB write |

### Redirect Module
Handles 301 redirects from old domains to new domain. Creates:
- ACM certificate for the source domain (DNS validated)
- CloudFront Function that returns `301` with `Location` header
- Minimal CloudFront distribution (dummy origin, function handles all requests)
- Route53 A record aliased to the distribution

Currently active: `aws-exams.matthewntsiful.com` → `certprep360.com`

---

## 9. CI/CD Pipeline

**File**: `.github/workflows/deploy.yml`

### Triggers
- Push to `develop` → deploy to dev
- Push to `main` → deploy to prod
- `workflow_dispatch` → manual trigger

### Jobs

**changes** — Uses `dorny/paths-filter` to detect what changed:
- `frontend`: `website/**`
- `backend`: `backend/lambdas/**`
- `infrastructure`: `infrastructure/terraform/**`

**build-frontend** — Runs if frontend changed or manual trigger:
1. `npm install --legacy-peer-deps`
2. `npm run build` (Vite, uses `.env.production`)
3. Uploads `website/dist/` as artifact

**build-lambdas** — Runs if backend changed or manual trigger:
1. `npm ci` in `backend/lambdas/`
2. Packages each Lambda: copies `index.js`, `common/`, `node_modules/`, `package.json` into a staging dir, zips it
3. Uploads all zips as artifact

**deploy-dev-frontend** — Runs on `develop` branch:
- S3 sync to `certprep360-dev-website`
- CloudFront invalidation on `E3BJ1TGWKI1MXR`

**deploy-dev-lambdas** — Runs on `develop` branch:
- Updates each Lambda function code via `aws lambda update-function-code`

**deploy-prod-frontend** — Runs on `main` branch:
- S3 sync to `certprep360-prod-website`
- CloudFront invalidation on `E1EJQ7714G35XX`

**deploy-prod-lambdas** — Runs on `main` branch:
- Updates each prod Lambda function code

### Authentication
GitHub Actions uses OIDC (no stored AWS credentials). IAM role `certprep360-github-actions-{env}` is assumed via `aws-actions/configure-aws-credentials@v4`. Role ARN stored as `AWS_ROLE_ARN` GitHub secret per environment.

### Environments
- GitHub environment `dev` → `develop` branch deployments
- GitHub environment `production` → `main` branch deployments

---

## 10. Environments

### Dev
| Resource | Value |
|----------|-------|
| URL | `https://dev.certprep360.com` |
| API | `https://api.dev.certprep360.com` |
| S3 bucket | `certprep360-dev-website` |
| CloudFront | `E3BJ1TGWKI1MXR` |
| Cognito Pool | `us-east-1_hMqIOybsZ` |
| Cognito Client | `2ovm85i7jvl02mhhv8esirqgnh` |
| DynamoDB | `CertPrep360-Dev-Main` |
| Branch | `develop` |

### Prod
| Resource | Value |
|----------|-------|
| URL | `https://certprep360.com` |
| API | `https://api.certprep360.com` |
| S3 bucket | `certprep360-prod-website` |
| CloudFront | `E1EJQ7714G35XX` |
| Cognito Pool | `us-east-1_2AgqRZj6v` |
| Cognito Client | `3t4vr03cb8mgc6mr9aol25hh7c` |
| DynamoDB | `CertPrep360-Prod-Main` |
| Branch | `main` |

### Environment Variables (`.env.development` / `.env.production`)
```
VITE_API_URL=https://api.{env}.certprep360.com
VITE_USER_POOL_ID={cognito_pool_id}
VITE_CLIENT_ID={cognito_client_id}
VITE_AUTH_DOMAIN=certprep360-{env}-auth.auth.us-east-1.amazoncognito.com
VITE_REDIRECT_URI=https://{domain}
```

---

## 11. Data Migration

Script: `scripts/migrate-dev-to-prod.js`

Copies content items from dev DynamoDB to prod. Filters by PK prefix:
- `CERT#` — questions (1,885 items)
- `QUALITY#` — quality reports (5 items)
- `EXAM_GUIDE#` — exam guide metadata (1 item)

Skips `USER#` (dev test users) and `JOB#` (AI generation jobs).

Uses DynamoDB `BatchWriteCommand` in batches of 25. Handles unprocessed items.

**Usage:**
```bash
# Dry run (no writes)
AWS_PROFILE=BlakkBrotherInc-Startup node scripts/migrate-dev-to-prod.js --dry-run

# Live migration
AWS_PROFILE=BlakkBrotherInc-Startup node scripts/migrate-dev-to-prod.js
```

Must be run from `backend/lambdas/` directory (needs `node_modules/@aws-sdk`):
```bash
cp scripts/migrate-dev-to-prod.js backend/lambdas/
cd backend/lambdas
AWS_PROFILE=BlakkBrotherInc-Startup node migrate-dev-to-prod.js
```

---

## 12. Domain & Redirects

### DNS (Route53)

| Domain | Hosted Zone | Points To |
|--------|-------------|-----------|
| `certprep360.com` | `Z00488512RB3NYQE1E0VD` | CloudFront `E1EJQ7714G35XX` |
| `www.certprep360.com` | `Z00488512RB3NYQE1E0VD` | CloudFront `E1EJQ7714G35XX` |
| `api.certprep360.com` | `Z00488512RB3NYQE1E0VD` | API Gateway regional |
| `dev.certprep360.com` | `Z00488512RB3NYQE1E0VD` | CloudFront `E3BJ1TGWKI1MXR` |
| `api.dev.certprep360.com` | `Z00488512RB3NYQE1E0VD` | API Gateway regional (dev) |
| `aws-exams.matthewntsiful.com` | `Z06084761OMT7UZ96VPLJ` | CloudFront redirect distribution |

### Legacy Redirect
`aws-exams.matthewntsiful.com` → 301 → `https://certprep360.com{path}`

Implemented via the `redirect` Terraform module. Path-preserving: `/exam/SAA-C03/01` on the old domain redirects to the same path on the new domain. Served by a CloudFront Function (zero latency, no origin hit).

---

## 13. Cost

Estimated monthly cost for production (~$6.50/month):

| Service | Cost |
|---------|------|
| S3 content bucket | ~$0.02 |
| S3 logs (with lifecycle) | ~$0.05 |
| CloudFront | ~$0.85 |
| Route53 | ~$0.50 |
| WAF | ~$5.00 |
| CloudWatch Alarms | ~$0.30 |
| Lambda | ~$0 (free tier) |
| API Gateway | ~$0 (free tier) |
| DynamoDB | ~$0 (on-demand, low traffic) |
| Cognito | ~$0 (free tier up to 50k MAU) |

**Cost optimizations applied:**
- `PriceClass_100` on CloudFront (US/EU edge locations only)
- S3 lifecycle: logs → IA after 30 days, Glacier after 90 days, delete after 365 days
- S3 lifecycle: expire old object versions after 30 days
- DynamoDB `PAY_PER_REQUEST` (no provisioned capacity waste)
- Lambda memory right-sized per function workload
- Redirect distribution uses `PriceClass_100`

---

## Appendix — AWS Profile

All AWS CLI and Terraform commands use profile `BlakkBrotherInc-Startup`:

```bash
aws ... --profile BlakkBrotherInc-Startup
AWS_PROFILE=BlakkBrotherInc-Startup terraform apply
```

## Appendix — Secrets in SSM Parameter Store

| Parameter | Environment | Description |
|-----------|-------------|-------------|
| `/certprep360/dev/auth/google_client_id` | Dev | Google OAuth Client ID |
| `/certprep360/dev/auth/google_client_secret` | Dev | Google OAuth Client Secret |
| `/certprep360/dev/payments/paystack_secret_key` | Dev | Paystack secret key |
| `/certprep360/dev/payments/paystack_public_key` | Dev | Paystack public key |
| `/certprep360/prod/auth/google_client_id` | Prod | Google OAuth Client ID |
| `/certprep360/prod/auth/google_client_secret` | Prod | Google OAuth Client Secret |
| `/certprep360/prod/payments/paystack_secret_key` | Prod | Paystack secret key |
| `/certprep360/prod/payments/paystack_public_key` | Prod | Paystack public key |

All parameters are `SecureString` type (KMS encrypted). The SSM Terraform module uses `ignore_changes = [value]` — update values directly via `aws ssm put-parameter --overwrite`.
