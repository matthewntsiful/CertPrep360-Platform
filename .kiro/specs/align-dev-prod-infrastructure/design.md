# Align Dev/Prod Infrastructure Bugfix Design

## Overview

The production Terraform configuration (`prod/main.tf`) has drifted from the validated development configuration (`dev/main.tf`). Six Lambda functions are under-provisioned (256 MB instead of 512 MB), the AI content generation Lambda is missing critical capabilities (higher memory, extended timeout, self-invoke, S3 access), four Lambda handlers use incorrect subdirectory-prefixed paths, and the `github_oidc` module hardcodes a project name instead of using a variable. The fix involves updating `prod/main.tf` to match the dev configuration patterns while preserving prod-specific values (domain names, table names, SSM paths).

## Glossary

- **Bug_Condition (C)**: A Terraform attribute in `prod/main.tf` that differs from the validated `dev/main.tf` configuration in a way that causes under-provisioning, missing capabilities, or inconsistency
- **Property (P)**: The prod configuration matches dev for resource sizing, handler paths, and variable usage while retaining prod-specific identifiers
- **Preservation**: Prod-specific values (function names, DynamoDB table, domain URLs, SSM paths, Cognito config) that must remain unchanged
- **prod/main.tf**: The production Terraform environment file at `infrastructure/terraform/environments/prod/main.tf`
- **dev/main.tf**: The development Terraform environment file at `infrastructure/terraform/environments/dev/main.tf` — the source of truth for resource configuration
- **Lambda module**: The reusable Terraform module at `infrastructure/terraform/modules/lambda/` that provisions AWS Lambda functions

## Bug Details

### Bug Condition

The bug manifests when `prod/main.tf` is applied to AWS. Lambda functions are provisioned with insufficient memory, incorrect handler paths, missing IAM permissions, and missing environment variables compared to the validated dev configuration. The `github_oidc` module uses a hardcoded string instead of a variable, creating a maintenance risk.

**Formal Specification:**
```
FUNCTION isBugCondition(module_block)
  INPUT: module_block of type TerraformModuleBlock
  OUTPUT: boolean

  // Category 1: Missing memory_size = 512
  IF module_block.name IN ['lambda_get_questions', 'lambda_get_user_analytics',
     'lambda_get_dynamic_quiz', 'lambda_admin_manage_content',
     'lambda_admin_analytics', 'lambda_get_catalog']
     AND module_block.memory_size != 512
  THEN RETURN true

  // Category 2: ai_generate_content under-provisioned
  IF module_block.name == 'lambda_ai_generate_content'
     AND (module_block.memory_size != 1024
          OR module_block.timeout != 900
          OR module_block.enable_self_invoke != true
          OR module_block.s3_read_bucket_arns IS EMPTY
          OR 'EXAM_GUIDES_BUCKET' NOT IN module_block.environment_variables)
  THEN RETURN true

  // Category 3: Incorrect handler paths
  IF module_block.name IN ['lambda_get_catalog', 'lambda_ai_generate_content',
     'lambda_manage_session', 'lambda_process_payment']
     AND module_block.handler != 'index.handler'
  THEN RETURN true

  // Category 4: Hardcoded project_name in github_oidc
  IF module_block.name == 'github_oidc'
     AND module_block.project_name == "saa-exams" (literal string, not var.project_name)
  THEN RETURN true

  RETURN false
END FUNCTION
```

### Examples

- `lambda_get_questions` in prod has no `memory_size` attribute → defaults to 256 MB. Expected: `memory_size = 512`
- `lambda_ai_generate_content` in prod has `timeout = 60`, `memory_size = 512`, no `enable_self_invoke`, no `s3_read_bucket_arns`, no `EXAM_GUIDES_BUCKET`. Expected: `timeout = 900`, `memory_size = 1024`, `enable_self_invoke = true`, `s3_read_bucket_arns = ["arn:aws:s3:::certprep360-prod-assets"]`, `EXAM_GUIDES_BUCKET = "certprep360-prod-assets"`
- `lambda_get_catalog` in prod has `handler = "get-catalog/index.handler"`. Expected: `handler = "index.handler"`
- `github_oidc` in prod has `project_name = "saa-exams"`. Expected: `project_name = var.project_name`

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All Lambda `function_name` values must retain the `CertPrep360-Prod-*` prefix
- All Lambda `environment_variables.TABLE_NAME` must continue referencing `module.dynamodb.table_name` (resolves to `CertPrep360-Prod-Main`)
- The `lambda_submit_results` module must remain at default memory (256 MB) and timeout (30s) — it matches dev already
- The `lambda_process_payment` SSM parameter path must remain `/certprep360/prod/payments/paystack_secret_key`
- The `lambda_get_catalog` ALLOWED_ORIGIN must remain `https://aws-exams.matthewntsiful.com`
- Cognito callback/logout URLs must remain prod-only (no localhost)
- S3, CloudFront, Route53, monitoring, and DynamoDB modules must remain unchanged
- The `lambda_admin_analytics` USER_POOL_ID environment variable must continue referencing `module.cognito.user_pool_id`

