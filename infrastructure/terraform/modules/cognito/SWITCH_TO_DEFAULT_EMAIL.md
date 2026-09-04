# Quick Switch: Cognito Default Email (No SES)

## If SES Production Access is Denied

Follow these steps to switch from SES to Cognito's built-in email service.

## Changes Required

### File: `infrastructure/terraform/modules/cognito/main.tf`

**BEFORE (Current - using SES):**
```hcl
resource "aws_cognito_user_pool" "main" {
  name = var.user_pool_name
  
  # ... other config ...
  
  tags = var.tags

  dynamic "email_configuration" {
    for_each = var.ses_source_arn != "" ? [1] : []
    content {
      email_sending_account  = "DEVELOPER"
      from_email_address     = var.ses_from_address
      source_arn             = var.ses_source_arn
    }
  }
}
```

**AFTER (Using Cognito Default):**
```hcl
resource "aws_cognito_user_pool" "main" {
  name = var.user_pool_name
  
  # ... other config ...
  
  tags = var.tags

  # Option 1: Remove the email_configuration block entirely
  # Cognito will automatically use default email service
  
  # Option 2: Or explicitly set it
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }
}
```

## Step-by-Step Instructions

### Step 1: Edit the Cognito Module

```bash
cd infrastructure/terraform/modules/cognito
```

Open `main.tf` and replace the `dynamic "email_configuration"` block with:

```hcl
email_configuration {
  email_sending_account = "COGNITO_DEFAULT"
}
```

**Or** simply remove the entire email_configuration block.

### Step 2: Comment Out SES IAM Resources (Optional Cleanup)

In the same `main.tf` file, comment out:

```hcl
# resource "aws_iam_role" "cognito_ses" {
#   count = var.ses_source_arn != "" ? 1 : 0
#   name  = "CertPrep360-Cognito-SES-Role"
#   ...
# }

# resource "aws_iam_role_policy" "cognito_ses" {
#   count  = var.ses_source_arn != "" ? 1 : 0
#   ...
# }
```

### Step 3: Apply to Dev Environment First

```bash
cd ../../environments/dev

# Review what will change
AWS_PROFILE=BlakkBrotherInc-Startup terraform plan

# Expected output:
# ~ resource "aws_cognito_user_pool" "main" {
#     ~ email_configuration {
#       ~ email_sending_account = "DEVELOPER" -> "COGNITO_DEFAULT"
#       - from_email_address    = "noreply@certprep360.com" -> null
#       - source_arn           = "arn:aws:ses:..." -> null
#     }
# }

# Apply the change
AWS_PROFILE=BlakkBrotherInc-Startup terraform apply
```

### Step 4: Test in Dev

```bash
# Try signing up with a test email
# Verification code should arrive from: no-reply@verificationemail.com
# Wait time: 10-30 seconds (usually faster than SES sandbox)
```

### Step 5: Apply to Prod

Once confirmed working in dev:

```bash
cd ../prod

AWS_PROFILE=BlakkBrotherInc-Startup terraform plan
AWS_PROFILE=BlakkBrotherInc-Startup terraform apply
```

### Step 6: Verify Both Pools

```bash
# Check dev pool
AWS_PROFILE=BlakkBrotherInc-Startup aws cognito-idp describe-user-pool \
  --user-pool-id us-east-1_hMqIOybsZ \
  --region us-east-1 | jq '.UserPool.EmailConfiguration'

# Check prod pool  
AWS_PROFILE=BlakkBrotherInc-Startup aws cognito-idp describe-user-pool \
  --user-pool-id us-east-1_2AgqRZj6v \
  --region us-east-1 | jq '.UserPool.EmailConfiguration'

# Should see: { "EmailSendingAccount": "COGNITO_DEFAULT" }
# Or null (which means default)
```

## What Changes for Users

### Before (SES):
- From: `noreply@certprep360.com`
- Status: Only verified emails (sandbox) or any email (production)
- Limit: 1/sec (sandbox) or 14+/sec (production)

### After (Cognito Default):
- From: `no-reply@verificationemail.com` ⚠️
- Status: Any email address works immediately ✅
- Limit: 50 emails per day ⚠️

### Email Content Changes

**Verification Email:**
```
From: no-reply@verificationemail.com
Subject: Verify your email for CertPrep360

Your verification code is: 123456
```

**Password Reset Email:**
```
From: no-reply@verificationemail.com
Subject: Reset your password for CertPrep360

Your password reset code is: 123456
```

## Important Notes

⚠️ **50 emails/day limit** - This includes:
- Signup verification codes
- Password reset codes
- Resend verification requests
- MFA setup codes

✅ **Immediate effect** - Works right after terraform apply (no waiting for approval)

✅ **Non-destructive** - Existing users are not affected, only new email sends

✅ **Can switch back** - If SES gets approved later, just revert the terraform change

## Monitoring Usage

Since you're limited to 50 emails/day, track signups:

```bash
# Count today's new users (proxy for emails sent)
AWS_PROFILE=BlakkBrotherInc-Startup aws cognito-idp list-users \
  --user-pool-id us-east-1_2AgqRZj6v \
  --region us-east-1 \
  --filter "cognito:user_status = \"UNCONFIRMED\" or cognito:user_status = \"CONFIRMED\"" \
  | jq '.Users | length'
```

## Rollback Plan

If you need to switch back to SES:

```bash
cd infrastructure/terraform/modules/cognito

# Restore the email_configuration to use SES
# (Just undo the changes made in Step 1)

cd ../../environments/dev
AWS_PROFILE=BlakkBrotherInc-Startup terraform apply

cd ../prod
AWS_PROFILE=BlakkBrotherInc-Startup terraform apply
```

## FAQ

**Q: Will this affect existing users?**
A: No, existing users can still log in. Only new email sends are affected.

**Q: What if I hit the 50/day limit?**
A: New signups will fail. Consider integrating SendGrid/Mailgun via Lambda (see COGNITO_EMAIL_FALLBACK_PLAN.md).

**Q: Can I customize the email content?**
A: Limited. You can customize the message in Cognito's verification_message_template, but the from address stays as `no-reply@verificationemail.com`.

**Q: Is this free?**
A: Yes, Cognito default email is included with Cognito at no extra cost.

**Q: How long does terraform apply take?**
A: 30-60 seconds. The change is applied immediately to the user pool.

---

**Estimated Time**: 10 minutes

**Difficulty**: Easy

**Risk**: Low (non-destructive change)
