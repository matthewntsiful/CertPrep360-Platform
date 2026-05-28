# Bugfix Requirements Document

## Introduction

The production Terraform configuration (`prod/main.tf`) has drifted out of sync with the development configuration (`dev/main.tf`). Multiple Lambda functions are under-provisioned in prod, the AI content generation Lambda is missing critical features (self-invoke, S3 access, exam guides bucket), handler paths are inconsistent, and the `github_oidc` module hardcodes a value instead of using the `project_name` variable. Deploying to prod in this state would result in performance degradation, broken AI content generation, and potential runtime failures.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the `get_questions`, `get_user_analytics`, `get_dynamic_quiz`, `admin_manage_content`, `admin_analytics`, or `get_catalog` Lambda is deployed to prod THEN the system provisions them with the default 256 MB memory instead of the validated 512 MB

1.2 WHEN the `ai_generate_content` Lambda is deployed to prod THEN the system provisions it with only 512 MB memory and a 60-second timeout instead of the validated 1024 MB and 900-second timeout

1.3 WHEN the `ai_generate_content` Lambda executes in prod THEN the system does not grant self-invoke permission, preventing batch/recursive generation workflows

1.4 WHEN the `ai_generate_content` Lambda attempts to read exam guide PDFs in prod THEN the system fails because no S3 read bucket ARN is configured and the `EXAM_GUIDES_BUCKET` environment variable is missing

1.5 WHEN the `get_catalog`, `ai_generate_content`, `manage_session`, or `process_payment` Lambda is deployed to prod THEN the system uses subdirectory-prefixed handler paths (e.g., `get-catalog/index.handler`) instead of the flat `index.handler` path used in dev

1.6 WHEN the `github_oidc` module is deployed in prod THEN the system uses a hardcoded `"saa-exams"` string for `project_name` instead of referencing `var.project_name`

### Expected Behavior (Correct)

2.1 WHEN the `get_questions`, `get_user_analytics`, `get_dynamic_quiz`, `admin_manage_content`, `admin_analytics`, or `get_catalog` Lambda is deployed to prod THEN the system SHALL provision them with `memory_size = 512`

2.2 WHEN the `ai_generate_content` Lambda is deployed to prod THEN the system SHALL provision it with `memory_size = 1024` and `timeout = 900`

2.3 WHEN the `ai_generate_content` Lambda is deployed to prod THEN the system SHALL enable `enable_self_invoke = true` to support batch/recursive generation workflows

2.4 WHEN the `ai_generate_content` Lambda is deployed to prod THEN the system SHALL configure `s3_read_bucket_arns = ["arn:aws:s3:::certprep360-prod-assets"]` and set the `EXAM_GUIDES_BUCKET = "certprep360-prod-assets"` environment variable

2.5 WHEN the `get_catalog`, `ai_generate_content`, `manage_session`, or `process_payment` Lambda is deployed to prod THEN the system SHALL use the flat `index.handler` handler path consistent with dev

2.6 WHEN the `github_oidc` module is deployed in prod THEN the system SHALL use `var.project_name` instead of a hardcoded string

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the `submit_results` Lambda is deployed to prod THEN the system SHALL CONTINUE TO use default memory (256 MB) and timeout (30s) as configured in both dev and prod

3.2 WHEN any Lambda is deployed to prod THEN the system SHALL CONTINUE TO use the correct prod-specific `function_name` prefix (`CertPrep360-Prod-*`)

3.3 WHEN any Lambda is deployed to prod THEN the system SHALL CONTINUE TO reference the prod DynamoDB table (`CertPrep360-Prod-Main`) via `module.dynamodb.table_name`

3.4 WHEN the Cognito module is deployed to prod THEN the system SHALL CONTINUE TO use prod-specific callback/logout URLs without localhost entries

3.5 WHEN the S3, CloudFront, Route53, and monitoring modules are deployed to prod THEN the system SHALL CONTINUE TO use their current prod-specific configurations unchanged

3.6 WHEN the `process_payment` Lambda is deployed to prod THEN the system SHALL CONTINUE TO reference the prod SSM parameter path (`/certprep360/prod/payments/paystack_secret_key`)

3.7 WHEN the `get_catalog` Lambda is deployed to prod THEN the system SHALL CONTINUE TO set `ALLOWED_ORIGIN` to the prod domain (`https://aws-exams.matthewntsiful.com`)