**Scope:**
All modules and attributes NOT listed in the bug condition should be completely unaffected by this fix. This includes:
- Infrastructure modules (S3, CloudFront, Route53, monitoring, DynamoDB, SSM, Cognito)
- The `lambda_submit_results` module (already matches dev)
- Prod-specific identifiers in all Lambda modules (function names, table references, domain URLs)
- The `api_gateway` module configuration

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Incremental Development Without Backport**: Features were developed and validated in dev (memory tuning, AI capabilities, handler path normalization) but never propagated to prod. This is the primary cause — the prod file was written at an earlier point in time and not updated as dev evolved.

2. **Handler Path Refactoring Incomplete**: The Lambda build/packaging was refactored to use flat `index.handler` paths (removing subdirectory prefixes), but only dev was updated. Prod still references the old subdirectory-prefixed paths.

3. **AI Feature Addition Without Prod Parity**: The `ai_generate_content` Lambda received significant capability upgrades in dev (self-invoke for batch processing, S3 access for exam guide PDFs, higher memory/timeout for PDF parsing) that were never applied to prod.

4. **Copy-Paste with Hardcoded Value**: The `github_oidc` module in prod was likely copied from an earlier version that used a literal string before the `var.project_name` variable was introduced.

## Correctness Properties

Property 1: Bug Condition - Prod Lambda Configuration Matches Dev

_For any_ Lambda module block in `prod/main.tf` where the bug condition holds (isBugCondition returns true), the fixed configuration SHALL set the attribute values to match the validated dev configuration: `memory_size = 512` for the six standard Lambdas, `memory_size = 1024` / `timeout = 900` / `enable_self_invoke = true` / S3 access / EXAM_GUIDES_BUCKET for ai_generate_content, `handler = "index.handler"` for the four refactored Lambdas, and `var.project_name` for github_oidc.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: Preservation - Prod-Specific Values Unchanged

_For any_ module block or attribute in `prod/main.tf` where the bug condition does NOT hold (isBugCondition returns false), the fixed configuration SHALL produce the same Terraform plan output as the original configuration, preserving all prod-specific function names, DynamoDB references, domain URLs, SSM paths, Cognito settings, and infrastructure module configurations.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `infrastructure/terraform/environments/prod/main.tf`

**Specific Changes**:

1. **Add `memory_size = 512` to six Lambda modules**: Add the `memory_size = 512` attribute to `lambda_get_questions`, `lambda_get_user_analytics`, `lambda_get_dynamic_quiz`, `lambda_admin_manage_content`, `lambda_admin_analytics`, and `lambda_get_catalog`.

2. **Update `lambda_ai_generate_content` to full dev parity**:
   - Change `memory_size` from `512` to `1024`
   - Change `timeout` from `60` to `900`
   - Add `enable_self_invoke = true`
   - Add `s3_read_bucket_arns = ["arn:aws:s3:::certprep360-prod-assets"]`
   - Add `EXAM_GUIDES_BUCKET = "certprep360-prod-assets"` to environment_variables

3. **Fix handler paths to flat `index.handler`**:
   - `lambda_get_catalog`: change `"get-catalog/index.handler"` → `"index.handler"`
   - `lambda_ai_generate_content`: change `"ai-generate-content/index.handler"` → `"index.handler"`
   - `lambda_manage_session`: change `"manage-session/index.handler"` → `"index.handler"`
   - `lambda_process_payment`: change `"process-payment/index.handler"` → `"index.handler"`

4. **Replace hardcoded string in `github_oidc`**:
   - Change `project_name = "saa-exams"` → `project_name = var.project_name`

5. **No changes to other modules**: S3, CloudFront, Route53, monitoring, DynamoDB, SSM, Cognito, api_gateway, and `lambda_submit_results` remain untouched.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the configuration drift on unfixed code, then verify the fix produces the correct Terraform plan and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the configuration drift BEFORE implementing the fix. Confirm or refute the root cause analysis by comparing prod and dev configurations.

