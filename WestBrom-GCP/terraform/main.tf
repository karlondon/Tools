###############################################################################
# Root Module - WestBrom External Backup GCP Infrastructure
#
# This configuration deploys the GCP-side infrastructure for the
# cross-cloud off-site backup solution (AWS Aurora -> GCP Cloud Storage).
#
# Components:
#   1. Cloud KMS         - Encryption key for backup bucket
#   2. Cloud Storage     - Immutable backup bucket with retention & WORM
#   3. Pub/Sub           - Notification topic for transfer events
#   4. Storage Transfer  - Scheduled transfer job from AWS S3
#   5. Cloud Logging     - Monitoring and log-based metrics
###############################################################################

# --------------------------------------------------------------------------
# Data Sources
# --------------------------------------------------------------------------

# Get the project number (needed for GCS service agent IAM)
data "google_project" "current" {
  project_id = var.project_id
}

# --------------------------------------------------------------------------
# Enable Required APIs
# --------------------------------------------------------------------------

resource "google_project_service" "required_apis" {
  for_each = toset([
    "storage.googleapis.com",
    "storagetransfer.googleapis.com",
    "cloudkms.googleapis.com",
    "pubsub.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "iam.googleapis.com",
  ])

  project = var.project_id
  service = each.value

  disable_dependent_services = false
  disable_on_destroy         = false
}

# --------------------------------------------------------------------------
# Service Account for Transfer Operations
# --------------------------------------------------------------------------

resource "google_service_account" "transfer" {
  account_id   = "${var.project_prefix}-${var.environment}-${var.transfer_service_account_id}"
  display_name = "Backup Transfer Service Account (${var.environment})"
  description  = "Service account for Storage Transfer Service - Aurora backup workflow"
  project      = var.project_id
}

# Grant the service account the Storage Transfer Admin role
resource "google_project_iam_member" "transfer_admin" {
  project = var.project_id
  role    = "roles/storagetransfer.admin"
  member  = "serviceAccount:${google_service_account.transfer.email}"
}

# Grant the service account permissions to write transfer logs
resource "google_project_iam_member" "transfer_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.transfer.email}"
}

# --------------------------------------------------------------------------
# Module: Cloud KMS
# --------------------------------------------------------------------------

module "kms" {
  source = "./modules/kms"

  project_id                     = var.project_id
  project_number                 = data.google_project.current.number
  region                         = var.region
  environment                    = var.environment
  project_prefix                 = var.project_prefix
  key_rotation_period            = var.kms_key_rotation_period
  transfer_service_account_email = google_service_account.transfer.email
  labels                         = var.labels

  depends_on = [google_project_service.required_apis]
}

# --------------------------------------------------------------------------
# Module: Cloud Storage
# --------------------------------------------------------------------------

module "storage" {
  source = "./modules/storage"

  project_id                     = var.project_id
  region                         = var.region
  environment                    = var.environment
  project_prefix                 = var.project_prefix
  storage_class                  = var.storage_class
  kms_crypto_key_id              = module.kms.crypto_key_id
  retention_period_days          = var.retention_period_days
  lifecycle_delete_age_days      = var.lifecycle_delete_age_days
  bucket_lock_enabled            = var.bucket_lock_enabled
  transfer_service_account_email = google_service_account.transfer.email
  labels                         = var.labels

  depends_on = [module.kms]
}

# --------------------------------------------------------------------------
# Module: Pub/Sub Notifications
# --------------------------------------------------------------------------

module "pubsub" {
  source = "./modules/pubsub"

  project_id                     = var.project_id
  environment                    = var.environment
  project_prefix                 = var.project_prefix
  transfer_service_account_email = google_service_account.transfer.email
  notification_email             = var.notification_email
  labels                         = var.labels

  depends_on = [google_project_service.required_apis]
}

# --------------------------------------------------------------------------
# Module: Storage Transfer Service
# --------------------------------------------------------------------------

module "transfer" {
  source = "./modules/transfer"

  project_id                        = var.project_id
  region                            = var.region
  environment                       = var.environment
  project_prefix                    = var.project_prefix
  aws_s3_bucket_name                = var.aws_s3_bucket_name
  aws_iam_role_arn                  = var.aws_iam_role_arn
  aws_s3_path                       = var.aws_s3_path
  destination_bucket_name           = module.storage.backup_bucket_name
  transfer_schedule_start_hour      = var.transfer_schedule_start_hour
  transfer_schedule_start_minute    = var.transfer_schedule_start_minute
  transfer_schedule_repeat_interval = var.transfer_schedule_repeat_interval
  notification_topic_id             = module.pubsub.notification_topic_id

  depends_on = [module.storage, module.pubsub, module.kms]
}