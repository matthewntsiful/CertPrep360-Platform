# CI/CD Pipeline Documentation

## Overview

Automated deployment pipeline using GitHub Actions for continuous integration and deployment to AWS.

## Workflows

### 1. Deploy to AWS (`deploy.yml`)

**Triggers:**
- Push to `main` branch → Deploy to production
- Push to `develop` branch → Deploy to dev
- Manual `workflow_dispatch` (choose `dev` or `prod`)

**Jobs:**

| Job | Runs when |
|-----|-----------|
| `build-frontend` | `website/**` changed, `workflow_dispatch`, or any push to `main` |
| `build-lambdas` | `backend/lambdas/**` changed, `workflow_dispatch`, or any push to `main` |
| `deploy-dev-*` | `is_prod == false` (i.e. `develop` branch) |
| `approve-prod` | `is_prod == true` — requires manual approval via `production` environment |
| `deploy-prod-*` | `is_prod == true`, after approval |

> **Note:** On pushes to `main`, both frontend and Lambda build jobs always run regardless of which files changed. This guarantees deployment artifacts are always available for production deploys.

**Environments:**
- **Dev**: `saa-exams-dev.blakkbrother.com`
- **Prod**: `aws-exams.matthewntsiful.com`

### 2. Terraform Infrastructure (`terraform.yml`)

**Triggers:**
- Push to `main` with infrastructure changes
- Manual workflow dispatch

**Steps:**
1. Terraform init
2. Terraform plan
3. Terraform apply (auto-approved)

### 3. PR Checks (`pr-check.yml`)

**Triggers:**
- Pull requests to `main` or `develop`

**Checks:**
- Node.js syntax validation
- Terraform format check
- Terraform validate

## Setup Instructions

### 1. AWS OIDC Provider Setup

**Create OIDC Provider (one-time, if not exists):**
```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

**Deploy IAM roles with Terraform:**
```bash
cd infrastructure/terraform/environments/prod
terraform apply -var="github_org=YOUR_GITHUB_USERNAME" -var="github_repo=YOUR_REPO_NAME"
```

### 2. GitHub Secrets

Add `AWS_ROLE_ARN` as a secret in **each GitHub environment** (not as a repository-level secret):

**`dev` environment secret:**
```
AWS_ROLE_ARN=arn:aws:iam::ACCOUNT_ID:role/certprep360-github-actions-dev
```

**`production` environment secret:**
```
AWS_ROLE_ARN=arn:aws:iam::ACCOUNT_ID:role/certprep360-github-actions-prod
```

**To add secrets:**
1. Go to repository Settings → Environments
2. Click on the `dev` environment → Add secret → `AWS_ROLE_ARN`
3. Repeat for the `production` environment with the prod role ARN

### 3. GitHub Environments

Create two environments in GitHub:

**Dev Environment:**
- Name: `dev`
- No protection rules needed

**Production Environment:**
- Name: `production`
- Enable "Required reviewers" (optional)
- Add deployment branch rule: `main` only

**To create environments:**
1. Go to repository Settings
2. Navigate to Environments
3. Click "New environment"
4. Configure protection rules

### 4. Branch Protection

Recommended branch protection rules for `main`:

- Require pull request reviews (1 approval)
- Require status checks to pass
- Require branches to be up to date
- Include administrators

## Deployment Flow

### Development Workflow

```
feature-branch → develop → dev environment
```

1. Create feature branch from `develop`
2. Make changes
3. Create PR to `develop`
4. PR checks run automatically
5. Merge to `develop`
6. Auto-deploy to dev environment

### Production Workflow

```
develop → main → production environment
```

1. Create PR from `develop` to `main`
2. PR checks run automatically
3. Review and approve
4. Merge to `main`
5. Auto-deploy to production

## Manual Deployment

### Deploy Infrastructure

```bash
# Via GitHub UI
1. Go to Actions tab
2. Select "Terraform Infrastructure"
3. Click "Run workflow"
4. Select environment (dev/prod)
5. Click "Run workflow"
```

### Deploy Website Only

```bash
# Local deployment
cd website
node -e "..." # Generate index.html
aws s3 sync public/ s3://bucket-name/
aws cloudfront create-invalidation --distribution-id ID --paths "/*"
```

## Monitoring

### GitHub Actions

- View workflow runs in the Actions tab
- Check logs for each step
- Review deployment status

### AWS CloudWatch

- Monitor CloudFront metrics
- Check S3 access logs
- Review WAF blocked requests

## Rollback Procedure

### Website Rollback

```bash
# Revert to previous commit
git revert <commit-hash>
git push origin main

# Or restore from S3 versioning
aws s3api list-object-versions --bucket bucket-name
aws s3api copy-object --copy-source bucket-name/index.html?versionId=VERSION
```

### Infrastructure Rollback

```bash
# Revert Terraform changes
cd infrastructure/terraform/environments/prod
terraform plan -destroy -target=resource.name
terraform apply
```

## Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs
2. Verify AWS credentials
3. Check S3 bucket permissions
4. Verify CloudFront distribution ID

### Terraform Fails

1. Check state lock in DynamoDB
2. Verify backend configuration
3. Run `terraform init -reconfigure`
4. Check AWS provider version

### CloudFront Not Updating

1. Wait for invalidation to complete (5-10 min)
2. Check invalidation status in AWS Console
3. Clear browser cache
4. Try incognito/private window

## Best Practices

1. **Always test in dev first**
2. **Use pull requests for all changes**
3. **Review Terraform plans before applying**
4. **Monitor CloudWatch alarms after deployment**
5. **Keep secrets secure (never commit)**
6. **Document infrastructure changes**
7. **Tag releases in Git**

## Security

- **OIDC Authentication** - No long-lived credentials
- **Temporary credentials** - Automatically rotated
- **Least privilege** - IAM roles with minimal permissions
- **Secrets never exposed** in logs
- **Branch protection** prevents direct pushes
- **Required reviews** for production
- **Terraform state encrypted** in S3
- **State locking** prevents concurrent changes

## Cost Optimization

- Workflows run only on relevant changes
- Artifacts cleaned up after 90 days
- CloudFront cache reduces S3 requests
- Lifecycle policies reduce storage costs

## Support

For issues with CI/CD:
1. Check workflow logs
2. Review this documentation
3. Verify AWS permissions
4. Check GitHub Actions status page
