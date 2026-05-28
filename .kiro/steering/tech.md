# Tech Stack & Build System

## Frontend (`website/`)
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6 (with `@vitejs/plugin-react`)
- **Styling**: Tailwind CSS 4 (via `@tailwindcss/vite` plugin)
- **State Management**: Zustand (exam store), React Query (server state)
- **Routing**: React Router DOM 7
- **Auth**: AWS Amplify 6 (`@aws-amplify/auth`, `@aws-amplify/api`)
- **UI Libraries**: Headless UI, Heroicons, Lucide React, Framer Motion, Tremor (charts), Recharts
- **PWA**: vite-plugin-pwa with Workbox
- **Testing**: Vitest + Testing Library + fast-check (property-based testing)
- **Linting**: ESLint 9 with typescript-eslint

## Backend (`backend/lambdas/`)
- **Runtime**: Node.js 20 (ES modules)
- **Functions**: AWS Lambda (individual handlers per feature)
- **AWS SDK**: @aws-sdk v3 (DynamoDB, S3, Bedrock, Cognito, Lambda)
- **AI**: Amazon Bedrock Runtime for question generation
- **Testing**: Vitest + fast-check
- **Shared Code**: `common/` directory copied into each Lambda zip at build time

## Infrastructure (`infrastructure/terraform/`)
- **IaC**: Terraform 1.9+ with AWS Provider ~> 6.0
- **State**: Remote S3 backend with DynamoDB locking
- **Modules**: S3, CloudFront, Route53, API Gateway, Lambda, DynamoDB, Cognito, Monitoring, GitHub OIDC, SSM
- **CI/CD**: GitHub Actions with OIDC authentication (no static credentials)

## Common Commands

### Frontend Development
```bash
cd website
npm install --legacy-peer-deps   # Install dependencies
npm run dev                       # Start Vite dev server (localhost:5173)
npm run build                     # TypeScript check + Vite production build
npm run lint                      # Run ESLint
npm run test                      # Run Vitest (single run)
npm run test:watch                # Run Vitest in watch mode
npm run preview                   # Preview production build locally
```

### Backend
```bash
cd backend/lambdas
npm ci                            # Install dependencies
npx vitest --run                  # Run Lambda tests
```

### Infrastructure
```bash
cd infrastructure/terraform/environments/dev   # or prod
AWS_PROFILE=Matthew_Cli terraform init
AWS_PROFILE=Matthew_Cli terraform plan
AWS_PROFILE=Matthew_Cli terraform apply
```

## Key Conventions
- ES modules throughout (`"type": "module"` in both package.json files)
- TypeScript strict mode for frontend
- `--legacy-peer-deps` flag needed for npm install (React 19 peer dep conflicts)
- Build output goes to `website/dist/`
- Lambda packaging: each function's `index.js` + `common/` + `node_modules` zipped together
