###############################################################################
# Storage Module Variables
###############################################################################

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_prefix" {
  description = "Prefix for resource naming"
  type        = string
}

variable "storage_class" {
  description = "Storage class for the backup bucket"
  type        = string
  default     = "STANDARD"
}

variable "kms_crypto_key_id" {
  description = "The ID of the KMS crypto key for bucket encryption"
  type        = string
}

variable "retention_period_days" {
  description = "Retention period in days for backup objects"
  type        = number
  default     = 30
}

variable "lifecycle_delete_age_days" {
  description = "Number of days after which objects are deleted"
  type        = number
  default     = 90
}

variable "bucket_lock_enabled" {
  description = "Whether to lock the retention policy (WORM mode)"
  type        = bool
  default     = false
}

variable "transfer_service_account_email" {
  description = "Email of the transfer service account"
  type        = string
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}