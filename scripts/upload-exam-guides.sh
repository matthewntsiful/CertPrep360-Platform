#!/usr/bin/env bash
# upload-exam-guides.sh
# Uploads all exam guide PDFs from CertPrep360-ExamGuide/ to S3.
# Each file is uploaded as s3://certprep360-dev-assets/exam-guides/<CERT_ID>.pdf
# using the Matthew_Cli AWS profile.
#
# The filenames contain a '#' fragment suffix (e.g. foo.pdf#foo.pdf) — the part
# before '#' is the real PDF content; we strip the suffix when naming the S3 key.

set -euo pipefail

BUCKET="certprep360-dev-assets"
PREFIX="exam-guides"
PROFILE="Matthew_Cli"
GUIDE_DIR="$(cd "$(dirname "$0")/.." && pwd)/CertPrep360-ExamGuide"

# Hardcoded mapping: base filename (before '#') → cert ID
declare -A CERT_MAP
CERT_MAP["advanced-networking-specialty-01.pdf"]="ANS-C01"
CERT_MAP["ai-practitioner-01.pdf"]="AIF-C01"
CERT_MAP["ai-professional-01.pdf"]="GDP-C01"
CERT_MAP["cloud-practitioner-02.pdf"]="CLF-C02"
CERT_MAP["data-engineer-associate-01.pdf"]="DEA-C01"
CERT_MAP["developer-associate-02.pdf"]="DVA-C02"
CERT_MAP["devops-engineer-professional-02.pdf"]="DOP-C02"
CERT_MAP["machine-learning-engineer-associate-01.pdf"]="MLE-C01"
CERT_MAP["security-specialty-03.pdf"]="SCS-C02"
CERT_MAP["solutions-architect-associate-03.pdf"]="SAA-C03"
CERT_MAP["solutions-architect-professional-02.pdf"]="SAP-C02"
CERT_MAP["sysops-administrator-associate-03.pdf"]="COE-C01"

echo "Uploading exam guide PDFs to s3://${BUCKET}/${PREFIX}/"
echo "Source directory: ${GUIDE_DIR}"
echo ""

uploaded=0
skipped=0

for filepath in "${GUIDE_DIR}"/*; do
  # Get the full filename including the '#' fragment
  full_name="$(basename "${filepath}")"

  # Strip the '#...' suffix to get the base PDF filename
  base_name="${full_name%%#*}"

  # Look up the cert ID from the mapping
  cert_id="${CERT_MAP[${base_name}]:-}"

  if [[ -z "${cert_id}" ]]; then
    echo "  [SKIP] No cert ID mapping for: ${full_name}"
    ((skipped++)) || true
    continue
  fi

  s3_key="${PREFIX}/${cert_id}.pdf"
  echo "  Uploading ${full_name}"
  echo "         → s3://${BUCKET}/${s3_key}"

  aws s3 cp "${filepath}" "s3://${BUCKET}/${s3_key}" \
    --profile "${PROFILE}" \
    --content-type "application/pdf"

  echo "         ✓ Done"
  ((uploaded++)) || true
done

echo ""
echo "Upload complete: ${uploaded} uploaded, ${skipped} skipped."
echo ""
echo "Verifying uploads in S3..."
aws s3 ls "s3://${BUCKET}/${PREFIX}/" --profile "${PROFILE}" --human-readable
