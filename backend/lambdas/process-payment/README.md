# Payment implementation (provisioned, not active)

CertPrep360 is currently a **free product**. The `process-payment` handler, its API Gateway routes, and CORS configuration are provisioned in infrastructure but the frontend payment flow is not active.

**What is wired:**
- API Gateway routes: `POST /payment/initialize` and `POST /payment/verify` (Cognito JWT required)
- CORS OPTIONS preflight for both routes
- Lambda integration via `AWS_PROXY`
- SSM parameters for Paystack keys at `/{project}/{env}/payments/paystack_public_key` and `.../paystack_secret_key`

**What is not wired:**
- Frontend API caller (no `processPayment` call in `api.ts`)
- CI/CD packaging (Lambda zip not included in deployment pipeline)

Re-enabling payment for a commercial release requires: adding the frontend caller, including the Lambda in CI packaging, populating SSM parameters with real Paystack keys, and completing a product-access review.
