# Do Not Do

## Frontend
- Do NOT use `localStorage` for new features — backend (DynamoDB via Lambda) is the source of truth
- Do NOT add new npm packages without checking if an existing library already covers it
- Do NOT modify files in `archive/` or `website_legacy/` — they are deprecated
- Do NOT use `--force` with npm install, use `--legacy-peer-deps`
- Do NOT create new pages without adding a route in `App.tsx`

## Infrastructure
- Do NOT push directly to `main` — always PR
- Do NOT run `terraform apply` in prod without a reviewed plan
- Do NOT hardcode AWS account IDs, ARNs, or credentials anywhere
- Do NOT create AWS resources outside of Terraform (no manual console changes)
- Do NOT modify `infrastructure/terraform/backend/` unless changing remote state config

## General
- Do NOT delete or overwrite test files
- Do NOT commit `.env` files — use SSM Parameter Store for secrets in AWS
- Do NOT use the `archive/` legacy Python scripts — they are replaced by the current build system
