# WestBrom External Backup GCP - Infrastructure as Code

## Overview

This repository contains the Terraform code, helper scripts, and CI/CD pipelines to deploy the **GCP-side infrastructure** for the WestBrom (Converge Banking) cross-cloud off-site backup solution.

The solution transfers Aurora PostgreSQL backups from **AWS S3** to **GCP Cloud Storage** using the **Storage Transfer Service**, providing cloud-level isolation and survivability in case AWS-native backups become unavailable or compromised.

### Architecture Reference
- **JIRA**: CS-14029
- **Design Document**: `CB-External Backup GCP Design-070426-150459.pdf`

---

## Solution Components

| GCP Service | Purpose |
|---|---|
| **Cloud KMS** | Dedicated encryption key for backup bucket |
| **Cloud Storage** | Immutable backup bucket with retention policy, WORM/LOCKED mode, and lifecycle management |
| **Storage Transfer Service** | Scheduled transfer job pulling backups from AWS S3 to GCS via Google-managed private network |
| **Pub/Sub** | Notification topic for transfer status events (Success, Failed, Aborted) |
| **Cloud Logging** | Transfer job monitoring and log-based metrics |
| **Cloud Monitoring** | Alert policies for transfer failures (optional) |
| **IAM** | Dedicated service account with least-privilege access |

### Security Controls

- ✅ Transfer traffic via **Google-managed private network** with AWS S3
- ✅ Destination bucket encrypted with **dedicated Cloud KMS key** (auto-rotation every 90 days)
- ✅ **Retention policy** (30 days) with optional **LOCKED/WORM mode** to prevent deletion
- ✅ **Dedicated GCP project** for Parity off-site backup storage
- ✅ **Uniform bucket-level access** enabled
- ✅ **Versioning** enabled on backup bucket
- ✅ **Access logging** to separate bucket

---

## Repository Structure

```
WestBrom-GCP/
├── README.md                          # This file
├── terraform/
│   ├── providers.tf                   # Terraform & provider configuration
│   ├── backend.tf                     # GCS backend (partial config)
│   ├── variables.tf                   # Root module variables
│   ├── main.tf                        # Root module - wires all modules together
│   ├── outputs.tf                     # Root module outputs
│   ├── modules/
│   │   ├── kms/                       # Cloud KMS key ring & crypto key
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── storage/                   # Cloud Storage bucket with retention & encryption
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── pubsub/                    # Pub/Sub notification topic & alerting
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   └── transfer/                  # Storage Transfer Service job
│   │       ├── main.tf
│   │       ├── variables.tf
│   │       └── outputs.tf
│   └── environments/
│       ├── nonprod/
│       │   ├── terraform.tfvars       # Non-prod variable values
│       │   └── backend.conf           # Non-prod backend config
│       └── prod/
│           ├── terraform.tfvars       # Production variable values
│           └── backend.conf           # Production backend config
├── scripts/
│   ├── init-terraform.sh              # Initialize Terraform for an environment
│   ├── plan-terraform.sh              # Run Terraform plan
│   ├── apply-terraform.sh             # Apply Terraform changes
│   └── validate-transfer-job.sh       # Validate transfer job status
├── .github/
│   └── workflows/
│       └── terraform-deploy.yml       # GitHub Actions workflow
└── pipelines/
    └── azure-devops-pipeline.yml      # Azure DevOps YAML pipeline
```

---

## Prerequisites

1. **GCP Project**: A dedicated GCP project for Parity off-site backup storage
2. **Terraform State Bucket**: A GCS bucket for Terraform remote state (per environment)
3. **GCP Authentication**: Service account or Workload Identity Federation configured
4. **Terraform**: Version >= 1.5.0 installed
5. **gcloud CLI**: For validation scripts
6. **AWS IAM Role**: Cross-cloud IAM role with trust policy for GCP (see design document)

---

## Quick Start

### 1. Configure Environment Variables

Update the `terraform.tfvars` files in `terraform/environments/<env>/` with actual values:

