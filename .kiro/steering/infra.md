# Infrastructure & AWS Architecture

## Architecture Overview
Serverless, static-first architecture:
- Frontend: S3 → CloudFront → Route53
- Backend: API Gateway → Lambda → DynamoDB
- Auth: Cognito (user pool + app client)
- AI: Amazon Bedrock (question generation)
- Monitoring: CloudWatch alarms
- Security: WAF (rate limiting + managed rules), OAC for S3

## Environments
| | Dev | Prod |
|---|---|---|
| Branch | `develop` | `main` |
| Domain | saa-exams-dev.blakkbrother.com | aws-exams.matthewntsiful.com |
| S3 Bucket | certprep360-dev-website | certprep360-prod-website |
| AWS Profile | Matthew_Cli | Matthew_Cli |

## Terraform Rules
- Always run `terraform plan` before `apply`
- State is remote: S3 bucket + DynamoDB lock table (set up in `infrastructure/terraform/backend/`)
- Modules live in `infrastructure/terraform/modules/` — never duplicate resource definitions
- Environment configs in `infrastructure/terraform/environments/dev|prod/`
- AWS Provider version: `~> 6.0`, Terraform: `>= 1.9`

## Lambda Rules
- Runtime: Node.js 20, ES modules
- Each Lambda is self-contained in `backend/lambdas/<function-name>/index.js`
- Shared code lives in `backend/lambdas/common/` — copied into each zip at build time
- Use `@aws-sdk/client-*` v3 packages only (not v2)
- Never hardcode ARNs or region — use environment variables

## CI/CD
- GitHub Actions with OIDC (no static AWS credentials ever)
- Push to `develop` → auto-deploy to dev
- Push to `main` → auto-deploy to prod
- PRs trigger `terraform plan` only (no apply)
