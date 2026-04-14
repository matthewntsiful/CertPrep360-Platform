# AWS360-Platform Restructure Summary

## Changes Made

### 1. Project Rename
- **Old:** `SAA-C03_Exam`
- **New:** `AWS360-Platform`
- **Reason:** Expanded scope from single SAA-C03 cert to all AWS certifications

### 2. Website Structure
**Before:**
```
website/public/
├── foundational/
├── associate/
├── professional/
├── specialty/
└── exams/  (old structure)
```

**After:**
```
website/public/
└── certifications/
    ├── foundational/
    ├── associate/
    ├── professional/
    └── specialty/
```

### 3. Archive Reorganization
**Before:**
```
archive/
├── scripts-legacy/
├── orphaned-exams/
└── retired-certs/
```

**After:**
```
archive/
├── legacy-builds/
├── deprecated-exams/
└── retired-certifications/
```

### 4. Removed Dead Code
- ❌ `website/SAA-C03_Complete_Exam_Suite/` (duplicate content)
- ❌ `website/public/exams/` (old structure)
- ❌ `infrastructure/terraform/modules/waf/` (unused, no WAF deployed)

### 5. Infrastructure Updates
- ✅ Terraform versions: Use `~> 6.0` for AWS, `~> 3.0` for random (major version only)
- ✅ Modules: Removed hardcoded provider versions (root controls versions)
- ✅ GitHub Actions: Use `latest` for Terraform version
- ✅ S3 buckets: Now match domain names (no random suffix)
- ✅ OIDC: Shared provider imported, per-environment IAM roles
- ✅ Removed all WAF references (commented code cleaned up)

### 6. Domain Strategy (Not Yet Applied)
**Current:**
- Dev: `aws-exams-dev.matthewntsiful.com`
- Prod: `aws-exams.matthewntsiful.com`

**Future Options:**
- `aws360.io` (AWS-focused)
- `cert360.io` (multi-cloud ready)

## Git Commits
1. `5b3c943` - refactor: restructure project - rename to AWS360-Platform and organize certifications
2. `ea1d7af` - chore: clean up dead code and reorganize archive

## Next Steps
1. ✅ Backend deployed (S3 state, DynamoDB, OIDC provider)
2. ⏳ Deploy dev environment
3. ⏳ Deploy prod environment
4. ⏳ Update GitHub secrets with outputs
5. ⏳ Test CI/CD pipeline
6. ⏳ Decide on final domain name

## Deployment Order
```bash
# 1. Backend (already done)
cd infrastructure/terraform/backend
AWS_PROFILE=Matthew_Cli terraform init
AWS_PROFILE=Matthew_Cli terraform apply

# 2. Dev
cd ../environments/dev
AWS_PROFILE=Matthew_Cli terraform init
AWS_PROFILE=Matthew_Cli terraform apply

# 3. Prod
cd ../prod
AWS_PROFILE=Matthew_Cli terraform init
AWS_PROFILE=Matthew_Cli terraform apply
```

## GitHub Secrets Required
Per environment (`dev` and `production`):
- `AWS_ROLE_ARN` - from `terraform output github_actions_role_arn`
- `S3_BUCKET_NAME` - from `terraform output s3_bucket_name`
- `CLOUDFRONT_DISTRIBUTION_ID` - from `terraform output cloudfront_distribution_id`
