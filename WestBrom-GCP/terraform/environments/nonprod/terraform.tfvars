###############################################################################
# Non-Production Environment Variables
###############################################################################

project_id     = "westbrom-parity-backup-nonprod"  # UPDATE: Set to actual GCP project ID
region         = "europe-west2"                     # London region
environment    = "nonprod"
project_prefix = "cb"

# Labels
labels = {
  project     = "converge-banking"
  component   = "external-backup"
  environment = "nonprod"
  managed_by  = "terraform"
  client      = "westbrom"
}

# KMS
kms_key_rotation_period = "7776000s" # 90 days

# Cloud Storage
storage_class             = "STANDARD"
retention_period_days     = 30   # 30-day retention per assumption
lifecycle_delete_age_days = 90   # Delete after 90 days
bucket_lock_enabled       = false # Set to true when ready for WORM/LOCKED mode

# AWS S3 Source
aws_s3_bucket_name = "westbrom-aurora-backup-nonprod"                         # UPDATE: Set to actual S3 bucket
aws_iam_role_arn   = "arn:aws:iam::937245949235:role/dev-gcp-transfer-poc"    # From design document
aws_s3_path        = ""

# Transfer Schedule (UTC) - runs daily at 04:00 UTC (after nightly backup completes)
transfer_schedule_start_hour      = 4
transfer_schedule_start_minute    = 0
transfer_schedule_repeat_interval = "86400s" # Daily

# Notifications
notification_email = "" # UPDATE: Set email for failure alerts

# IAM
transfer_service_account_id = "backup-transfer-sa"