```bash
# Key values to update (marked with "# UPDATE" comments):
- project_id          # Your actual GCP project ID
- aws_s3_bucket_name  # Source AWS S3 bucket name
- aws_iam_role_arn    # AWS IAM Role ARN for cross-cloud auth
- notification_email  # Alert email (optional)
```

### 2. Initialize Terraform

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Initialize for non-prod
./scripts/init-terraform.sh nonprod
```

### 3. Plan

```bash
./scripts/plan-terraform.sh nonprod
```

### 4. Apply

```bash
./scripts/apply-terraform.sh nonprod
```

### 5. Validate

```bash
# After the transfer job has run at least once
./scripts/validate-transfer-job.sh <project_id> <transfer_job_name>
```

---

## Transfer Job Configuration

| Parameter | Value |
|---|---|
| **Source** | Amazon S3 |
| **AWS IAM Role ARN** | `arn:aws:iam::937245949235:role/dev-gcp-transfer-poc` (nonprod) |
| **Destination** | Google Cloud Storage |
| **Schedule** | Daily at 04:00 UTC (configurable) |
| **Network** | Google-managed private network |
| **Monitoring** | Cloud Logging enabled |
| **Notifications** | Pub/Sub events on Success, Failed, or Aborted |

---

## CI/CD Pipelines

### GitHub Actions

The workflow at `.github/workflows/terraform-deploy.yml` provides:

- **PR**: Runs validate + plan, comments plan output on PR
- **Push to main**: Auto-deploys to nonprod
- **Manual dispatch**: Select environment (nonprod/prod) and action (plan/apply)

#### Required GitHub Secrets

| Secret | Description |
|---|---|
| `GCP_WORKLOAD_IDENTITY_PROVIDER_NONPROD` | Workload Identity Provider for nonprod |
| `GCP_SERVICE_ACCOUNT_NONPROD` | GCP service account email for nonprod |
| `GCP_WORKLOAD_IDENTITY_PROVIDER_PROD` | Workload Identity Provider for prod |
| `GCP_SERVICE_ACCOUNT_PROD` | GCP service account email for prod |

### Azure DevOps

The pipeline at `pipelines/azure-devops-pipeline.yml` provides:

- **Validate → Plan → Apply** stages
- Parameterised environment and action selection
- Approval gates for production deployments
- Artifact-based plan/apply workflow

#### Required Variable Groups

- `westbrom-gcp-nonprod` - containing `GCP_CREDENTIALS` (service account JSON)
- `westbrom-gcp-prod` - containing `GCP_CREDENTIALS` (service account JSON)

---

## Key Assumptions & Decisions

| Type | Description |
|---|---|
| **ASSUMPTION** | Backup retention: 30 days for nightly offsite backup |
| **ASSUMPTION** | Off-site backup only used in event of widespread AWS regional outage (RTO: 7 days, RPO: 24 hrs) |
| **DECISION** | Use GCP Storage Transfer Service with Google-managed private network |
| **DECISION** | Backup scope: Aurora DB Backup and Cognito Backup |
| **DEPENDENCY** | Deloitte GCP team will create the necessary configurations |
| **DEPENDENCY** | Enable SIEM monitoring in Google SecOps |

---

## Target Dates

| Milestone | Date |
|---|---|
| Non-prod deployment | 30-Apr-2026 |
| Production deployment | TBD |

---

## Post-Deployment Checklist

- [ ] Verify GCP APIs are enabled
- [ ] Confirm KMS key ring and crypto key are created
- [ ] Verify backup bucket exists with correct retention policy
- [ ] Confirm Pub/Sub topic and subscription are created
- [ ] Verify transfer job is created with correct schedule
- [ ] Test AWS IAM Role cross-cloud authentication
- [ ] Run first manual transfer to validate end-to-end flow
- [ ] Verify objects appear in GCS bucket with KMS encryption
- [ ] Check Cloud Logging for transfer operation logs
- [ ] Verify Pub/Sub notification on successful transfer
- [ ] Enable SIEM monitoring in Google SecOps
- [ ] Set `bucket_lock_enabled = true` for production WORM mode