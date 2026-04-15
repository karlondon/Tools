#!/usr/bin/env bash
###############################################################################
# Initialize Terraform for a specific environment
#
# Usage:
#   ./scripts/init-terraform.sh <environment>
#
# Examples:
#   ./scripts/init-terraform.sh nonprod
#   ./scripts/init-terraform.sh prod
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

BACKEND_CONF="${TERRAFORM_DIR}/environments/${ENVIRONMENT}/backend.conf"

if [[ ! -f "${BACKEND_CONF}" ]]; then
  echo "ERROR: Backend config not found: ${BACKEND_CONF}"
  exit 1
fi

echo "============================================="
echo "  Initializing Terraform"
echo "  Environment: ${ENVIRONMENT}"
echo "  Backend Config: ${BACKEND_CONF}"
echo "============================================="

cd "${TERRAFORM_DIR}"

# Clean previous state if switching environments
rm -rf .terraform/terraform.tfstate

terraform init \
  -backend-config="${BACKEND_CONF}" \
  -reconfigure

echo ""
echo "Terraform initialized successfully for '${ENVIRONMENT}' environment."