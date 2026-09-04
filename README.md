# AWS Solutions Architect Associate (SAA-C03) Exam Suite

> Complete practice exam application for AWS Solutions Architect Associate certification preparation.

[![AWS](https://img.shields.io/badge/AWS-SAA--C03-orange)](https://aws.amazon.com/certification/certified-solutions-architect-associate/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Terraform](https://img.shields.io/badge/Terraform-1.9+-purple)](https://www.terraform.io/)

🌐 **[Live Production App](https://aws-exams.matthewntsiful.com)** | 📊 **[Dev Environment](https://saa-exams-dev.blakkbrother.com)**

## ✨ Features

### 🎯 Exam Features
- **16 Complete Practice Exams** (1,040 questions total)
- **130-Minute Timer** per exam (matches real conditions)
- **Study Mode** (no timer, instant feedback, learning resources)
- **Auto-Save Progress** (resume within 4 hours)
- **Question Navigation** (jump to any question)
- **Keyboard Navigation** (arrow keys for questions only, spacebar for pause/resume only)
- **Flag Questions** for review
- **Social Media Sharing** (X, LinkedIn, Facebook, Reddit, WhatsApp, Telegram)
- **Dark Mode** support
- **Mobile Responsive** design

### 📊 Analytics & Tracking
- **Performance Dashboard** (avg score, pass rate, attempts)
- **Progress Tracking** across all 16 exams
- **Detailed Results** with score breakdown
- **Answer Review** (see correct/incorrect answers)
- **Exam History** (track all attempts)
- **Difficulty Levels** (Easy → Expert)
- **Central Resources System** (AWS Docs, Tutorials, Videos per topic)

### 🏗️ Infrastructure

![Architecture Diagram](docs/architecture/diagram.png)

**Serverless Architecture Components:**
- **Frontend & CDN**: Route53 → CloudFront → S3 (static hosting)
- **Security Layer**: AWS WAF (rate limiting + managed rules)
- **Content Delivery**: CloudFront OAC with compression (Brotli + Gzip)
- **Storage**: S3 buckets (content + access logs with lifecycle policies)
- **Infrastructure as Code**: Terraform with remote state (S3 + DynamoDB locking)
- **CI/CD Pipeline**: GitHub Actions with OIDC authentication
- **Monitoring**: CloudWatch alarms + access logging
- **Multi-Environment**: Automated dev/prod deployments
- **Cost Optimized**: ~$6.50/month with lifecycle policies

## 🚀 Quick Start

### Local Development
```bash
cd website
npm install
npm run dev
# Visit http://localhost:3000
```

### AWS Deployment

**First-time setup (create backend):**
```bash
cd infrastructure/terraform/backend
terraform init
terraform apply
```

**Deploy to dev/prod:**
```bash
cd infrastructure/terraform/environments/dev  # or prod
terraform init
terraform apply
```

**Automated deployment via GitHub Actions:**
- Push to `develop` → deploys to dev environment
- Push to `main` → deploys to production
- Pull requests → runs terraform plan

## 📁 Project Structure

```
SAA-C03_Exam/
├── website/                    # Application code
│   ├── server.js              # Express server
│   ├── package.json           # Dependencies (Node 18+)
│   ├── views/                 # EJS templates
│   │   └── minimal.ejs        # Landing page
│   ├── public/                # Static files
│   │   ├── exams/             # 16 exam HTML files
│   │   ├── js/                # Shared JavaScript
│   │   └── assets/            # Icons, manifest
│   └── scripts/               # Build/deploy scripts
├── infrastructure/             # Terraform IaC
│   └── terraform/             # AWS resources
│       ├── modules/           # Reusable modules
│       ├── environments/      # dev/prod configs
│       └── backend/           # Remote state setup
├── .github/workflows/         # CI/CD pipeline
├── docs/                      # Documentation
│   ├── architecture/         # Architecture diagrams
│   ├── FEATURES.md           # Complete feature list
│   ├── ARCHITECTURE.md       # System architecture
│   ├── DEPLOYMENT.md         # Deployment guide
│   └── PROJECT_STRUCTURE.md  # Detailed structure
├── scripts-legacy/            # Legacy Python utilities
├── QUICK_START.md            # 30-second start guide
└── README.md                 # This file
```

## 📚 Documentation

- **[Features](docs/FEATURES.md)** - Complete feature list
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture & diagrams
- **[Architecture Diagram](docs/architecture/diagram.png)** - Visual system overview
- **[Deployment](docs/DEPLOYMENT.md)** - Deployment guide
- **[CI/CD Pipeline](docs/CICD.md)** - Automated deployment
- **[Structure](docs/PROJECT_STRUCTURE.md)** - Project organization
- **[Website README](website/README.md)** - Application docs

## 🎓 Usage

1. **Take Exams** - Click any exam card to start
2. **Study Mode** - Toggle for learning (instant feedback, no timer)
3. **Keyboard Navigation** - Arrow keys (←/→) navigate questions, spacebar pauses/resumes timer
4. **Track Progress** - View analytics dashboard
5. **Review Answers** - See detailed explanations with resources
6. **Share Results** - Post scores to social media
7. **Retake Exams** - Improve your scores
8. **Monitor Performance** - Track improvement over time

## 🛠️ Tech Stack

**Frontend:**
- HTML, Tailwind CSS, Vanilla JS
- PWA (Progressive Web App)
- Service Worker for offline support

**Backend:**
- Node.js, Express, EJS
- Browser localStorage

**Infrastructure:**
- Terraform 1.9+ (AWS Provider 6.20)
- AWS S3 (versioned, encrypted, logged)
- AWS CloudFront (cache policies, security headers, OAC)
- AWS Route53 (DNS + SSL certificates)
- AWS WAF (rate limiting, managed rules)
- AWS CloudWatch (alarms, monitoring)
- DynamoDB (Terraform state locking)
- GitHub OIDC (secure CI/CD authentication)

## 📊 Exam Content

- **Total Exams**: 16
- **Questions per Exam**: 65
- **Total Questions**: 1,040
- **Time per Exam**: 130 minutes
- **Passing Score**: 72%
- **Domains**: All SAA-C03 domains covered

## 🎯 Key Metrics

| Metric | Value |
|--------|-------|
| Exams | 16 |
| Questions | 1,040 |
| Study Mode | ✅ |
| Keyboard Navigation | ✅ |
| Social Sharing | ✅ |
| Pass Rate Tracking | ✅ |
| Progress Saving | ✅ |
| Mobile Support | ✅ |
| Dark Mode | ✅ |

## 🚀 Deployment Options

1. **Local Development** - `npm run dev` (Node.js 18+)
2. **AWS Production** - S3 + CloudFront (Terraform)
3. **CI/CD Pipeline** - GitHub Actions (automated)
4. **Static Hosting** - Netlify, Vercel, GitHub Pages

## 💰 AWS Cost Estimate

~$6.50/month for production deployment:
- S3 (content): $0.023
- S3 (logs with lifecycle): $0.05
- CloudFront: $0.85
- Route53: $0.50
- WAF: $5.00
- CloudWatch Alarms: $0.30

**Cost Optimization:**
- Logs transition to IA after 30 days (70% savings)
- Logs archive to Glacier after 90 days (90% savings)
- Logs auto-delete after 365 days
- CloudFront compression (Brotli + Gzip)

## 🔐 Security

**Application:**
- All data stored locally (localStorage)
- No user accounts required
- No external tracking
- PWA support with offline capability

**Infrastructure:**
- HTTPS only (TLS 1.2+)
- WAF protection (rate limiting + AWS managed rules)
- S3 encryption at rest (AES256)
- S3 versioning enabled
- Public access blocked
- CloudFront Origin Access Control (OAC)
- Security headers (HSTS, X-Frame-Options, XSS Protection)
- Access logging (S3 + CloudFront)

## 🌐 Current Deployment Status

### Infrastructure State
- **Backend**: Terraform state in S3 with DynamoDB locking ✅
- **Dev Environment**: Deployed and functional ✅
- **Prod Environment**: Deployed and functional ✅
- **CI/CD Pipeline**: GitHub Actions configured ✅
- **Monitoring**: CloudWatch alarms active ✅

### Environment Details
- **Dev**: `develop` branch → auto-deploy to dev environment
- **Prod**: `main` branch → auto-deploy to production
- **Terraform**: v1.9.0 with AWS Provider v6.20
- **Node.js**: v20+ required for local development (CI uses v24)

### Active AWS Resources
- S3 buckets (content + logs)
- CloudFront distributions
- Route53 hosted zones
- WAF web ACLs
- CloudWatch alarms
- IAM roles for GitHub OIDC

## 📝 License

Educational use only. AWS and SAA-C03 are trademarks of Amazon Web Services.

## 🤝 Contributing

Contributions welcome for:
- Bug fixes
- UI improvements
- Additional features
- Documentation

## 📞 Support

### Application Issues
1. Check browser console (F12)
2. Clear localStorage: `localStorage.clear()`
3. Try different browser
4. Review [QUICK_START.md](QUICK_START.md)

### Infrastructure Issues
1. Check GitHub Actions logs
2. Review Terraform state
3. Verify AWS credentials
4. Check [DEPLOYMENT.md](docs/DEPLOYMENT.md)

### Development Setup
1. Ensure Node.js 18+ installed
2. Run `npm install` in website directory
3. Use `npm run dev` for development
4. Check [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)

---

## 🏆 AWS Best Practices Implemented

- ✅ Remote state management with DynamoDB locking
- ✅ S3 encryption, versioning, and access logging
- ✅ Modern CloudFront cache policies with OAC
- ✅ Security headers (HSTS, CSP, X-Frame-Options)
- ✅ CloudWatch monitoring and custom alarms
- ✅ Cost optimization with S3 lifecycle policies
- ✅ WAF protection with rate limiting
- ✅ TLS 1.2+ minimum encryption
- ✅ Infrastructure as Code (Terraform 1.9+)
- ✅ Multi-environment support (dev/prod)
- ✅ CI/CD pipeline with GitHub Actions
- ✅ GitHub OIDC for secure deployments
- ✅ Automated invalidation and deployment

---

**Status**: ✅ Production Ready & Deployed  
**Version**: 2.3.0  
**Infrastructure**: Terraform 1.9+ | AWS Provider 6.20  
**Runtime**: Node.js 18+ | Express 4.18+  
**Last Updated**: January 2025

**Good luck with your AWS certification! 🎉**