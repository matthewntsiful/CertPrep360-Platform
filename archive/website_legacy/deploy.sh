#!/bin/bash

# Deploy to S3 bucket
BUCKET="saa-exams-dev-24b4775a"
DISTRIBUTION_ID="EBZ8XFPX6NOO5"

echo "🚀 Deploying to S3 bucket: $BUCKET"

# Create index.html from minimal.ejs
echo "📝 Generating index.html from minimal.ejs..."
node -e "
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const examDir = path.join(__dirname, 'public/exams');
const files = fs.readdirSync(examDir)
  .filter(f => f.startsWith('SAA-C03_Minimal_Exam_') && f.endsWith('.html'))
  .sort();

const exams = files.map((file, index) => ({
  id: index + 1,
  filename: file,
  title: \`Practice Exam \${index + 1}\`,
  questions: 65,
  duration: 130
}));

const template = fs.readFileSync('views/minimal.ejs', 'utf8');
const html = ejs.render(template, { exams });
fs.writeFileSync('public/index.html', html);
console.log('✅ Generated index.html');
"

# Upload to S3
echo "📤 Uploading files to S3..."
aws s3 sync public/ s3://$BUCKET/ \
  --delete \
  --exclude "*.DS_Store" \
  --cache-control "public, max-age=3600"

# Upload HTML files with no-cache
echo "📤 Uploading HTML files with no-cache..."
aws s3 sync public/ s3://$BUCKET/ \
  --exclude "*" \
  --include "*.html" \
  --cache-control "no-cache" \
  --content-type "text/html"

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text

echo "✅ Deployment complete!"
echo "🌐 URL: https://saa-exams-dev.blakkbrother.com"
