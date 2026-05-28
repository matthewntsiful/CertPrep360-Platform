# Project Structure

```
CertPrep360-Platform/
├── website/                          # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/               # Reusable UI components
│   │   │   └── exam/                 # Exam-specific components
│   │   ├── pages/                    # Route-level page components
│   │   ├── store/                    # Zustand stores (useExamStore.ts)
│   │   ├── services/                 # API service layer (api.ts, adminService.ts)
│   │   ├── context/                  # React context (AuthContext.tsx)
│   │   ├── hooks/                    # Custom hooks (useTimer.ts)
│   │   ├── types/                    # TypeScript type definitions
│   │   ├── utils/                    # Utility functions
│   │   ├── data/                     # Static data and mock data
│   │   ├── tests/                    # Test files
│   │   │   └── property/            # Property-based tests (fast-check)
│   │   ├── App.tsx                   # Root component with routing
│   │   ├── config.ts                # App configuration (API URLs, Amplify)
│   │   └── main.tsx                  # Entry point
│   ├── public/                       # Static assets (icons, PWA manifest)
│   ├── dist/                         # Build output (git-ignored in prod)
│   ├── vite.config.ts               # Vite + PWA + Tailwind config
│   ├── vitest.config.ts             # Test configuration
│   ├── tsconfig.json                # TypeScript config
│   └── package.json
│
├── backend/
│   └── lambdas/                      # AWS Lambda functions
│       ├── common/                   # Shared utilities across all Lambdas
│       ├── get-questions/            # Fetch exam questions
│       ├── get-dynamic-quiz/         # AI-generated dynamic quizzes
│       ├── submit-results/           # Save exam results
│       ├── get-user-analytics/       # User performance data
│       ├── get-catalog/              # Exam catalog listing
│       ├── manage-session/           # Session management
│       ├── admin-analytics/          # Admin dashboard data
│       ├── admin-manage-content/     # Content CRUD operations
│       ├── ai-generate-content/      # Bedrock AI question generation
│       ├── process-payment/          # Payment processing
│       ├── tests/                    # Backend test files
│       ├── vitest.config.ts
│       └── package.json
│
├── infrastructure/
│   └── terraform/
│       ├── backend/                  # Remote state setup (S3 + DynamoDB)
│       ├── environments/
│       │   ├── dev/                  # Dev environment config
│       │   └── prod/                 # Production environment config
│       └── modules/                  # Reusable Terraform modules
│           ├── s3/                   # S3 buckets (website + logs)
│           ├── cloudfront/           # CDN distribution
│           ├── route53/              # DNS + SSL certificates
│           ├── api-gateway/          # REST API
│           ├── lambda/               # Lambda function definitions
│           ├── dynamodb/             # DynamoDB tables
│           ├── cognito/              # User pool + app client
│           ├── monitoring/           # CloudWatch alarms
│           ├── github-oidc/          # CI/CD IAM roles
│           └── ssm/                  # Parameter Store
│
├── .github/workflows/
│   ├── deploy.yml                    # Main CI/CD (build + deploy to dev/prod)
│   ├── pr-check.yml                  # PR validation
│   └── terraform.yml                 # Infrastructure changes
│
├── CertPrep360-ExamGuide/            # PDF exam guides (source material for AI generation)
├── archive/                          # Deprecated exams and legacy build scripts
└── docs/                             # Documentation (architecture, features, deployment)
```

## Key Patterns
- **Pages** are top-level route components; reusable pieces go in `components/`
- **Admin pages** prefixed with `Admin*` and protected by `AdminProtectedRoute`
- **Each Lambda** is a self-contained directory with an `index.js` entry point
- **Terraform modules** are composed in environment-level `main.tf` files
- **Tests** live alongside source (`.test.tsx` in pages) or in dedicated `tests/` directories
- **Property-based tests** use fast-check and live in `src/tests/property/`
