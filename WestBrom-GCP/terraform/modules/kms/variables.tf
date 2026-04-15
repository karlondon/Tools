###############################################################################
# KMS Module Variables
###############################################################################

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "project_number" {
  description = "GCP project number (for GCS service agent IAM binding)"
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

variable "key_rotation_period" {
  description = "Rotation period for the KMS crypto key"
  type        = string
  default     = "7776000s"
}

variable "transfer_service_account_email" {
  description = "Email of the transfer service account that needs KMS access"
  type        = string
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}