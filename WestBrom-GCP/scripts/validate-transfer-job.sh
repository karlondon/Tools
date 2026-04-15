#!/usr/bin/env bash
###############################################################################
# Validate Storage Transfer Job Status
#
# Checks the status of the most recent transfer operation and reports
# success/failure. Useful for post-deployment validation.
#
# Usage:
#   ./scripts/validate-transfer-job.sh <project_id> <job_name>
#
# Prerequisites:
#   - gcloud CLI authenticated with appropriate permissions
#   - jq installed
###############################################################################

set -euo pipefail

# Validate arguments
if [[ $# -lt 2 ]]; then
  echo "ERROR: Project ID and job name required."
  echo "Usage: $0 <project_id> <job_name>"
  echo ""
  echo "Example:"
  echo "  $0 westbrom-parity-backup-nonprod transferJobs/1234567890"
  exit 1
fi

PROJECT_ID="$1"
JOB_NAME="$2"

echo "============================================="
echo "  Validating Storage Transfer Job"
echo "  Project: ${PROJECT_ID}"
echo "  Job: ${JOB_NAME}"
echo "============================================="

# Check if gcloud is available
if ! command -v gcloud &>/dev/null; then
  echo "ERROR: gcloud CLI not found. Please install Google Cloud SDK."
  exit 1
fi

# Check if jq is available
if ! command -v jq &>/dev/null; then
  echo "ERROR: jq not found. Please install jq."
  exit 1
fi

echo ""
echo "1. Checking transfer job configuration..."
echo "-------------------------------------------"

gcloud transfer jobs describe "${JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --format="table(name,status,schedule.scheduleStartDate,schedule.startTimeOfDay)" \
  2>/dev/null || {
    echo "ERROR: Could not describe transfer job. Check permissions and job name."
    exit 1
  }

echo ""
echo "2. Listing recent transfer operations..."
echo "-------------------------------------------"

OPERATIONS=$(gcloud transfer operations list \
  --job-names="${JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --limit=5 \
  --format=json 2>/dev/null)

if [[ -z "${OPERATIONS}" || "${OPERATIONS}" == "[]" ]]; then
  echo "No transfer operations found yet. The job may not have run."
  echo "Check the schedule configuration."
  exit 0
fi

echo "${OPERATIONS}" | jq -r '.[] | "  Operation: \(.name)\n  Status: \(.metadata.status)\n  Start: \(.metadata.startTime)\n  End: \(.metadata.endTime // "in progress")\n  Objects: \(.metadata.counters.objectsFoundFromSource // 0) found, \(.metadata.counters.objectsCopiedToSink // 0) copied\n  Bytes: \(.metadata.counters.bytesFoundFromSource // 0) found, \(.metadata.counters.bytesCopiedToSink // 0) copied\n  ---"'

echo ""
echo "3. Checking latest operation status..."
echo "-------------------------------------------"

LATEST_STATUS=$(echo "${OPERATIONS}" | jq -r '.[0].metadata.status // "UNKNOWN"')

case "${LATEST_STATUS}" in
  SUCCESS)
    echo "✅ Latest transfer operation: SUCCESS"
    BYTES=$(echo "${OPERATIONS}" | jq -r '.[0].metadata.counters.bytesCopiedToSink // 0')
    OBJECTS=$(echo "${OPERATIONS}" | jq -r '.[0].metadata.counters.objectsCopiedToSink // 0')
    echo "   Objects copied: ${OBJECTS}"
    echo "   Bytes copied: ${BYTES}"
    ;;
  FAILED)
    echo "❌ Latest transfer operation: FAILED"
    ERROR_SUMMARY=$(echo "${OPERATIONS}" | jq -r '.[0].metadata.errorBreakdowns // "No error details"')
    echo "   Error details: ${ERROR_SUMMARY}"
    exit 1
    ;;
  ABORTED)
    echo "⚠️  Latest transfer operation: ABORTED"
    exit 1
    ;;
  IN_PROGRESS)
    echo "🔄 Latest transfer operation: IN PROGRESS"
    ;;
  *)
    echo "❓ Latest transfer operation status: ${LATEST_STATUS}"
    ;;
esac

echo ""
echo "4. Checking destination bucket..."
echo "-------------------------------------------"

# Get bucket name from terraform output or construct it
BUCKET_OUTPUT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../terraform" && terraform output -raw backup_bucket_name 2>/dev/null || echo "")

if [[ -n "${BUCKET_OUTPUT}" ]]; then
  OBJECT_COUNT=$(gsutil ls -l "gs://${BUCKET_OUTPUT}/" 2>/dev/null | tail -1 || echo "Unable to list")
  echo "  Bucket: ${BUCKET_OUTPUT}"
  echo "  Contents: ${OBJECT_COUNT}"
else
  echo "  Could not determine bucket name from Terraform outputs."
  echo "  Run 'terraform output backup_bucket_name' to check."
fi

echo ""
echo "============================================="
echo "  Validation Complete"
echo "============================================="