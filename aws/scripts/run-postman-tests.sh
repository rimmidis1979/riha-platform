#!/usr/bin/env bash
# ==============================================================================
# RIHA ENTERPRISE PLATFORM - AUTOMATED POSTMAN / NEWMAN TEST RUNNER
# Target Environments: AWS ECS Fargate ALB or Local Docker Compose
# Target AWS Account: 172981085842
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
POSTMAN_DIR="${ROOT_DIR}/aws/postman"

COLLECTION="${POSTMAN_DIR}/RIHA_AWS_ECS_Deployment_TestSuite.postman_collection.json"
PROD_ENV="${POSTMAN_DIR}/RIHA_AWS_Prod_Environment.postman_environment.json"
LOCAL_ENV="${POSTMAN_DIR}/RIHA_AWS_Local_Environment.postman_environment.json"

TARGET_ENV="prod"
ALB_OVERRIDE=""
REPORTER="cli"

# Parse Command-Line Arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --local)
      TARGET_ENV="local"
      shift
      ;;
    --prod|--aws)
      TARGET_ENV="prod"
      shift
      ;;
    --alb-url)
      ALB_OVERRIDE="$2"
      shift 2
      ;;
    --html)
      REPORTER="cli,htmlextra"
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--prod|--local] [--alb-url <URL>] [--html]"
      echo ""
      echo "Options:"
      echo "  --prod, --aws     Run against AWS ECS Fargate ALB (default)"
      echo "  --local           Run against Local Docker Compose (http://localhost)"
      echo "  --alb-url <url>   Override ALB base URL (e.g., http://riha-alb.us-east-1.elb.amazonaws.com)"
      echo "  --html            Generate Newman htmlextra test report"
      exit 0
      ;;
    *)
      echo "[-] Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "${TARGET_ENV}" == "local" ]]; then
  SELECTED_ENV="${LOCAL_ENV}"
  ENV_LABEL="Local Docker Environment"
else
  SELECTED_ENV="${PROD_ENV}"
  ENV_LABEL="AWS ECS Fargate Production Environment"
fi

echo "=============================================================================="
echo "    RIHA ENTERPRISE - AUTOMATED API & ARCHITECTURAL VERIFICATION SUITE       "
echo "=============================================================================="
echo "  Target Environment : ${ENV_LABEL}"
echo "  Collection         : ${COLLECTION}"
echo "  Environment Config : ${SELECTED_ENV}"
if [[ -n "${ALB_OVERRIDE}" ]]; then
  echo "  ALB URL Override   : ${ALB_OVERRIDE}"
fi
echo "=============================================================================="

# Check for newman or npx
if command -v newman >/dev/null 2>&1; then
  NEWMAN_CMD="newman"
elif command -v npx >/dev/null 2>&1; then
  NEWMAN_CMD="npx --yes newman"
else
  echo "[-] ERROR: Neither 'newman' nor 'npx' is installed. Please install Node.js/npm." >&2
  exit 1
fi

NEWMAN_ARGS=(
  run "${COLLECTION}"
  -e "${SELECTED_ENV}"
  --reporters "${REPORTER}"
  --color on
)

if [[ -n "${ALB_OVERRIDE}" ]]; then
  NEWMAN_ARGS+=(--env-var "alb_base_url=${ALB_OVERRIDE}")
fi

echo ""
echo "--> Executing test suite via Newman..."
${NEWMAN_CMD} "${NEWMAN_ARGS[@]}"

echo ""
echo "=============================================================================="
echo "SUCCESS: All Postman architectural tests executed successfully!"
echo "=============================================================================="