**Test Plan**: Run `terraform plan` on the unfixed prod configuration and compare attribute values against dev. Parse the Terraform files to identify discrepancies programmatically.

**Test Cases**:
1. **Memory Size Drift Test**: Parse `prod/main.tf` and verify that `lambda_get_questions`, `lambda_get_user_analytics`, `lambda_get_dynamic_quiz`, `lambda_admin_manage_content`, `lambda_admin_analytics`, `lambda_get_catalog` are missing `memory_size = 512` (will fail on unfixed code)
2. **AI Lambda Under-Provisioning Test**: Verify `lambda_ai_generate_content` has `timeout = 60` and `memory_size = 512` instead of `900`/`1024` (will fail on unfixed code)
3. **Handler Path Inconsistency Test**: Verify `lambda_get_catalog`, `lambda_ai_generate_content`, `lambda_manage_session`, `lambda_process_payment` use subdirectory-prefixed handlers (will fail on unfixed code)
4. **Hardcoded Variable Test**: Verify `github_oidc` uses literal `"saa-exams"` instead of `var.project_name` (will fail on unfixed code)

**Expected Counterexamples**:
- Six Lambda modules missing explicit `memory_size` attribute (defaulting to 256)
- `ai_generate_content` missing `enable_self_invoke`, `s3_read_bucket_arns`, and `EXAM_GUIDES_BUCKET`
- Four Lambda modules with subdirectory-prefixed handler paths
- `github_oidc` with hardcoded project name string

### Fix Checking

**Goal**: Verify that for all module blocks where the bug condition holds, the fixed configuration produces the expected attribute values.

**Pseudocode:**
```
FOR ALL module_block WHERE isBugCondition(module_block) DO
  fixed_block := parse(prod_main_tf_fixed, module_block.name)
  ASSERT expectedConfiguration(fixed_block)
END FOR
```

Where `expectedConfiguration` checks:
- memory_size matches dev value (512 or 1024)
- timeout matches dev value (900 for ai_generate_content)
- handler == "index.handler" for affected modules
- enable_self_invoke == true for ai_generate_content
- s3_read_bucket_arns contains prod bucket ARN
- EXAM_GUIDES_BUCKET == "certprep360-prod-assets"
- github_oidc.project_name == var.project_name

### Preservation Checking

**Goal**: Verify that for all module blocks where the bug condition does NOT hold, the fixed configuration produces the same Terraform plan as the original.

**Pseudocode:**
```
FOR ALL module_block WHERE NOT isBugCondition(module_block) DO
  ASSERT parse(prod_main_tf_original, module_block.name) == parse(prod_main_tf_fixed, module_block.name)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It can generate many attribute combinations to verify no unintended changes
- It catches accidental modifications to adjacent lines or modules
- It provides strong guarantees that non-buggy modules remain identical

**Test Plan**: Capture the original configuration for all non-affected modules, apply the fix, then verify those modules are byte-for-byte identical.

**Test Cases**:
1. **Submit Results Preservation**: Verify `lambda_submit_results` remains unchanged (no memory_size added, handler stays `index.handler`)
2. **Infrastructure Module Preservation**: Verify S3, CloudFront, Route53, monitoring, DynamoDB, SSM, Cognito modules are unchanged
3. **Prod Identifier Preservation**: Verify all `CertPrep360-Prod-*` function names, prod DynamoDB table name, prod domain URLs remain unchanged
4. **API Gateway Preservation**: Verify the `api_gateway` module configuration is unchanged

### Unit Tests

- Parse fixed `prod/main.tf` and assert each affected Lambda has correct `memory_size`
- Assert `lambda_ai_generate_content` has all required attributes (memory, timeout, self-invoke, S3, env var)
- Assert all four refactored Lambdas use `handler = "index.handler"`
- Assert `github_oidc` uses `var.project_name` reference

### Property-Based Tests

- Generate random subsets of Lambda module names and verify memory_size is correctly set (512 for standard, 1024 for AI, default for submit_results)
- Generate random module attribute checks and verify prod-specific values (function names, table references) are preserved across all modules
- Verify that for any Lambda module, the handler path is always `"index.handler"` (no subdirectory prefixes remain)

### Integration Tests

- Run `terraform validate` on the fixed `prod/main.tf` to confirm syntactic correctness
- Run `terraform plan` (with appropriate backend config) to verify no unexpected resource recreations
- Compare `terraform plan` output to confirm only the intended attribute changes are proposed
