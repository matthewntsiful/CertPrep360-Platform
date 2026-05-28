# Implementation Plan

## Overview

Fix the production Terraform configuration (`prod/main.tf`) to align with the validated development configuration. This involves adding memory_size to six Lambda modules, updating the AI content generation Lambda to full dev parity, fixing handler paths, and replacing a hardcoded string with a variable reference.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Prod Lambda Configuration Drift from Dev
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the configuration drift exists in `prod/main.tf`
  - **Scoped PBT Approach**: Parse `prod/main.tf` and assert expected attribute values for each affected module block
  - Test that `lambda_get_questions`, `lambda_get_user_analytics`, `lambda_get_dynamic_quiz`, `lambda_admin_manage_content`, `lambda_admin_analytics`, `lambda_get_catalog` each have `memory_size = 512` (from Bug Condition Category 1 in design)
  - Test that `lambda_ai_generate_content` has `memory_size = 1024`, `timeout = 900`, `enable_self_invoke = true`, `s3_read_bucket_arns = ["arn:aws:s3:::certprep360-prod-assets"]`, and `EXAM_GUIDES_BUCKET = "certprep360-prod-assets"` in environment_variables (from Bug Condition Category 2)
  - Test that `lambda_get_catalog`, `lambda_ai_generate_content`, `lambda_manage_session`, `lambda_process_payment` each have `handler = "index.handler"` (from Bug Condition Category 3)
  - Test that `github_oidc` has `project_name = var.project_name` (not a hardcoded literal string) (from Bug Condition Category 4)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the configuration drift exists)
  - Document counterexamples found: six Lambdas missing `memory_size`, ai_generate_content under-provisioned, four Lambdas with subdirectory-prefixed handlers, github_oidc with hardcoded string
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Prod-Specific Values Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `lambda_submit_results` has no explicit `memory_size` (defaults to 256 MB) and `timeout` defaults to 30s on unfixed code
  - Observe: All Lambda `function_name` values use `CertPrep360-Prod-*` prefix on unfixed code
  - Observe: All Lambda `environment_variables.TABLE_NAME` reference `module.dynamodb.table_name` on unfixed code
  - Observe: `lambda_process_payment` references SSM path `/certprep360/prod/payments/paystack_secret_key` on unfixed code
  - Observe: `lambda_get_catalog` has `ALLOWED_ORIGIN = "https://aws-exams.matthewntsiful.com"` on unfixed code
  - Observe: Cognito `callback_urls` and `logout_urls` contain only `https://${local.subdomain}` (no localhost) on unfixed code
  - Observe: S3, CloudFront, Route53, monitoring, DynamoDB, SSM, Cognito, api_gateway modules are unchanged on unfixed code
  - Observe: `lambda_admin_analytics` has `USER_POOL_ID = module.cognito.user_pool_id` on unfixed code
  - Write property-based test: for all module blocks where `isBugCondition` returns false, the configuration is byte-for-byte identical between original and fixed versions (from Preservation Requirements in design)
  - Write property-based test: for all Lambda modules, `function_name` retains `CertPrep360-Prod-*` prefix
  - Write property-based test: for all Lambda modules, `TABLE_NAME` references `module.dynamodb.table_name`
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix prod/main.tf to align with dev configuration

  - [x] 3.1 Add `memory_size = 512` to six Lambda modules
    - Add `memory_size = 512` to `lambda_get_questions`
    - Add `memory_size = 512` to `lambda_get_user_analytics`
    - Add `memory_size = 512` to `lambda_get_dynamic_quiz`
    - Add `memory_size = 512` to `lambda_admin_manage_content`
    - Add `memory_size = 512` to `lambda_admin_analytics`
    - Add `memory_size = 512` to `lambda_get_catalog`
    - _Bug_Condition: isBugCondition(module_block) where module_block.name IN [lambda_get_questions, lambda_get_user_analytics, lambda_get_dynamic_quiz, lambda_admin_manage_content, lambda_admin_analytics, lambda_get_catalog] AND module_block.memory_size != 512_
    - _Expected_Behavior: Each module block has memory_size = 512 matching dev configuration_
    - _Preservation: lambda_submit_results remains at default 256 MB; all function_name prefixes unchanged_
    - _Requirements: 2.1_

  - [x] 3.2 Update `lambda_ai_generate_content` to full dev parity
    - Change `memory_size` from `512` to `1024`
    - Change `timeout` from `60` to `900`
    - Add `enable_self_invoke = true`
    - Add `s3_read_bucket_arns = ["arn:aws:s3:::certprep360-prod-assets"]`
    - Add `EXAM_GUIDES_BUCKET = "certprep360-prod-assets"` to environment_variables
    - _Bug_Condition: isBugCondition(module_block) where module_block.name == 'lambda_ai_generate_content' AND (memory_size != 1024 OR timeout != 900 OR enable_self_invoke != true OR s3_read_bucket_arns IS EMPTY OR 'EXAM_GUIDES_BUCKET' NOT IN environment_variables)_
    - _Expected_Behavior: memory_size = 1024, timeout = 900, enable_self_invoke = true, s3_read_bucket_arns = ["arn:aws:s3:::certprep360-prod-assets"], EXAM_GUIDES_BUCKET = "certprep360-prod-assets"_
    - _Preservation: function_name remains CertPrep360-Prod-AIGenerateContent; TABLE_NAME still references module.dynamodb.table_name; enable_bedrock_access remains true_
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 3.3 Fix handler paths to flat `index.handler`
    - Change `lambda_get_catalog` handler from `"get-catalog/index.handler"` to `"index.handler"`
    - Change `lambda_ai_generate_content` handler from `"ai-generate-content/index.handler"` to `"index.handler"`
    - Change `lambda_manage_session` handler from `"manage-session/index.handler"` to `"index.handler"`
    - Change `lambda_process_payment` handler from `"process-payment/index.handler"` to `"index.handler"`
    - _Bug_Condition: isBugCondition(module_block) where module_block.name IN [lambda_get_catalog, lambda_ai_generate_content, lambda_manage_session, lambda_process_payment] AND module_block.handler != 'index.handler'_
    - _Expected_Behavior: All four modules have handler = "index.handler" consistent with dev_
    - _Preservation: All other Lambda modules already use "index.handler" and remain unchanged_
    - _Requirements: 2.5_

  - [x] 3.4 Replace hardcoded `"saa-exams"` with `var.project_name` in github_oidc
    - Change `project_name = "saa-exams"` to `project_name = var.project_name`
    - _Bug_Condition: isBugCondition(module_block) where module_block.name == 'github_oidc' AND module_block.project_name == "saa-exams" (literal string)_
    - _Expected_Behavior: project_name = var.project_name (variable reference)_
    - _Preservation: All other github_oidc attributes (environment, github_org, github_repo, s3_bucket_arn, cloudfront_distribution_arn, tags) remain unchanged_
    - _Requirements: 2.6_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Prod Lambda Configuration Matches Dev
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (correct memory, timeout, handler, variable usage)
    - When this test passes, it confirms the expected behavior is satisfied for all bug condition categories
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms all configuration drift is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Prod-Specific Values Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions to prod-specific values)
    - Confirm all prod-specific identifiers, domain URLs, SSM paths, and infrastructure modules remain unchanged

