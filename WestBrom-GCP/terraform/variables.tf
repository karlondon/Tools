###############################################################################
# Variables - WestBrom External Backup GCP
###############################################################################

# --------------------------------------------------------------------------
# Project & Region
# --------------------------------------------------------------------------
variable "project_id" {
  description = "The dedicated GCP project ID for Parity off-site backup storage"
  type        = string
}

variable "region" {
  description = "GCP region for resources (UK region)"
  type        = string
  default     = "europe-west2"
}

variable "environment" {
  description = "Environment name (e.g., nonprod, prod)"
  type        = string
  validation {
    condition     = contains(["nonprod", "prod"], var.environment)
    error_message = "Environment must be 'nonprod' or 'prod'."
  }
}

# --------------------------------------------------------------------------
# Naming & Labelling
# --------------------------------------------------------------------------
variable "project_prefix" {
  description = "Prefix for resource naming (e.g., cb, westbrom)"
  type        = string
  default     = "cb"
}

variable "labels" {
  description = "Common labels to apply to all resources"
  type        = map(string)
  default = {
    project     = "converge-banking"
    component   = "external-backup"
    managed_by  = "terraform"
  }
}

# --------------------------------------------------------------------------
# Cloud KMS
# --------------------------------------------------------------------------
variable "kms_key_rotation_period" {
  description = "Rotation period for the KMS crypto key (in seconds). Default 90 days."
  type        = string
  default     = "7776000s"
}

# --------------------------------------------------------------------------
# Cloud Storage
# --------------------------------------------------------------------------
variable "storage_class" {
  description = "Storage class for the backup bucket"
  type        = string
  default     = "STANDARD"
}

variable "retention_period_days" {
  description = "Retention period in days for backup objects (30 days per assumption)"
  type        = number
  default     = 30
}

variable "lifecycle_delete_age_days" {
  description = "Number of days after which objects are deleted by lifecycle policy"
  type        = number
  default     = 90
}

variable "bucket_lock_enabled" {
  description = "Whether to lock the retention policy on the bucket (prevents deletion)"
  type        = bool
  default     = false
}

# --------------------------------------------------------------------------
# AWS S3 Source Configuration
# --------------------------------------------------------------------------
variable "aws_s3_bucket_name" {
  description = "The source AWS S3 bucket name containing Aurora backups"
  type        = string
}

variable "aws_iam_role_arn" {
  description = "AWS IAM Role ARN for GCP Storage Transfer Service to assume"
  type        = string
  default     = "arn:aws:iam::937245949235:role/dev-gcp-transfer-poc"
}

variable "aws_s3_path" {
  description = "Optional path prefix within the S3 bucket to transfer from"
  type        = string
  default     = ""
}

# --------------------------------------------------------------------------
# Transfer Job Schedule
# --------------------------------------------------------------------------
variable "transfer_schedule_start_hour" {
  description = "Hour (UTC) to start the transfer job (0-23). Should be after AWS backup completes."
  type        = number
  default     = 4
}

variable "transfer_schedule_start_minute" {
  description = "Minute to start the transfer job (0-59)"
  type        = number
  default     = 0
}

variable "transfer_schedule_repeat_interval" {
  description = "Repeat interval for the transfer job (e.g., '86400s' for daily)"
  type        = string
  default     = "86400s"
}

# --------------------------------------------------------------------------
# Pub/Sub Notification
# --------------------------------------------------------------------------
variable "notification_email" {
  description = "Email address for transfer job failure alerts (optional, for alerting policy)"
  type        = string
  default     = ""
}

# --------------------------------------------------------------------------
# IAM
# --------------------------------------------------------------------------
variable "transfer_service_account_id" {
  description = "Custom service account ID for the transfer job"
  type        = string
  default     = "backup-transfer-sa"
}