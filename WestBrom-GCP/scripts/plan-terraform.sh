#!/usr/bin/env bash
###############################################################################
# Run Terraform Plan for a specific environment
#
# Usage:
#   ./scripts/plan-terraform.sh <environment>
#
# Examples:
#   ./scripts/plan-terraform.sh nonprod
#   ./scripts/plan-terraform.sh prod
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

TFVARS_FILE="${TERRAFORM_DIR}/environments/${ENVIRONMENT}/terraform.tfvars"
PLAN_FILE="${TERRAFORM_DIR}/${ENVIRONMENT}.tfplan"

if [[ ! -f "${TFVARS_FILE}" ]]; then
  echo "ERROR: Terraform vars file not found: ${TFVARS_FILE}"
  exit 1
fi

echo "============================================="
echo "  Running Terraform Plan"
echo "  Environment: ${ENVIRONMENT}"
echo "  Vars File: ${TFVARS_FILE}"
echo "  Plan Output: ${PLAN_FILE}"
echo "============================================="

cd "${TERRAFORM_DIR}"

terraform validate

terraform plan \
  -var-file="${TFVARS_FILE}" \
  -out="${PLAN_FILE}" \
  -input=false

echo ""
echo "Plan saved to: ${PLAN_FILE}"
echo "Review the plan and run apply-terraform.sh to apply."