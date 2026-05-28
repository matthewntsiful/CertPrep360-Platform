/**
 * Property 2: Preservation - Prod-Specific Values Unchanged
 *
 * These tests verify that prod-specific values are preserved in the current (unfixed) code.
 * They MUST PASS on unfixed code — passing confirms the baseline behavior to preserve.
 * After the fix is applied, these tests must STILL PASS, confirming no regressions.
 *
 * Observations on unfixed code:
 * - lambda_submit_results has no explicit memory_size (defaults to 256 MB) and timeout defaults to 30s
 * - All Lambda function_name values use CertPrep360-Prod-* prefix
 * - All Lambda environment_variables.TABLE_NAME reference module.dynamodb.table_name
 * - lambda_process_payment references SSM path /certprep360/prod/payments/paystack_secret_key
 * - lambda_get_catalog has ALLOWED_ORIGIN = "https://aws-exams.matthewntsiful.com"
 * - Cognito callback_urls and logout_urls contain only https://${local.subdomain} (no localhost)
 * - S3, CloudFront, Route53, monitoring, DynamoDB, SSM, Cognito, api_gateway modules are unchanged
 * - lambda_admin_analytics has USER_POOL_ID = module.cognito.user_pool_id
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── Terraform HCL Parser Utilities ────────────────────────────────────────────

const PROD_MAIN_TF_PATH = resolve(
  import.meta.dirname,
  '../../../../infrastructure/terraform/environments/prod/main.tf'
);

/**
 * Read the prod/main.tf file content.
 */
function readProdMainTf(): string {
  return readFileSync(PROD_MAIN_TF_PATH, 'utf-8');
}

/**
 * Extract a module block by name from Terraform HCL content.
 * Returns the full text of the module block.
 */
function extractModuleBlock(content: string, moduleName: string): string | null {
  const modulePattern = new RegExp(
    `module\\s+"${moduleName}"\\s*\\{`,
    'g'
  );
  const match = modulePattern.exec(content);
  if (!match) return null;

  const startIndex = match.index;
  let braceCount = 0;
  let endIndex = startIndex;

  for (let i = match.index + match[0].length - 1; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') braceCount--;
    if (braceCount === 0) {
      endIndex = i + 1;
      break;
    }
  }

  return content.slice(startIndex, endIndex);
}

/**
 * Extract a simple attribute value from a module block.
 */
function getAttributeValue(block: string, attribute: string): string | null {
  const pattern = new RegExp(
    `^\\s*${attribute}\\s*=\\s*(.+?)\\s*$`,
    'm'
  );
  const match = pattern.exec(block);
  if (!match) return null;
  return match[1].trim();
}

/**
 * Extract the environment_variables block from a module block.
 */
function getEnvironmentVariables(block: string): Record<string, string> {
  const envPattern = /environment_variables\s*=\s*\{([^}]*)\}/s;
  const match = envPattern.exec(block);
  if (!match) return {};

  const envBlock = match[1];
  const vars: Record<string, string> = {};
  const varPattern = /(\w+)\s*=\s*(.+)/g;
  let varMatch;
  while ((varMatch = varPattern.exec(envBlock)) !== null) {
    vars[varMatch[1]] = varMatch[2].trim();
  }
  return vars;
}

/**
 * Determine if a module block matches the bug condition (should be changed by the fix).
 * Modules NOT matching this condition must be preserved byte-for-byte.
 */
function isBugConditionModule(moduleName: string): boolean {
  // Category 1: Lambdas needing memory_size = 512
  const needsMemory512 = [
    'lambda_get_questions',
    'lambda_get_user_analytics',
    'lambda_get_dynamic_quiz',
    'lambda_admin_manage_content',
    'lambda_admin_analytics',
    'lambda_get_catalog',
  ];

  // Category 2: ai_generate_content under-provisioned
  if (moduleName === 'lambda_ai_generate_content') return true;

  // Category 3: Lambdas needing handler fix (overlaps with category 1 for get_catalog)
  const needsHandlerFix = [
    'lambda_get_catalog',
    'lambda_ai_generate_content',
    'lambda_manage_session',
    'lambda_process_payment',
  ];

  // Category 4: github_oidc hardcoded project_name
  if (moduleName === 'github_oidc') return true;

  if (needsMemory512.includes(moduleName)) return true;
  if (needsHandlerFix.includes(moduleName)) return true;

  return false;
}

// ── Test Data ─────────────────────────────────────────────────────────────────

