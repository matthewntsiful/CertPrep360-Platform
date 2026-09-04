# AWS SES Production Access Request Guide

## Current Issue

Your CertPrep360 platform is experiencing authentication delays due to AWS SES being in **SANDBOX MODE**:

- **Sending Rate Limit**: 1 email/second (causing 20+ second delays)
- **Recipient Restrictions**: Can only send to verified email addresses (why users don't receive verification codes)
- **Daily Limit**: 200 emails per day

## Root Cause Analysis

```
✓ Cognito Configuration: Correct (using SES with arn:aws:ses:us-east-1:654654335668:identity/certprep360.com)
✓ SES Domain Verification: Success (certprep360.com verified)
✓ Frontend Implementation: No issues found
✗ SES Account Status: SANDBOX MODE (ProductionAccessEnabled: false)
```

## Solution: Request SES Production Access

### Step 1: Request Production Access via AWS Console

1. Go to AWS Console → Amazon SES → Account Dashboard
2. Click **"Request production access"** button
3. Fill out the form with these details:

**Mail Type**: Transactional

**Website URL**: https://certprep360.com

**Use Case Description** (example):
```
We operate CertPrep360, an AWS certification exam preparation platform available on 
AWS Marketplace. Our application uses Amazon Cognito for user authentication and 
requires SES to send:

1. Email verification codes for new user registrations
2. Password reset emails
3. Account recovery emails
4. Important account notifications

We currently have 18+ active users and are experiencing service disruptions because 
SES sandbox mode cannot send verification emails to new users, preventing account 
activation. We need production access to provide reliable authentication services.

Our email sending patterns:
- Average: 10-50 emails per day
- Peak: 100-200 emails per day
- All emails are transactional (no marketing)
- Bounce/complaint handling via SNS notifications (already configured)

We follow AWS email best practices and will monitor bounce/complaint rates closely.
```

**Additional Information**:
```
Our application is deployed on AWS infrastructure using:
- Amazon Cognito (User Pools: us-east-1_2AgqRZj6v for prod)
- Amazon SES (verified domain: certprep360.com)
- AWS Lambda, API Gateway, DynamoDB
- CloudFront distribution

We are listed on AWS Marketplace (Product Code: dlzlo33jcrq5pa950xbpo0yd1)
```

**Compliance**:
- [x] We will only send to recipients who have requested emails
- [x] We have a process to handle bounces and complaints
- [x] We understand AWS email sending policies

### Step 2: Alternative Solution (Immediate Fix)

While waiting for production access (typically 24-48 hours), you can:

#### Option A: Verify Individual Test Email Addresses

For testing and early users:

```bash
# Verify a specific email address
AWS_PROFILE=BlakkBrotherInc-Startup aws ses verify-email-identity \
  --email-address user@example.com \
  --region us-east-1

# User will receive verification email from AWS
# They must click the link to verify
```

#### Option B: Use Cognito with Default Email (Not Recommended)

Temporarily switch back to Cognito's default email service (less reliable, still has limits):

```hcl
# In infrastructure/terraform/modules/cognito/main.tf
# Comment out the email_configuration block temporarily
# Then run terraform apply
```

**Not recommended because:**
- Still has rate limits
- Less reliable delivery
- Cannot customize sender email
- Will need to switch back to SES anyway

### Step 3: Monitor SES Production Access Request

Check status:
```bash
AWS_PROFILE=BlakkBrotherInc-Startup aws sesv2 get-account --region us-east-1
```

Look for:
```json
{
  "ProductionAccessEnabled": true,  // This should change to true
  "SendingEnabled": true,
  "SendQuota": {
    "Max24HourSend": 50000.0,      // Will increase significantly
    "MaxSendRate": 14.0             // Will increase to at least 14/sec
  }
}
```

## After Production Access is Granted

### Immediate Benefits

✅ **Fast email delivery**: Up to 14+ emails/second (vs 1/second)
✅ **Send to any email**: No more "verified addresses only" restriction
✅ **Higher daily limit**: 50,000+ emails/day (vs 200/day)
✅ **Better deliverability**: Production SES has better sender reputation

### Verification

```bash
# Check that production access is enabled
AWS_PROFILE=BlakkBrotherInc-Startup aws sesv2 get-account --region us-east-1

# Test sending an email
AWS_PROFILE=BlakkBrotherInc-Startup aws ses send-email \
  --from "noreply@certprep360.com" \
  --destination "ToAddresses=your-test-email@example.com" \
  --message "Subject={Data='Test Email'},Body={Text={Data='Test email from CertPrep360'}}" \
  --region us-east-1
```

### Monitor Email Metrics

Set up CloudWatch alarms for:
- Bounce rate (should be < 5%)
- Complaint rate (should be < 0.1%)
- Send rate
- Daily send quota utilization

```bash
# Check sending statistics
AWS_PROFILE=BlakkBrotherInc-Startup aws ses get-send-statistics --region us-east-1
```

## Expected Timeline

- **Request Submission**: 5 minutes
- **AWS Review**: 24-48 hours (usually within 24 hours)
- **Approval Notification**: Via email to account root email
- **Testing**: 10 minutes after approval

## Post-Approval Tasks

1. ✅ Test user registration flow end-to-end
2. ✅ Test password reset flow
3. ✅ Test Google OAuth sign-in
4. ✅ Verify email delivery times (should be < 5 seconds)
5. ✅ Set up CloudWatch alarms for bounce/complaint rates
6. ✅ Configure SNS topics for SES notifications (optional but recommended)

## Support Resources

- AWS SES Documentation: https://docs.aws.amazon.com/ses/
- SES Production Access: https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
- SES Sending Limits: https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html

## Current Configuration

**Dev Environment:**
- User Pool: us-east-1_hMqIOybsZ
- Domain: dev.certprep360.com
- SES From: noreply@certprep360.com

**Prod Environment:**
- User Pool: us-east-1_2AgqRZj6v  
- Domain: certprep360.com
- SES From: noreply@certprep360.com

Both environments use the same SES identity (certprep360.com), so production access will fix both.
