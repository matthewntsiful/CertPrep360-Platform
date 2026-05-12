#!/bin/bash
set -e

BASE="/Users/Matthieu/Documents/Jomacs_DevOps/MyProjects/CertPrep360-Platform/backend/lambdas"

LAMBDAS=("admin-analytics" "admin-manage-content" "ai-generate-content" "get-dynamic-quiz" "get-questions" "get-user-analytics" "submit-results")
FUNCTION_NAMES=("CertPrep360-Dev-AdminAnalytics" "CertPrep360-Dev-AdminManageContent" "CertPrep360-Dev-AIGenerateContent" "CertPrep360-Dev-GetDynamicQuiz" "CertPrep360-Dev-GetQuestions" "CertPrep360-Dev-GetUserAnalytics" "CertPrep360-Dev-SubmitResults")

for i in "${!LAMBDAS[@]}"; do
  DIR="${LAMBDAS[$i]}"
  FUNC="${FUNCTION_NAMES[$i]}"
  ZIP="/tmp/${DIR}.zip"
  STAGING="/tmp/staging_${DIR}"

  echo "📦 Packaging $DIR..."
  rm -rf "$STAGING" "$ZIP"
  mkdir -p "$STAGING"

  cp "$BASE/$DIR/index.js" "$STAGING/"
  cp -r "$BASE/common" "$STAGING/"
  cp -r "$BASE/node_modules" "$STAGING/"
  cp "$BASE/package.json" "$STAGING/"

  cd "$STAGING"
  zip -r "$ZIP" . > /dev/null 2>&1
  cd "$BASE"

  echo "🚀 Deploying $FUNC..."
  aws lambda update-function-code \
    --function-name "$FUNC" \
    --zip-file "fileb://$ZIP" \
    --profile Matthew_Cli --region us-east-1 \
    --query "{LastModified: LastModified, CodeSize: CodeSize}"
  echo ""
done

echo "✅ All Lambdas deployed successfully"
