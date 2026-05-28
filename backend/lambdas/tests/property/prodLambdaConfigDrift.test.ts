/**
 * Property 1: Bug Condition - Prod Lambda Configuration Drift from Dev
 *
 * This test encodes the EXPECTED (correct) behavior for prod/main.tf.
 * It MUST FAIL on unfixed code — failure confirms the configuration drift exists.
 * Once the fix is applied, this test will PASS, confirming the drift is resolved.
 *
 * Bug Condition Categories:
 * 1. Six Lambdas missing memory_size = 512
 * 2. ai_generate_content under-provisioned (memory, timeout, self-invoke, S3, env var)
 * 3. Four Lambdas with subdirectory-prefixed handlers instead of "index.handler"
 * 4. github_oidc with hardcoded "saa-exams" instead of var.project_name
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
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
  // Match module "name" { ... } with balanced braces
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
 * Handles: attribute = value, attribute = "string", attribute = number
 */
function getAttributeValue(block: string, attribute: string): string | null {
  // Match attribute = value (handles strings, numbers, booleans, variable references)
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
 * Check if a module block contains a specific attribute with a list value.
 */
function getListAttribute(block: string, attribute: string): string[] | null {
  const pattern = new RegExp(
    `${attribute}\\s*=\\s*\\[([^\\]]*)]`,
    's'
  );
  const match = pattern.exec(block);
  if (!match) return null;

  const items = match[1]
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
  return items;
}

// ── Test Data ─────────────────────────────────────────────────────────────────

/** Category 1: Lambdas that should have memory_size = 512 */
const LAMBDAS_REQUIRING_512MB = [
  'lambda_get_questions',
  'lambda_get_user_analytics',
  'lambda_get_dynamic_quiz',
  'lambda_admin_manage_content',
  'lambda_admin_analytics',
  'lambda_get_catalog',
] as const;

/** Category 3: Lambdas that should have handler = "index.handler" */
const LAMBDAS_REQUIRING_FLAT_HANDLER = [
  'lambda_get_catalog',
  'lambda_ai_generate_content',
  'lambda_manage_session',
  'lambda_process_payment',
] as const;

// ── Property-Based Tests ──────────────────────────────────────────────────────

describe('Property 1: Bug Condition - Prod Lambda Configuration Drift from Dev', () => {
  const content = readProdMainTf();

  describe('Category 1: Six Lambdas must have memory_size = 512', () => {
    it('for any Lambda in the 512MB set, memory_size must equal 512', () => {
      const lambdaArb = fc.constantFrom(...LAMBDAS_REQUIRING_512MB);

      fc.assert(
        fc.property(lambdaArb, (lambdaName) => {
          const block = extractModuleBlock(content, lambdaName);
          expect(block).not.toBeNull();

          const memorySize = getAttributeValue(block!, 'memory_size');
          // The expected behavior: memory_size must be explicitly set to 512
          expect(memorySize).toBe('512');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Category 2: lambda_ai_generate_content must have full dev parity', () => {
    it('ai_generate_content must have memory_size = 1024', () => {
      fc.assert(
        fc.property(fc.constant('lambda_ai_generate_content'), (lambdaName) => {
          const block = extractModuleBlock(content, lambdaName);
          expect(block).not.toBeNull();

          const memorySize = getAttributeValue(block!, 'memory_size');
          expect(memorySize).toBe('1024');
        }),
        { numRuns: 1 }
      );
    });

    it('ai_generate_content must have timeout = 900', () => {
      fc.assert(
        fc.property(fc.constant('lambda_ai_generate_content'), (lambdaName) => {
          const block = extractModuleBlock(content, lambdaName);
          expect(block).not.toBeNull();

          const timeout = getAttributeValue(block!, 'timeout');
          expect(timeout).toBe('900');
        }),
        { numRuns: 1 }
      );
    });

    it('ai_generate_content must have enable_self_invoke = true', () => {
      fc.assert(
        fc.property(fc.constant('lambda_ai_generate_content'), (lambdaName) => {
          const block = extractModuleBlock(content, lambdaName);
          expect(block).not.toBeNull();

          const selfInvoke = getAttributeValue(block!, 'enable_self_invoke');
          expect(selfInvoke).toBe('true');
        }),
        { numRuns: 1 }
      );
    });

    it('ai_generate_content must have s3_read_bucket_arns with prod assets bucket', () => {
      fc.assert(
        fc.property(fc.constant('lambda_ai_generate_content'), (lambdaName) => {
          const block = extractModuleBlock(content, lambdaName);
          expect(block).not.toBeNull();

          const s3Arns = getListAttribute(block!, 's3_read_bucket_arns');
          expect(s3Arns).not.toBeNull();
          expect(s3Arns).toContain('"arn:aws:s3:::certprep360-prod-assets"');
        }),
        { numRuns: 1 }
      );
    });

    it('ai_generate_content must have EXAM_GUIDES_BUCKET in environment_variables', () => {
      fc.assert(
        fc.property(fc.constant('lambda_ai_generate_content'), (lambdaName) => {
          const block = extractModuleBlock(content, lambdaName);
          expect(block).not.toBeNull();

          const envVars = getEnvironmentVariables(block!);
          expect(envVars).toHaveProperty('EXAM_GUIDES_BUCKET');
          expect(envVars['EXAM_GUIDES_BUCKET']).toBe('"certprep360-prod-assets"');
        }),
        { numRuns: 1 }
      );
    });
  });

  describe('Category 3: Four Lambdas must have handler = "index.handler"', () => {
    it('for any Lambda in the flat handler set, handler must be "index.handler"', () => {
      const lambdaArb = fc.constantFrom(...LAMBDAS_REQUIRING_FLAT_HANDLER);

      fc.assert(
        fc.property(lambdaArb, (lambdaName) => {
          const block = extractModuleBlock(content, lambdaName);
          expect(block).not.toBeNull();

          const handler = getAttributeValue(block!, 'handler');
          expect(handler).toBe('"index.handler"');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Category 4: github_oidc must use var.project_name', () => {
    it('github_oidc project_name must reference var.project_name (not a hardcoded string)', () => {
      fc.assert(
        fc.property(fc.constant('github_oidc'), (moduleName) => {
          const block = extractModuleBlock(content, moduleName);
          expect(block).not.toBeNull();

          const projectName = getAttributeValue(block!, 'project_name');
          expect(projectName).not.toBeNull();
          // Must be a variable reference, not a quoted string literal
          expect(projectName).toBe('var.project_name');
        }),
        { numRuns: 1 }
      );
    });
  });
});