- [x] 4. Checkpoint - Validate and ensure all tests pass
  - Run `terraform validate` in the `infrastructure/terraform/environments/prod/` directory to confirm syntactic correctness
  - Ensure all property-based tests pass (both bug condition and preservation)
  - Verify no unexpected changes to non-affected modules
  - Ask the user if questions arise

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "2"],
      "description": "Write exploration and preservation tests BEFORE implementing the fix"
    },
    {
      "wave": 2,
      "tasks": ["3.1", "3.2", "3.3", "3.4"],
      "description": "Implement all fix changes to prod/main.tf"
    },
    {
      "wave": 3,
      "tasks": ["3.5", "3.6"],
      "description": "Verify exploration test passes and preservation tests still pass after fix"
    },
    {
      "wave": 4,
      "tasks": ["4"],
      "description": "Final validation checkpoint with terraform validate"
    }
  ]
}
```

## Notes

- The target file is `infrastructure/terraform/environments/prod/main.tf`
- The dev configuration at `infrastructure/terraform/environments/dev/main.tf` serves as the source of truth
- The Lambda module defaults are defined in `infrastructure/terraform/modules/lambda/variables.tf` (memory_size defaults to 256, timeout defaults to 30)
- Property-based tests should parse the Terraform HCL file to validate attribute values programmatically
- `terraform validate` requires proper provider/backend configuration; use `-backend=false` if state backend is unavailable locally
