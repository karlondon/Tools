#!/usr/bin/env bash
###############################################################################
# Apply Terraform Plan for a specific environment
#
# Usage:
#   ./scripts/apply-terraform.sh <environment>
#
# Examples:
#   ./scripts/apply-terraform.sh nonprod
#   ./scripts/apply-terraform.sh prod
###############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="${SCRIPT_DIR}/../terraform"

# Validate arguments
if [[ $# -ne 1 ]]; then
  echo "ERROR: Environment argument required."
  echo "Usage: $0 <environment>"
  echo "  Environments: nonprod, prod"
  exit 1
fi

ENVIRONMENT="$1"

# Validate environment
if [[ "${ENVIRONMENT}" != "nonprod" && "${ENVIRONMENT}" != "prod" ]]; then
  echo "ERROR: Invalid environment '${ENVIRONMENT}'. Must be 'nonprod' or 'prod'."
  exit 1
fi

PLAN_FILE="${TERRAFORM_DIR}/${ENVIRONMENT}.tfplan"

if [[ ! -f "${PLAN_FILE}" ]]; then
  echo "ERROR: Plan file not found: ${PLAN_FILE}"
  echo "Run plan-terraform.sh first to generate a plan."
  exit 1
fi

echo "============================================="
echo "  Applying Terraform Plan"
echo "  Environment: ${ENVIRONMENT}"
echo "  Plan File: ${PLAN_FILE}"
echo "============================================="
echo ""
echo "WARNING: This will make changes to your GCP infrastructure."
echo ""

# In CI/CD, auto-approve is used; locally, prompt for confirmation
if [[ "${CI:-false}" == "true" || "${TF_AUTO_APPROVE:-false}" == "true" ]]; then
  echo "Auto-approve mode enabled (CI/CD)."
else
  read -rp "Do you want to continue? (yes/no): " CONFIRM
  if [[ "${CONFIRM}" != "yes" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

cd "${TERRAFORM_DIR}"

terraform apply \
  -input=false \
  "${PLAN_FILE}"

echo ""
echo "============================================="
echo "  Terraform Apply Complete"
echo "  Environment: ${ENVIRONMENT}"
echo "============================================="

# Display key outputs
echo ""
echo "Key Outputs:"
terraform output -json | jq -r 'to_entries[] | "  \(.key): \(.value.value)"' 2>/dev/null || \
  terraform output

# Clean up plan file
rm -f "${PLAN_FILE}"
echo ""
echo "Plan file cleaned up."