# CertPrep360 Platform

## What It Is
CertPrep360 is an AWS certification exam preparation platform. Users take timed practice exams, review answers with explanations, and track their progress over time.

## Core Capabilities
- Practice exams with real exam conditions (65 questions, 130 min timer, 72% passing score)
- Study mode with instant feedback and no timer
- Dynamic quiz generation powered by AI (Bedrock)
- Performance analytics dashboard (score trends, pass rates, weak areas)
- Admin panel for content management and AI-driven question generation
- PWA with offline support via service worker

## Target Certifications
Currently focused on AWS Solutions Architect Associate (SAA-C03) with architecture to support all AWS certifications (Cloud Practitioner, Developer Associate, DevOps Professional, Security Specialty, etc.).

## Users
- **Learners**: Take exams, review results, track progress
- **Admins**: Manage question content, view platform analytics, trigger AI generation

## Environments
- **Dev**: `develop` branch → auto-deploys to dev (certprep360-dev-website S3 bucket)
- **Prod**: `main` branch → auto-deploys to production (aws-exams.matthewntsiful.com)

## Authentication
AWS Cognito via AWS Amplify on the frontend. Admin routes are protected.