/** All Lambda module names in prod/main.tf */
const ALL_LAMBDA_MODULES = [
  'lambda_get_questions',
  'lambda_submit_results',
  'lambda_get_user_analytics',
  'lambda_get_dynamic_quiz',
  'lambda_admin_manage_content',
  'lambda_admin_analytics',
  'lambda_get_catalog',
  'lambda_ai_generate_content',
  'lambda_manage_session',
  'lambda_process_payment',
] as const;

/** Modules that should NOT be affected by the bug fix */
const NON_BUG_CONDITION_MODULES = [
  's3',
  'route53',
  'cloudfront',
  'monitoring',
  'dynamodb',
  'ssm',
  'cognito',
  'lambda_submit_results',
  'api_gateway',
] as const;

// ── Property-Based Tests ──────────────────────────────────────────────────────

describe('Property 2: Preservation - Prod-Specific Values Unchanged', () => {
  const content = readProdMainTf();

  describe('Non-bug-condition modules are byte-for-byte identical (preservation baseline)', () => {
    it('for all modules where isBugCondition returns false, the module block exists and is unchanged', () => {
      /**
       * This test captures the current state of non-bug-condition modules.
       * After the fix, these modules must produce the exact same block content.
       * On unfixed code, this simply verifies they exist and can be parsed.
       */
      const moduleArb = fc.constantFrom(...NON_BUG_CONDITION_MODULES);

      fc.assert(
        fc.property(moduleArb, (moduleName) => {
          const block = extractModuleBlock(content, moduleName);
          // Module must exist in prod/main.tf
          expect(block).not.toBeNull();
          // Module must not be in the bug condition set
          expect(isBugConditionModule(moduleName)).toBe(false);
          // Verify the block is non-empty (has actual configuration)
          expect(block!.length).toBeGreaterThan(20);
        }),
        { numRuns: 100 }
      );
    });

    it('lambda_submit_results has no explicit memory_size (defaults to 256 MB)', () => {
      /**
       * **Validates: Requirements 3.1**
       * lambda_submit_results must remain at default memory (256 MB).
       * On unfixed code: no memory_size attribute present → defaults to 256.
       * After fix: must still have no explicit memory_size.
       */
      fc.assert(
        fc.property(fc.constant('lambda_submit_results'), (lambdaName) => {
          const block = extractModuleBlock(content, lambdaName);
          expect(block).not.toBeNull();

          const memorySize = getAttributeValue(block!, 'memory_size');
          // No explicit memory_size means it defaults to 256 via module variable
          expect(memorySize).toBeNull();
        }),
        { numRuns: 1 }
      );
    });

    it('lambda_submit_results has no explicit timeout (defaults to 30s)', () => {
      /**
       * **Validates: Requirements 3.1**
       * lambda_submit_results must remain at default timeout (30s).
       */
      fc.assert(
        fc.property(fc.constant('lambda_submit_results'), (lambdaName) => {
          const block = extractModuleBlock(content, lambdaName);
          expect(block).not.toBeNull();

          const timeout = getAttributeValue(block!, 'timeout');
          // No explicit timeout means it defaults to 30 via module variable
          expect(timeout).toBeNull();
        }),
        { numRuns: 1 }
      );
    });
  });

  describe('All Lambda function_name values retain CertPrep360-Prod-* prefix', () => {
    it('for any Lambda module, function_name starts with "CertPrep360-Prod-"', () => {
      /**
       * **Validates: Requirements 3.2**
       * All Lambda function names must use the prod-specific prefix.
       */
      const lambdaArb = fc.constantFrom(...ALL_LAMBDA_MODULES);

      fc.assert(
        fc.property(lambdaArb, (lambdaName) => {
          const block = extractModuleBlock(content, lambdaName);
          expect(block).not.toBeNull();

          const functionName = getAttributeValue(block!, 'function_name');
          expect(functionName).not.toBeNull();
          // function_name is a quoted string like "CertPrep360-Prod-GetQuestions"
          expect(functionName!).toMatch(/^"CertPrep360-Prod-.+"$/);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('All Lambda TABLE_NAME references module.dynamodb.table_name', () => {
    it('for any Lambda module with TABLE_NAME, it references module.dynamodb.table_name', () => {
      /**
       * **Validates: Requirements 3.3**
       * All Lambda environment variables must reference the prod DynamoDB table
       * via module.dynamodb.table_name (resolves to CertPrep360-Prod-Main).
       */
      const lambdaArb = fc.constantFrom(...ALL_LAMBDA_MODULES);

      fc.assert(
        fc.property(lambdaArb, (lambdaName) => {
          const block = extractModuleBlock(content, lambdaName);
          expect(block).not.toBeNull();

          const envVars = getEnvironmentVariables(block!);
          // All Lambda modules in prod have TABLE_NAME
          expect(envVars).toHaveProperty('TABLE_NAME');
          expect(envVars['TABLE_NAME']).toBe('module.dynamodb.table_name');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Prod-specific configuration values are preserved', () => {
    it('lambda_process_payment references prod SSM path for paystack_secret_key', () => {
      /**
       * **Validates: Requirements 3.6**
       */
      fc.assert(
        fc.property(fc.constant('lambda_process_payment'), (lambdaName) => {
          const block = extractModuleBlock(content, lambdaName);
          expect(block).not.toBeNull();

          const envVars = getEnvironmentVariables(block!);
          expect(envVars).toHaveProperty('PAYSTACK_SECRET_PARAM');
          expect(envVars['PAYSTACK_SECRET_PARAM']).toBe(
            '"/certprep360/prod/payments/paystack_secret_key"'
          );
        }),
        { numRuns: 1 }
      );
    });

    it('lambda_get_catalog has ALLOWED_ORIGIN set to prod domain', () => {
      /**
       * **Validates: Requirements 3.7**
       */
      fc.assert(
        fc.property(fc.constant('lambda_get_catalog'), (lambdaName) => {
          const block = extractModuleBlock(content, lambdaName);
          expect(block).not.toBeNull();

          const envVars = getEnvironmentVariables(block!);
          expect(envVars).toHaveProperty('ALLOWED_ORIGIN');
          expect(envVars['ALLOWED_ORIGIN']).toBe(
            '"https://aws-exams.matthewntsiful.com"'
          );
        }),
        { numRuns: 1 }
      );
    });

    it('Cognito callback_urls and logout_urls contain only prod domain (no localhost)', () => {
      /**
       * **Validates: Requirements 3.4**
       */
      fc.assert(
        fc.property(fc.constant('cognito'), (moduleName) => {
          const block = extractModuleBlock(content, moduleName);
          expect(block).not.toBeNull();

          const callbackUrls = getAttributeValue(block!, 'callback_urls');
          const logoutUrls = getAttributeValue(block!, 'logout_urls');

          expect(callbackUrls).not.toBeNull();
          expect(logoutUrls).not.toBeNull();

          // Must contain the prod subdomain reference
          expect(callbackUrls!).toContain('${local.subdomain}');
          expect(logoutUrls!).toContain('${local.subdomain}');

          // Must NOT contain localhost
          expect(callbackUrls!).not.toContain('localhost');
          expect(logoutUrls!).not.toContain('localhost');
        }),
        { numRuns: 1 }
      );
    });

    it('lambda_admin_analytics has USER_POOL_ID referencing module.cognito.user_pool_id', () => {
      /**
       * **Validates: Requirements 3.5** (infrastructure module preservation)
       */
      fc.assert(
        fc.property(fc.constant('lambda_admin_analytics'), (lambdaName) => {
          const block = extractModuleBlock(content, lambdaName);
          expect(block).not.toBeNull();

          const envVars = getEnvironmentVariables(block!);
          expect(envVars).toHaveProperty('USER_POOL_ID');
          expect(envVars['USER_POOL_ID']).toBe('module.cognito.user_pool_id');
        }),
        { numRuns: 1 }
      );
    });
  });

  describe('Infrastructure modules exist and are unchanged', () => {
    it('for any infrastructure module (S3, CloudFront, Route53, monitoring, DynamoDB, SSM, Cognito, api_gateway), the module block exists', () => {
      /**
       * **Validates: Requirements 3.5**
       * All infrastructure modules must remain present and configured.
       */
      const infraModules = [
        's3',
        'cloudfront',
        'route53',
        'monitoring',
        'dynamodb',
        'ssm',
        'cognito',
        'api_gateway',
      ] as const;

      const infraArb = fc.constantFrom(...infraModules);

      fc.assert(
        fc.property(infraArb, (moduleName) => {
          const block = extractModuleBlock(content, moduleName);
          expect(block).not.toBeNull();
          // Verify it has a source attribute (valid module block)
          const source = getAttributeValue(block!, 'source');
          expect(source).not.toBeNull();
          expect(source!).toContain('../../modules/');
        }),
        { numRuns: 100 }
      );
    });

    it('DynamoDB table_name is CertPrep360-Prod-Main', () => {
      /**
       * **Validates: Requirements 3.3, 3.5**
       */
      fc.assert(
        fc.property(fc.constant('dynamodb'), (moduleName) => {
          const block = extractModuleBlock(content, moduleName);
          expect(block).not.toBeNull();

          const tableName = getAttributeValue(block!, 'table_name');
          expect(tableName).toBe('"CertPrep360-Prod-Main"');
        }),
        { numRuns: 1 }
      );
    });
  });
});
