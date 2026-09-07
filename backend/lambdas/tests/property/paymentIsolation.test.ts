import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '../../../..');

function readRepositoryFile(relativePath: string): string {
  return readFileSync(resolve(repositoryRoot, relativePath), 'utf-8');
}

describe('Free product payment isolation', () => {
  it('retains the payment implementation without connecting it to runtime infrastructure', () => {
    const apiGateway = readRepositoryFile('infrastructure/terraform/modules/api-gateway/main.tf');
    const devEnvironment = readRepositoryFile('infrastructure/terraform/environments/dev/main.tf');
    const prodEnvironment = readRepositoryFile('infrastructure/terraform/environments/prod/main.tf');
    const deployment = readRepositoryFile('.github/workflows/deploy.yml');
    const frontendApi = readRepositoryFile('website/src/services/api.ts');
    const ssmModule = readRepositoryFile('infrastructure/terraform/modules/ssm/main.tf');

    expect(apiGateway).not.toMatch(/path_part\s*=\s*"payment"/);
    expect(apiGateway).not.toContain('process_payment_lambda_invoke_arn');
    expect(devEnvironment).not.toContain('module "lambda_process_payment"');
    expect(prodEnvironment).not.toContain('module "lambda_process_payment"');
    expect(deployment).not.toContain('"process-payment"');
    expect(frontendApi).not.toContain('/payment/');
    expect(ssmModule).not.toContain('paystack_');

    expect(existsSync(resolve(repositoryRoot, 'backend/lambdas/process-payment/index.js'))).toBe(true);
    expect(existsSync(resolve(repositoryRoot, 'backend/lambdas/process-payment/README.md'))).toBe(true);
  });
});
